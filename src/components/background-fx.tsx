import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

/**
 * Calm editorial background.
 *
 * Restrained, professional aesthetic — deep navy with two large slow-moving
 * glass rings and a soft grain layer. No neon, no rainbow. Text stays
 * effortlessly legible.
 */
export function BackgroundFX() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setFallback(true); return; }

    const nav = navigator as Navigator & { deviceMemory?: number; connection?: any };
    const smallScreen = window.matchMedia("(max-width: 900px)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    
    // Stricter mobile/low-power check
    const isSaveData = nav.connection?.saveData === true;
    const weak =
      (nav.deviceMemory !== undefined && nav.deviceMemory <= 4) ||
      (navigator.hardwareConcurrency !== undefined && navigator.hardwareConcurrency <= 4);

    if (smallScreen || coarse || weak || isSaveData) {
      setFallback(true);
      return;
    }
    const mount = mountRef.current;
    if (!mount) return;


    let renderer: THREE.WebGLRenderer;
    try {
      // Pre-flight: some browsers/hardware refuse WebGL. Silently fall back instead of throwing.
      const probe = document.createElement("canvas").getContext("webgl2") ||
        document.createElement("canvas").getContext("webgl");
      if (!probe) { setFallback(true); return; }
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance", failIfMajorPerformanceCaveat: false });
    } catch { setFallback(true); return; }

    const isMobile = window.matchMedia("(max-width: 768px), (pointer: coarse)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 0.75 : 1.0); // Lower resolution for better performance
    const width = () => mount.clientWidth;
    const height = () => mount.clientHeight;

    renderer.setPixelRatio(dpr);
    renderer.setSize(width(), height(), false);
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.85;
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";

    // If the browser drops the WebGL context (tab throttled, GPU reset, blocked), quietly fall back.
    const onContextLost = (e: Event) => { e.preventDefault(); setFallback(true); };
    renderer.domElement.addEventListener("webglcontextlost", onContextLost as EventListener, false);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width() / height(), 0.1, 200);
    camera.position.set(0, 0, 18);

    // Professional palette: deep steel-blue + soft slate
    const cSteel = new THREE.Color("#7ea8d1");
    const cSlate = new THREE.Color("#a8b8cc");

    scene.add(new THREE.AmbientLight(0x0f1420, 0.7));
    const keyLight = new THREE.PointLight(0x88a8d0, 1.4, 60, 1.5);
    keyLight.position.set(-8, 4, 8);
    scene.add(keyLight);
    const fillLight = new THREE.PointLight(0xa8b8cc, 1.0, 60, 1.5);
    fillLight.position.set(8, -4, 6);
    scene.add(fillLight);

    // Two large glass rings — restrained, editorial
    const ringConfigs = [
      { r: 7.5, tube: 0.09, c: cSteel, rot: new THREE.Euler(-0.4, 0.3, 0.1), speed: 0.045 },
      { r: 10.0, tube: 0.06, c: cSlate, rot: new THREE.Euler(0.4, -0.3, -0.15), speed: 0.028 },
    ];
    const rings = ringConfigs.map((cfg) => {
      const g = new THREE.TorusGeometry(cfg.r, cfg.tube, 20, 220);
      const m = new THREE.MeshStandardMaterial({
        color: cfg.c, emissive: cfg.c, emissiveIntensity: 0.35,
        roughness: 0.5, metalness: 0.7, transparent: true, opacity: 0.4,
      });
      const mesh = new THREE.Mesh(g, m);
      mesh.rotation.copy(cfg.rot);
      mesh.position.z = -2;
      scene.add(mesh);
      return { mesh, base: cfg.rot.clone(), speed: cfg.speed, geom: g, mat: m };
    });

    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    let scrollY = 0;
    const onMove = (e: PointerEvent) => {
      mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    const onScroll = () => { scrollY = window.scrollY; };
    const onResize = () => {
      camera.aspect = width() / height();
      camera.updateProjectionMatrix();
      renderer.setSize(width(), height(), false);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    let visible = true;
    const onVis = () => { visible = document.visibilityState === "visible"; };
    document.addEventListener("visibilitychange", onVis);

    const startedAt = performance.now();
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!visible) return;
      const t = (performance.now() - startedAt) / 1000;
      mouse.x += (mouse.tx - mouse.x) * 0.04;
      mouse.y += (mouse.ty - mouse.y) * 0.04;
      const s = Math.min(scrollY / (window.innerHeight * 2.5), 1);

      const targetZ = 18 - s * (isMobile ? 2.5 : 4);
      camera.position.x = mouse.x * 1.2;
      camera.position.y = -mouse.y * 0.8;
      camera.position.z += (targetZ - camera.position.z) * 0.05;
      camera.lookAt(0, 0, 0);

      rings.forEach((r, i) => {
        const sign = i % 2 === 0 ? 1 : -1;
        r.mesh.rotation.x = r.base.x + t * r.speed * sign + s * 0.5 * sign + mouse.y * 0.10;
        r.mesh.rotation.y = r.base.y + t * r.speed * 0.7 + mouse.x * 0.15;
        r.mesh.rotation.z = r.base.z + Math.sin(t * 0.12 + i) * 0.05;
      });

      keyLight.position.x = Math.sin(t * 0.22) * 8 + mouse.x * 2;
      keyLight.position.y = Math.cos(t * 0.18) * 4 + 2 - s * 2;
      fillLight.position.x = Math.cos(t * 0.20) * 8 - mouse.x * 2;
      fillLight.position.y = Math.sin(t * 0.16) * 4 - 2 + s * 2;

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
      rings.forEach((r) => { r.geom.dispose(); r.mat.dispose(); });
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Deep editorial base */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,oklch(0.15_0.018_248)_0%,oklch(0.11_0.015_250)_100%)]" />

      {/* Two soft aurora washes — muted steel blue */}
      <div
        className="absolute -left-40 -top-40 h-[36rem] w-[36rem] rounded-full opacity-30 blur-3xl"
        style={{ background: "radial-gradient(circle, oklch(0.55 0.09 240 / 0.55), transparent 65%)" }}
      />
      <div
        className="absolute -right-32 top-40 h-[32rem] w-[32rem] rounded-full opacity-25 blur-3xl"
        style={{ background: "radial-gradient(circle, oklch(0.52 0.06 210 / 0.45), transparent 65%)" }}
      />

      {/* WebGL canvas */}
      {!fallback && (
        <div
          ref={mountRef}
          className="absolute inset-0 opacity-55 [mask-image:radial-gradient(ellipse_at_center,transparent_0%,black_50%,black_100%)] [-webkit-mask-image:radial-gradient(ellipse_at_center,transparent_0%,black_50%,black_100%)]"
        />
      )}

      {/* Central veil — keep text crisp */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_center,oklch(0.11_0.015_250/0.68)_0%,transparent_70%)]" />

      {/* Subtle grain */}
      <div
        className="absolute inset-0 opacity-[0.08]"
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
