import { createServerFn } from "@tanstack/react-start";

type PublicSiteSettings = {
  id: boolean;
  lockdown_enabled: boolean;
  lockdown_message: string | null;
  lockdown_code: string | null;
  updated_at?: string | null;
};

function isSchemaError(error: unknown) {
  const message = String((error as { message?: string } | null)?.message ?? "");
  const code = String((error as { code?: string } | null)?.code ?? "");
  return (
    code === "PGRST205" ||
    code === "PGRST204" ||
    (message.includes("site_settings") && (message.includes("schema cache") || message.includes("Could not find")))
  );
}

export const getPublicSiteSettings = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("site_settings")
      .select("lockdown_enabled, lockdown_message, lockdown_code, updated_at")
      .eq("id", true)
      .maybeSingle();

    if (error) {
      return {
        data: null,
        error: { message: error.message, code: error.code ?? null },
        schemaMissing: isSchemaError(error),
      };
    }

    const row = data as Partial<PublicSiteSettings> | null;
    return {
      data: row
        ? {
            id: true,
            lockdown_enabled: Boolean(row.lockdown_enabled),
            lockdown_message: row.lockdown_message ?? null,
            lockdown_code: row.lockdown_code ?? null,
            updated_at: row.updated_at ?? null,
          }
        : null,
      error: null,
      schemaMissing: false,
    };
  } catch (error) {
    return {
      data: null,
      error: { message: error instanceof Error ? error.message : String(error), code: null },
      schemaMissing: false,
    };
  }
});