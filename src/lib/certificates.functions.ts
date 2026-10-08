import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { certificateHash, signCertificateHash, checkCertificateIntegrity, type CertificateSnapshot } from "@/lib/certificate-integrity";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function b64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function makeCode(): string {
  const rnd = new Uint8Array(9);
  crypto.getRandomValues(rnd);
  const s = b64url(rnd).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
  return `SV-${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`;
}

export const generateCertificate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({
      debug: z.boolean().optional(),
      fake: z.boolean().optional(),
    }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const secret = process.env.CERT_SIGNING_SECRET;
    if (!secret) throw new Error("Missing CERT_SIGNING_SECRET");

    // Fetch student profile
    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("id, full_name, class_year, class_letter, school_id, hours_earned, hours_needed, role")
      .eq("id", userId)
      .maybeSingle();
    if (pErr || !profile) throw new Error("Profilis nerastas");
    // Debug bypass: only allow if caller is an admin (also bypasses student-role check)
    let debugMode = false;
    if (data.debug || data.fake) {
      const { data: isAdmin } = await supabase.rpc("has_role", {
        _user_id: userId,
        _role: "admin",
      });
      if (!isAdmin) throw new Error("Debug rėžimas leidžiamas tik super admin");
      debugMode = true;
    }

    // FAKE mode: fabricate a realistic student certificate for visual testing.
    if (data.fake) {
      const fakeName = "Jonas Petraitis";
      const fakeClass = "11B";
      const fakeSchool = "Šeduvos gimnazija";
      const orgs = [
        "Raudonojo Kryžiaus draugija",
        "Panevėžio senelių namai",
        "Miesto biblioteka",
        "Gyvūnų prieglauda „Letenėlė“",
        "Aplinkosaugos klubas",
        "Vaikų dienos centras",
      ];
      const reservations = Array.from({ length: 8 }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (i + 1) * 4);
        const h = 2 + (i % 3);
        return {
          date: d.toISOString().slice(0, 10),
          start_time: "15:00",
          end_time: `${15 + h}:00`,
          hours: h,
          notes: "",
          organization: orgs[i % orgs.length],
        };
      });
      const totalHours = reservations.reduce((s, r) => s + r.hours, 0);
      const code = `DBG-${makeCode().slice(3)}`;
      const payload = JSON.stringify({
        code, student_id: userId, student_name: fakeName, total_hours: totalHours, reservations,
      });
      const content_hash = await certificateHash(JSON.parse(payload), 1);
      const signature = await signCertificateHash(secret, code, content_hash);
      return {
        code, content_hash, signature,
        generated_at: new Date().toISOString(),
        student_name: fakeName,
        student_class: fakeClass,
        school_name: fakeSchool,
        total_hours: totalHours,
        hours_needed: 20,
        reservations,
        debug: true,
      };
    }

    if (!debugMode && profile.role !== "student") {
      throw new Error("Tik moksleiviai gali generuoti sertifikatą");
    }


    // Fetch school name
    let schoolName: string | null = null;
    if (profile.school_id) {
      const { data: sch } = await supabase.from("schools").select("name").eq("id", profile.school_id).maybeSingle();
      schoolName = sch?.name ?? null;
    }

    // Page through both owner and accepted-participant history; never silently cap exports.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const rows: Array<{ id: string; reservation_date: string; start_time: string | null; end_time: string | null; hours_to_earn: number; note: string | null; organization_id: string; source: string; hours_approved_by: string | null; hours_approved_at: string | null }> = [];
    for (let offset = 0; ; offset += 500) {
      const { data: batch, error } = await supabase.from("reservations").select("id,reservation_date,start_time,end_time,hours_to_earn,note,organization_id,source,hours_approved_by,hours_approved_at").eq("student_id", userId).eq("status", "completed").order("id").range(offset, offset + 499);
      if (error) throw error;
      rows.push(...(batch ?? []).map(r => ({ ...r, hours_to_earn: Number(r.hours_to_earn) })));
      if (!batch || batch.length < 500) break;
    }
    for (let offset = 0; ; offset += 500) {
      const { data: batch, error } = await supabase.from("reservation_participants").select("reservation_id,hours_awarded").eq("student_id", userId).eq("status", "accepted").order("id").range(offset, offset + 499);
      if (error) throw error;
      if (batch?.length) {
        const { data: visits, error: visitError } = await supabase.from("reservations").select("id,reservation_date,start_time,end_time,hours_to_earn,note,organization_id,source,hours_approved_by,hours_approved_at").in("id", batch.map(p => p.reservation_id)).eq("status", "completed");
        if (visitError) throw visitError;
        for (const visit of visits ?? []) if (!rows.some(r => r.id === visit.id)) rows.push({ ...visit, hours_to_earn: Number(batch.find(p => p.reservation_id === visit.id)?.hours_awarded ?? 0) });
      }
      if (!batch || batch.length < 500) break;
    }
    const ids = Array.from(new Set(rows.flatMap(r => [r.organization_id, r.hours_approved_by]).filter((id): id is string => !!id)));
    const names: Record<string, string> = {};
    for (let offset = 0; offset < ids.length; offset += 300) {
      // Only names attached to this authenticated student's own completed visits.
      const { data: people, error } = await supabaseAdmin.from("profiles").select("id,organization_name,full_name").in("id", ids.slice(offset, offset + 300));
      if (error) throw error;
      for (const person of people ?? []) names[person.id] = person.organization_name || person.full_name || "Organizacija";
    }
    const reservations = rows.sort((a, b) => b.reservation_date.localeCompare(a.reservation_date)).map(r => ({
      date: r.reservation_date, start_time: r.start_time ?? "", end_time: r.end_time ?? "",
      hours: Number(r.hours_to_earn), notes: r.note ?? "", organization: names[r.organization_id] || "Organizacija",
      approved_by: r.hours_approved_by ? names[r.hours_approved_by] ?? null : null,
      approved_at: r.hours_approved_at, source: r.source,
    }));

    const totalHours = reservations.reduce((s, r) => s + Number(r.hours ?? 0), 0);
    const hoursNeeded = Number(profile.hours_needed ?? 0);
    const goalReached = hoursNeeded > 0 && totalHours >= hoursNeeded;
    if (!goalReached && !debugMode) {
      throw new Error(
        `Sertifikatas dar negalimas — surinkta ${totalHours}/${hoursNeeded} val. Užbaik visas reikalingas valandas.`,
      );
    }
    const code = debugMode ? `DBG-${makeCode().slice(3)}` : makeCode();
    const generatedAt = new Date().toISOString();
    const studentClass = [profile.class_year, profile.class_letter].filter(Boolean).join("") || null;
    const snapshot: CertificateSnapshot = {
      code, student_id: userId, student_name: profile.full_name ?? "", student_class: studentClass,
      school_id: profile.school_id, school_name: schoolName, total_hours: totalHours,
      hours_needed: hoursNeeded, generated_at: generatedAt, reservations,
    };
    const content_hash = await certificateHash(snapshot, 2);
    const signature = "v2:" + await signCertificateHash(secret, code, content_hash);

    if (!debugMode) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error: insErr } = await supabaseAdmin.from("certificates").insert({
        code,
        student_id: userId,
        student_name: profile.full_name ?? "",
        student_class: studentClass,
        school_id: profile.school_id ?? null,
        school_name: schoolName,
        total_hours: totalHours,
        hours_needed: profile.hours_needed ?? 0,
        reservations_json: reservations,
        content_hash,
        signature,
        generated_at: generatedAt,
      });
      if (insErr) throw new Error(insErr.message);
    }

    return {
      code,
      content_hash,
      signature,
      generated_at: generatedAt,
      student_name: profile.full_name ?? "",
      student_class: studentClass,
      school_name: schoolName,
      total_hours: totalHours,
      hours_needed: profile.hours_needed ?? 0,
      reservations,
      debug: debugMode,
    };
  });

