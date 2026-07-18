import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type LockdownSettingsDto = {
  id: boolean;
  lockdown_enabled: boolean;
  lockdown_message: string | null;
  updated_at: string | null;
  updated_by: string | null;
};

export async function requireAdminClient(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });

  if (error || data !== true) {
    throw new Error("Reikia sistemos administratoriaus teisių");
  }

  return supabaseAdmin;
}

export function normalizeLockdownSettings(row: any): LockdownSettingsDto {
  return {
    id: Boolean(row?.id ?? true),
    lockdown_enabled: Boolean(row?.lockdown_enabled),
    lockdown_message: row?.lockdown_message ?? null,
    updated_at: row?.updated_at ?? null,
    updated_by: row?.updated_by ?? null,
  };
}