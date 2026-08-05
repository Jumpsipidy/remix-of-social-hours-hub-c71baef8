import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const onboardingPayload = z.object({
  organization_name: z.string().min(2).max(120),
  bio: z.string().max(800).optional(),
  public_email: z.string().email().max(120).optional(),
  phone: z.string().max(30).optional(),
  website_url: z.string().max(120).optional(),
  address: z.string().max(240).optional(),
  city: z.string().max(80).optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  logo_url: z.string().max(500).optional(),
  activity_tags: z.array(z.string().max(30)).max(12).optional(),
  first_task: z.object({
    title: z.string().min(3).max(160),
    description: z.string().max(800).optional(),
    task_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    start_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    end_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    available_hours: z.number().min(1).max(8),
    location: z.string().max(200).optional(),
    address: z.string().max(240).optional(),
    latitude: z.number().nullable().optional(),
    longitude: z.number().nullable().optional(),
    spots_total: z.number().min(1).max(1000),
    tags: z.array(z.string().max(30)).max(12).optional(),
  }).optional(),
});

/**
 * Saves the first organization profile and optionally creates the first task.
 * Called once from the onboarding wizard; avoids profile being "empty".
 */
export const completeOrgOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => onboardingPayload.parse(input))
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const supabase = context.supabase;

    const profilePatch = {
      organization_name: data.organization_name,
      bio: data.bio ?? null,
      public_email: data.public_email ?? null,
      phone: data.phone ?? null,
      website_url: data.website_url ?? null,
      address: data.address ?? null,
      city: data.city ?? null,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      logo_url: data.logo_url ?? null,
      activity_tags: data.activity_tags ?? [],
      onboarding_completed_at: new Date().toISOString(),
    };

    const { error: profileError } = await supabase.from("profiles").update(profilePatch).eq("id", userId);
    if (profileError) throw new Error(profileError.message);

    let taskId: string | null = null;
    if (data.first_task) {
      const task = {
        organization_id: userId,
        title: data.first_task.title,
        description: data.first_task.description ?? null,
        task_date: data.first_task.task_date,
        start_time: data.first_task.start_time ?? null,
        end_time: data.first_task.end_time ?? null,
        available_hours: data.first_task.available_hours,
        location: data.first_task.location ?? null,
        address: data.first_task.address ?? null,
        latitude: data.first_task.latitude ?? null,
        longitude: data.first_task.longitude ?? null,
        spots_total: data.first_task.spots_total,
        is_open: true,
        tags: data.first_task.tags ?? [],
      };
      // Same schema-resilience as create-task-panel: drop unknown columns if DB lags.
      let payload: Record<string, unknown> = { ...task };
      let error: { message: string; code?: string } | null = null;
      for (let attempt = 0; attempt < 4; attempt += 1) {
        const res = await supabase.from("tasks").insert(payload as any);
        error = res.error as { message: string; code?: string } | null;
        if (!error) {
          if (Array.isArray(res.data) && res.data[0]?.id) taskId = res.data[0].id;
          break;
        }
        const missing = /Could not find the '([^']+)' column/.exec(error.message)?.[1];
        if (!missing || !(missing in payload)) break;
        delete payload[missing];
      }
      if (error) throw new Error(error.message);
    }

    return { ok: true, taskId };
  });
