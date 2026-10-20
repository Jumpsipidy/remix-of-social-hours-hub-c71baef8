import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type OrgAccessRequest = {
  id: string;
  organization_name: string;
  legal_code: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  website: string | null;
  description: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
};

async function requireAdminCaller(context: { supabase: any; userId: string }) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("Solo Super Admin.");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Lista las solicitudes de acceso de organizaciones para el panel de Super Admin. */
export const listOrgAccessRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabaseAdmin = await requireAdminCaller(context);
    const { data, error } = await supabaseAdmin
      .from("organization_access_requests")
      .select("id, organization_name, legal_code, contact_name, contact_email, contact_phone, website, description, status, admin_notes, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return { requests: (data ?? []) as OrgAccessRequest[] };
  });

/** Marca una solicitud como aprobada o rechazada. La cuenta se crea aparte. */
export const setOrgAccessRequestStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; status: string; note?: string }) => {
    if (!input?.id) throw new Error("Solicitud no indicada.");
    if (!["approved", "rejected", "pending"].includes(input.status)) throw new Error("Estado no válido.");
    return { id: String(input.id), status: input.status, note: String(input.note ?? "").slice(0, 500) };
  })
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await requireAdminCaller(context);
    const { error } = await supabaseAdmin
      .from("organization_access_requests")
      .update({ status: data.status, admin_notes: data.note || null, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("activity_log").insert({
      user_id: context.userId,
      action: `admin.org_request_${data.status}`,
      entity_type: "organization_access_request",
      entity_id: data.id,
      meta: {},
    });
    return { ok: true };
  });
