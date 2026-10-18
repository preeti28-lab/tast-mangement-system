"use client";

import { useEffect, useRef, type ReactNode } from "react";
import * as THREE from "three";

type Props = {
  color?: string;
  speed?: number;
  children?: ReactNode;
  className?: string;
};

/**
 * Infinite synthwave floor: a neon grid scrolling toward a low camera on a
 * horizon. A single GridHelper resets its position once it has travelled one
 * cell, so the scroll is seamless. Transparent canvas over a theme-aware
 * gradient with a content slot on top. Holds still for prefers-reduced-motion.
 */
export default function NeonGrid3D({ color = "#8b5cf6", speed = 1, children, className = "" }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const DIV = 40;
    const SIZE = 60;
    const CELL = SIZE / DIV;
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(new THREE.Color(color), 8, 34);

    const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 100);
    camera.position.set(0, 2.2, 6);
    camera.lookAt(0, 0, -12);

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
    mount.appendChild(canvas);

    const neon = new THREE.Color(color);
    const grid = new THREE.GridHelper(SIZE, DIV, neon, neon);
    const material = grid.material as THREE.Material;
    material.transparent = true;
    material.opacity = 0.7;
    scene.add(grid);

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const setSize = () => {
      const width = mount.clientWidth || 1;
      const height = mount.clientHeight || 1;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      if (reduceMotion) renderer.render(scene, camera);
    };
    setSize();
    const observer = new ResizeObserver(setSize);
    observer.observe(mount);

    // Only animate while the canvas is on screen, to save battery/CPU.
    let last = performance.now();
    const tick = (time: number) => {
      const delta = Math.min((time - last) / 1000, 0.1);
      last = time;
      // The grid is periodic with period = one cell, so wrapping the offset
      // back by a cell keeps the scroll perfectly seamless.
      grid.position.z = (grid.position.z + delta * speed * 6) % CELL;
      renderer.render(scene, camera);
    };
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

    return () => {
      renderer.setAnimationLoop(null);
      visibility.disconnect();
      observer.disconnect();
      grid.geometry.dispose();
      material.dispose();
      renderer.forceContextLoss();
      renderer.dispose();
      if (canvas.parentNode === mount) mount.removeChild(canvas);
    };
  }, [color, speed]);

  return (
    <div
      ref={mountRef}
      className={`relative h-full w-full overflow-hidden rounded-2xl bg-gradient-to-b from-fuchsia-50 to-indigo-100 shadow-xl shadow-slate-900/5 ring-1 ring-black/5 transition-all duration-300 ease-out hover:shadow-2xl hover:shadow-fuchsia-500/10 dark:from-slate-950 dark:to-fuchsia-950 dark:shadow-black/40 dark:ring-white/10 dark:hover:shadow-black/60 ${className}`}
    >
      <div className="pointer-events-none relative z-10 h-full">{children}</div>
    </div>
  );
}
