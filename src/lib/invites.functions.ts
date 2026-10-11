import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabase } from "@/integrations/supabase/client";

async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: me } = await supabaseAdmin.from("profiles").select("role").eq("id", userId).maybeSingle();
  if ((me as { role?: string } | null)?.role !== "admin") throw new Error("Reikia administratoriaus teisių");
  return supabaseAdmin as any;
}

async function sha256Hex(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export type InviteRow = {
  id: string; label: string; message: string | null; audience: string; school_id: string | null;
  max_uses: number | null; uses: number; opens: number; expires_at: string | null;
  revoked_at: string | null; created_at: string;
};

export const adminListInvites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = await assertAdmin(context.userId);
    const { data, error } = await sb
      .from("invite_links")
      .select("id,label,message,audience,school_id,max_uses,uses,opens,expires_at,revoked_at,created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return { invites: (data ?? []) as InviteRow[] };
  });

export const adminCreateInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { label: string; message?: string; audience: string; schoolId?: string | null; maxUses?: number | null; days?: number | null }) => d)
  .handler(async ({ data, context }) => {
    const sb = await assertAdmin(context.userId);
    const label = data.label.trim().slice(0, 80);
    if (!label) throw new Error("Įrašyk pavadinimą");
    if (!["student", "organization", "any"].includes(data.audience)) throw new Error("Netinkama auditorija");
    const maxUses = data.maxUses && data.maxUses > 0 ? Math.min(Math.floor(data.maxUses), 10000) : null;
    const days = data.days && data.days > 0 ? Math.min(data.days, 365) : null;
    const bytes = crypto.getRandomValues(new Uint8Array(24));
    const token = btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const { error } = await sb.from("invite_links").insert({
      token_hash: await sha256Hex(token),
      label,
      message: data.message?.trim().slice(0, 500) || null,
      audience: data.audience,
      school_id: data.schoolId || null,
      max_uses: maxUses,
      expires_at: days ? new Date(Date.now() + days * 86400000).toISOString() : null,
      created_by: context.userId,
    });
    if (error) throw new Error(error.message);
    // Token is shown once; only its hash is stored.
    return { token };
  });

export const adminRevokeInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const sb = await assertAdmin(context.userId);
    const { error } = await sb.from("invite_links").update({ revoked_at: new Date().toISOString() }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type InviteInfo = {
  status: "ok" | "invalid" | "revoked" | "expired" | "used_up";
  label?: string; message?: string | null; audience?: string;
  school_name?: string | null; school_code?: string | null; expires_at?: string | null;
};

export async function fetchInvite(token: string, accept = false): Promise<InviteInfo> {
  const { data, error } = await (supabase.rpc as any)("get_invite", { _token: token, _accept: accept });
  if (error) return { status: "invalid" };
  return data as InviteInfo;
}
