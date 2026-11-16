// Shared in-browser notification list. One listener (NotificationCenter) fills it,
// the bell (and anything else) reads it. Stored per signed-in user so accounts on
// the same device never see each other's items.

export type NotifKind = "message" | "dm" | "reservation" | "friend" | "group" | "hours" | "bug";

export type Notif = {
  id: string;
  key: string; // stable id of the underlying event — used to avoid duplicates
  kind: NotifKind;
  title: string;
  body: string;
  at: string;
  to: string; // page to open
  hash?: string;
  status?: string;
  important?: boolean;
  read: boolean;
};

type State = { uid: string | null; items: Notif[]; seen: string[] };

const MAX_ITEMS = 60;
const MAX_SEEN = 400;
const listeners = new Set<() => void>();
let state: State = { uid: null, items: [], seen: [] };

const itemsKey = (uid: string) => `sv_notifs_v3:${uid}`;
const sinceKey = (uid: string) => `sv_notifs_since_v3:${uid}`;

function save() {
  if (!state.uid) return;
  try {
    localStorage.setItem(itemsKey(state.uid), JSON.stringify({ items: state.items, seen: state.seen }));
  } catch { /* storage can be unavailable */ }
}

function emit() {
  listeners.forEach((l) => l());
}

function set(next: Partial<State>) {
  state = { ...state, ...next };
  save();
  emit();
}

export const notifications = {
  subscribe(l: () => void) {
    listeners.add(l);
    return () => { listeners.delete(l); };
  },
  getSnapshot: () => state,
  getServerSnapshot: () => state,

  /** Switch to a user's list (or clear when signed out). */
  useUser(uid: string | null) {
    if (state.uid === uid) return;
    if (!uid) { state = { uid: null, items: [], seen: [] }; emit(); return; }
    let items: Notif[] = [];
    let seen: string[] = [];
    try {
      const raw = localStorage.getItem(itemsKey(uid));
      if (raw) {
        const parsed = JSON.parse(raw) as { items?: Notif[]; seen?: string[] };
        items = Array.isArray(parsed.items) ? parsed.items.filter((n) => n && n.key && n.to) : [];
        seen = Array.isArray(parsed.seen) ? parsed.seen : [];
      }
    } catch { /* ignore broken storage */ }
    state = { uid, items, seen };
    emit();
  },

  has(key: string) {
    return state.seen.includes(key) || state.items.some((n) => n.key === key);
  },

  /** Adds an item; returns it, or null when this event was already shown. */
  add(n: Omit<Notif, "id" | "read" | "at"> & { at?: string }): Notif | null {
    if (!state.uid || notifications.has(n.key)) return null;
    const rec: Notif = { ...n, id: n.key, at: n.at ?? new Date().toISOString(), read: false };
    const items = [rec, ...state.items].sort((a, b) => b.at.localeCompare(a.at)).slice(0, MAX_ITEMS);
    set({ items, seen: [n.key, ...state.seen].slice(0, MAX_SEEN) });
    return rec;
  },

  markRead(id: string) {
    set({ items: state.items.map((n) => (n.id === id ? { ...n, read: true } : n)) });
  },
  markAllRead() {
    if (!state.items.some((n) => !n.read)) return;
    set({ items: state.items.map((n) => ({ ...n, read: true })) });
  },
  remove(id: string) {
    set({ items: state.items.filter((n) => n.id !== id) });
  },
  clear() {
    set({ items: [] });
  },

  /** When this browser last caught up for the user (ISO). Defaults to 3 days ago. */
  since(uid: string): string {
    try {
      const v = localStorage.getItem(sinceKey(uid));
      if (v && !Number.isNaN(Date.parse(v))) return v;
    } catch { /* ignore */ }
    return new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString();
  },
  markSynced(uid: string, at = new Date().toISOString()) {
    try { localStorage.setItem(sinceKey(uid), at); } catch { /* ignore */ }
  },
};

export const OPEN_NOTIFICATIONS_EVENT = "sv:open-notifications";

/** Where each kind of notification should take the user. */
export function notificationTarget(kind: NotifKind, role: string | null | undefined): string {
  if (kind === "bug") return "/admin/bugs";
  if (kind === "message") {
    if (role === "admin") return "/admin/messages";
    if (role === "school_admin") return "/mokytojas/pokalbiai";
    return "/chat";
  }
  if (kind === "dm") return "/chat";
  if (kind === "reservation") {
    if (role === "organization") return "/organization";
    if (role === "school_admin") return "/mokytojas/rezervacijos";
    if (role === "admin") return "/admin/reservations";
    return "/student";
  }
  return "/student"; // friend, group, hours
}
