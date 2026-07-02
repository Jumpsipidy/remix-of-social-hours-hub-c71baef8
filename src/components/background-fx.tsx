import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

/**
 * Friendly community-themed WebGL background.
 *
 * Scene:
 *  - A soft cloud of "community nodes" (rounded orbs) linked by thin lines
 *    that gently pulse — a stylized social network.
 *  - A central 3D "progress ring" (torus) that fills / rotates as the user
 *    scrolls, simulating volunteer hours being completed.
 *  - Floating pill/heart-like rounded shapes drift slowly around the scene.
 *  - Soft warm lighting (peach + violet) with MeshStandardMaterial for a
 *    tactile, high-end look — no wireframes, no matrix vibes.
 *
 * Interaction:
 *  - Nodes gently spring toward the cursor with playful physics.
 *  - Scroll drives progress ring fill, camera dolly, and node assembly
 *    toward the ring (community coming together).
 *
 * Perf:
 *  - Adaptive counts + DPR for mobile.
 *  - Static gradient fallback for reduced-motion or WebGL failure.
 *  - RAF paused when tab hidden.
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
    const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.25 : 1.75);

    const width = () => mount.clientWidth;
    const height = () => mount.clientHeight;

    renderer.setPixelRatio(dpr);
    renderer.setSize(width(), height(), false);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.cssText =
      "position:absolute;inset:0;width:100%;height:100%;display:block";

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width() / height(), 0.1, 200);
    camera.position.set(0, 0, 16);

    const isDark = document.documentElement.classList.contains("dark");

    // Warm friendly palette
    const cCoral = new THREE.Color(isDark ? "#ff9a7a" : "#ff8a65");
    const cPeach = new THREE.Color(isDark ? "#ffc48a" : "#ffb27a");
    const cViolet = new THREE.Color(isDark ? "#c8a8ff" : "#a888ff");
    const cMint = new THREE.Color(isDark ? "#8fe3c4" : "#7ed7b1");
    const cSky = new THREE.Color(isDark ? "#8fc7ff" : "#7fb4ff");
    const palette = [cCoral, cPeach, cViolet, cMint, cSky];

    // --- Lighting: soft, warm ---
    scene.add(new THREE.AmbientLight(0xffffff, isDark ? 0.55 : 0.85));
    const key = new THREE.DirectionalLight(0xffd8b8, isDark ? 0.9 : 1.1);
    key.position.set(6, 8, 10);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xc9b0ff, 0.6);
    rim.position.set(-8, -4, 4);
    scene.add(rim);

    // --- Community nodes (rounded orbs linked by lines) ---
    const nodeCount = isMobile ? 18 : 34;
    const nodeGeom = new THREE.SphereGeometry(1, 24, 24);
    const nodes: {
      mesh: THREE.Mesh;
      home: THREE.Vector3;
      target: THREE.Vector3;
      current: THREE.Vector3;
      vel: THREE.Vector3;
      scale: number;
      speed: number;
      phase: number;
      color: THREE.Color;
    }[] = [];

    const nodeGroup = new THREE.Group();
    scene.add(nodeGroup);

    for (let i = 0; i < nodeCount; i++) {
      const color = palette[i % palette.length];
      const mat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.35,
        metalness: 0.15,
        emissive: color,
        emissiveIntensity: isDark ? 0.35 : 0.12,
      });
      const mesh = new THREE.Mesh(nodeGeom, mat);
      const scale = 0.22 + Math.random() * 0.45;
      mesh.scale.setScalar(scale);
      // Distribute on a loose sphere so they read as a "network cloud"
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 6 + Math.random() * 4;
      const home = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * r,
        Math.sin(phi) * Math.sin(theta) * r * 0.7,
        Math.cos(phi) * r - 2
      );
      mesh.position.copy(home);
      nodeGroup.add(mesh);
      nodes.push({
        mesh,
        home,
        target: home.clone(),
        current: home.clone(),
        vel: new THREE.Vector3(),
        scale,
        speed: 0.4 + Math.random() * 0.8,
        phase: Math.random() * Math.PI * 2,
        color,
      });
    }

    // --- Connection lines between nearby nodes ---
    const maxLinks = isMobile ? 40 : 90;
    const linkPairs: [number, number][] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if (nodes[i].home.distanceTo(nodes[j].home) < 4.2) {
          linkPairs.push([i, j]);
          if (linkPairs.length >= maxLinks) break;
        }
      }
      if (linkPairs.length >= maxLinks) break;
    }
    const linkPositions = new Float32Array(linkPairs.length * 2 * 3);
    const linkColors = new Float32Array(linkPairs.length * 2 * 3);
    for (let k = 0; k < linkPairs.length; k++) {
      const [a, b] = linkPairs[k];
      const ca = nodes[a].color;
      const cb = nodes[b].color;
      linkColors.set([ca.r, ca.g, ca.b], k * 6);
      linkColors.set([cb.r, cb.g, cb.b], k * 6 + 3);
    }
    const linkGeom = new THREE.BufferGeometry();
    linkGeom.setAttribute("position", new THREE.BufferAttribute(linkPositions, 3));
    linkGeom.setAttribute("color", new THREE.BufferAttribute(linkColors, 3));
    const linkMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: isDark ? 0.35 : 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const links = new THREE.LineSegments(linkGeom, linkMat);
    nodeGroup.add(links);

    // --- Central 3D progress ring (torus) ---
    const ringGroup = new THREE.Group();
    scene.add(ringGroup);

    // Track (dim full ring)
    const trackGeom = new THREE.TorusGeometry(3, 0.18, 16, 128);
    const trackMat = new THREE.MeshStandardMaterial({
      color: isDark ? 0x3a2f4a : 0xf1e3d3,
      roughness: 0.7,
      metalness: 0.05,
      transparent: true,
      opacity: 0.55,
    });
    const track = new THREE.Mesh(trackGeom, trackMat);
    ringGroup.add(track);

    // Progress arc — a tube along a partial circle whose length grows with scroll
    let progressMesh: THREE.Mesh | null = null;
    const buildProgress = (fill: number) => {
      if (progressMesh) {
        progressMesh.geometry.dispose();
        ringGroup.remove(progressMesh);
      }
      const segs = Math.max(2, Math.floor(128 * fill));
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= segs; i++) {
        const a = (i / 128) * Math.PI * 2 - Math.PI / 2;
        pts.push(new THREE.Vector3(Math.cos(a) * 3, Math.sin(a) * 3, 0));
      }
      const curve = new THREE.CatmullRomCurve3(pts);
      const geom = new THREE.TubeGeometry(curve, Math.max(8, segs * 2), 0.24, 16, false);
      const mat = new THREE.MeshStandardMaterial({
        color: cCoral,
        emissive: cPeach,
        emissiveIntensity: isDark ? 0.55 : 0.25,
        roughness: 0.3,
        metalness: 0.25,
      });
      progressMesh = new THREE.Mesh(geom, mat);
      ringGroup.add(progressMesh);
    };
    buildProgress(0.02);

    // Little "star" marker that rides the progress tip
    const starGeom = new THREE.IcosahedronGeometry(0.32, 0);
    const starMat = new THREE.MeshStandardMaterial({
      color: cPeach,
      emissive: cCoral,
      emissiveIntensity: 0.7,
      roughness: 0.25,
      metalness: 0.4,
    });
    const star = new THREE.Mesh(starGeom, starMat);
    ringGroup.add(star);

    ringGroup.position.set(0, 0, -1);
    ringGroup.rotation.x = -0.25;

    // --- Floating pill shapes (torusKnots for playful geometry) ---
    const pillCount = isMobile ? 4 : 8;
    const pills: { mesh: THREE.Mesh; base: THREE.Vector3; spin: THREE.Vector3 }[] = [];
    for (let i = 0; i < pillCount; i++) {
      const g = new THREE.TorusKnotGeometry(0.5 + Math.random() * 0.3, 0.16, 64, 8, 2, 3);
      const c = palette[i % palette.length];
      const m = new THREE.MeshStandardMaterial({
        color: c,
        emissive: c,
        emissiveIntensity: isDark ? 0.25 : 0.08,
        roughness: 0.4,
        metalness: 0.2,
      });
      const mesh = new THREE.Mesh(g, m);
      const base = new THREE.Vector3(
        (Math.random() - 0.5) * 22,
        (Math.random() - 0.5) * 14,
        -6 - Math.random() * 8
      );
      mesh.position.copy(base);
      scene.add(mesh);
      pills.push({
        mesh,
        base,
        spin: new THREE.Vector3(
          0.2 + Math.random() * 0.4,
          0.2 + Math.random() * 0.4,
          0.1 + Math.random() * 0.2
        ),
      });
    }

    // --- Interaction ---
    const mouse = { x: 0, y: 0, tx: 0, ty: 0, worldX: 0, worldY: 0 };
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
    const linkPos = linkGeom.getAttribute("position") as THREE.BufferAttribute;
    let currentFill = 0.02;
    let lastRebuild = 0;

    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!visible) return;
      const t = clock.getElapsedTime();
      const dt = Math.min(clock.getDelta(), 0.05);

      mouse.x += (mouse.tx - mouse.x) * 0.06;
      mouse.y += (mouse.ty - mouse.y) * 0.06;
      // Approximate mouse position in world space at z=0
      mouse.worldX = mouse.x * 9;
      mouse.worldY = -mouse.y * 6;

      // Scroll progress 0..1 across ~3 viewport heights
      const s = Math.min(scrollY / (window.innerHeight * 2.5), 1);

      // Camera: subtle, no dramatic zoom — friendly parallax
      camera.position.x = mouse.x * 1.4;
      camera.position.y = -mouse.y * 1.0;
      camera.position.z = 16 - s * 2.5;
      camera.lookAt(0, s * -0.4, 0);

      // --- Nodes: spring toward home, gently pulled by cursor,
      //     and gradually pulled toward the ring as scroll increases ---
      for (const n of nodes) {
        // Assemble factor: nodes drift closer to the ring circle
        const ringAngle = Math.atan2(n.home.y, n.home.x);
        const ringTarget = new THREE.Vector3(
          Math.cos(ringAngle) * (3.2 + (i => 0)(0)),
          Math.sin(ringAngle) * (3.2),
          0
        );
        // Base target: interpolate home -> ringTarget by s
        n.target.copy(n.home).lerp(ringTarget, s * 0.55);
        // Add gentle float
        n.target.y += Math.sin(t * n.speed + n.phase) * 0.35;
        n.target.x += Math.cos(t * n.speed * 0.7 + n.phase) * 0.25;

        // Cursor attraction (playful bounce)
        const dx = mouse.worldX - n.current.x;
        const dy = mouse.worldY - n.current.y;
        const dist2 = dx * dx + dy * dy;
        if (dist2 < 25) {
          const f = (1 - dist2 / 25) * 0.6;
          n.vel.x += dx * f * dt;
          n.vel.y += dy * f * dt;
        }

        // Spring toward target
        n.vel.x += (n.target.x - n.current.x) * 4 * dt;
        n.vel.y += (n.target.y - n.current.y) * 4 * dt;
        n.vel.z += (n.target.z - n.current.z) * 4 * dt;
        // Damping
        n.vel.multiplyScalar(0.88);
        n.current.addScaledVector(n.vel, dt * 4);

        n.mesh.position.copy(n.current);
        // Subtle breathing scale
        const pulse = 1 + Math.sin(t * 1.2 + n.phase) * 0.06;
        n.mesh.scale.setScalar(n.scale * pulse);
      }

      // Update link line positions from live node positions
      for (let k = 0; k < linkPairs.length; k++) {
        const [a, b] = linkPairs[k];
        const pa = nodes[a].current;
        const pb = nodes[b].current;
        linkPos.setXYZ(k * 2, pa.x, pa.y, pa.z);
        linkPos.setXYZ(k * 2 + 1, pb.x, pb.y, pb.z);
      }
      linkPos.needsUpdate = true;

      // --- Ring: fill grows with scroll, gentle idle rotation ---
      const targetFill = 0.05 + s * 0.9;
      currentFill += (targetFill - currentFill) * 0.08;
      // Rebuild tube only when change is meaningful (perf)
      if (Math.abs(currentFill - lastRebuild) > 0.02) {
        buildProgress(currentFill);
        lastRebuild = currentFill;
      }
      ringGroup.rotation.z = t * 0.08 + mouse.x * 0.15;
      ringGroup.rotation.x = -0.25 + mouse.y * 0.12;
      // Star marker rides the progress tip
      const tipAngle = (currentFill) * Math.PI * 2 - Math.PI / 2;
      star.position.set(Math.cos(tipAngle) * 3, Math.sin(tipAngle) * 3, 0);
      star.rotation.y = t * 1.2;
      star.rotation.x = t * 0.9;

      // Pills: slow drift + spin
      for (const p of pills) {
        p.mesh.rotation.x += p.spin.x * dt;
        p.mesh.rotation.y += p.spin.y * dt;
        p.mesh.rotation.z += p.spin.z * dt;
        p.mesh.position.y = p.base.y + Math.sin(t * 0.4 + p.base.x) * 0.5;
        p.mesh.position.x = p.base.x + Math.cos(t * 0.35 + p.base.y) * 0.4;
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
      nodeGeom.dispose();
      linkGeom.dispose();
      linkMat.dispose();
      trackGeom.dispose();
      trackMat.dispose();
      starGeom.dispose();
      starMat.dispose();
      if (progressMesh) progressMesh.geometry.dispose();
      pills.forEach((p) => {
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
      });
      nodes.forEach((n) => (n.mesh.material as THREE.Material).dispose());
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
          "radial-gradient(ellipse at 15% 10%, oklch(0.92 0.10 30 / 0.55), transparent 55%), radial-gradient(ellipse at 85% 15%, oklch(0.92 0.09 55 / 0.45), transparent 55%), radial-gradient(ellipse at 50% 100%, oklch(0.90 0.10 305 / 0.35), transparent 60%), linear-gradient(180deg, oklch(0.985 0.012 75) 0%, oklch(0.965 0.018 60) 100%)",
      }}
    >
      {/* WebGL canvas */}
      {!fallback && <div ref={mountRef} className="absolute inset-0" />}

      {/* Subtle dotted texture for depth (not a matrix grid) */}
      <div
        className="absolute inset-0 opacity-[0.35] dark:opacity-25"
        style={{
          backgroundImage:
            "radial-gradient(oklch(0.68 0.19 25 / 0.14) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage: "radial-gradient(ellipse at center, black 25%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 25%, transparent 75%)",
        }}
      />

      {/* Dark-mode ambient wash */}
      <div className="absolute inset-0 hidden dark:block bg-[radial-gradient(ellipse_at_20%_10%,oklch(0.35_0.12_25/0.35),transparent_55%),radial-gradient(ellipse_at_80%_15%,oklch(0.35_0.12_305/0.30),transparent_55%),linear-gradient(180deg,oklch(0.19_0.03_285)_0%,oklch(0.15_0.03_285)_100%)]" />

      {/* Soft light-mode veil so UI stays legible */}
      <div className="absolute inset-0 bg-background/40 dark:bg-transparent" />
    </div>
  );
}
