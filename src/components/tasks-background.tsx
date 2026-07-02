import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

/**
 * Tasks-page-specific 3D background.
 *
 * Concept: floating rounded "task cards" drifting through 3D space —
 * a visual metaphor for the tasks/organizations grid. Different from the
 * global rings scene; feels connected to the content of this page.
 *
 * - ~24 subtly-glowing rounded plane meshes drift in slow orbits
 * - Very sparse dust for depth
 * - Cursor gently tilts the whole cloud; scroll shifts it in Z and Y
 * - Mobile: fewer cards, lower DPR
 * - Reduced-motion fallback: pure CSS gradient
 */
export function TasksBackgroundFX() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setFallback(true); return; }
    const mount = mountRef.current;
    if (!mount) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch { setFallback(true); return; }

    const isMobile = window.matchMedia("(max-width: 768px), (pointer: coarse)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.15 : 1.5);
    const w = () => mount.clientWidth;
    const h = () => mount.clientHeight;
    renderer.setPixelRatio(dpr);
    renderer.setSize(w(), h(), false);
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, w() / h(), 0.1, 200);
    camera.position.set(0, 0, 20);

    scene.add(new THREE.AmbientLight(0x1a1330, 0.7));
    const l1 = new THREE.PointLight(0xa880ff, 2.4, 80, 1.6); l1.position.set(-10, 6, 10); scene.add(l1);
    const l2 = new THREE.PointLight(0x5eead4, 2.0, 80, 1.6); l2.position.set(10, -6, 8); scene.add(l2);

    // "Task cards": rounded rectangles as plane meshes
    const cardCount = isMobile ? 14 : 26;
    const palette = [new THREE.Color("#a880ff"), new THREE.Color("#5eead4"), new THREE.Color("#86efac"), new THREE.Color("#f472b6")];

    function makeRoundedRectShape(width: number, height: number, radius: number) {
      const s = new THREE.Shape();
      const x = -width / 2, y = -height / 2;
      s.moveTo(x, y + radius);
      s.lineTo(x, y + height - radius);
      s.quadraticCurveTo(x, y + height, x + radius, y + height);
      s.lineTo(x + width - radius, y + height);
      s.quadraticCurveTo(x + width, y + height, x + width, y + height - radius);
      s.lineTo(x + width, y + radius);
      s.quadraticCurveTo(x + width, y, x + width - radius, y);
      s.lineTo(x + radius, y);
      s.quadraticCurveTo(x, y, x, y + radius);
      return s;
    }

    const cards: { mesh: THREE.Mesh; base: THREE.Vector3; speed: number; phase: number; geom: THREE.ShapeGeometry; mat: THREE.MeshStandardMaterial }[] = [];
    for (let i = 0; i < cardCount; i++) {
      const width = 2 + Math.random() * 1.2;
      const height = 1.4 + Math.random() * 0.8;
      const shape = makeRoundedRectShape(width, height, 0.35);
      const geom = new THREE.ShapeGeometry(shape, 8);
      const c = palette[i % palette.length];
      const mat = new THREE.MeshStandardMaterial({
        color: c,
        emissive: c,
        emissiveIntensity: 0.55,
        roughness: 0.35,
        metalness: 0.5,
        transparent: true,
        opacity: 0.32,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geom, mat);
      // Bias positions to edges — keep center readable
      const angle = Math.random() * Math.PI * 2;
      const radius = 7 + Math.random() * 10;
      const base = new THREE.Vector3(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius * 0.55,
        -4 - Math.random() * 12,
      );
      mesh.position.copy(base);
      mesh.rotation.set((Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.4);
      scene.add(mesh);
      cards.push({ mesh, base, speed: 0.15 + Math.random() * 0.3, phase: Math.random() * Math.PI * 2, geom, mat });
    }

    // sparse dust
    const dustCount = isMobile ? 90 : 200;
    const dPos = new Float32Array(dustCount * 3);
    const dCol = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 10 + Math.random() * 14;
      dPos[i * 3] = Math.cos(a) * r;
      dPos[i * 3 + 1] = Math.sin(a) * r * 0.6;
      dPos[i * 3 + 2] = -6 - Math.random() * 12;
      const c = palette[Math.floor(Math.random() * palette.length)];
      dCol.set([c.r, c.g, c.b], i * 3);
    }
    const dg = new THREE.BufferGeometry();
    dg.setAttribute("position", new THREE.BufferAttribute(dPos, 3));
    dg.setAttribute("color", new THREE.BufferAttribute(dCol, 3));
    const dm = new THREE.PointsMaterial({ size: 0.055, vertexColors: true, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending });
    const dust = new THREE.Points(dg, dm); scene.add(dust);

    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    let scrollY = 0;
    const onMove = (e: PointerEvent) => { mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2; mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2; };
    const onScroll = () => { scrollY = window.scrollY; };
    const onResize = () => { camera.aspect = w() / h(); camera.updateProjectionMatrix(); renderer.setSize(w(), h(), false); };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    let visible = true;
    const onVis = () => { visible = document.visibilityState === "visible"; };
    document.addEventListener("visibilitychange", onVis);

    const clock = new THREE.Clock();
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!visible) return;
      const t = clock.getElapsedTime();
      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;
      const s = Math.min(scrollY / (window.innerHeight * 2), 1);

      camera.position.x = mouse.x * 1.6;
      camera.position.y = -mouse.y * 1.2 - s * 2;
      camera.position.z = 20;
      camera.lookAt(0, 0, 0);

      cards.forEach((c, i) => {
        const sign = i % 2 === 0 ? 1 : -1;
        c.mesh.position.x = c.base.x + Math.sin(t * c.speed + c.phase) * 0.6 + mouse.x * 0.4 * sign;
        c.mesh.position.y = c.base.y + Math.cos(t * c.speed * 0.8 + c.phase) * 0.5 - mouse.y * 0.3;
        c.mesh.position.z = c.base.z + Math.sin(t * 0.3 + c.phase) * 0.4;
        c.mesh.rotation.x += 0.0018 * sign;
        c.mesh.rotation.y += 0.0022 * sign;
        c.mesh.rotation.z = Math.sin(t * 0.2 + i) * 0.15;
      });

      l1.position.x = Math.sin(t * 0.3) * 10 + mouse.x * 3;
      l1.position.y = Math.cos(t * 0.25) * 5 + 2;
      l2.position.x = Math.cos(t * 0.28) * 10 - mouse.x * 3;
      l2.position.y = Math.sin(t * 0.22) * 5 - 2;

      dust.rotation.y = t * 0.015;
      dust.rotation.x = -s * 0.15;
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
      cards.forEach((c) => { c.geom.dispose(); c.mat.dispose(); });
      dg.dispose(); dm.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-0 overflow-hidden">
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, oklch(0.14 0.03 285 / 0.0) 0%, oklch(0.12 0.03 290 / 0.35) 100%)" }} />
      <div className="absolute -left-24 -top-24 h-[28rem] w-[28rem] rounded-full opacity-50 blur-3xl" style={{ background: "radial-gradient(circle, oklch(0.55 0.20 300 / 0.45), transparent 65%)" }} />
      <div className="absolute -right-24 top-40 h-[26rem] w-[26rem] rounded-full opacity-45 blur-3xl" style={{ background: "radial-gradient(circle, oklch(0.55 0.18 195 / 0.45), transparent 65%)" }} />
      {!fallback && (
        <div
          ref={mountRef}
          className="absolute inset-0 opacity-70 [mask-image:radial-gradient(ellipse_at_center,transparent_0%,black_55%,black_100%)] [-webkit-mask-image:radial-gradient(ellipse_at_center,transparent_0%,black_55%,black_100%)]"
        />
      )}
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 70% 55% at center, oklch(0.10 0.03 290 / 0.35) 0%, transparent 70%)" }} />
    </div>
  );
}
