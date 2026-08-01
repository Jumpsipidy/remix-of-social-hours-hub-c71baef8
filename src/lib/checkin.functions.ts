import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Rotating QR window: token valid for 30 seconds.
const WINDOW_SECONDS = 30;

/** Turn raw PostgREST plumbing errors into something an organization can act on. */
function friendlyRpcError(message: string): string {
  if (/PGRST202|could not find the function\s+public\.check_in_by_code/i.test(message)) {
    return "PostgREST nemato check_in_by_code(_code text) funkcijos. Paleisk FIX_CHECK_IN_BY_CODE.sql Supabase SQL Editor ir perkrauk puslapį.";
  }
  if (/PGRST204|schema cache/i.test(message)) {
    return "Duomenų bazėje trūksta įsiregistravimo stulpelių — paleisk FIX_CHECKIN_AND_STREAKS.sql Supabase SQL Editor.";
  }
  if (/not found|nerast/i.test(message)) {
    return "Toks kodas nerastas arba jis priklauso kitai organizacijai.";
  }
  return message;
}


async function hmacHex(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg)));
  return Array.from(sig).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Student pulls a fresh rotating check-in token every ~25s.
 * Returns { token, expires_at, code } where `code` is the 6-digit offline fallback.
 * Only returns data for reservations owned by (or with the student as accepted participant of) the caller.
 */
export const getMyCheckInTokens = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const secret = process.env.CERT_SIGNING_SECRET;
    if (!secret) throw new Error("Server misconfigured: CERT_SIGNING_SECRET missing");

    // Owner reservations (approved, not yet completed). Codes are generated on
    // demand when the DB trigger never fired (older rows / missing trigger).
    const { data: ownedRaw } = await supabase
      .from("reservations")
      .select("id, check_in_code, checked_in_at, status, reservation_date, organization_id")
      .eq("student_id", userId)
      .eq("status", "approved");

    // Group participant rows
    const { data: partsRaw } = await supabase
      .from("reservation_participants")
      .select("id, reservation_id, check_in_code, checked_in_at, status")
      .eq("student_id", userId)
      .eq("status", "accepted");

    const ensureCode = async (args: { reservationId?: string; participantId?: string }) => {
      const { data, error } = await supabase.rpc("ensure_check_in_code" as never, {
        _reservation_id: args.reservationId ?? null,
        _participant_id: args.participantId ?? null,
      } as never);
      if (error) return null;
      return typeof data === "string" ? data : null;
    };

    const owned: NonNullable<typeof ownedRaw> = [];
    for (const r of ownedRaw ?? []) {
      const code = r.check_in_code ?? (await ensureCode({ reservationId: r.id }));
      if (code) owned.push({ ...r, check_in_code: code });
    }

    const parts: NonNullable<typeof partsRaw> = [];
    for (const p of partsRaw ?? []) {
      const code = p.check_in_code ?? (await ensureCode({ participantId: p.id }));
      if (code) parts.push({ ...p, check_in_code: code });
    }

    const window = Math.floor(Date.now() / 1000 / WINDOW_SECONDS);

    const tokens = await Promise.all([
      ...(owned ?? []).map(async (r) => {
        const payload = `r:${r.id}:${userId}:${window}`;
        const sig = (await hmacHex(secret, payload)).slice(0, 24);
        return {
          kind: "owner" as const,
          reservation_id: r.id,
          code: r.check_in_code as string,
          checked_in: !!r.checked_in_at,
          qr: `SVCI|${r.id}|${userId}|${window}|${sig}`,
          expires_at: (window + 1) * WINDOW_SECONDS * 1000,
        };
      }),
      ...(parts ?? []).map(async (p) => {
        const payload = `p:${p.id}:${userId}:${window}`;
        const sig = (await hmacHex(secret, payload)).slice(0, 24);
        return {
          kind: "participant" as const,
          reservation_id: p.reservation_id,
          participant_id: p.id,
          code: p.check_in_code as string,
          checked_in: !!p.checked_in_at,
          qr: `SVCI-P|${p.id}|${userId}|${window}|${sig}`,
          expires_at: (window + 1) * WINDOW_SECONDS * 1000,
        };
      }),
    ]);

    return { tokens, window_seconds: WINDOW_SECONDS };
  });

/**
 * Organization submits either a scanned QR payload (SVCI|... or SVCI-P|...)
 * or a typed 6-digit code. Returns student info and success/duplicate flag.
 */
export const submitCheckIn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ raw: z.string().min(1).max(300) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const raw = data.raw.trim();

    // Case A: QR payload
    if (raw.startsWith("SVCI|") || raw.startsWith("SVCI-P|")) {
      const secret = process.env.CERT_SIGNING_SECRET;
      if (!secret) throw new Error("Server misconfigured: CERT_SIGNING_SECRET missing");
      const parts = raw.split("|");
      if (parts.length !== 5) throw new Error("Netaisyklingas QR kodas");
      const [prefix, targetId, studentId, windowStr, sig] = parts;
      const window = parseInt(windowStr, 10);
      const now = Math.floor(Date.now() / 1000 / WINDOW_SECONDS);
      if (!Number.isFinite(window) || Math.abs(now - window) > 1) {
        throw new Error("QR kodas nebegalioja — paprašyk atnaujinti");
      }
      const isParticipant = prefix === "SVCI-P";
      const payload = `${isParticipant ? "p" : "r"}:${targetId}:${studentId}:${window}`;
      const expected = (await hmacHex(secret, payload)).slice(0, 24);
      if (expected !== sig) throw new Error("Neteisingas parašas — QR kodas suklastotas");

      // Look up the corresponding check_in_code and delegate to the RPC to enforce org ownership.
      let code: string | null = null;
      if (isParticipant) {
        const { data: p } = await supabase
          .from("reservation_participants")
          .select("check_in_code")
          .eq("id", targetId)
          .maybeSingle();
        code = p?.check_in_code ?? null;
      } else {
        const { data: r } = await supabase
          .from("reservations")
          .select("check_in_code")
          .eq("id", targetId)
          .maybeSingle();
        code = r?.check_in_code ?? null;
      }
      if (!code) throw new Error("Rezervacija nerasta");
      const { data: result, error } = await supabase.rpc("check_in_by_code", { _code: code });
      if (error) throw new Error(friendlyRpcError(error.message));
      return result as {
        ok: boolean; already: boolean; reservation_id: string;
        student_id: string; student_name: string; checked_in_at: string; is_owner: boolean;
      };
    }

    // Case B: typed 6-digit code
    const cleaned = raw.replace(/\D/g, "");
    if (cleaned.length !== 6) throw new Error("Kodas turi būti 6 skaitmenys");
    const { data: result, error } = await supabase.rpc("check_in_by_code", { _code: cleaned });
    if (error) throw new Error(friendlyRpcError(error.message));
    void userId;
    return result as {
      ok: boolean; already: boolean; reservation_id: string;
      student_id: string; student_name: string; checked_in_at: string; is_owner: boolean;
    };
  });
