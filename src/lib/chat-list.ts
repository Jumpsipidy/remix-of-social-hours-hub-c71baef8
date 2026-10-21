export type ChatFilter = "all" | "unread" | "students" | "school";
export const MESSAGE_RETENTION_DAYS = 12;
export function messageIsRetained(createdAt: string, now = Date.now()) {
  return new Date(createdAt).getTime() >= now - MESSAGE_RETENTION_DAYS * 86400000;
}
export function matchesChatFilter(chat: { student_id: string | null; unread: number; last_at: string }, filter: ChatFilter, from = "", until = "") {
  if (filter === "unread" && chat.unread === 0) return false;
  if (filter === "students" && !chat.student_id) return false;
  if (filter === "school" && chat.student_id) return false;
  const day = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Vilnius" }).format(new Date(chat.last_at));
  return (!from || day >= from) && (!until || day <= until);
}
export function chatDate(createdAt: string) {
  return new Date(createdAt).toLocaleDateString("lt-LT", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Europe/Vilnius" });
}