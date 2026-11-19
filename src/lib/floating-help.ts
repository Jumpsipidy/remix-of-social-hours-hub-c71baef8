/** Shared events that let menus open the floating help widgets. */
export const OPEN_SUPPORT_EVENT = "sv:open-support";
export const OPEN_BUG_REPORT_EVENT = "sv:open-bug-report";

export function openSupportChat() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(OPEN_SUPPORT_EVENT));
}

export function openBugReport() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(OPEN_BUG_REPORT_EVENT));
}
