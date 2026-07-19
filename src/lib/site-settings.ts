import { supabase } from "@/integrations/supabase/client";

export type SiteSettings = {
  id: boolean;
  lockdown_enabled: boolean;
  lockdown_message: string | null;
  lockdown_code: string | null;
  updated_at?: string | null;
  updated_by?: string | null;
};

export function isSiteSettingsSchemaError(error: unknown) {
  const message = String((error as { message?: string } | null)?.message ?? "");
  const code = String((error as { code?: string } | null)?.code ?? "");
  return (
    code === "PGRST205" ||
    code === "PGRST204" ||
    (message.includes("site_settings") && (message.includes("schema cache") || message.includes("Could not find"))) ||
    (message.includes("get_lockdown_public") && (message.includes("schema cache") || message.includes("Could not find")))
  );
}

export async function readSiteSettings() {
  // Read via SECURITY DEFINER RPC so anon/authenticated can obtain the public
  // lockdown status (including the display incident code) without holding
  // direct SELECT on the underlying site_settings.lockdown_code column.
  const query = () => supabase.rpc("get_lockdown_public");

  let result = await query();
  if (result.error && isSiteSettingsSchemaError(result.error)) {
    await new Promise((resolve) => setTimeout(resolve, 900));
    result = await query();
  }

  const row = Array.isArray(result.data) ? (result.data[0] as Partial<SiteSettings> | undefined) : null;
  const data: SiteSettings | null = row
    ? {
        id: true,
        lockdown_enabled: Boolean(row.lockdown_enabled),
        lockdown_message: row.lockdown_message ?? null,
        lockdown_code: row.lockdown_code ?? null,
        updated_at: row.updated_at ?? null,
      }
    : null;

  return {
    data,
    error: result.error ?? null,
    schemaMissing: Boolean(result.error && isSiteSettingsSchemaError(result.error)),
  };
}