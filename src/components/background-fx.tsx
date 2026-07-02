import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

/**
 * Calm, premium 3D background.
 *
 * Goals:
 *  - Still visibly 3D and alive, but never fights the foreground text.
 *  - Big, slow-moving glass rings + soft aurora — not a busy particle field.
 *  - Content stays perfectly legible thanks to a central vignette + veil.
 *
 * Scene:
 *  - 3 large concentric glass torus rings (subtle iridescent tint), slowly
 *    rotating and tilting toward the cursor.
 *  - A sparse layer of ambient glow dots for depth (no busy network).
 *  - Two roaming point-lights (violet + teal) give the glass a lit look.
 *
 * Interaction:
 *  - Cursor tilts the whole ring stack.
 *  - Scroll rotates rings on a different axis, swings the light angle, and
 *    gently zooms the camera so the 3D scene feels like it moves through space.
 *
 * Perf: adaptive DPR / counts on mobile, RAF paused when tab hidden,
 *       static gradient fallback for reduced-motion / no-WebGL.
 */
export function BackgroundFX() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setFallback(true);
      return;
    }
    const mount = mountRef.current;
    if (!mount) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      setFallback(true);
      return;
    }

    const isMobile = window.matchMedia("(max-width: 768px), (pointer: coarse)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.15 : 1.6);

    const width = () => mount.clientWidth;
    const height = () => mount.clientHeight;

    renderer.setPixelRatio(dpr);
    renderer.setSize(width(), height(), false);
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.cssText =
      "position:absolute;inset:0;width:100%;height:100%;display:block";

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width() / height(), 0.1, 200);
    camera.position.set(0, 0, 18);

    const cPurple = new THREE.Color("#a880ff");
    const cTeal = new THREE.Color("#5eead4");
    const cMint = new THREE.Color("#86efac");

    // Lighting
    scene.add(new THREE.AmbientLight(0x1a1330, 0.6));
    const purpleLight = new THREE.PointLight(0xa880ff, 2.2, 60, 1.5);
    purpleLight.position.set(-8, 4, 8);
    scene.add(purpleLight);
    const tealLight = new THREE.PointLight(0x5eead4, 1.8, 60, 1.5);
    tealLight.position.set(8, -4, 6);
    scene.add(tealLight);

    // --- Big glass rings (the hero geometry) ---
    const ringConfigs = [
      { r: 6.5, tube: 0.10, c: cPurple, rot: new THREE.Euler(-0.4, 0.3, 0.1), speed: 0.06 },
      { r: 8.5, tube: 0.08, c: cTeal, rot: new THREE.Euler(0.5, -0.3, -0.15), speed: 0.04 },
      { r: 10.5, tube: 0.06, c: cMint, rot: new THREE.Euler(0.2, 0.5, 0.25), speed: 0.03 },
    ];
    const rings = ringConfigs.map((cfg) => {
      const g = new THREE.TorusGeometry(cfg.r, cfg.tube, 20, 220);
      const m = new THREE.MeshStandardMaterial({
        color: cfg.c,
        emissive: cfg.c,
        emissiveIntensity: 0.8,
        roughness: 0.3,
        metalness: 0.6,
        transparent: true,
        opacity: 0.55,
      });
      const mesh = new THREE.Mesh(g, m);
      mesh.rotation.copy(cfg.rot);
      mesh.position.z = -2;
      scene.add(mesh);
      return { mesh, base: cfg.rot.clone(), speed: cfg.speed, geom: g, mat: m };
    });

    // --- Sparse ambient dots (much fewer than before, edges only) ---
    const dustCount = isMobile ? 180 : 380;
    const dustPos = new Float32Array(dustCount * 3);
    const dustCol = new Float32Array(dustCount * 3);
    const palette = [cPurple, cTeal, cMint];
    for (let i = 0; i < dustCount; i++) {
      // Bias to the outer ring — push them away from center so text stays clean
      const angle = Math.random() * Math.PI * 2;
      const radius = 8 + Math.random() * 18;
      dustPos[i * 3] = Math.cos(angle) * radius;
      dustPos[i * 3 + 1] = Math.sin(angle) * radius * 0.6;
      dustPos[i * 3 + 2] = -6 - Math.random() * 12;
      const c = palette[Math.floor(Math.random() * palette.length)];
      dustCol.set([c.r, c.g, c.b], i * 3);
    }
    const dustGeom = new THREE.BufferGeometry();
    dustGeom.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
    dustGeom.setAttribute("color", new THREE.BufferAttribute(dustCol, 3));
    const dustMat = new THREE.PointsMaterial({
      size: isMobile ? 0.05 : 0.06,
      vertexColors: true,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const dust = new THREE.Points(dustGeom, dustMat);
    scene.add(dust);

    // --- Interaction ---
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    let scrollY = 0;

    const onMove = (e: PointerEvent) => {
      mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    const onScroll = () => {
      scrollY = window.scrollY;
    };
    const onResize = () => {
      camera.aspect = width() / height();
      camera.updateProjectionMatrix();
      renderer.setSize(width(), height(), false);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    let visible = true;
    const onVis = () => {
      visible = document.visibilityState === "visible";
    };
    document.addEventListener("visibilitychange", onVis);

    const clock = new THREE.Clock();
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!visible) return;
      const t = clock.getElapsedTime();

      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;

      const s = Math.min(scrollY / (window.innerHeight * 2.5), 1);

      // Camera: cursor lean + scroll zoom-in. The zoom is smoothed so text never jumps.
      const targetZ = 18 - s * (isMobile ? 3.2 : 5.4);
      camera.position.x = mouse.x * 1.4;
      camera.position.y = -mouse.y * 1.0;
      camera.position.z += (targetZ - camera.position.z) * 0.055;
      camera.lookAt(0, 0, 0);

      // Rings: independent slow rotation + scroll-driven tilt + cursor lean
      rings.forEach((r, i) => {
        const sign = i % 2 === 0 ? 1 : -1;
        r.mesh.rotation.x = r.base.x + t * r.speed * sign + s * 0.6 * sign + mouse.y * 0.15;
        r.mesh.rotation.y = r.base.y + t * r.speed * 0.7 + mouse.x * 0.2;
        r.mesh.rotation.z = r.base.z + Math.sin(t * 0.15 + i) * 0.08 + s * 0.3 * sign;
        const targetScale = 1 + s * (0.1 + i * 0.035);
        r.mesh.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.04);
      });

      // Lights drift — this is what makes the glass rings feel alive
      purpleLight.position.x = Math.sin(t * 0.3) * 9 + mouse.x * 3;
      purpleLight.position.y = Math.cos(t * 0.25) * 5 + 2 - s * 3;
      tealLight.position.x = Math.cos(t * 0.28) * 9 - mouse.x * 3;
      tealLight.position.y = Math.sin(t * 0.22) * 5 - 2 + s * 3;

      // Dust rotates very slowly
      dust.rotation.y = t * 0.01;
      dust.rotation.x = -s * 0.1;

      renderer.render(scene, camera);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVis);
      renderer.dispose();
      dustGeom.dispose();
      dustMat.dispose();
      rings.forEach((r) => {
        r.geom.dispose();
        r.mat.dispose();
      });
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* Base gradient — light and dark now look intentionally different */}
      <div
        className="absolute inset-0 bg-[linear-gradient(180deg,oklch(0.985_0.018_255)_0%,oklch(0.955_0.035_285)_52%,oklch(0.94_0.035_195)_100%)] dark:bg-[linear-gradient(180deg,oklch(0.13_0.04_285)_0%,oklch(0.08_0.035_290)_100%)]"
      />

      {/* Aurora blobs — soft, blurred, pushed to corners */}
      <div
        className="absolute -left-32 -top-32 h-[36rem] w-[36rem] rounded-full opacity-35 blur-3xl dark:opacity-60"
        style={{ background: "radial-gradient(circle, oklch(0.55 0.20 300 / 0.55), transparent 65%)" }}
      />
      <div
        className="absolute -right-32 top-40 h-[32rem] w-[32rem] rounded-full opacity-30 blur-3xl dark:opacity-50"
        style={{ background: "radial-gradient(circle, oklch(0.55 0.18 195 / 0.50), transparent 65%)" }}
      />
      <div
        className="absolute -bottom-40 left-1/3 h-[36rem] w-[36rem] rounded-full opacity-25 blur-3xl dark:opacity-40"
        style={{ background: "radial-gradient(circle, oklch(0.55 0.16 155 / 0.40), transparent 65%)" }}
      />

      {/* WebGL canvas */}
      {!fallback && (
        <div
          ref={mountRef}
          className="absolute inset-0 opacity-35 dark:opacity-70 [mask-image:radial-gradient(ellipse_at_center,transparent_0%,black_45%,black_100%)] [-webkit-mask-image:radial-gradient(ellipse_at_center,transparent_0%,black_45%,black_100%)]"
        />
      )}

      {/* Central legibility veil — keeps text crisp */}
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_center,oklch(0.99_0.01_255/0.74)_0%,transparent_70%)] dark:bg-[radial-gradient(ellipse_70%_55%_at_center,oklch(0.09_0.03_290/0.68)_0%,transparent_70%)]"
      />

      {/* Fine noise / grain via subtle dots */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(oklch(0.85 0.15 300 / 0.10) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,oklch(0_0_0/0.5))]" />
    </div>
  );
}
