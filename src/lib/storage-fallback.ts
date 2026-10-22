/**
 * Some browsers (e.g. Firefox with a corrupted site-data file) throw
 * NS_ERROR_FAILURE on every localStorage call. Sign-in then fails after the
 * password was accepted. Probe once at startup and swap in a working store
 * (sessionStorage, else memory) so the session lasts at least for this tab.
 */
function works(store: Storage | undefined): boolean {
  if (!store) return false;
  try {
    const k = "__sv_storage_probe__";
    store.setItem(k, "1");
    const ok = store.getItem(k) === "1";
    store.removeItem(k);
    return ok;
  } catch {
    return false;
  }
}

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() { return map.size; },
    clear: () => map.clear(),
    getItem: (k) => (map.has(k) ? map.get(k)! : null),
    key: (i) => Array.from(map.keys())[i] ?? null,
    removeItem: (k) => { map.delete(k); },
    setItem: (k, v) => { map.set(k, String(v)); },
  };
}

export function installStorageFallback(): "native" | "session" | "memory" | "unavailable" {
  if (typeof window === "undefined") return "unavailable";
  let local: Storage | undefined;
  try { local = window.localStorage; } catch { local = undefined; }
  if (works(local)) return "native";
  let session: Storage | undefined;
  try { session = window.sessionStorage; } catch { session = undefined; }
  const replacement = works(session) ? session! : memoryStorage();
  try {
    Object.defineProperty(window, "localStorage", { configurable: true, get: () => replacement });
  } catch {
    return "unavailable";
  }
  console.warn("[storage] Naršyklės vietinė saugykla neveikia; sesija laikoma tik šiame skirtuke.");
  return replacement === session ? "session" : "memory";
}

installStorageFallback();
