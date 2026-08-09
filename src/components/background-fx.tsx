/**
 * Static, GPU-cheap editorial background.
 *
 * Previously this mounted a three.js/WebGL scene with per-frame rendering,
 * pointer + scroll listeners and camera work. That was the single biggest
 * source of dropped frames (13 FPS reports). It is now pure CSS: painted once,
 * never animated, zero JS on the main thread while scrolling.
 */
export function BackgroundFX({ isDashboard }: { isDashboard?: boolean }) {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Deep editorial base */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,oklch(0.15_0.018_248)_0%,oklch(0.11_0.015_250)_100%)]" />

      {/* Two soft aurora washes — muted steel blue (static) */}
      <div
        className="absolute -left-40 -top-40 h-[36rem] w-[36rem] rounded-full opacity-30 blur-2xl"
        style={{ background: "radial-gradient(circle, oklch(0.55 0.09 240 / 0.55), transparent 65%)" }}
      />
      {!isDashboard && (
        <div
          className="absolute -right-32 top-40 h-[32rem] w-[32rem] rounded-full opacity-25 blur-2xl"
          style={{ background: "radial-gradient(circle, oklch(0.52 0.06 210 / 0.45), transparent 65%)" }}
        />
      )}

      {/* Central veil — keep text crisp */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_center,oklch(0.11_0.015_250/0.68)_0%,transparent_70%)]" />

      {/* Subtle grain */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: "radial-gradient(oklch(0.85 0.02 240 / 0.6) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />

      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,oklch(0_0_0/0.45))]" />
    </div>
  );
}
