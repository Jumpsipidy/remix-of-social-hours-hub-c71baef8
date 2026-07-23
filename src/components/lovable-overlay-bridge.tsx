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
import { motion, AnimatePresence } from "framer-motion";
import { Bug, Send, Check } from "lucide-react";
import { logClientError } from "@/lib/error-log";

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
  for (const sel of OVERLAY_SELECTORS) {
    const el = document.querySelector(sel) as HTMLElement | null;
    if (!el) continue;
    // Vite overlay uses shadow DOM
    const root = (el as any).shadowRoot ?? el;
    const text = (root.textContent ?? "").trim();
    if (!text) continue;
    const msgEl = root.querySelector?.(".message, .message-body, .plugin, [class*=message]");
    const stackEl = root.querySelector?.(".stack, pre, [class*=stack]");
    const message = (msgEl?.textContent ?? text).trim().slice(0, 500);
    const stack = (stackEl?.textContent ?? "").trim().slice(0, 4000);
    return { message: `[overlay] ${message}`, stack, source: sel };
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
    mo.observe(document.body, { childList: true, subtree: false });
    // Fallback poll every 4s in case overlay uses shadow DOM mutations
    const poll = window.setInterval(trigger, 4000);
    trigger();

    return () => {
      mo.disconnect();
      window.clearInterval(poll);
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

  return (
    <AnimatePresence>
      {info && (
        <motion.div
          initial={{ opacity: 0, y: -12, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
          className="fixed left-1/2 top-3 z-[200] -translate-x-1/2"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <button
            onClick={send}
            disabled={busy}
            className="group flex items-center gap-2 rounded-full border border-rose-500/60 bg-gradient-to-r from-rose-600/90 to-fuchsia-600/90 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xl backdrop-blur-xl transition hover:scale-[1.03] disabled:opacity-60"
            style={{ boxShadow: "0 12px 40px rgba(244,63,94,0.4)" }}
            title={info.message}
          >
            <span className="grid h-5 w-5 place-items-center rounded-full bg-white/20">
              {sent ? <Check className="h-3 w-3" /> : <Bug className="h-3 w-3" />}
            </span>
            <span className="max-w-[240px] truncate">
              {sent
                ? "Nusiųsta į klaidų centrą"
                : busy
                  ? "Siunčiu…"
                  : "Overlay klaida — siųsti į /admin/errors"}
            </span>
            {!sent && !busy && <Send className="h-3 w-3 opacity-70" />}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
