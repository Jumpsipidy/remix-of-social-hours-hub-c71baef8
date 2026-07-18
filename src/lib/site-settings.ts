import { supabase } from "@/integrations/supabase/client";

export type SiteSettings = {
  id: boolean;
  lockdown_enabled: boolean;
  lockdown_message: string | null;
  lockdown_code: string | null;
  updated_at?: string | null;
  updated_by?: string | null;
};

const SITE_SETTINGS_COLUMNS = "id, lockdown_enabled, lockdown_message, lockdown_code, updated_at, updated_by";

export function isSiteSettingsSchemaError(error: unknown) {
  const message = String((error as { message?: string } | null)?.message ?? "");
  const code = String((error as { code?: string } | null)?.code ?? "");
  return (
    code === "PGRST205" ||
    code === "PGRST204" ||
    (message.includes("site_settings") && (message.includes("schema cache") || message.includes("Could not find")))
  );
}

export async function readSiteSettings() {
  const query = () =>
    supabase
      .from("site_settings")
      .select(SITE_SETTINGS_COLUMNS)
      .eq("id", true)
      .maybeSingle();

  let result = await query();
  if (result.error && isSiteSettingsSchemaError(result.error)) {
    await new Promise((resolve) => setTimeout(resolve, 900));
    result = await query();
  }

  return {
    data: (result.data as SiteSettings | null) ?? null,
    error: result.error ?? null,
    schemaMissing: Boolean(result.error && isSiteSettingsSchemaError(result.error)),
  };
}