import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Pool of 10 candidate identities per role. Each seed run randomly picks a subset.
const STUDENT_POOL = [
  "Emilija Kazlauskaitė", "Mantas Petraitis", "Gabija Jankauskaitė", "Lukas Stankevičius",
  "Austėja Butkutė", "Dominykas Šimkus", "Ugnė Rimkutė", "Nojus Balčiūnas",
  "Kamilė Vaitkevičiūtė", "Rokas Žukauskas",
];
const ORG_POOL = [
  { org: "Žalioji Karta", contact: "Rūta Miškinienė" },
  { org: "Vaikų Šypsena", contact: "Tomas Vilkas" },
  { org: "Senjorų Namai „Ąžuolas“", contact: "Vytautas Jonaitis" },
  { org: "Gyvūnų Prieglauda „Letenėlė“", contact: "Ieva Baltrūnaitė" },
  { org: "Maisto Bankas Lietuva", contact: "Jonas Kairys" },
  { org: "Kultūros Centras „Šviesa“", contact: "Milda Grigaitė" },
  { org: "Sporto Klubas „Vilkas“", contact: "Paulius Meškauskas" },
  { org: "Biblioteka „Knygos ir Mes“", contact: "Vaida Pocienė" },
  { org: "Bendruomenė „Kaimynai“", contact: "Andrius Šimonis" },
  { org: "Ekologinė Iniciatyva „Švarus Pajūris“", contact: "Simona Urbonaitė" },
];
const SCHOOL_ADMIN_POOL = [
  "Dr. Rasa Petkevičienė", "Prof. Gintaras Adomaitis", "Živilė Kudarauskienė",
  "Algirdas Norvaišas", "Eglė Stankūnienė", "Vidmantas Bagdonas",
  "Laima Vasiliauskienė", "Saulius Kaminskas", "Danutė Vaitkuvienė", "Rimvydas Šarka",
];
const ADMIN_POOL = [
  "System Owner", "Platform Root", "Sistemos Savininkas",
];

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randSuffix() { return Math.random().toString(36).slice(2, 7); }
// Cryptographically-strong per-account password. Returned to the calling admin
// once; never stored in code, UI, or the profile row.
function randPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = new Uint8Array(20);
  (globalThis.crypto ?? require("node:crypto").webcrypto).getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("") + "!Aa1";
}
function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "").slice(0, 20);
}

export type DevAccount = {
  role: "student" | "organization" | "school_admin" | "admin";
  email: string;
  password: string;
  full_name: string;
  organization_name?: string | null;
  hours_needed?: number;
  hours_earned?: number;
};

function generateEcosystem(): DevAccount[] {
  const s = pick(STUDENT_POOL);
  const o = pick(ORG_POOL);
  const sa = pick(SCHOOL_ADMIN_POOL);
  const ad = pick(ADMIN_POOL);
  const suf = randSuffix();
  return [
    {
      role: "student",
      email: `${slugify(s)}.${suf}@dev.local`,
      password: randPassword(),
      full_name: s,
      hours_needed: 20 + Math.floor(Math.random() * 40),
      hours_earned: Math.floor(Math.random() * 8),
    },
    {
      role: "organization",
      email: `${slugify(o.org)}.${suf}@dev.local`,
      password: randPassword(),
      full_name: o.contact,
      organization_name: o.org,
    },
    {
      role: "school_admin",
      email: `${slugify(sa)}.${suf}@dev.local`,
      password: randPassword(),
      full_name: sa,
    },
    {
      role: "admin",
      email: `${slugify(ad)}.${suf}@dev.local`,
      password: randPassword(),
      full_name: ad,
    },
  ];
}

async function requireAdmin(_supabase: any, userId: string) {
  // Use service-role client so we don't depend on has_role EXECUTE grants.
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: me } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if ((me as { role?: string } | null)?.role === "admin") return;
  // No auto-bootstrap. Admins must be promoted explicitly by an existing
  // admin (or via a direct DB update during initial deployment) — otherwise
  // a temporary empty-admin state would grant anyone super-admin.
  throw new Error("Reikia sistemos administratoriaus teisių");
}


