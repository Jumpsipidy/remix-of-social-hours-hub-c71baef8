// Server-only persistence helper for AI error analyses.
//
// Databases in the wild can lag behind the code: a column such as
// `raw_response` or `error_message` may not exist yet, and PostgREST then
// answers with PGRST204 „Could not find the 'x' column of 'ai_error_analyses'
// in the schema cache". Instead of failing the whole analysis, we drop the
// unknown column and retry until the row is accepted.

type AnyRow = Record<string, unknown>;

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function upsertAnalysis<T = any>(
  client: any,
  row: AnyRow,
): Promise<{ saved: T | null; error: { message: string } | null }> {
  const payload: AnyRow = { ...row };
  let error: { message: string } | null = null;
  let saved: T | null = null;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const res = await client
      .from("ai_error_analyses")
      .upsert(payload as never, { onConflict: "fingerprint" })
      .select()
      .single();
    saved = (res.data ?? null) as T | null;
    error = (res.error ?? null) as { message: string } | null;
    if (!error) return { saved, error: null };

    // Older DBs declare `confidence` as integer → "invalid input syntax for
    // type integer: \"0.8\"". Coerce the offending fractional value (0–1 is
    // stored as a 0–100 percentage) and retry instead of losing the analysis.
    const badInt = /invalid input syntax for type integer:\s*"([^"]+)"/.exec(error.message)?.[1];
    if (badInt) {
      let fixed = false;
      for (const [key, value] of Object.entries(payload)) {
        if (typeof value !== "number" || String(value) !== badInt) continue;
        payload[key] = Math.abs(value) <= 1 ? Math.round(value * 100) : Math.round(value);
        fixed = true;
      }
      if (fixed) continue;
    }

    const missing = /Could not find the '([^']+)' column/.exec(error.message)?.[1];
    if (!missing || !(missing in payload) || missing === "fingerprint") break;
    delete payload[missing];
  }

  return { saved, error };
}
