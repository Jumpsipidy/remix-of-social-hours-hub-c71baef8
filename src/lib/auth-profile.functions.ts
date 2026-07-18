import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AppRole, Profile } from "@/hooks/use-auth";

const PROFILE_COLUMNS =
  "id, full_name, email, role, hours_needed, hours_earned, organization_name, school_id, class_year, assigned_classes";
const PROFILE_COLUMNS_SAFE =
  "id, full_name, email, role, hours_needed, hours_earned, organization_name, school_id, class_year";

function isAssignedClassesSchemaError(error: unknown) {
  const message = error instanceof Error ? error.message : String((error as { message?: string } | null)?.message ?? error ?? "");
  return message.includes("assigned_classes") && (message.includes("does not exist") || message.includes("schema cache") || message.includes("column"));
}

function withAssignedClassFallback(profile: unknown) {
  if (!profile) return profile;
  return { ...(profile as Record<string, unknown>), assigned_classes: (profile as Profile).assigned_classes ?? [] } as Profile;
}

async function selectProfileById(supabaseAdmin: any, id: string) {
  const full = await supabaseAdmin.from("profiles").select(PROFILE_COLUMNS).eq("id", id).maybeSingle();
  if (!full.error) return { data: full.data ? withAssignedClassFallback(full.data) : null, error: null };
  if (!isAssignedClassesSchemaError(full.error)) return full;

  const safe = await supabaseAdmin.from("profiles").select(PROFILE_COLUMNS_SAFE).eq("id", id).maybeSingle();
  return { data: safe.data ? withAssignedClassFallback(safe.data) : null, error: safe.error };
}

async function selectFirstProfileByEmail(supabaseAdmin: any, email: string) {
  const full = await supabaseAdmin
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .ilike("email", email)
    .order("created_at", { ascending: true })
    .limit(1);
  if (!full.error) return { data: full.data?.[0] ? withAssignedClassFallback(full.data[0]) : null, error: null };
  if (!isAssignedClassesSchemaError(full.error)) return full;

  const safe = await supabaseAdmin
    .from("profiles")
    .select(PROFILE_COLUMNS_SAFE)
    .ilike("email", email)
    .order("created_at", { ascending: true })
    .limit(1);
  return { data: safe.data?.[0] ? withAssignedClassFallback(safe.data[0]) : null, error: safe.error };
}

function displayNameFromMetadata(meta: Record<string, unknown>, email: string | null) {
  const fullName = meta.full_name;
  const name = meta.name;
  if (typeof fullName === "string" && fullName.trim()) return fullName.trim();
  if (typeof name === "string" && name.trim()) return name.trim();
  return email?.split("@")[0] ?? "Naujas vartotojas";
}

function copyProfileForCurrentUser(profile: Profile, id: string, email: string | null, fullName: string) {
  return {
    id,
    email,
    full_name: profile.full_name ?? fullName,
    role: profile.role,
    organization_name: profile.organization_name,
    hours_needed: profile.hours_needed ?? 20,
    hours_earned: profile.hours_earned ?? 0,
    school_id: profile.school_id ?? null,
    class_year: profile.class_year ?? null,
    assigned_classes: profile.assigned_classes ?? [],
  };
}

async function upsertProfileSafely(supabaseAdmin: any, payload: Record<string, unknown>) {
  const first = await supabaseAdmin
    .from("profiles")
    .upsert(payload, { onConflict: "id" })
    .select(PROFILE_COLUMNS)
    .single();
  if (!first.error) return first;
  if (!isAssignedClassesSchemaError(first.error)) return first;

  const { assigned_classes: _assignedClasses, ...safePayload } = payload;
  const retry = await supabaseAdmin
    .from("profiles")
    .upsert(safePayload, { onConflict: "id" })
    .select(PROFILE_COLUMNS_SAFE)
    .single();
  return { data: retry.data ? withAssignedClassFallback(retry.data) : null, error: retry.error };
}

export const ensureSignedInProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    if (userError || !userData.user) throw new Error(userError?.message ?? "Vartotojas nerastas");

    const user = userData.user;
    const email = user.email?.toLowerCase() ?? null;
    const fullName = displayNameFromMetadata(user.user_metadata ?? {}, email);

    const { data: exactProfile, error: exactError } = await selectProfileById(supabaseAdmin, context.userId);
    if (exactError) throw new Error(exactError.message);

    if (exactProfile) {
      const profile = exactProfile as Profile;
      if ((email && profile.email !== email) || !profile.full_name) {
        const updatedResult = await supabaseAdmin
          .from("profiles")
          .update({ email, full_name: profile.full_name ?? fullName })
          .eq("id", context.userId)
          .select(PROFILE_COLUMNS)
          .single();
        const { data: updated, error: updateError } = updatedResult.error && isAssignedClassesSchemaError(updatedResult.error)
          ? await supabaseAdmin
              .from("profiles")
              .update({ email, full_name: profile.full_name ?? fullName })
              .eq("id", context.userId)
              .select(PROFILE_COLUMNS_SAFE)
              .single()
          : updatedResult;
        if (updateError) throw new Error(updateError.message);
        return { profile: withAssignedClassFallback(updated) as Profile, created: false };
      }
      return { profile, created: false };
    }

    let emailMatchedProfile: Profile | null = null;
    if (email) {
      const { data: match, error: matchError } = await selectFirstProfileByEmail(supabaseAdmin, email);
      if (matchError) throw new Error(matchError.message);
      emailMatchedProfile = (match as Profile | null) ?? null;
    }

    if (emailMatchedProfile) {
      const { data: copied, error: copyError } = await upsertProfileSafely(
        supabaseAdmin,
        copyProfileForCurrentUser(emailMatchedProfile, context.userId, email, fullName),
      );
      if (copyError) throw new Error(copyError.message);
      return { profile: copied as Profile, created: true };
    }

    // No admin auto-bootstrap: every fresh sign-in becomes a student. The
    // first super admin must be promoted manually in the DB (or via an
    // existing admin using adminCreateAccount). This closes the privilege
    // escalation path where an empty admin table would promote whoever
    // signed in next.
    const role: AppRole = "student";
    const { data: created, error: createError } = await upsertProfileSafely(supabaseAdmin, {
        id: context.userId,
        email,
        full_name: fullName,
        role,
        organization_name: null,
        hours_needed: 20,
        hours_earned: 0,
        assigned_classes: [],
      });

    if (createError) throw new Error(createError.message);

    return { profile: created as Profile, created: true };
  });