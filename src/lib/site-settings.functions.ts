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
  const shape = (row: Partial<PublicSiteSettings> | null) =>
    row
      ? {
          id: true as const,
          lockdown_enabled: Boolean(row.lockdown_enabled),
          lockdown_message: row.lockdown_message ?? null,
          lockdown_code: row.lockdown_code ?? null,
          updated_at: row.updated_at ?? null,
        }
      : null;

  // 1) Preferred path: service-role read of the settings row.
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("site_settings")
      .select("lockdown_enabled, lockdown_message, lockdown_code, updated_at")
      .eq("id", true)
      .maybeSingle();

    if (!error) {
      return { data: shape(data as Partial<PublicSiteSettings> | null), error: null, schemaMissing: false };
    }
    // Any failed privileged read must try the public read path too, not only
    // schema errors: an expired service credential must not block public status.
  } catch {
    // Missing service-role env or cold worker → fall through to the public RPC.
  }

  // 2) Fallback: publishable-key client calling the SECURITY DEFINER RPC.
  // This must never throw — a 500 here would break the whole site shell.
  try {
    const url = process.env["SUPABASE_URL"] || process.env["SB_URL"] || process.env["VITE_SUPABASE_URL"];
    const key =
      process.env["SUPABASE_PUBLISHABLE_KEY"] ||
      process.env["SB_PUBLISHABLE_KEY"] ||
      process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
      process.env["VITE_SUPABASE_ANON_KEY"];
    if (url && key) {
      const { createClient } = await import("@supabase/supabase-js");
      const client = createClient(url, key, {
        auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
        global: {
          fetch: (input, init) => {
            const headers = new Headers(init?.headers);
            if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
              headers.delete("Authorization");
            }
            headers.set("apikey", key);
            return fetch(input, { ...init, headers });
          },
        },
      });
      const { data, error } = await client.rpc("get_lockdown_public");
      if (!error) {
        const row = Array.isArray(data) ? (data[0] as Partial<PublicSiteSettings> | undefined) : (data as any);
        return { data: shape(row ?? null), error: null, schemaMissing: false };
      }
      return {
        data: null,
        error: { message: error.message, code: (error as { code?: string }).code ?? null },
        schemaMissing: isSchemaError(error),
      };
    }
  } catch (error) {
    return {
      data: null,
      error: { message: error instanceof Error ? error.message : String(error), code: null },
      schemaMissing: false,
    };
  }

  // Unknown remains unknown; the access gate must never interpret it as open.
  return { data: null, error: null, schemaMissing: true };
});