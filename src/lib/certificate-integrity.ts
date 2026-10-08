export type CertificateVisit = {
  date: string; hours: number; organization: string; start_time?: string; end_time?: string; notes?: string;
  approved_by?: string | null; approved_at?: string | null; source?: string;
};
export type CertificateSnapshot = {
  code: string; student_id: string; student_name: string; student_class?: string | null;
  school_id?: string | null; school_name?: string | null; total_hours: number; hours_needed?: number;
  generated_at?: string; reservations: CertificateVisit[];
};

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
  return JSON.stringify(value) ?? "null";
}
export async function certificateHash(snapshot: CertificateSnapshot, version: 1 | 2): Promise<string> {
  const payload = version === 2 ? canonical(snapshot) : JSON.stringify({
    code: snapshot.code, student_id: snapshot.student_id, student_name: snapshot.student_name,
    total_hours: snapshot.total_hours, reservations: snapshot.reservations.map(r => ({
      date: r.date, start_time: r.start_time ?? "", end_time: r.end_time ?? "", hours: r.hours,
      notes: r.notes ?? "", organization: r.organization,
    })),
  });
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload)))).map(b => b.toString(16).padStart(2, "0")).join("");
}
export async function signCertificateHash(secret: string, code: string, hash: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return Array.from(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${code}|${hash}`)))).map(b => b.toString(16).padStart(2, "0")).join("");
}
export async function checkCertificateIntegrity(snapshot: CertificateSnapshot, storedHash: string, signature: string, secrets: string[]): Promise<boolean> {
  const v2 = signature.startsWith("v2:");
  if (await certificateHash(snapshot, v2 ? 2 : 1) !== storedHash) return false;
  const raw = v2 ? signature.slice(3) : signature;
  for (const secret of secrets) {
    const expected = await signCertificateHash(secret, snapshot.code, storedHash);
    let diff = expected.length ^ raw.length;
    for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ (raw.charCodeAt(i) || 0);
    if (diff === 0) return true;
  }
  return false;
}