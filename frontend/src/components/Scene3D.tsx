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
    scene.fog = new THREE.Fog("#050604", 5, 17);

    const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 100);
    camera.position.set(0, 0.4, 7.4);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    currentHost.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    const coreGeometry = new THREE.IcosahedronGeometry(1.25, 2);
    const coreMaterial = new THREE.MeshStandardMaterial({
      color: "#dcff45",
      emissive: "#55f0c0",
      emissiveIntensity: 0.32,
      roughness: 0.34,
      metalness: 0.62,
      wireframe: true,
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    group.add(core);

    const nodeGeometry = new THREE.SphereGeometry(0.055, 16, 16);
    const nodeMaterial = new THREE.MeshStandardMaterial({
      color: "#f4f4ef",
      emissive: "#dcff45",
      emissiveIntensity: 0.7,
      roughness: 0.2,
      metalness: 0.4,
    });
    const lineMaterial = new THREE.LineBasicMaterial({ color: "#dcff45", transparent: true, opacity: 0.28 });

    const nodePositions = Array.from({ length: 18 }, (_, index) => {
      const angle = index * 2.399963;
      const radius = 2.05 + (index % 4) * 0.32;
      const y = -1.5 + (index % 7) * 0.5;
      return new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
    });

    const routeGeometries: THREE.BufferGeometry[] = [];

    nodePositions.forEach((position, index) => {
      const node = new THREE.Mesh(nodeGeometry, nodeMaterial);
      node.position.copy(position);
      node.scale.setScalar(index % 5 === 0 ? 1.7 : 1);
      group.add(node);

      const routeGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), position]);
      routeGeometries.push(routeGeometry);
      group.add(new THREE.Line(routeGeometry, lineMaterial));
    });

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

    scene.add(new THREE.AmbientLight("#f4f4ef", 0.42));
    const pointLight = new THREE.PointLight("#dcff45", 1.8);
    pointLight.position.set(6, 7, 8);
    scene.add(pointLight);

    const spotLight = new THREE.SpotLight("#55f0c0", 1.2);
    spotLight.position.set(-7, 6, 6);
    spotLight.angle = 0.15;
    spotLight.penumbra = 1;
    scene.add(spotLight);

    let frameId = 0;
    const clock = new THREE.Clock();

    function resize() {
      const width = currentHost.clientWidth || 1;
      const height = currentHost.clientHeight || 1;
      camera.aspect = width / height;
      camera.position.z = width < 700 ? 8.4 : 7.4;
      group.scale.setScalar(width < 700 ? 0.82 : 1);
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    }

    function animate() {
      const elapsed = clock.getElapsedTime();
      group.rotation.x = Math.sin(elapsed * 0.28) * 0.12;
      group.rotation.y = elapsed * 0.16;
      core.rotation.x = elapsed * 0.34;
      core.rotation.y = elapsed * 0.48;
      group.position.y = Math.sin(elapsed * 1.1) * 0.1;
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
      coreGeometry.dispose();
      coreMaterial.dispose();
      nodeGeometry.dispose();
      nodeMaterial.dispose();
      lineMaterial.dispose();
      routeGeometries.forEach((geometry) => geometry.dispose());
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
