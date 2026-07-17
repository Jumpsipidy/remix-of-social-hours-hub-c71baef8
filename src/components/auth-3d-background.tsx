import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Advanced interactive 3D backdrop for /login and /register.
 *
 * Layers:
 *  1. Deep starfield (parallax on cursor)
 *  2. Glass icosahedron cluster with physical material + subtle wireframe shell
 *  3. Twisted torus knot centerpiece, slowly morphing hue
 *  4. Instanced glowing particles orbiting on Lissajous paths
 *  5. Dynamic connecting lines between nearby orbs (only when close)
 *  6. Two moving colored point lights the whole scene reacts to
 *
 * Performance:
 *  - Lower particle/orb counts on mobile
 *  - DPR capped
 *  - Pauses when tab hidden
 *  - Full teardown on unmount (no leaks between /login and /register)
 *  - Respects prefers-reduced-motion (static frame only)
 */
export function Auth3DBackground() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || typeof window === "undefined") return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isMobile = window.matchMedia("(max-width: 768px), (pointer: coarse)").matches;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.25 : 1.75));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0a1a, 0.045);

    const camera = new THREE.PerspectiveCamera(60, mount.clientWidth / mount.clientHeight, 0.1, 120);
    camera.position.set(0, 0, 10);

    // Lights
    scene.add(new THREE.AmbientLight(0x8b7fff, 0.55));
    const p1 = new THREE.PointLight(0x8b5cf6, 3.0, 40, 1.6); p1.position.set(-6, 4, 5); scene.add(p1);
    const p2 = new THREE.PointLight(0x22d3ee, 2.4, 40, 1.6); p2.position.set(6, -4, 5); scene.add(p2);
    const p3 = new THREE.PointLight(0xf472b6, 1.6, 40, 1.8); p3.position.set(0, 0, -6); scene.add(p3);

    // --- Starfield
    const starCount = isMobile ? 400 : 900;
    const starPos = new Float32Array(starCount * 3);
    const starCol = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPos[i * 3] = (Math.random() - 0.5) * 80;
      starPos[i * 3 + 1] = (Math.random() - 0.5) * 60;
      starPos[i * 3 + 2] = -Math.random() * 60 - 5;
      const t = Math.random();
      starCol[i * 3] = 0.6 + t * 0.4;
      starCol[i * 3 + 1] = 0.5 + t * 0.5;
      starCol[i * 3 + 2] = 0.9 + Math.random() * 0.1;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute("color", new THREE.BufferAttribute(starCol, 3));
    const starMat = new THREE.PointsMaterial({ size: 0.06, vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // --- Central twisted torus knot
    const knotGeo = new THREE.TorusKnotGeometry(1.6, 0.42, 220, 32, 2, 3);
    const knotMat = new THREE.MeshPhysicalMaterial({
      color: 0x8b5cf6,
      metalness: 0.6,
      roughness: 0.15,
      transmission: 0.55,
      thickness: 0.9,
      clearcoat: 1,
      clearcoatRoughness: 0.15,
      iridescence: 0.9,
      iridescenceIOR: 1.4,
      emissive: 0x2a1a5c,
      emissiveIntensity: 0.4,
    });
    const knot = new THREE.Mesh(knotGeo, knotMat);
    knot.position.set(0, 0, -1.5);
    scene.add(knot);

    // Wireframe shell around it
    const shellGeo = new THREE.IcosahedronGeometry(3.6, 1);
    const shellMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee, wireframe: true, transparent: true, opacity: 0.12 });
    const shell = new THREE.Mesh(shellGeo, shellMat);
    scene.add(shell);

    // --- Glass orb cluster
    const orbCount = isMobile ? 10 : 18;
    const orbGeo = new THREE.IcosahedronGeometry(0.32, 1);
    const orbs: THREE.Mesh[] = [];
    for (let i = 0; i < orbCount; i++) {
      const mat = new THREE.MeshPhysicalMaterial({
        color: i % 3 === 0 ? 0x8b5cf6 : i % 3 === 1 ? 0x22d3ee : 0xf472b6,
        metalness: 0.25,
        roughness: 0.12,
        transmission: 0.8,
        thickness: 0.5,
        clearcoat: 1,
        transparent: true,
        opacity: 0.88,
        ior: 1.35,
      });
      const m = new THREE.Mesh(orbGeo, mat);
      m.position.set((Math.random() - 0.5) * 13, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 5 - 2);
      m.userData = {
        vx: (Math.random() - 0.5) * 0.006,
        vy: (Math.random() - 0.5) * 0.006,
        vz: (Math.random() - 0.5) * 0.003,
        rx: (Math.random() - 0.5) * 0.012,
        ry: (Math.random() - 0.5) * 0.012,
      };
      scene.add(m);
      orbs.push(m);
    }

    // --- Lissajous orbiting particles
    const dustCount = isMobile ? 60 : 140;
    const dustPos = new Float32Array(dustCount * 3);
    const dustCol = new Float32Array(dustCount * 3);
    const dustParams: { a: number; b: number; c: number; d: number; phase: number; r: number }[] = [];
    for (let i = 0; i < dustCount; i++) {
      dustParams.push({
        a: 2 + Math.random() * 3,
        b: 1 + Math.random() * 4,
        c: 1 + Math.random() * 3,
        d: Math.random() * Math.PI * 2,
        phase: Math.random() * Math.PI * 2,
        r: 3 + Math.random() * 5,
      });
      dustPos[i * 3] = 0; dustPos[i * 3 + 1] = 0; dustPos[i * 3 + 2] = 0;
      const c = new THREE.Color().setHSL(0.7 + Math.random() * 0.2, 0.9, 0.65);
      dustCol[i * 3] = c.r; dustCol[i * 3 + 1] = c.g; dustCol[i * 3 + 2] = c.b;
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
    dustGeo.setAttribute("color", new THREE.BufferAttribute(dustCol, 3));
    const dustMat = new THREE.PointsMaterial({ size: 0.09, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending });
    const dust = new THREE.Points(dustGeo, dustMat);
    scene.add(dust);

    // --- Connecting lines
    const lineMat = new THREE.LineBasicMaterial({ color: 0x8b5cf6, transparent: true, opacity: 0.22 });
    const linesGroup = new THREE.Group();
    scene.add(linesGroup);

    // Input
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    const onMove = (e: MouseEvent) => {
      mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.ty = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    const onTouch = (e: TouchEvent) => {
      if (!e.touches[0]) return;
      mouse.tx = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
      mouse.ty = -((e.touches[0].clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("touchmove", onTouch, { passive: true });

    const onResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", onResize);

    let visible = true;
    const onVis = () => { visible = document.visibilityState === "visible"; };
    document.addEventListener("visibilitychange", onVis);

    const clock = new THREE.Clock();
    let raf = 0;
    const dustPosAttr = dustGeo.getAttribute("position") as THREE.BufferAttribute;

    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!visible) return;
      const t = clock.getElapsedTime();

      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;

      // Knot morphs
      knot.rotation.x = t * 0.25;
      knot.rotation.y = t * 0.35;
      const hue = (t * 0.03) % 1;
      (knot.material as THREE.MeshPhysicalMaterial).color.setHSL(0.7 + hue * 0.15, 0.7, 0.55);
      (knot.material as THREE.MeshPhysicalMaterial).emissive.setHSL(0.7 + hue * 0.15, 0.9, 0.15);

      shell.rotation.x = -t * 0.08;
      shell.rotation.y = t * 0.12;

      // Orbs drift + soft cursor pull
      for (const o of orbs) {
        o.position.x += o.userData.vx + mouse.x * 0.0006;
        o.position.y += o.userData.vy + mouse.y * 0.0006;
        o.position.z += o.userData.vz;
        o.rotation.x += o.userData.rx;
        o.rotation.y += o.userData.ry;
        if (o.position.x > 8 || o.position.x < -8) o.userData.vx *= -1;
        if (o.position.y > 5.5 || o.position.y < -5.5) o.userData.vy *= -1;
        if (o.position.z > 2 || o.position.z < -6) o.userData.vz *= -1;
      }

      // Dust — Lissajous around origin
      for (let i = 0; i < dustCount; i++) {
        const q = dustParams[i];
        const s = t * 0.25 + q.phase;
        dustPosAttr.array[i * 3] = Math.sin(q.a * s + q.d) * q.r;
        dustPosAttr.array[i * 3 + 1] = Math.sin(q.b * s) * q.r * 0.6;
        dustPosAttr.array[i * 3 + 2] = Math.cos(q.c * s + q.d) * (q.r * 0.4) - 1.5;
      }
      dustPosAttr.needsUpdate = true;

      // Redraw lines (only nearby)
      linesGroup.clear();
      for (let i = 0; i < orbs.length; i++) {
        for (let j = i + 1; j < orbs.length; j++) {
          const d = orbs[i].position.distanceTo(orbs[j].position);
          if (d < 3.0) {
            const g = new THREE.BufferGeometry().setFromPoints([orbs[i].position, orbs[j].position]);
            const mat = lineMat.clone();
            mat.opacity = 0.35 * (1 - d / 3.0);
            linesGroup.add(new THREE.Line(g, mat));
          }
        }
      }

      // Lights orbit
      p1.position.x = Math.sin(t * 0.5) * 6;
      p1.position.y = Math.cos(t * 0.4) * 3;
      p2.position.x = Math.cos(t * 0.45) * 6;
      p2.position.y = Math.sin(t * 0.5) * 3;

      // Star parallax
      stars.rotation.y = t * 0.01 + mouse.x * 0.05;
      stars.rotation.x = -mouse.y * 0.05;

      // Camera follows cursor with damping
      camera.position.x += (mouse.x * 1.6 - camera.position.x) * 0.04;
      camera.position.y += (mouse.y * 1.1 - camera.position.y) * 0.04;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };

    if (prefersReduced) {
      // one static frame
      renderer.render(scene, camera);
    } else {
      raf = requestAnimationFrame(tick);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onTouch);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVis);
      renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
      orbs.forEach((o) => (o.material as THREE.Material).dispose());
      orbGeo.dispose();
      knotGeo.dispose(); (knot.material as THREE.Material).dispose();
      shellGeo.dispose(); shellMat.dispose();
      starGeo.dispose(); starMat.dispose();
      dustGeo.dispose(); dustMat.dispose();
    };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
      <div ref={mountRef} className="absolute inset-0" />
      <div className="absolute -left-32 -top-32 h-[32rem] w-[32rem] rounded-full opacity-40 blur-3xl" style={{ background: "radial-gradient(circle, oklch(0.6 0.22 300 / 0.55), transparent 65%)" }} />
      <div className="absolute -right-32 bottom-0 h-[32rem] w-[32rem] rounded-full opacity-40 blur-3xl" style={{ background: "radial-gradient(circle, oklch(0.65 0.18 195 / 0.55), transparent 65%)" }} />
      <div className="absolute inset-0 bg-gradient-to-b from-background/45 via-background/15 to-background/65" />
    </div>
  );
}
