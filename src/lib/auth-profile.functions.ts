import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AppRole, Profile } from "@/hooks/use-auth";

const PROFILE_COLUMNS =
  "id, full_name, email, role, hours_needed, hours_earned, organization_name, school_id, class_year, assigned_classes";

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

export const ensureSignedInProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    if (userError || !userData.user) throw new Error(userError?.message ?? "Vartotojas nerastas");

    const user = userData.user;
    const email = user.email?.toLowerCase() ?? null;
    const fullName = displayNameFromMetadata(user.user_metadata ?? {}, email);

    const { data: exactProfile, error: exactError } = await supabaseAdmin
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .eq("id", context.userId)
      .maybeSingle();
    if (exactError) throw new Error(exactError.message);

    if (exactProfile) {
      const profile = exactProfile as Profile;
      if ((email && profile.email !== email) || !profile.full_name) {
        const { data: updated, error: updateError } = await supabaseAdmin
          .from("profiles")
          .update({ email, full_name: profile.full_name ?? fullName })
          .eq("id", context.userId)
          .select(PROFILE_COLUMNS)
          .single();
        if (updateError) throw new Error(updateError.message);
        return { profile: updated as Profile, created: false };
      }
      return { profile, created: false };
    }

    let emailMatchedProfile: Profile | null = null;
    if (email) {
      const { data: matches, error: matchError } = await supabaseAdmin
        .from("profiles")
        .select(PROFILE_COLUMNS)
        .ilike("email", email)
        .order("created_at", { ascending: true })
        .limit(1);
      if (matchError) throw new Error(matchError.message);
      emailMatchedProfile = ((matches?.[0] as Profile | undefined) ?? null);
    }

    if (emailMatchedProfile) {
      const { data: copied, error: copyError } = await supabaseAdmin
        .from("profiles")
        .upsert(copyProfileForCurrentUser(emailMatchedProfile, context.userId, email, fullName), { onConflict: "id" })
        .select(PROFILE_COLUMNS)
        .single();
      if (copyError) throw new Error(copyError.message);
      return { profile: copied as Profile, created: true };
    }

    const { count, error: countError } = await supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if (countError) throw new Error(countError.message);

    const role: AppRole = (count ?? 0) === 0 ? "admin" : "student";
    const { data: created, error: createError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: context.userId,
        email,
        full_name: fullName,
        role,
        organization_name: null,
        hours_needed: role === "student" ? 20 : 0,
        hours_earned: 0,
        assigned_classes: [],
      })
      .select(PROFILE_COLUMNS)
      .single();
    if (createError) throw new Error(createError.message);

    return { profile: created as Profile, created: true };
  });