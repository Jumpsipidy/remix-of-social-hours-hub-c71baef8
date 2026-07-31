import { supabase } from "@/integrations/supabase/client";

/**
 * PostgREST returns PGRST204 ("Could not find the 'x' column ... in the schema
 * cache") when the app knows about a column the database does not have yet.
 * Instead of failing the user's action, drop the unknown column and retry.
 * The original failure is still reported to /admin/errors by the client fetch hook.
 */
export async function insertWithSchemaFallback(
  table: string,
  row: Record<string, unknown>,
  maxRetries = 5,
): Promise<{ error: { message: string } | null; droppedColumns: string[] }> {
  const payload = { ...row };
  const dropped: string[] = [];

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const { error } = await supabase.from(table as never).insert(payload as never);
    if (!error) return { error: null, droppedColumns: dropped };

    const missing = extractMissingColumn(error.message);
    if (!missing || !(missing in payload)) return { error, droppedColumns: dropped };

    delete payload[missing];
    dropped.push(missing);
  }

  return { error: { message: "Nepavyko išsaugoti (schemos neatitikimas)" }, droppedColumns: dropped };
}

export function extractMissingColumn(message: string): string | null {
  const m = /Could not find the '([^']+)' column/i.exec(message ?? "");
  return m?.[1] ?? null;
}
