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
    const { data: valid, error } = await supabaseAdmin.rpc("verify_school_signup_code", {
      _school_id: data.schoolId,
      _code: normalizedCode,
    });

    if (error) throw new Error(error.message);
    return { ok: !!valid };
  });