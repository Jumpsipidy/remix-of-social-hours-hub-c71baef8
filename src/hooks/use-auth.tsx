import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { ensureSignedInProfile } from "@/lib/auth-profile.functions";
import { logActivity } from "@/lib/activity-log";

export type AppRole = "student" | "school_admin" | "organization" | "admin";

export type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: AppRole;
  hours_needed: number;
  hours_earned: number;
  organization_name: string | null;
  school_id?: string | null;
  class_year?: string | null;
  assigned_classes?: string[] | null;
};


type MockSession = { user: User; profile: Profile };

type AuthState = {
  user: User | null;
  profile: Profile | null;
  role: AppRole | null;
  isAuthenticated: boolean;
  isImpersonating: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  impersonate: (profile: Profile) => void;
  impersonateReal: (email: string, password: string) => Promise<void>;
  clearImpersonation: () => void;
};

const MOCK_KEY = "sv_mock_session_v1";
const ROLE_CACHE_KEY = "sv_last_role_v1";
const AuthContext = createContext<AuthState | null>(null);
const PROFILE_COLUMNS = "id, full_name, email, role, hours_needed, hours_earned, organization_name, school_id, class_year, assigned_classes";
const PROFILE_COLUMNS_SAFE = "id, full_name, email, role, hours_needed, hours_earned, organization_name, school_id, class_year";

function isAssignedClassesSchemaError(error: unknown) {
  const message = String((error as { message?: string } | null)?.message ?? "");
  return message.includes("assigned_classes") && (message.includes("does not exist") || message.includes("schema cache") || message.includes("column"));
}

function normalizeProfile(profile: unknown): Profile | null {
  if (!profile) return null;
  const next = profile as Profile;
  return { ...next, assigned_classes: next.assigned_classes ?? [] };
}

function makeMockUser(profile: Profile): User {
  return {
    id: profile.id,
    email: profile.email ?? undefined,
    aud: "authenticated",
    role: "authenticated",
    app_metadata: {},
    user_metadata: { full_name: profile.full_name, role: profile.role, mock: true },
    created_at: new Date().toISOString(),
  } as unknown as User;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [mock, setMock] = useState<MockSession | null>(null);
  const ensureProfile = useServerFn(ensureSignedInProfile);
  const ensureProfileRef = useRef(ensureProfile);

  useEffect(() => {
    ensureProfileRef.current = ensureProfile;
  }, [ensureProfile]);

  useEffect(() => {
    // Debug-only mock impersonation. In production builds this branch is
    // stripped, so writing localStorage['sv_mock_session_v1'] can't fake an
    // admin role in the UI.
    if (!import.meta.env.DEV) return;
    try {
      const raw = localStorage.getItem(MOCK_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { profile: Profile };
        const u = makeMockUser(parsed.profile);
        setMock({ user: u, profile: parsed.profile });
      }
    } catch {}
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadProfile = async (uid: string) => {
      try {
        const ensured = await ensureProfileRef.current();
        if (mounted && ensured.profile) {
          setProfile(ensured.profile as Profile);
          try { localStorage.setItem(ROLE_CACHE_KEY, ensured.profile.role); } catch {}
          return;
        }
      } catch {
        // Fall back to a normal RLS read; this keeps auth usable even if the
        // privileged repair path is temporarily unavailable.
      }

      const fetchProfile = async () => {
        const result = await supabase
          .from("profiles")
          .select(PROFILE_COLUMNS)
          .eq("id", uid)
          .maybeSingle();
        if (!result.error) return normalizeProfile(result.data);
        if (!isAssignedClassesSchemaError(result.error)) throw result.error;

        const fallback = await supabase
          .from("profiles")
          .select(PROFILE_COLUMNS_SAFE)
          .eq("id", uid)
          .maybeSingle();
        if (fallback.error) throw fallback.error;
        return normalizeProfile(fallback.data);
      };

      let nextProfile = await fetchProfile();

      if (mounted) {
        setProfile(nextProfile);
        if (nextProfile?.role) {
          try { localStorage.setItem(ROLE_CACHE_KEY, nextProfile.role); } catch {}
        }
      }
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      // Ignore TOKEN_REFRESHED — it fires on tab focus and would otherwise
      // reset component state (scroll, form inputs). INITIAL_SESSION is handled by getSession.
      if (event === "TOKEN_REFRESHED") return;
      
      if (event === "SIGNED_IN") {
        try { localStorage.removeItem(MOCK_KEY); } catch {}
        setMock(null);
      }
      
      const u = session?.user ?? null;
      setUser(u);
      
      if (u) {
        loadProfile(u.id).finally(() => {
          if (mounted) setLoading(false);
        });
      } else {
        if (event === "SIGNED_OUT") {
          (async () => {
            try {
              const { deviceMeta } = await import("@/lib/device-meta");
              logActivity("auth.signed_out", { meta: deviceMeta() });
            } catch {}
          })();
        }
        setProfile(null);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      if (mounted) {
        setUser(u);
        if (u) {
          loadProfile(u.id).finally(() => {
            if (mounted) setLoading(false);
          });
        } else {
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthState>(() => {
    const active = mock ?? (user ? { user, profile } : null);
    return {
      user: active?.user ?? null,
      profile: (active?.profile as Profile | null) ?? null,
      role: active?.profile?.role ?? null,
      isAuthenticated: !!active?.user,
      isImpersonating: !!mock,
      loading,
      signOut: async () => {
        try {
          const { deviceMeta } = await import("@/lib/device-meta");
          await logActivity("auth.signed_out", { meta: deviceMeta() });
        } catch {}
        try { localStorage.removeItem(MOCK_KEY); } catch {}
        try { localStorage.removeItem(ROLE_CACHE_KEY); } catch {}
        setMock(null);
        await supabase.auth.signOut();
      },
      impersonate: (p: Profile) => {
        try { localStorage.setItem(MOCK_KEY, JSON.stringify({ profile: p })); } catch {}
        setMock({ user: makeMockUser(p), profile: p });
      },
      impersonateReal: async (email: string, password: string) => {
        try { localStorage.removeItem(MOCK_KEY); } catch {}
        try { localStorage.removeItem(ROLE_CACHE_KEY); } catch {}
        setMock(null);
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user?.id) {
          try {
            const { deviceMeta } = await import("@/lib/device-meta");
            await logActivity("auth.signed_in", { entityType: "user", entityId: data.user.id, meta: deviceMeta({ method: "debug_impersonate_real" }) });
          } catch {}
        }
      },
      clearImpersonation: () => {
        try { localStorage.removeItem(MOCK_KEY); } catch {}
        setMock(null);
      },
    };
  }, [user, profile, loading, mock]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Safe fallback used if a consumer renders before/without the provider
// (e.g. during HMR races or SSR of a route that mounts outside <AuthProvider>).
// Returning inert defaults instead of throwing prevents a whole page crash.
const FALLBACK_AUTH: AuthState = {
  user: null,
  profile: null,
  role: null,
  isAuthenticated: false,
  isImpersonating: false,
  loading: false,
  signOut: async () => {},
  impersonate: () => {},
  impersonateReal: async () => {},
  clearImpersonation: () => {},
};

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    if (typeof window !== "undefined" && import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn("useAuth called without AuthProvider — using safe fallback.");
    }
    return FALLBACK_AUTH;
  }
  return ctx;
}
