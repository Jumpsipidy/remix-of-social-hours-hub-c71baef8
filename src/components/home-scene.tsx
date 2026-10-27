import { useEffect, useRef } from "react";

/**
 * Living, code-drawn landscape behind the whole homepage.
 * Scroll progress (--p) drives the eclipse, mountains and lake as one scene;
 * pointer position (--mx/--my) adds gentle parallax. Theme tokens switch
 * between a night (dark) and dawn (light) palette.
 */
export function HomeScene() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let mx = 0, my = 0;
    const update = () => {
      raf = 0;
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      el.style.setProperty("--p", String(Math.min(1, window.scrollY / max)));
      el.style.setProperty("--v", String(Math.min(1, window.scrollY / window.innerHeight)));
      if (!reduce) { el.style.setProperty("--mx", mx.toFixed(3)); el.style.setProperty("--my", my.toFixed(3)); }
    };
    const queue = () => { if (!raf) raf = requestAnimationFrame(update); };
    const onMove = (e: PointerEvent) => { mx = e.clientX / window.innerWidth - 0.5; my = e.clientY / window.innerHeight - 0.5; queue(); };
    update();
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => { cancelAnimationFrame(raf); window.removeEventListener("scroll", queue); window.removeEventListener("resize", queue); window.removeEventListener("pointermove", onMove); };
  }, []);

  return <div ref={ref} className="home-scene" aria-hidden="true">
    <div className="scene-sky" />
    <div className="scene-stars" />
    <div className="scene-stars scene-stars-2" />
    <div className="scene-eclipse"><span className="scene-corona" /><span className="scene-corona scene-corona-2" /><span className="scene-moon" /></div>
    <svg className="scene-layer scene-far" viewBox="0 0 1440 400" preserveAspectRatio="none"><path d="M0 260 L120 190 L210 230 L330 120 L420 200 L520 150 L640 230 L760 110 L880 210 L980 160 L1100 240 L1220 140 L1340 210 L1440 170 L1440 400 L0 400Z" /></svg>
    <svg className="scene-layer scene-mid" viewBox="0 0 1440 400" preserveAspectRatio="none"><path d="M0 300 L160 210 L280 270 L400 180 L540 280 L660 220 L780 300 L900 200 L1040 290 L1180 210 L1300 280 L1440 230 L1440 400 L0 400Z" /></svg>
    <svg className="scene-layer scene-near" viewBox="0 0 1440 400" preserveAspectRatio="none"><path d="M0 330 Q120 280 240 320 T480 315 T720 335 T960 310 T1200 330 T1440 305 L1440 400 L0 400Z" /></svg>
    <div className="scene-lake"><span className="scene-glint" /></div>
    <div className="scene-fog" />
  </div>;
}
