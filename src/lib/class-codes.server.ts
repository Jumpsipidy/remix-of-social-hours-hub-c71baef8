const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateClassCode() {
  const pick = (n: number) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => CHARS[b % CHARS.length]).join("");
  return `MKC-${pick(5)}-${pick(1)}`;
}

/**
 * Keeps class codes in sync with a school admin's assignment: every assigned
 * class (year + letter) gets one active MKC code. Existing codes stay as-is.
 */
export async function ensureClassCodes(db: any, schoolId: string, classes: string[], letter: string | null) {
  const letters = letter === "A" || letter === "B" ? [letter] : ["A", "B"];
  const out: { class_year: string; class_letter: string; signup_code: string; hours_needed: number | null }[] = [];
  for (const year of classes) {
    for (const l of letters) {
      const { data: existing } = await db.from("school_class_codes").select("class_year, class_letter, signup_code, hours_needed")
        .eq("school_id", schoolId).eq("class_year", year).eq("class_letter", l).eq("is_active", true).maybeSingle();
      if (existing) { out.push(existing); continue; }
      for (let attempt = 0; attempt < 3; attempt++) {
        const signup_code = generateClassCode();
        const hours_needed = ["5", "6", "7"].includes(year) ? 20 : null;
        const { error } = await db.from("school_class_codes").insert({ school_id: schoolId, class_year: year, class_letter: l, signup_code, is_active: true, hours_needed });
        if (!error) { out.push({ class_year: year, class_letter: l, signup_code, hours_needed }); break; }
        if (error.code !== "23505") break;
      }
    }
  }
  return out;
}

/** Hours a student gets from their class code; 5–7 classes are always 20. */
export function hoursFromCode(classYear: string, codeHours: number | null | undefined) {
  if (["5", "6", "7"].includes(classYear)) return 20;
  return Math.min(500, Math.max(8, Math.round(codeHours ?? 20)));
}
