import { useEffect, useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";

/**
 * Global animated 3D-feeling background.
 * - Aurora gradient blobs that drift & react to cursor + scroll
 * - Subtle animated grid with perspective
 * - Grain overlay for depth
 * Pointer-events: none, sits behind all content.
 */
export function BackgroundFX() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();

  // Parallax transforms tied to page scroll
  const y1 = useTransform(scrollYProgress, [0, 1], [0, -220]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, 320]);
  const y3 = useTransform(scrollYProgress, [0, 1], [0, -140]);
  const rot = useTransform(scrollYProgress, [0, 1], [0, 25]);
  const gridY = useTransform(scrollYProgress, [0, 1], [0, 180]);

  // Cursor spring — subtle 3D shift
  const cxRaw = useRef(0);
  const cyRaw = useRef(0);
  const cx = useSpring(0, { stiffness: 40, damping: 20, mass: 0.6 });
  const cy = useSpring(0, { stiffness: 40, damping: 20, mass: 0.6 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;
      cxRaw.current = nx;
      cyRaw.current = ny;
      cx.set(nx * 40);
      cy.set(ny * 40);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [cx, cy]);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{ perspective: 1200 }}
    >
      {/* Base wash */}
      <div className="absolute inset-0 bg-gradient-mesh opacity-90" />

      {/* Aurora blob 1 */}
      <motion.div
        style={{ y: y1, x: cx, rotate: rot }}
        className="absolute -left-32 top-[-10%] h-[520px] w-[520px] rounded-full blur-3xl"
      >
        <div className="h-full w-full rounded-full bg-[radial-gradient(circle_at_30%_30%,oklch(0.72_0.20_290/0.55),transparent_65%)] animate-float" />
      </motion.div>

      {/* Aurora blob 2 */}
      <motion.div
        style={{ y: y2, x: cy }}
        className="absolute right-[-8%] top-[20%] h-[620px] w-[620px] rounded-full blur-3xl"
      >
        <div className="h-full w-full rounded-full bg-[radial-gradient(circle_at_60%_40%,oklch(0.75_0.18_320/0.5),transparent_65%)] animate-float [animation-delay:2s]" />
      </motion.div>

      {/* Aurora blob 3 */}
      <motion.div
        style={{ y: y3, x: cx }}
        className="absolute left-[20%] top-[60%] h-[560px] w-[560px] rounded-full blur-3xl"
      >
        <div className="h-full w-full rounded-full bg-[radial-gradient(circle_at_50%_50%,oklch(0.78_0.16_220/0.45),transparent_65%)] animate-float [animation-delay:4s]" />
      </motion.div>

      {/* Perspective grid */}
      <motion.div
        style={{
          y: gridY,
          transform: "translateZ(0) rotateX(60deg)",
          transformOrigin: "50% 100%",
          backgroundImage:
            "linear-gradient(to right, oklch(0.58 0.20 268 / 0.14) 1px, transparent 1px), linear-gradient(to bottom, oklch(0.58 0.20 268 / 0.14) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          maskImage:
            "radial-gradient(ellipse at 50% 40%, black 20%, transparent 70%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at 50% 40%, black 20%, transparent 70%)",
        }}
        className="absolute inset-x-[-30%] bottom-[-30%] h-[80vh]"
      />

      {/* Vignette + grain */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,oklch(0_0_0/0.25))]" />
      <div
        className="absolute inset-0 opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.6'/></svg>\")",
        }}
      />
    </div>
  );
}
