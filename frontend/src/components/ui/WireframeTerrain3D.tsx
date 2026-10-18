"use client";

import { useEffect, useRef, type ReactNode } from "react";
import * as THREE from "three";

type Props = {
  color?: string;
  speed?: number;
  amplitude?: number;
  children?: ReactNode;
  className?: string;
};

/**
 * Endless flying wireframe landscape: a plane displaced by two crossed sine
 * waves that scroll toward the camera every frame. Transparent canvas over a
 * theme-aware gradient, with hero content layered on top. With reduced motion
 * the terrain renders a single still frame. The parent must give it a height.
 */
export default function WireframeTerrain3D({
  color = "#6366f1",
  speed = 1,
  amplitude = 1.6,
  children,
  className = "",
}: Props) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const SEG = 60;
    const SIZE = 40;
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(new THREE.Color(color), 0.028);

    const camera = new THREE.PerspectiveCamera(65, 1, 0.1, 200);
    camera.position.set(0, 3.2, 9);
    camera.lookAt(0, 0.5, -10);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch {
      // No WebGL: the gradient background alone still looks fine.
      return undefined;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const canvas = renderer.domElement;
    canvas.style.position = "absolute";
    canvas.style.inset = "0";
    canvas.setAttribute("aria-hidden", "true");
    mount.prepend(canvas);

    const geometry = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
    geometry.rotateX(-Math.PI / 2);
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      wireframe: true,
      transparent: true,
      opacity: 0.55,
    });
    const terrain = new THREE.Mesh(geometry, material);
    terrain.position.z = -6;
    scene.add(terrain);

    const position = geometry.attributes.position;
    const base = (position.array as Float32Array).slice();

    const displace = (offset: number) => {
      const arr = position.array as Float32Array;
      for (let i = 0; i < arr.length; i += 3) {
        const x = base[i];
        const z = base[i + 2];
        arr[i + 1] =
          Math.sin(x * 0.35 + offset) * amplitude + Math.sin(z * 0.5 + offset * 1.3) * amplitude * 0.6;
      }
      position.needsUpdate = true;
      renderer.render(scene, camera);
    };

    const setSize = () => {
      const width = mount.clientWidth || 1;
      const height = mount.clientHeight || 1;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    setSize();

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let offset = 0;
    let last = performance.now();
    const tick = (time: number) => {
      const delta = Math.min((time - last) / 1000, 0.1);
      last = time;
      offset += delta * speed * 2.2;
      displace(offset);
    };
    displace(offset);

    // Only animate while the hero is on screen, to save battery/CPU.
    const visibility = new IntersectionObserver(([entry]) => {
      if (reduceMotion) return;
      if (entry.isIntersecting) {
        last = performance.now();
        renderer.setAnimationLoop(tick);
      } else {
        renderer.setAnimationLoop(null);
      }
    });
    visibility.observe(mount);

    const observer = new ResizeObserver(() => {
      setSize();
      if (reduceMotion) displace(offset);
    });
    observer.observe(mount);

    return () => {
      renderer.setAnimationLoop(null);
      visibility.disconnect();
      observer.disconnect();
      geometry.dispose();
      material.dispose();
      renderer.forceContextLoss();
      renderer.dispose();
      if (canvas.parentNode === mount) mount.removeChild(canvas);
    };
  }, [color, speed, amplitude]);

  return (
    <div
      ref={mountRef}
      className={`relative h-full w-full overflow-hidden rounded-2xl bg-gradient-to-b from-white to-indigo-100 shadow-xl shadow-slate-900/5 ring-1 ring-black/5 transition-shadow duration-300 ease-out hover:shadow-2xl dark:from-zinc-950 dark:to-indigo-950 dark:shadow-black/40 dark:ring-white/10 dark:hover:shadow-black/60 ${className}`}
    >
      <div className="pointer-events-none relative z-10 h-full">{children}</div>
    </div>
  );
}
