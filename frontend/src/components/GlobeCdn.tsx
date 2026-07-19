"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import createGlobe from "cobe";

type LatLng = [number, number];

interface CdnMarker {
  id: string;
  location: LatLng;
  region: string;
}

interface CdnArc {
  id: string;
  from: LatLng;
  to: LatLng;
}

interface GlobeCdnProps {
  markers?: CdnMarker[];
  arcs?: CdnArc[];
  className?: string;
  speed?: number;
}

const defaultMarkers: CdnMarker[] = [
  { id: "cdn-iad", location: [38.95, -77.45], region: "IAD" },
  { id: "cdn-sfo", location: [37.62, -122.38], region: "SFO" },
  { id: "cdn-cdg", location: [49.01, 2.55], region: "CDG" },
  { id: "cdn-hnd", location: [35.55, 139.78], region: "HND" },
  { id: "cdn-syd", location: [-33.95, 151.18], region: "SYD" },
  { id: "cdn-gru", location: [-23.43, -46.47], region: "GRU" },
  { id: "cdn-sin", location: [1.36, 103.99], region: "SIN" },
  { id: "cdn-arn", location: [59.65, 17.93], region: "ARN" },
  { id: "cdn-dub", location: [53.43, -6.25], region: "DUB" },
  { id: "cdn-bom", location: [19.09, 72.87], region: "BOM" },
];

const defaultArcs: CdnArc[] = [
  { id: "cdn-arc-1", from: [38.95, -77.45], to: [49.01, 2.55] },
  { id: "cdn-arc-2", from: [37.62, -122.38], to: [35.55, 139.78] },
  { id: "cdn-arc-3", from: [49.01, 2.55], to: [1.36, 103.99] },
  { id: "cdn-arc-4", from: [38.95, -77.45], to: [-23.43, -46.47] },
  { id: "cdn-arc-5", from: [35.55, 139.78], to: [-33.95, 151.18] },
  { id: "cdn-arc-6", from: [49.01, 2.55], to: [19.09, 72.87] },
];

