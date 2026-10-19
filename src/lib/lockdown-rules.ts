import { z } from "zod";
import { LOCKDOWN_CODES } from "@/lib/lockdown-codes";
export const lockdownSettingsSchema = z.object({
  lockdown_enabled: z.boolean().optional(),
  lockdown_message: z.string().max(400).nullable().optional(),
  lockdown_code: z.string().refine((code) => LOCKDOWN_CODES.some((item) => item.code === code), "Nežinomas incidento kodas").nullable().optional(),
}).strict();