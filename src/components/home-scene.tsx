import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/** Deterministic jagged ridge path (no Math.random → stable SSR/hydration). */
function ridge(seed: number, base: number, amp: number, steps: number) {
  let x = seed * 9301 + 49297;
  const rnd = () => { x = (x * 9301 + 49297) % 233280; return x / 233280; };
  let d = `M0 400 L0 ${base}`;
  for (let i = 1; i <= steps; i++) {
    const px = (i / steps) * 1440;
    const peak = Math.sin(i * 0.9 + seed) * 0.5 + rnd();
    d += ` L${px.toFixed(0)} ${(base - peak * amp).toFixed(0)}`;
  }
  return d + " L1440 400Z";
}
const FAR = ridge(3, 230, 120, 34);
const MID = ridge(7, 270, 110, 26);
const NEAR = ridge(11, 320, 70, 40);

/**
 * Living, code-drawn landscape behind the whole homepage.
 * Scroll (--p, --v) moves eclipse/mountains/lake as one scene; pointer adds parallax.
 */
export function HomeScene() {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0, mx = 0, my = 0;
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
  }, [mounted]);

  if (!mounted) return null;
  return createPortal(<div ref={ref} className="home-scene" aria-hidden="true">
    <div className="scene-sky" />
    <div className="scene-stars" />
    <div className="scene-stars scene-stars-2" />
    <div className="scene-eclipse"><span className="scene-halo" /><span className="scene-corona" /><span className="scene-corona scene-corona-2" /><span className="scene-moon" /></div>
    <svg className="scene-layer scene-far" viewBox="0 0 1440 400" preserveAspectRatio="none"><defs><linearGradient id="sc-g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--sc-far)" /><stop offset="1" stopColor="var(--sc-mid)" /></linearGradient></defs><path d={FAR} fill="url(#sc-g1)" /></svg>
    <div className="scene-haze scene-haze-1" />
    <svg className="scene-layer scene-mid" viewBox="0 0 1440 400" preserveAspectRatio="none"><defs><linearGradient id="sc-g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--sc-mid)" /><stop offset="1" stopColor="var(--sc-near)" /></linearGradient></defs><path d={MID} fill="url(#sc-g2)" /></svg>
    <div className="scene-haze scene-haze-2" />
    <svg className="scene-layer scene-near" viewBox="0 0 1440 400" preserveAspectRatio="none"><path d={NEAR} fill="var(--sc-near)" /></svg>
    <div className="scene-lake"><span className="scene-glint" /><span className="scene-ripples" /></div>
    <div className="scene-fog" />
  </div>, document.body);
}
