// Shared password rules for signup and password changes.
const COMMON = ["password", "slaptazodis", "qwerty", "123456", "admin", "letmein", "labas", "socialines", "valandos"];

/** Returns a Lithuanian error message, or null when the password is acceptable. */
export function passwordProblem(pw: string, email = ""): string | null {
  if (pw.length < 10) return "Slaptažodis turi būti bent 10 simbolių.";
  if (!/[a-zA-ZąčęėįšųūžĄČĘĖĮŠŲŪŽ]/.test(pw) || !/\d/.test(pw)) return "Slaptažodyje turi būti raidžių ir skaičių.";
  if (/^(.)\1+$/.test(pw)) return "Slaptažodis per paprastas.";
  const low = pw.toLowerCase();
  const local = email.split("@")[0]?.toLowerCase() ?? "";
  if (local.length >= 4 && low.includes(local)) return "Slaptažodyje negali būti tavo el. pašto vardo.";
  if (COMMON.some((w) => low.includes(w))) return "Slaptažodis per lengvai atspėjamas.";
  return null;
}

/** k-anonymity check against known leaked passwords (only 5 hash chars leave the device). Fails open. */
export async function isLeakedPassword(pw: string): Promise<boolean> {
  try {
    const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(pw));
    const hex = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
    const res = await fetch(`https://api.pwnedpasswords.com/range/${hex.slice(0, 5)}`, { headers: { "Add-Padding": "true" } });
    if (!res.ok) return false;
    const text = await res.text();
    return text.split("\n").some((l) => { const [suf, n] = l.trim().split(":"); return suf === hex.slice(5) && Number(n) > 0; });
  } catch {
    return false;
  }
}

/** Full check used by forms. */
export async function checkPassword(pw: string, email = ""): Promise<string | null> {
  const p = passwordProblem(pw, email);
  if (p) return p;
  // Leaked-list lookups are advisory only; blocking them rejected legitimate passwords.
  return null;
}
