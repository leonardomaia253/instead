"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function Scene3D() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const currentHost = host;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog("#080b14", 5, 15);

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.set(0, 0, 5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    currentHost.appendChild(renderer.domElement);

    const sphereGeometry = new THREE.SphereGeometry(1.5, 64, 64);
    const sphereMaterial = new THREE.MeshStandardMaterial({
      color: "#7c3aed",
      emissive: "#2563eb",
      emissiveIntensity: 0.22,
      roughness: 0.18,
      metalness: 0.78,
    });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    scene.add(sphere);

    const particleCount = 200;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let index = 0; index < particleCount; index += 1) {
      particlePositions[index * 3] = (Math.random() - 0.5) * 10;
      particlePositions[index * 3 + 1] = (Math.random() - 0.5) * 10;
      particlePositions[index * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    const particles = new THREE.Points(
      particleGeometry,
      new THREE.PointsMaterial({ size: 0.02, color: "#f1f5f9", transparent: true, opacity: 0.6 }),
    );
    scene.add(particles);

    scene.add(new THREE.AmbientLight("#ffffff", 0.5));
    const pointLight = new THREE.PointLight("#ffffff", 1.5);
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);

    const spotLight = new THREE.SpotLight("#ffffff", 1);
    spotLight.position.set(-10, 10, 5);
    spotLight.angle = 0.15;
    spotLight.penumbra = 1;
    scene.add(spotLight);

    let frameId = 0;
    const clock = new THREE.Clock();

    function resize() {
      const width = currentHost.clientWidth || 1;
      const height = currentHost.clientHeight || 1;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    }

    function animate() {
      const elapsed = clock.getElapsedTime();
      sphere.rotation.x = elapsed * 0.2;
      sphere.rotation.y = elapsed * 0.3;
      sphere.position.y = Math.sin(elapsed * 1.6) * 0.08;
      particles.rotation.y = elapsed * 0.05;
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    }

    resize();
    animate();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(currentHost);

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      renderer.dispose();
      sphereGeometry.dispose();
      sphereMaterial.dispose();
      particleGeometry.dispose();
      currentHost.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none" }}
    />
  );
}
