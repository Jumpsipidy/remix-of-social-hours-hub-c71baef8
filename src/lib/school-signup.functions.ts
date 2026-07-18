import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const verifySchoolSignupCode = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        schoolId: z.string().uuid(),
        code: z.string().min(2).max(64),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const normalizedCode = data.code.trim().toUpperCase();
    if (!normalizedCode) return { ok: false };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: school, error } = await supabaseAdmin
      .from("schools")
      .select("id")
      .eq("id", data.schoolId)
      .eq("is_active", true)
      .eq("signup_code", normalizedCode)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return { ok: !!school };
  });