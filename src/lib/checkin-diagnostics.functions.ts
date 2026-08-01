import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type DiagItem = { key: string; label: string; ok: boolean; detail?: string };

// PGRST202 is the only reliable signal that PostgREST cannot resolve an RPC.
// A function that exists can itself raise "relation/operator does not exist";
// treating that as a missing RPC hides the real SQL error.
const MISSING_FN = /(PGRST202|could not find the function\s+public\.)/i;
const MISSING_COL = /(PGRST204|column .* does not exist|Could not find the ')/i;

/**
 * Probes every DB object the check-in + streak features need.
 * Used by /checkin and /organization/scan to explain exactly what is missing
 * instead of failing with a raw PostgREST error.
 */
export const checkInDiagnostics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const items: DiagItem[] = [];

    const probeColumn = async (table: string, column: string, label: string) => {
      const { error } = await supabase.from(table as never).select(column).limit(1);
      const missing = !!error && MISSING_COL.test(error.message);
      items.push({ key: `${table}.${column}`, label, ok: !missing, detail: missing ? error?.message : undefined });
    };

    const probeFn = async (name: string, args: Record<string, unknown>, label: string) => {
      const { error } = await supabase.rpc(name as never, args as never);
      const missing = !!error && MISSING_FN.test(error.message);
      items.push({
        key: name,
        label,
        ok: !missing,
        detail: missing ? error?.message : undefined,
      });
    };

    await probeColumn("reservations", "check_in_code", "reservations.check_in_code stulpelis");
    await probeColumn("reservations", "checked_in_at", "reservations.checked_in_at stulpelis");
    await probeColumn("reservation_participants", "check_in_code", "reservation_participants.check_in_code stulpelis");
    await probeFn("ensure_check_in_code", { _reservation_id: null, _participant_id: null }, "ensure_check_in_code() funkcija");
    await probeFn("check_in_by_code", { _code: "000000" }, "check_in_by_code() funkcija");
    await probeFn("bump_login_streak", {}, "bump_login_streak() funkcija (streak)");
    await probeColumn("profiles", "login_streak", "profiles.login_streak stulpelis");

    const { error: achErr } = await supabase.from("user_achievements" as never).select("id").limit(1);
    const achMissing = !!achErr && /(does not exist|PGRST205|schema cache)/i.test(achErr.message);
    items.push({ key: "user_achievements", label: "user_achievements lentelė (pasiekimai)", ok: !achMissing, detail: achMissing ? achErr?.message : undefined });

    const missing = items.filter((i) => !i.ok);
    return {
      ok: missing.length === 0,
      items,
      missingCount: missing.length,
      hint: missing.length
        ? "Duomenų bazėje trūksta objektų. Paleisk visą FIX_CHECKIN_AND_STREAKS.sql Supabase SQL Editor."
        : null,
    };
  });
