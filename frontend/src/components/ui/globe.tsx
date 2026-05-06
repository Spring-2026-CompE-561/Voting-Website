"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import * as topojson from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";

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

    let countries: ReturnType<typeof topojson.feature> | null = null;
    let timer: ReturnType<typeof d3.timer> | null = null;

    const render = () => {
      context.clearRect(0, 0, width, height);
      projection.rotate(rotation);

      // Ocean
      context.beginPath();
      context.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
      context.fillStyle = "hsl(210 50% 18%)";
      context.fill();
      context.strokeStyle = "hsl(210 16% 34%)";
      context.lineWidth = 1;
      context.stroke();

      // Land
      if (countries) {
        context.beginPath();
        path(countries);
        context.fillStyle = "hsl(140 25% 28%)";
        context.fill();
        context.strokeStyle = "hsl(140 20% 20%)";
        context.lineWidth = 0.5;
        context.stroke();
      }

      // Graticule grid
      context.beginPath();
      path(graticule);
      context.strokeStyle = "hsl(210 14% 55% / 0.2)";
      context.lineWidth = 0.5;
      context.stroke();

      // Vote location dots
      points.forEach((point) => {
        const projected = projection([point.longitude, point.latitude]);
        if (!projected) {
          return;
        }

        const visible =
          d3.geoDistance(
            [point.longitude, point.latitude],
            [-rotation[0], -rotation[1]],
          ) <
          Math.PI / 2;
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

    const start = () => {
      timer = d3.timer(() => {
        rotation[0] += 0.25;
        render();
      });
      render();
    };

    fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
      .then((r) => r.json())
      .then((world: Topology<{ countries: GeometryCollection }>) => {
        countries = topojson.feature(world, world.objects.countries);
        start();
      })
      .catch(() => {
        // If the fetch fails, still start the globe without land
        start();
      });

    return () => timer?.stop();
  }, [height, points, width]);

  return (
    <canvas
      ref={canvasRef}
      aria-label="Vote locations globe"
      className={`h-auto max-w-full rounded-md bg-background ${className}`}
    />
  );
}