export const verifyCertificatePublic = createServerFn({ method: "POST" })
  .validator((input) => z.object({ code: z.string().min(6).max(64) }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: res, error } = await supabaseAdmin.rpc("verify_certificate", {
      _code: data.code.trim().toUpperCase(),
    });
    if (error) throw new Error(error.message);
    const result = (res ?? { valid: false, reason: "not_found" }) as any;
    // Re-verify the HMAC signature so a row edited directly in the database
    // (without the signing secret) is reported as forged.
    if (result.valid) {
      const { data: row, error: rowError } = await supabaseAdmin.from("certificates").select("*").eq("code", data.code.trim().toUpperCase()).maybeSingle();
      const secrets = [process.env.CERT_SIGNING_SECRET, process.env.CERT_SIGNING_SECRET_OLD].filter((secret): secret is string => !!secret);
      if (rowError || !row || !secrets.length) return { valid: false, reason: "unverifiable" };
      const snapshot = { ...row, reservations: row.reservations_json } as unknown as CertificateSnapshot;
      // The signed object is deliberately projected: database bookkeeping isn't part of the snapshot.
      const signedSnapshot: CertificateSnapshot = {
        code: snapshot.code, student_id: snapshot.student_id, student_name: snapshot.student_name,
        student_class: snapshot.student_class, school_id: snapshot.school_id, school_name: snapshot.school_name,
        total_hours: snapshot.total_hours, hours_needed: snapshot.hours_needed,
        generated_at: row.generated_at ? new Date(row.generated_at).toISOString() : undefined, reservations: snapshot.reservations,
      };
      if (!await checkCertificateIntegrity(signedSnapshot, row.content_hash, row.signature, secrets)) return { valid: false, reason: "tampered" };
      result.signature_verified = true;
    }
    return result as {
      signature_verified?: boolean;
      valid: boolean;
      reason?: string;
      code?: string;
      student_name?: string;
      student_class?: string;
      school_name?: string;
      total_hours_at_generation?: number;
      current_hours_in_system?: number;
      hours_needed?: number;
      reservations?: Array<{ date: string; hours: number; organization: string; start_time?: string; end_time?: string; notes?: string; approved_by?: string | null; approved_at?: string | null; source?: string }>;
      generated_at?: string;
      content_hash?: string;
      revoked_at?: string;
      revoked_reason?: string;
    };

  });
