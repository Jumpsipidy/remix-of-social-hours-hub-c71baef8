import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { bootstrapFirstAdmin } from "@/lib/bootstrap-admin.functions";

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
  clearImpersonation: () => void;
};

const MOCK_KEY = "sv_mock_session_v1";
const AuthContext = createContext<AuthState | null>(null);

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
  const bootstrapAdmin = useServerFn(bootstrapFirstAdmin);
  const bootstrapAdminRef = useRef(bootstrapAdmin);

  useEffect(() => {
    bootstrapAdminRef.current = bootstrapAdmin;
  }, [bootstrapAdmin]);

  useEffect(() => {
    // Load mock from storage
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
      const fetchProfile = async () => {
        const { data } = await supabase
          .from("profiles")
          .select("id, full_name, email, role, hours_needed, hours_earned, organization_name, school_id, class_year")
          .eq("id", uid)
          .maybeSingle();
        return (data as Profile | null) ?? null;
      };

      let nextProfile = await fetchProfile();

      // If the database was wiped and no super-admin exists, make the first signed-in user the owner.
      if (!nextProfile || nextProfile.role !== "admin") {
        try {
          const result = await bootstrapAdminRef.current();
          if (result.bootstrapped) nextProfile = await fetchProfile();
        } catch {
          // Normal case after setup: an admin already exists, so nothing changes.
        }
      }

      if (mounted) setProfile(nextProfile);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        setLoading(true);
        setTimeout(async () => {
          await loadProfile(u.id);
          if (mounted) setLoading(false);
        }, 0);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) await loadProfile(u.id);
      if (mounted) setLoading(false);
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
        try { localStorage.removeItem(MOCK_KEY); } catch {}
        setMock(null);
        await supabase.auth.signOut();
      },
      impersonate: (p: Profile) => {
        try { localStorage.setItem(MOCK_KEY, JSON.stringify({ profile: p })); } catch {}
        setMock({ user: makeMockUser(p), profile: p });
      },
      clearImpersonation: () => {
        try { localStorage.removeItem(MOCK_KEY); } catch {}
        setMock(null);
      },
    };
  }, [user, profile, loading, mock]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
