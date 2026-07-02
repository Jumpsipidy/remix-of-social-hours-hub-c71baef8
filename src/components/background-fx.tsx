import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

/**
 * Premium dark-glassmorphism WebGL background.
 *
 * Scene:
 *  - A constellation of glowing "glass" nodes (translucent, physically-lit
 *    spheres) linked by thin neon strands — a stylized social network.
 *  - Two floating 3D neon rings (torus) that orbit the scene, catching light.
 *  - Ambient particle dust for depth.
 *  - Two colored point-lights (electric purple + teal) that drift slowly and
 *    react to the cursor for a "lit-from-within" glass feel.
 *
 * Interaction:
 *  - Scene leans/rotates toward the cursor. Nodes gently attract to the pointer.
 *  - Scroll rotates and repositions rings + shifts key light angle. NO zoom.
 *
 * Perf: adaptive counts + DPR for mobile, RAF paused on hidden tabs,
 *       static CSS fallback for reduced-motion / no-WebGL.
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
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.cssText =
      "position:absolute;inset:0;width:100%;height:100%;display:block";

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(52, width() / height(), 0.1, 200);
    camera.position.set(0, 0, 16);

    // Premium dark palette — electric purple, teal, soft mint
    const cPurple = new THREE.Color("#a880ff");
    const cTeal = new THREE.Color("#5eead4");
    const cMint = new THREE.Color("#86efac");
    const cPink = new THREE.Color("#f0abfc");
    const palette = [cPurple, cTeal, cMint, cPink];

    // --- Lighting: dark ambient + two roaming colored point lights ---
    scene.add(new THREE.AmbientLight(0x1a1330, 0.55));
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.35);
    keyLight.position.set(6, 8, 10);
    scene.add(keyLight);
    const purpleLight = new THREE.PointLight(0xa880ff, 2.4, 40, 1.6);
    purpleLight.position.set(-6, 3, 6);
    scene.add(purpleLight);
    const tealLight = new THREE.PointLight(0x5eead4, 2.0, 40, 1.6);
    tealLight.position.set(6, -3, 4);
    scene.add(tealLight);

    // --- Glass nodes ---
    const nodeCount = isMobile ? 20 : 36;
    const nodeGeom = new THREE.SphereGeometry(1, 32, 32);
    const nodes: {
      mesh: THREE.Mesh;
      home: THREE.Vector3;
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
      const mat = new THREE.MeshPhysicalMaterial({
        color: 0x2a2340,
        roughness: 0.15,
        metalness: 0.0,
        transmission: 0.85, // glass
        thickness: 0.6,
        ior: 1.35,
        clearcoat: 1,
        clearcoatRoughness: 0.15,
        emissive: color,
        emissiveIntensity: 0.55,
        transparent: true,
        opacity: 0.95,
      });
      const mesh = new THREE.Mesh(nodeGeom, mat);
      const scale = 0.22 + Math.random() * 0.5;
      mesh.scale.setScalar(scale);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 5.5 + Math.random() * 4.5;
      const home = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * r,
        Math.sin(phi) * Math.sin(theta) * r * 0.75,
        Math.cos(phi) * r - 2
      );
      mesh.position.copy(home);
      nodeGroup.add(mesh);
      nodes.push({
        mesh,
        home,
        current: home.clone(),
        vel: new THREE.Vector3(),
        scale,
        speed: 0.35 + Math.random() * 0.7,
        phase: Math.random() * Math.PI * 2,
        color,
      });
    }

    // --- Neon connection strands ---
    const maxLinks = isMobile ? 45 : 100;
    const linkPairs: [number, number][] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if (nodes[i].home.distanceTo(nodes[j].home) < 4.5) {
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
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const links = new THREE.LineSegments(linkGeom, linkMat);
    nodeGroup.add(links);

    // --- Two floating neon rings ---
    const rings: { mesh: THREE.Mesh; baseRot: THREE.Euler; drift: number }[] = [];
    const ringConfigs: { r: number; c: THREE.Color; pos: THREE.Vector3; rot: THREE.Euler }[] = [
      { r: 4.2, c: cPurple, pos: new THREE.Vector3(0, 0.5, 0), rot: new THREE.Euler(-0.35, 0.25, 0.1) },
      { r: 5.4, c: cTeal, pos: new THREE.Vector3(0.2, -0.6, -1), rot: new THREE.Euler(0.45, -0.3, -0.15) },
    ];
    for (const cfg of ringConfigs) {
      const g = new THREE.TorusGeometry(cfg.r, 0.06, 20, 180);
      const m = new THREE.MeshStandardMaterial({
        color: cfg.c,
        emissive: cfg.c,
        emissiveIntensity: 1.4,
        roughness: 0.25,
        metalness: 0.6,
        transparent: true,
        opacity: 0.9,
      });
      const mesh = new THREE.Mesh(g, m);
      mesh.position.copy(cfg.pos);
      mesh.rotation.copy(cfg.rot);
      scene.add(mesh);
      rings.push({ mesh, baseRot: cfg.rot.clone(), drift: Math.random() });
    }

    // --- Ambient dust particles ---
    const dustCount = isMobile ? 500 : 1200;
    const dustPos = new Float32Array(dustCount * 3);
    const dustCol = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      dustPos[i * 3] = (Math.random() - 0.5) * 60;
      dustPos[i * 3 + 1] = (Math.random() - 0.5) * 40;
      dustPos[i * 3 + 2] = (Math.random() - 0.5) * 30 - 5;
      const c = palette[Math.floor(Math.random() * palette.length)];
      dustCol.set([c.r, c.g, c.b], i * 3);
    }
    const dustGeom = new THREE.BufferGeometry();
    dustGeom.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
    dustGeom.setAttribute("color", new THREE.BufferAttribute(dustCol, 3));
    const dustMat = new THREE.PointsMaterial({
      size: isMobile ? 0.04 : 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const dust = new THREE.Points(dustGeom, dustMat);
    scene.add(dust);

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

    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!visible) return;
      const t = clock.getElapsedTime();
      const dt = Math.min(clock.getDelta(), 0.05);

      mouse.x += (mouse.tx - mouse.x) * 0.06;
      mouse.y += (mouse.ty - mouse.y) * 0.06;
      mouse.worldX = mouse.x * 9;
      mouse.worldY = -mouse.y * 6;

      // Scroll factor (0..1 across ~3vh)
      const s = Math.min(scrollY / (window.innerHeight * 2.5), 1);

      // Camera: gentle lean, NO zoom on scroll — position stays at z=16
      camera.position.x = mouse.x * 1.6;
      camera.position.y = -mouse.y * 1.2;
      camera.position.z = 16;
      camera.lookAt(0, 0, 0);

      // Scene rotation reacts to scroll (not zoom) + cursor
      nodeGroup.rotation.y = t * 0.04 + mouse.x * 0.35 + s * 0.9;
      nodeGroup.rotation.x = mouse.y * 0.25 + s * 0.35;

      // Nodes: gentle spring toward home + cursor attraction
      for (const n of nodes) {
        const targetX = n.home.x + Math.cos(t * n.speed * 0.7 + n.phase) * 0.35;
        const targetY = n.home.y + Math.sin(t * n.speed + n.phase) * 0.4;
        const targetZ = n.home.z;

        // Cursor attraction in world space
        const dx = mouse.worldX - n.current.x;
        const dy = mouse.worldY - n.current.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 20) {
          const f = (1 - d2 / 20) * 0.5;
          n.vel.x += dx * f * dt;
          n.vel.y += dy * f * dt;
        }

        n.vel.x += (targetX - n.current.x) * 3.5 * dt;
        n.vel.y += (targetY - n.current.y) * 3.5 * dt;
        n.vel.z += (targetZ - n.current.z) * 3.5 * dt;
        n.vel.multiplyScalar(0.88);
        n.current.addScaledVector(n.vel, dt * 4);

        n.mesh.position.copy(n.current);
        const pulse = 1 + Math.sin(t * 1.1 + n.phase) * 0.07;
        n.mesh.scale.setScalar(n.scale * pulse);
      }

      // Update link segments
      for (let k = 0; k < linkPairs.length; k++) {
        const [a, b] = linkPairs[k];
        const pa = nodes[a].current;
        const pb = nodes[b].current;
        linkPos.setXYZ(k * 2, pa.x, pa.y, pa.z);
        linkPos.setXYZ(k * 2 + 1, pb.x, pb.y, pb.z);
      }
      linkPos.needsUpdate = true;

      // Rings: rotate + shift position with scroll (no zoom)
      rings.forEach((r, i) => {
        const sign = i === 0 ? 1 : -1;
        r.mesh.rotation.x = r.baseRot.x + t * 0.12 * sign + s * 1.2 * sign;
        r.mesh.rotation.y = r.baseRot.y + t * 0.09 * sign + s * 0.8 * sign;
        r.mesh.rotation.z = r.baseRot.z + Math.sin(t * 0.3 + r.drift) * 0.15;
        r.mesh.position.x = (i === 0 ? 0 : 0.2) + Math.sin(t * 0.25 + r.drift) * 0.6 + mouse.x * 0.4;
        r.mesh.position.y = (i === 0 ? 0.5 : -0.6) + Math.cos(t * 0.3 + r.drift) * 0.4 - mouse.y * 0.3 + s * (i === 0 ? -0.8 : 0.9);
      });

      // Lights drift + shift with scroll for lighting-angle changes
      purpleLight.position.x = Math.sin(t * 0.4) * 7 + mouse.x * 2;
      purpleLight.position.y = Math.cos(t * 0.3) * 4 + 2 - s * 3;
      purpleLight.position.z = 5 + Math.sin(t * 0.2) * 2;
      tealLight.position.x = Math.cos(t * 0.35) * 7 - mouse.x * 2;
      tealLight.position.y = Math.sin(t * 0.28) * 4 - 2 + s * 3;
      tealLight.position.z = 4 + Math.cos(t * 0.22) * 2;
      keyLight.position.x = Math.sin(s * Math.PI) * 8;
      keyLight.position.y = 8 - s * 6;

      // Dust drifts
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
      nodeGeom.dispose();
      linkGeom.dispose();
      linkMat.dispose();
      dustGeom.dispose();
      dustMat.dispose();
      rings.forEach((r) => {
        r.mesh.geometry.dispose();
        (r.mesh.material as THREE.Material).dispose();
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
          "radial-gradient(ellipse at 20% 10%, oklch(0.35 0.18 300 / 0.55), transparent 55%), radial-gradient(ellipse at 85% 15%, oklch(0.35 0.15 195 / 0.45), transparent 55%), radial-gradient(ellipse at 50% 100%, oklch(0.30 0.14 155 / 0.35), transparent 60%), linear-gradient(180deg, oklch(0.14 0.03 285) 0%, oklch(0.10 0.03 290) 100%)",
      }}
    >
      {/* WebGL canvas */}
      {!fallback && <div ref={mountRef} className="absolute inset-0" />}

      {/* Subtle dotted texture */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(oklch(0.85 0.15 300 / 0.10) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          maskImage: "radial-gradient(ellipse at center, black 25%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 25%, transparent 75%)",
        }}
      />

      {/* Vignette for depth */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,oklch(0_0_0/0.55))]" />
    </div>
  );
}
