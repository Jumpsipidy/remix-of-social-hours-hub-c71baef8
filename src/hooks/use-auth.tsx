import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "student" | "school_admin" | "organization" | "admin";

export type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: AppRole;
  hours_needed: number;
  hours_earned: number;
  organization_name: string | null;
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
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email, role, hours_needed, hours_earned, organization_name")
        .eq("id", uid)
        .maybeSingle();
      if (mounted) setProfile((data as Profile | null) ?? null);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) setTimeout(() => loadProfile(u.id), 0);
      else setProfile(null);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) loadProfile(u.id);
      setLoading(false);
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