export const listDevProfiles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, role, hours_needed, hours_earned, organization_name")
      .like("email", "%@dev.local")
      .order("role");
    return { profiles: data ?? [] };
  });

export const seedDevEcosystem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const accs = generateEcosystem();
    const results: Array<{ email: string; role: string; id: string }> = [];

    for (const acc of accs) {
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
      const userId = data.user.id;

      await supabaseAdmin.from("profiles").upsert(
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
      results.push({ email: acc.email, role: acc.role, id: userId });
    }
    return { ok: true, accounts: results };
  });

export const resetDevData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Delete every non-admin account (students, organizations, school_admins,
    // whether real or @dev.local). Admins are preserved so the caller stays signed in.
    const { data: profs } = await supabaseAdmin
      .from("profiles")
      .select("id, role")
      .neq("role", "admin");
    const ids = (profs ?? []).map((p) => p.id);
    if (ids.length === 0) return { ok: true, cleared: 0 };

    await supabaseAdmin.from("messages").delete().in("sender_id", ids);
    await supabaseAdmin.from("chat_rooms").delete().in("student_id", ids);
    await supabaseAdmin.from("chat_rooms").delete().in("organization_id", ids);
    await supabaseAdmin.from("chat_rooms").delete().in("school_admin_id", ids);
    await supabaseAdmin.from("reservations").delete().in("student_id", ids);
    await supabaseAdmin.from("tasks").delete().in("organization_id", ids);

    for (const id of ids) {
      await supabaseAdmin.auth.admin.deleteUser(id);
    }
    return { ok: true, cleared: ids.length };
  });

// ---- Extra debug helpers -------------------------------------------------

export const createTestAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: {
    role: "student" | "organization" | "school_admin" | "admin";
    school_id?: string | null;
  }) => input)
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const suf = randSuffix();
    let acc: DevAccount;
    if (data.role === "student") {
      const n = pick(STUDENT_POOL);
      acc = { role: "student", email: `${slugify(n)}.${suf}@dev.local`, password: "DevPass123!", full_name: n, hours_needed: 20 };
    } else if (data.role === "organization") {
      const o = pick(ORG_POOL);
      acc = { role: "organization", email: `${slugify(o.org)}.${suf}@dev.local`, password: "DevPass123!", full_name: o.contact, organization_name: o.org };
    } else if (data.role === "school_admin") {
      const n = pick(SCHOOL_ADMIN_POOL);
      acc = { role: "school_admin", email: `${slugify(n)}.${suf}@dev.local`, password: "DevPass123!", full_name: n };
    } else {
      const n = pick(ADMIN_POOL);
      acc = { role: "admin", email: `${slugify(n)}.${suf}@dev.local`, password: "DevPass123!", full_name: n };
    }
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: acc.email, password: acc.password, email_confirm: true,
      user_metadata: {
        full_name: acc.full_name, role: acc.role,
        organization_name: acc.organization_name ?? null,
        hours_needed: acc.hours_needed ?? 0,
      },
    });
    if (error || !created.user) throw new Error(error?.message ?? "create failed");
    await supabaseAdmin.from("profiles").upsert({
      id: created.user.id, email: acc.email, full_name: acc.full_name, role: acc.role,
      organization_name: acc.organization_name ?? null,
      hours_needed: acc.hours_needed ?? 0, hours_earned: 0,
      school_id: data.school_id ?? null,
    }, { onConflict: "id" });
    return { ok: true, account: { ...acc, id: created.user.id } };
  });

export const listSchoolCodes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("schools").select("id, name, signup_code, is_active").order("name");
    return { schools: data ?? [] };
  });

export const testSignupCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { school_id: string; code: string }) => input)
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: ok, error } = await supabaseAdmin.rpc("verify_school_signup_code", {
      _school_id: data.school_id, _code: data.code,
    });
    if (error) throw new Error(error.message);
    return { valid: !!ok };
  });

export const verifyAccountDeleted = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { userId: string }) => input)
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: prof } = await supabaseAdmin.from("profiles").select("id").eq("id", data.userId).maybeSingle();
    const { data: auth } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    return {
      profile_exists: !!prof,
      auth_exists: !!auth?.user,
      fully_deleted: !prof && !auth?.user,
    };
  });
