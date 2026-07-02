import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

/**
 * Cinematic WebGL background.
 * - Floating instanced glass spheres + particle field
 * - Mouse parallax + scroll evolves camera & scene rotation
 * - Adaptive DPR / particle count for mobile
 * - Static CSS fallback when WebGL / prefers-reduced-motion
 * Fixed, behind all UI, pointer-events: none.
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

    // Detect WebGL
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: false,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      setFallback(true);
      return;
    }

    const isMobile = window.matchMedia("(max-width: 768px), (pointer: coarse)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.25 : 1.75);

    const width = () => mount.clientWidth;
    const height = () => mount.clientHeight;

    renderer.setPixelRatio(dpr);
    renderer.setSize(width(), height(), false);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, width() / height(), 0.1, 200);
    camera.position.set(0, 0, 14);

    // Read theme colors
    const isDark = document.documentElement.classList.contains("dark");
    const cPrimary = new THREE.Color(isDark ? "#22d3ee" : "#0891b2"); // cyan
    const cAccent = new THREE.Color(isDark ? "#fb7185" : "#f43f5e"); // coral
    const cMint = new THREE.Color(isDark ? "#a7f3d0" : "#5eead4");

    // --- Glass spheres (instanced icosahedrons for cheap "glass" look) ---
    const sphereCount = isMobile ? 6 : 14;
    const sphereGeom = new THREE.IcosahedronGeometry(1, isMobile ? 1 : 2);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: cPrimary,
      transparent: true,
      opacity: 0.10,
      wireframe: true,
    });
    const sphereMat2 = new THREE.MeshBasicMaterial({
      color: cAccent,
      transparent: true,
      opacity: 0.08,
      wireframe: true,
    });
    const sphereGroup = new THREE.Group();
    const spheres: { mesh: THREE.Mesh; base: THREE.Vector3; speed: number; scale: number }[] = [];
    for (let i = 0; i < sphereCount; i++) {
      const mesh = new THREE.Mesh(sphereGeom, i % 2 === 0 ? sphereMat : sphereMat2);
      const scale = 0.6 + Math.random() * 2.4;
      mesh.scale.setScalar(scale);
      const base = new THREE.Vector3(
        (Math.random() - 0.5) * 26,
        (Math.random() - 0.5) * 18,
        (Math.random() - 0.5) * 14 - 4
      );
      mesh.position.copy(base);
      sphereGroup.add(mesh);
      spheres.push({ mesh, base, speed: 0.2 + Math.random() * 0.6, scale });
    }
    scene.add(sphereGroup);

    // --- Particle starfield ---
    const particleCount = isMobile ? 800 : 2200;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 60;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 40 - 5;
      const mix = Math.random();
      const c = mix < 0.5 ? cPrimary : mix < 0.85 ? cMint : cAccent;
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    const pGeom = new THREE.BufferGeometry();
    pGeom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    pGeom.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const pMat = new THREE.PointsMaterial({
      size: isMobile ? 0.045 : 0.055,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(pGeom, pMat);
    scene.add(points);

    // --- Big centerpiece glass sphere ---
    const heroGeom = new THREE.IcosahedronGeometry(3.6, isMobile ? 2 : 3);
    const heroMat = new THREE.MeshBasicMaterial({
      color: cPrimary,
      transparent: true,
      opacity: 0.14,
      wireframe: true,
    });
    const heroSphere = new THREE.Mesh(heroGeom, heroMat);
    scene.add(heroSphere);

    // --- Interaction state ---
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

    // Pause when tab hidden
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

      // ease mouse
      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;

      // scroll factor (normalized-ish)
      const s = Math.min(scrollY / (window.innerHeight * 3), 1.5);

      // Camera reacts to cursor + scroll
      camera.position.x = mouse.x * 2.2;
      camera.position.y = -mouse.y * 1.6 - s * 2;
      camera.position.z = 14 - s * 3;
      camera.lookAt(0, 0, 0);

      // Rotate scene groups slowly
      sphereGroup.rotation.y = t * 0.05 + mouse.x * 0.3;
      sphereGroup.rotation.x = mouse.y * 0.2 + s * 0.4;

      points.rotation.y = t * 0.02;
      points.rotation.x = -s * 0.3;

      // Hero sphere breathes and reacts
      heroSphere.rotation.x = t * 0.12 + mouse.y * 0.4;
      heroSphere.rotation.y = t * 0.15 - mouse.x * 0.4;
      const pulse = 1 + Math.sin(t * 0.8) * 0.04;
      heroSphere.scale.setScalar(pulse * (1 + s * 0.4));

      // Individual sphere float
      for (const sph of spheres) {
        sph.mesh.position.y = sph.base.y + Math.sin(t * sph.speed + sph.base.x) * 0.6;
        sph.mesh.position.x = sph.base.x + Math.cos(t * sph.speed * 0.7) * 0.4;
        sph.mesh.rotation.x = t * sph.speed * 0.3;
        sph.mesh.rotation.y = t * sph.speed * 0.4;
      }

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
      sphereGeom.dispose();
      sphereMat.dispose();
      sphereMat2.dispose();
      heroGeom.dispose();
      heroMat.dispose();
      pGeom.dispose();
      pMat.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 20% 10%, oklch(0.35 0.10 200 / 0.35), transparent 55%), radial-gradient(ellipse at 80% 90%, oklch(0.40 0.14 20 / 0.28), transparent 55%), linear-gradient(180deg, oklch(0.13 0.02 220) 0%, oklch(0.09 0.02 235) 100%)",
      }}
    >
      {/* WebGL canvas mounts here */}
      {!fallback && <div ref={mountRef} className="absolute inset-0" />}

      {/* Static overlay grid + vignette (visible in all modes, adds depth) */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(oklch(0.72 0.15 200 / 0.06) 1px, transparent 1px), linear-gradient(90deg, oklch(0.72 0.15 200 / 0.06) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,oklch(0_0_0/0.55))]" />
      {/* Light mode veil */}
      <div className="absolute inset-0 bg-background/60 dark:bg-transparent" />
    </div>
  );
}
