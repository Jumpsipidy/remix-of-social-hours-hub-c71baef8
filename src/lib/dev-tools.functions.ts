import { createServerFn } from "@tanstack/react-start";

export type DevAccount = {
  role: "student" | "organization" | "school_admin" | "admin";
  email: string;
  password: string;
  full_name: string;
  organization_name?: string | null;
  hours_needed?: number;
  hours_earned?: number;
};

export const DEV_ACCOUNTS: DevAccount[] = [
  {
    role: "student",
    email: "alex.student@dev.local",
    password: "DevPass123!",
    full_name: "Alex (Student)",
    hours_needed: 40,
    hours_earned: 12,
  },
  {
    role: "organization",
    email: "greencity.org@dev.local",
    password: "DevPass123!",
    full_name: "Green City NGO",
    organization_name: "Green City NGO",
  },
  {
    role: "school_admin",
    email: "mr.smith.school@dev.local",
    password: "DevPass123!",
    full_name: "Mr. Smith (School Administrator)",
  },
  {
    role: "admin",
    email: "system.owner@dev.local",
    password: "DevPass123!",
    full_name: "System Owner",
  },
];

function assertDevAllowed() {
  // Always allowed — mock tester panel is intentionally available in all environments.
}

export const listDevProfiles = createServerFn({ method: "GET" }).handler(async () => {
  assertDevAllowed();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const emails = DEV_ACCOUNTS.map((a) => a.email);
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, email, role, hours_needed, hours_earned, organization_name")
    .in("email", emails);
  return { profiles: data ?? [] };
});

export const seedDevEcosystem = createServerFn({ method: "POST" }).handler(async () => {
  assertDevAllowed();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const results: Array<{ email: string; role: string; created: boolean; id: string }> = [];

  for (const acc of DEV_ACCOUNTS) {
    // Check if user exists by listing — admin API doesn't have getUserByEmail
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const existing = list?.users.find((u) => u.email?.toLowerCase() === acc.email.toLowerCase());

    let userId: string;
    let created = false;
    if (existing) {
      userId = existing.id;
    } else {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: acc.email,
        password: acc.password,
        email_confirm: true,
        user_metadata: {
          full_name: acc.full_name,
          role: acc.role,
          organization_name: acc.organization_name ?? null,
          hours_needed: acc.hours_needed ?? 0,
        },
      });
      if (error || !data.user) throw new Error(`Create ${acc.email}: ${error?.message}`);
      userId = data.user.id;
      created = true;
    }

    // Upsert profile with desired values (trigger may have created it, but ensure values match)
    const { error: upErr } = await supabaseAdmin.from("profiles").upsert(
      {
        id: userId,
        email: acc.email,
        full_name: acc.full_name,
        role: acc.role,
        organization_name: acc.organization_name ?? null,
        hours_needed: acc.hours_needed ?? 0,
        hours_earned: acc.hours_earned ?? 0,
      },
      { onConflict: "id" },
    );
    if (upErr) throw new Error(`Profile ${acc.email}: ${upErr.message}`);

    results.push({ email: acc.email, role: acc.role, created });
  }

  return { ok: true, accounts: results };
});

export const resetDevData = createServerFn({ method: "POST" }).handler(async () => {
  assertDevAllowed();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const devEmails = DEV_ACCOUNTS.map((a) => a.email);
  const { data: profs } = await supabaseAdmin
    .from("profiles")
    .select("id, email, role")
    .in("email", devEmails);

  const ids = (profs ?? []).map((p) => p.id);

  if (ids.length > 0) {
    // Delete reservations created by dev students -> cascades chat_rooms/messages via FK? chat_rooms cascade on student delete only.
    // Reservations have student_id; delete them. Then chat_rooms by student or org id, then messages.
    await supabaseAdmin.from("messages").delete().in("sender_id", ids);
    await supabaseAdmin.from("chat_rooms").delete().in("student_id", ids);
    await supabaseAdmin.from("chat_rooms").delete().in("organization_id", ids);
    await supabaseAdmin.from("chat_rooms").delete().in("school_admin_id", ids);
    await supabaseAdmin.from("reservations").delete().in("student_id", ids);

    // Reset student hours to original
    for (const acc of DEV_ACCOUNTS) {
      const p = profs?.find((x) => x.email === acc.email);
      if (!p) continue;
      await supabaseAdmin
        .from("profiles")
        .update({
          hours_needed: acc.hours_needed ?? 0,
          hours_earned: acc.hours_earned ?? 0,
          full_name: acc.full_name,
          organization_name: acc.organization_name ?? null,
        })
        .eq("id", p.id);
    }
  }

  return { ok: true, cleared: ids.length };
});
