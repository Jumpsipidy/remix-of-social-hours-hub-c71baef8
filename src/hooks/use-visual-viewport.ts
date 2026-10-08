import { useEffect } from "react";

/** Keep portalled dialogs and chat composers inside the visible mobile keyboard area. */
export function useVisualViewport() {
  useEffect(() => {
    const viewport = window.visualViewport;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        document.documentElement.style.setProperty("--visual-viewport-height", `${viewport?.height ?? window.innerHeight}px`);
        document.documentElement.style.setProperty("--visual-viewport-top", `${viewport?.offsetTop ?? 0}px`);
      });
    };
    update();
    viewport?.addEventListener("resize", update);
    viewport?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      viewport?.removeEventListener("resize", update);
      viewport?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);
}