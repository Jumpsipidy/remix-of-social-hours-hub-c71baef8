import { useEffect } from "react";

/**
 * Watches the page: whenever skeleton placeholders are removed and real content
 * is added in the same spot, the new content gets a short fade-in so the swap
 * feels smooth instead of popping. One observer for the whole app.
 */
export function SkeletonReveal() {
  useEffect(() => {
    const hasSkel = (n: Node) =>
      n instanceof Element && (n.hasAttribute("data-skeleton") || !!n.querySelector("[data-skeleton]"));
    const obs = new MutationObserver((muts) => {
      for (const m of muts) {
        // AuthShell owns the handoff; a second animation would fade the whole frame.
        if (m.target instanceof Element && m.target.closest(".auth-shell")) continue;
        if (!m.removedNodes.length || !m.addedNodes.length) continue;
        let removedSkel = false;
        m.removedNodes.forEach((n) => { if (!removedSkel && hasSkel(n)) removedSkel = true; });
        if (!removedSkel) continue;
        m.addedNodes.forEach((n) => {
          if (n instanceof HTMLElement && !hasSkel(n) && !n.matches(".auth-shell") && !n.querySelector(".auth-shell")) {
            n.classList.remove("sv-reveal");
            void n.offsetWidth;
            n.classList.add("sv-reveal");
            n.addEventListener("animationend", () => n.classList.remove("sv-reveal"), { once: true });
          }
        });
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, []);
  return null;
}
