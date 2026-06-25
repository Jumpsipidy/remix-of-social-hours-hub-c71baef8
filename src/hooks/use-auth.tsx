import { useEffect, useState } from "react";
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

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

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

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        setTimeout(() => loadProfile(u.id), 0);
      } else {
        setProfile(null);
      }
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

  return {
    user,
    profile,
    role: profile?.role ?? null,
    isAuthenticated: !!user,
    loading,
    signOut: async () => {
      await supabase.auth.signOut();
    },
  };
}
