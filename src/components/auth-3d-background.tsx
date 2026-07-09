import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Lightweight interactive 3D backdrop for /login and /register.
 * Floating glass orbs + connecting lines that react to cursor.
 * Kept intentionally low-poly so it never fights the form.
 */
export function Auth3DBackground() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    if (typeof window === "undefined") return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, mount.clientWidth / mount.clientHeight, 0.1, 100);
    camera.position.z = 8;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    } catch {
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0x8b7fff, 0.6));
    const p1 = new THREE.PointLight(0x8b5cf6, 2, 30); p1.position.set(-5, 3, 4); scene.add(p1);
    const p2 = new THREE.PointLight(0x22d3ee, 1.6, 30); p2.position.set(5, -3, 4); scene.add(p2);

    // Orbs
    const orbCount = window.innerWidth < 640 ? 8 : 14;
    const orbs: THREE.Mesh[] = [];
    const geo = new THREE.IcosahedronGeometry(0.35, 1);
    for (let i = 0; i < orbCount; i++) {
      const mat = new THREE.MeshPhysicalMaterial({
        color: i % 2 === 0 ? 0x8b5cf6 : 0x22d3ee,
        metalness: 0.2,
        roughness: 0.15,
        transmission: 0.7,
        thickness: 0.6,
        transparent: true,
        opacity: 0.85,
      });
      const m = new THREE.Mesh(geo, mat);
      m.position.set((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 4 - 2);
      m.userData = {
        vx: (Math.random() - 0.5) * 0.005,
        vy: (Math.random() - 0.5) * 0.005,
        rx: (Math.random() - 0.5) * 0.01,
        ry: (Math.random() - 0.5) * 0.01,
      };
      scene.add(m);
      orbs.push(m);
    }

    // Lines between close orbs
    const lineMat = new THREE.LineBasicMaterial({ color: 0x8b5cf6, transparent: true, opacity: 0.18 });
    const linesGroup = new THREE.Group();
    scene.add(linesGroup);

    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    const onMove = (e: MouseEvent) => {
      mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.ty = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("mousemove", onMove);

    const onResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", onResize);

    let raf = 0;
    const tick = () => {
      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;

      for (const o of orbs) {
        o.position.x += o.userData.vx;
        o.position.y += o.userData.vy;
        o.rotation.x += o.userData.rx;
        o.rotation.y += o.userData.ry;
        if (o.position.x > 7 || o.position.x < -7) o.userData.vx *= -1;
        if (o.position.y > 5 || o.position.y < -5) o.userData.vy *= -1;
      }

      // Redraw lines
      linesGroup.clear();
      for (let i = 0; i < orbs.length; i++) {
        for (let j = i + 1; j < orbs.length; j++) {
          const d = orbs[i].position.distanceTo(orbs[j].position);
          if (d < 3.2) {
            const g = new THREE.BufferGeometry().setFromPoints([orbs[i].position, orbs[j].position]);
            const mat = lineMat.clone();
            mat.opacity = 0.25 * (1 - d / 3.2);
            linesGroup.add(new THREE.Line(g, mat));
          }
        }
      }

      camera.position.x += (mouse.x * 1.2 - camera.position.x) * 0.04;
      camera.position.y += (mouse.y * 0.8 - camera.position.y) * 0.04;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
      if (!prefersReduced) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
      orbs.forEach((o) => { (o.material as THREE.Material).dispose(); });
      geo.dispose();
    };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
      <div ref={mountRef} className="absolute inset-0" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/20 to-background/60" />
    </div>
  );
}
