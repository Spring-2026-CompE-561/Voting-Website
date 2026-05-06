"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { feature } from "topojson-client";
import type { Topology } from "topojson-specification";
import worldLand from "world-atlas/land-50m.json";

export type GlobePoint = {
  latitude: number;
  longitude: number;
  votes?: number;
  country?: string | null;
};

interface RotatingEarthProps {
  width?: number;
  height?: number;
  className?: string;
  points?: GlobePoint[];
}

const worldTopology = worldLand as unknown as Topology;
const land = feature(
  worldTopology,
  worldTopology.objects.land,
) as GeoJSON.FeatureCollection;

export default function RotatingEarth({
  width = 800,
  height = 600,
  className = "",
  points = [],
}: RotatingEarthProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) {
      return;
    }

    const size = Math.min(width, height);
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    const radius = size * 0.42;
    const projection = d3
      .geoOrthographic()
      .scale(radius)
      .translate([width / 2, height / 2])
      .clipAngle(90);
    const path = d3.geoPath().projection(projection).context(context);
    const graticule = d3.geoGraticule10();
    const rotation: [number, number] = [0, -12];

    const render = () => {
      context.clearRect(0, 0, width, height);
      projection.rotate(rotation);

      const oceanGradient = context.createRadialGradient(
        width * 0.38,
        height * 0.32,
        radius * 0.15,
        width / 2,
        height / 2,
        radius,
      );
      oceanGradient.addColorStop(0, "hsl(204 78% 36%)");
      oceanGradient.addColorStop(0.7, "hsl(209 68% 22%)");
      oceanGradient.addColorStop(1, "hsl(215 58% 12%)");

      context.beginPath();
      context.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
      context.fillStyle = oceanGradient;
      context.fill();
      context.strokeStyle = "hsl(197 80% 78% / 0.35)";
      context.lineWidth = 1;
      context.stroke();

      context.save();
      context.beginPath();
      context.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
      context.clip();

      context.beginPath();
      path(land);
      context.fillStyle = "hsl(132 34% 31%)";
      context.fill();
      context.strokeStyle = "hsl(92 42% 64% / 0.55)";
      context.lineWidth = 0.7;
      context.stroke();

      context.beginPath();
      path(land);
      context.shadowColor = "hsl(130 60% 18% / 0.55)";
      context.shadowBlur = 10;
      context.fillStyle = "hsl(92 38% 45% / 0.28)";
      context.fill();
      context.shadowBlur = 0;

      context.beginPath();
      path(graticule);
      context.strokeStyle = "hsl(198 80% 82% / 0.18)";
      context.lineWidth = 0.7;
      context.stroke();
      context.restore();

      const atmosphere = context.createRadialGradient(
        width / 2,
        height / 2,
        radius * 0.72,
        width / 2,
        height / 2,
        radius * 1.08,
      );
      atmosphere.addColorStop(0, "hsl(0 0% 100% / 0)");
      atmosphere.addColorStop(0.78, "hsl(196 90% 80% / 0.08)");
      atmosphere.addColorStop(1, "hsl(196 90% 75% / 0.32)");

      context.beginPath();
      context.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
      context.fillStyle = atmosphere;
      context.fill();
      context.strokeStyle = "hsl(198 88% 78% / 0.45)";
      context.lineWidth = 1.5;
      context.stroke();

      points.forEach((point) => {
        const projected = projection([point.longitude, point.latitude]);
        if (!projected) {
          return;
        }

        const visible = d3.geoDistance(
          [point.longitude, point.latitude],
          [-rotation[0], -rotation[1]],
        ) < Math.PI / 2;
        if (!visible) {
          return;
        }

        const pointRadius = Math.min(10, 3 + Math.sqrt(point.votes ?? 1) * 2);
        context.beginPath();
        context.arc(projected[0], projected[1], pointRadius + 4, 0, Math.PI * 2);
        context.fillStyle = "hsl(173 80% 45% / 0.18)";
        context.fill();
        context.beginPath();
        context.arc(projected[0], projected[1], pointRadius, 0, Math.PI * 2);
        context.fillStyle = "hsl(173 80% 45%)";
        context.fill();
        context.strokeStyle = "hsl(0 0% 100% / 0.8)";
        context.lineWidth = 1;
        context.stroke();
      });
    };

    const timer = d3.timer(() => {
      rotation[0] += 0.25;
      render();
    });

    render();

    return () => timer.stop();
  }, [height, points, width]);

  return (
    <canvas
      ref={canvasRef}
      aria-label="Vote locations globe"
      className={`h-auto max-w-full rounded-md bg-background ${className}`}
    />
  );
}