export function GlobeCdn({
  markers = defaultMarkers,
  arcs = defaultArcs,
  className = "",
  speed = 0.003,
}: GlobeCdnProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerInteracting = useRef<{ x: number; y: number } | null>(null);
  const dragOffset = useRef({ phi: 0, theta: 0 });
  const phiOffsetRef = useRef(0);
  const thetaOffsetRef = useRef(0);
  const isPausedRef = useRef(false);
  const [traffic, setTraffic] = useState(() =>
    defaultArcs.map((arc, index) => ({ id: arc.id, value: [420, 380, 290, 185, 156, 134][index] || 100 })),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setTraffic((data) =>
        data.map((item) => ({
          ...item,
          value: Math.max(50, item.value + Math.floor(Math.random() * 21) - 10),
        })),
      );
    }, 250);
    return () => clearInterval(interval);
  }, []);

  const handlePointerDown = useCallback((event: React.PointerEvent) => {
    pointerInteracting.current = { x: event.clientX, y: event.clientY };
    if (canvasRef.current) canvasRef.current.style.cursor = "grabbing";
    isPausedRef.current = true;
  }, []);

  const handlePointerUp = useCallback(() => {
    if (pointerInteracting.current !== null) {
      phiOffsetRef.current += dragOffset.current.phi;
      thetaOffsetRef.current += dragOffset.current.theta;
      dragOffset.current = { phi: 0, theta: 0 };
    }
    pointerInteracting.current = null;
    if (canvasRef.current) canvasRef.current.style.cursor = "grab";
    isPausedRef.current = false;
  }, []);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (pointerInteracting.current !== null) {
        dragOffset.current = {
          phi: (event.clientX - pointerInteracting.current.x) / 300,
          theta: (event.clientY - pointerInteracting.current.y) / 1000,
        };
      }
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerup", handlePointerUp, { passive: true });
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [handlePointerUp]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    let globe: ReturnType<typeof createGlobe> | null = null;
    let animationId = 0;
    let phi = 0;

    function init() {
      const width = canvas.offsetWidth;
      if (width === 0 || globe) return;

      globe = createGlobe(canvas, {
        devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        width,
        height: width,
        phi: 0,
        theta: 0.2,
        dark: 1,
        diffuse: 1.25,
        mapSamples: 16000,
        mapBrightness: 6,
        baseColor: [0.03, 0.04, 0.04],
        markerColor: [0.87, 1, 0.28],
        glowColor: [0.22, 1, 0.72],
        markerElevation: 0.02,
        markers: markers.map((marker) => ({ location: marker.location, size: 0.014, id: marker.id })),
        arcs: arcs.map((arc) => ({ from: arc.from, to: arc.to, id: arc.id })),
        arcColor: [0.87, 1, 0.28],
        arcWidth: 0.7,
        arcHeight: 0.28,
        opacity: 0.95,
      });

      function animate() {
        if (!globe) return;
        if (!isPausedRef.current) phi += speed;
        globe.update({
          phi: phi + phiOffsetRef.current + dragOffset.current.phi,
          theta: 0.2 + thetaOffsetRef.current + dragOffset.current.theta,
        });
        animationId = requestAnimationFrame(animate);
      }

      animate();
      setTimeout(() => {
        canvas.style.opacity = "1";
      });
    }

    if (canvas.offsetWidth > 0) {
      init();
    } else {
      const resizeObserver = new ResizeObserver((entries) => {
        if (entries[0]?.contentRect.width > 0) {
          resizeObserver.disconnect();
          init();
        }
      });
      resizeObserver.observe(canvas);
    }

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      if (globe) globe.destroy();
    };
  }, [markers, arcs, speed]);

  const pyramidFaceStyle = (nth: number): React.CSSProperties => {
    const transforms = [
      "rotateY(0deg) translateZ(4px) rotateX(19.5deg)",
      "rotateY(120deg) translateZ(4px) rotateX(19.5deg)",
      "rotateY(240deg) translateZ(4px) rotateX(19.5deg)",
      "rotateX(-90deg) rotateZ(60deg) translateY(4px)",
    ];
    const colors = ["#dcff45", "#7cffd3", "#f4f4ef", "#1f332e"];
    return {
      position: "absolute",
      left: -0.5,
      top: 0,
      width: 0,
      height: 0,
      borderLeft: "6.5px solid transparent",
      borderRight: "6.5px solid transparent",
      borderBottom: `13px solid ${colors[nth]}`,
      transformOrigin: "center bottom",
      transform: transforms[nth],
    };
  };

  return (
    <div className={`globe-cdn ${className}`}>
      <canvas ref={canvasRef} onPointerDown={handlePointerDown} className="globe-cdn__canvas" />
      {markers.map((marker) => (
        <div
          key={marker.id}
          className="globe-cdn__marker"
          style={{
            positionAnchor: `--cobe-${marker.id}`,
            opacity: `var(--cobe-visible-${marker.id}, 0)`,
            filter: `blur(calc((1 - var(--cobe-visible-${marker.id}, 0)) * 8px))`,
          } as React.CSSProperties}
        >
          <div className="globe-cdn__pyramid">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} style={pyramidFaceStyle(item)} />
            ))}
          </div>
          <span>{marker.region}</span>
        </div>
      ))}
      {traffic.map((item) => (
        <div
          key={item.id}
          className="globe-cdn__traffic"
          style={{
            positionAnchor: `--cobe-arc-${item.id}`,
            opacity: `var(--cobe-visible-arc-${item.id}, 0)`,
            filter: `blur(calc((1 - var(--cobe-visible-arc-${item.id}, 0)) * 8px))`,
          } as React.CSSProperties}
        >
          {item.value}k req/s
        </div>
      ))}
    </div>
  );
}
