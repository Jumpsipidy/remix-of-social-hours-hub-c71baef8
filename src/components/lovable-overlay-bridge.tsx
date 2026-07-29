// Lovable / Vite error-overlay bridge.
//
// Preview mode shows a red modal overlay when a runtime or build error is
// caught (Vite's <vite-error-overlay>, Lovable's iframe error toast, etc.).
// Users complained: „it doesn't reach our error center". This component:
//   1. Watches the DOM for known overlay elements.
//   2. When one appears, auto-forwards its content to logClientError()
//      (deduped, once per overlay session).
//   3. Injects a small floating pill: „🐞 Siųsti į klaidų centrą" which
//      lets the user re-send explicitly, or send an arbitrary console noise
//      that our filters would normally drop.
//
// Renders nothing when no overlay is present. Safe on every route.

import { useEffect, useState } from "react";
import { Bug, Send, Check } from "lucide-react";
import { logClientError } from "@/lib/error-log";
import { FriendlyErrorScreen } from "@/components/friendly-error";

// Hide the tooling overlay (Vite / Lovable / Next red modal) so the student
// only ever sees OUR friendly screen instead of a raw stack trace badge.
function suppressNativeOverlays() {
  if (typeof document === "undefined") return;
  for (const sel of OVERLAY_SELECTORS) {
    document.querySelectorAll<HTMLElement>(sel).forEach((el) => {
      el.style.setProperty("display", "none", "important");
      el.setAttribute("data-sv-suppressed", "1");
    });
  }
}

type OverlayInfo = { message: string; stack?: string; source: string };

// Broadened list: Vite, Lovable, Next, Remix, Webpack, generic red dialogs.
const OVERLAY_SELECTORS = [
  "vite-error-overlay",
  "vite-plugin-checker-error-overlay",
  "[data-lovable-error-overlay]",
  "[data-lovable-overlay]",
  "iframe[title*='error' i]",
  "#webpack-dev-server-client-overlay",
  "nextjs-portal",
  "[data-nextjs-dialog-overlay]",
  "[data-remix-error-boundary]",
];

// Fuzzy match for random red dialogs from any tooling.
const OVERLAY_TEXT_HINTS = [
  "runtime error",
  "unhandled runtime",
  "compilation error",
  "syntaxerror",
  "referenceerror",
  "typeerror:",
  "failed to compile",
];

function scanForOverlay(): OverlayInfo | null {
  if (typeof document === "undefined") return null;
  // 1) Known selectors (Vite, Lovable, Next, Remix…)
  for (const sel of OVERLAY_SELECTORS) {
    const el = document.querySelector(sel) as HTMLElement | null;
    if (!el) continue;
    const root = (el as any).shadowRoot ?? el;
    const text = (root.textContent ?? "").trim();
    if (!text) continue;
    const msgEl = root.querySelector?.(".message, .message-body, .plugin, [class*=message]");
    const stackEl = root.querySelector?.(".stack, pre, [class*=stack]");
    const message = (msgEl?.textContent ?? text).trim().slice(0, 500);
    const stack = (stackEl?.textContent ?? "").trim().slice(0, 4000);
    return { message: `[overlay] ${message}`, stack, source: sel };
  }
  // 2) Heuristic: any fixed dialog / modal whose text screams „error".
  const candidates = document.querySelectorAll<HTMLElement>(
    "[role=dialog], [role=alertdialog], [data-state=open], .error-overlay, .error-modal",
  );
  for (const el of Array.from(candidates)) {
    const text = (el.textContent ?? "").toLowerCase();
    if (!text) continue;
    if (OVERLAY_TEXT_HINTS.some((h) => text.includes(h))) {
      const message = (el.textContent ?? "").trim().slice(0, 500);
      return { message: `[overlay:heuristic] ${message}`, stack: "", source: "heuristic-dialog" };
    }
  }
  return null;
}

export function LovableOverlayBridge() {
  const [info, setInfo] = useState<OverlayInfo | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let lastSignature = "";
    let debounce: number | null = null;

    const check = () => {
      const found = scanForOverlay();
      if (!found) {
        setInfo(null);
        setSent(false);
        lastSignature = "";
        return;
      }
      const sig = found.message.slice(0, 200);
      if (sig === lastSignature) return;
      lastSignature = sig;
      setInfo(found);
      setSent(false);
      suppressNativeOverlays();
      // Auto-forward once per unique overlay session
      void logClientError(new Error(found.message), {
        source: "lovable.overlay.auto",
        extra: { stack: found.stack, selector: found.source, autoForwarded: true },
      });
    };

    const trigger = () => {
      if (debounce) window.clearTimeout(debounce);
      debounce = window.setTimeout(check, 350);
    };

    // MutationObserver on <body> — cheap; overlays are inserted as siblings
    const mo = new MutationObserver(trigger);
    mo.observe(document.body, { childList: true, subtree: true });
    // Fallback poll every 4s in case overlay uses shadow DOM mutations
    const poll = window.setInterval(trigger, 4000);

    // 3) Parent frame bridge — Lovable preview forwards runtime errors via postMessage.
    const onMsg = (e: MessageEvent) => {
      const d = e.data as any;
      if (!d || typeof d !== "object") return;
      const type = String(d.type ?? d.event ?? "").toLowerCase();
      const looksLikeErr =
        type.includes("error") ||
        type.includes("exception") ||
        type === "vite:error" ||
        type === "lovable:error";
      if (!looksLikeErr) return;
      const message = String(d.message ?? d.error?.message ?? d.reason ?? "").slice(0, 500);
      if (!message) return;
      void logClientError(new Error(`[parent-frame] ${message}`), {
        source: "overlay.postmessage",
        extra: { rawType: type, stack: d.stack ?? d.error?.stack ?? "" },
      });
    };
    window.addEventListener("message", onMsg);
    trigger();

    return () => {
      mo.disconnect();
      window.clearInterval(poll);
      window.removeEventListener("message", onMsg);
      if (debounce) window.clearTimeout(debounce);
    };
  }, []);

  const send = async () => {
    if (!info) return;
    setBusy(true);
    try {
      await logClientError(new Error(info.message), {
        source: "lovable.overlay.manual",
        extra: { stack: info.stack, selector: info.source, manuallySent: true },
      });
      setSent(true);
    } finally {
      setBusy(false);
    }
  };

  if (info) {
    // Full-screen calm error takeover — replaces the transient tooling badge.
    return (
      <div className="fixed inset-0 z-[300] overflow-auto">
        <FriendlyErrorScreen
          error={new Error(info.message)}
          source="lovable.overlay.screen"
          onRetry={() => window.location.reload()}
        />
        <div className="pointer-events-none fixed bottom-3 left-1/2 z-[301] -translate-x-1/2">
          <button
            onClick={send}
            disabled={busy}
            className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/15 bg-black/60 px-3.5 py-1.5 text-xs font-semibold text-white/80 backdrop-blur-xl transition hover:bg-black/80 disabled:opacity-60"
            title={info.message}
          >
            <span className="grid h-5 w-5 place-items-center rounded-full bg-white/10">
              {sent ? <Check className="h-3 w-3" /> : <Bug className="h-3 w-3" />}
            </span>
            <span className="max-w-[260px] truncate">
              {sent
                ? "Nusiųsta į klaidų centrą"
                : busy
                  ? "Siunčiu…"
                  : "Siųsti dar kartą į /admin/errors"}
            </span>
            {!sent && !busy && <Send className="h-3 w-3 opacity-70" />}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
