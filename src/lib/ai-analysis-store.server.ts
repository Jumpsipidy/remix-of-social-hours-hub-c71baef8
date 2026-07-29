// Server-only persistence helper for AI error analyses.
//
// Databases in the wild can lag behind the code: a column such as
// `raw_response` or `error_message` may not exist yet, and PostgREST then
// answers with PGRST204 „Could not find the 'x' column of 'ai_error_analyses'
// in the schema cache". Instead of failing the whole analysis, we drop the
// unknown column and retry until the row is accepted.

type AnyRow = Record<string, unknown>;

type UpsertResult = { saved: AnyRow | null; error: { message: string } | null };

export async function upsertAnalysis(
  client: {
    from: (t: string) => {
      upsert: (
        row: never,
        opts: { onConflict: string },
      ) => { select: () => { single: () => Promise<{ data: AnyRow | null; error: { message: string } | null }> } };
    };
  },
  row: AnyRow,
): Promise<UpsertResult> {
  const payload: AnyRow = { ...row };
  let error: { message: string } | null = null;
  let saved: AnyRow | null = null;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const res = await client
      .from("ai_error_analyses")
      .upsert(payload as never, { onConflict: "fingerprint" })
      .select()
      .single();
    saved = res.data;
    error = res.error;
    if (!error) return { saved, error: null };

    const missing = /Could not find the '([^']+)' column/.exec(error.message)?.[1];
    if (!missing || !(missing in payload) || missing === "fingerprint") break;
    delete payload[missing];
  }

  return { saved, error };
}
