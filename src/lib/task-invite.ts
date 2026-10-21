/** Chat message format for a teacher's activity invite card. */
export type TaskInvite = { id: string; title: string; date: string; time: string; place: string; hours: string };
const RE = /^\[\[sv-task:([^\]]+)\]\]\n?/;
const clean = (v: string) => String(v ?? "").replace(/[|\]\n]/g, " ").trim().slice(0, 120);

export function encodeTaskInvite(t: TaskInvite, message: string) {
  return `[[sv-task:${[t.id, t.title, t.date, t.time, t.place, t.hours].map(clean).join("|")}]]\n${message.trim()}`;
}

export function parseTaskInvite(text: string): { invite: TaskInvite; message: string } | null {
  const m = RE.exec(text);
  if (!m) return null;
  const [id, title = "", date = "", time = "", place = "", hours = ""] = m[1].split("|");
  if (!/^[\w-]{8,64}$/.test(id)) return null;
  return { invite: { id, title, date, time, place, hours }, message: text.slice(m[0].length) };
}

/** Short preview for inbox lists. */
export function messagePreview(text: string) {
  const p = parseTaskInvite(text);
  return p ? `📌 Rezervacijos pasiūlymas: ${p.invite.title}` : text;
}
