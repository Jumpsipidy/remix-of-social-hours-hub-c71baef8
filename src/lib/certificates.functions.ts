import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function b64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
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

async function sha256Hex(msg: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(msg));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function makeCode(): string {
  const rnd = new Uint8Array(9);
  crypto.getRandomValues(rnd);
  const s = b64url(rnd).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
  return `SV-${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`;
}

export const generateCertificate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ debug: z.boolean().optional() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const secret = process.env.CERT_SIGNING_SECRET;
    if (!secret) throw new Error("Missing CERT_SIGNING_SECRET");

    // Fetch student profile
    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("id, full_name, class_year, school_id, hours_earned, hours_needed, role")
      .eq("id", userId)
      .maybeSingle();
    if (pErr || !profile) throw new Error("Profilis nerastas");
    if (profile.role !== "student") throw new Error("Tik moksleiviai gali generuoti sertifikatą");

    // Debug bypass: only allow if caller is an admin
    let debugMode = false;
    if (data.debug) {
      const { data: isAdmin } = await supabase.rpc("has_role", {
        _user_id: userId,
        _role: "admin",
      });
      if (!isAdmin) throw new Error("Debug rėžimas leidžiamas tik super admin");
      debugMode = true;
    }

    // Fetch school name
    let schoolName: string | null = null;
    if (profile.school_id) {
      const { data: sch } = await supabase.from("schools").select("name").eq("id", profile.school_id).maybeSingle();
      schoolName = sch?.name ?? null;
    }

    // Fetch completed reservations
    const { data: rs } = await supabase
      .from("reservations")
      .select("id, reservation_date, start_time, end_time, hours_to_earn, note, organization_id")
      .eq("student_id", userId)
      .eq("status", "completed")
      .order("reservation_date", { ascending: false });

    const rows = (rs ?? []) as Array<{
      id: string;
      reservation_date: string;
      start_time: string | null;
      end_time: string | null;
      hours_to_earn: number | null;
      note: string | null;
      organization_id: string | null;
    }>;

    const orgIds = Array.from(new Set(rows.map((r) => r.organization_id).filter(Boolean))) as string[];
    const orgMap: Record<string, string> = {};
    if (orgIds.length) {
      const { data: orgs } = await supabase
        .from("profiles")
        .select("id, organization_name, full_name")
        .in("id", orgIds);
      (orgs ?? []).forEach((o) => {
        orgMap[o.id] = o.organization_name ?? o.full_name ?? "Organizacija";
      });
    }

    const reservations = rows.map((r) => ({
      date: r.reservation_date,
      start_time: r.start_time ?? "",
      end_time: r.end_time ?? "",
      hours: Number(r.hours_to_earn ?? 0),
      notes: r.note ?? "",
      organization: (r.organization_id && orgMap[r.organization_id]) || "Organizacija",
    }));


    const totalHours = reservations.reduce((s, r) => s + Number(r.hours ?? 0), 0);
    const code = makeCode();
    const payload = JSON.stringify({
      code,
      student_id: userId,
      student_name: profile.full_name ?? "",
      total_hours: totalHours,
      reservations,
    });
    const content_hash = await sha256Hex(payload);
    const signature = await hmacHex(secret, code + "|" + content_hash);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: insErr } = await supabaseAdmin.from("certificates").insert({
      code,
      student_id: userId,
      student_name: profile.full_name ?? "",
      student_class: profile.class_year ?? null,
      school_id: profile.school_id ?? null,
      school_name: schoolName,
      total_hours: totalHours,
      hours_needed: profile.hours_needed ?? 0,
      reservations_json: reservations,
      content_hash,
      signature,
    });
    if (insErr) throw new Error(insErr.message);

    return {
      code,
      content_hash,
      signature,
      generated_at: new Date().toISOString(),
      student_name: profile.full_name ?? "",
      student_class: profile.class_year ?? null,
      school_name: schoolName,
      total_hours: totalHours,
      hours_needed: profile.hours_needed ?? 0,
      reservations,
    };
  });

export const verifyCertificatePublic = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ code: z.string().min(6).max(64) }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: res, error } = await supabaseAdmin.rpc("verify_certificate", {
      _code: data.code.trim().toUpperCase(),
    });
    if (error) throw new Error(error.message);
    return (res ?? { valid: false, reason: "not_found" }) as unknown as {
      valid: boolean;
      reason?: string;
      code?: string;
      student_name?: string;
      student_class?: string;
      school_name?: string;
      total_hours_at_generation?: number;
      current_hours_in_system?: number;
      hours_needed?: number;
      reservations?: Array<{ date: string; hours: number; organization: string; start_time?: string; end_time?: string; notes?: string }>;
      generated_at?: string;
      content_hash?: string;
      revoked_at?: string;
      revoked_reason?: string;
    };

  });
