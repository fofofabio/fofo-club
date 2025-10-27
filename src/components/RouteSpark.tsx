// src/components/RouteSpark.tsx
"use client";
import React, { useMemo } from "react";
import clsx from "clsx";
import { decodePolyline } from "@/lib/decodePolyline";

export default function RouteSpark({
  polyline,
  variant = "run",
  className,
}: {
  polyline: string | null;
  variant?: "run" | "ride";
  className?: string;
}) {
  if (!polyline) return <div className={clsx("bg-fofo-mist/20", className)} />;

  const points = useMemo(() => decodePolyline(polyline), [polyline]);
  const xs = points.map((p) => p[1]);
  const ys = points.map((p) => p[0]);
  const minX = Math.min(...xs),
    maxX = Math.max(...xs);
  const minY = Math.min(...ys),
    maxY = Math.max(...ys);
  const w = maxX - minX || 1,
    h = maxY - minY || 1;

  const vbW = 1000,
    vbH = 500;
  const pad = 14;
  const scale = Math.min((vbW - pad * 2) / w, (vbH - pad * 2) / h);

  const drawW = w * scale,
    drawH = h * scale;
  const offsetX = (vbW - drawW) / 2 - minX * scale;
  const offsetY = (vbH - drawH) / 2 + maxY * scale;

  const d = points
    .map(([lat, lon], i) => {
      const x = lon * scale + offsetX;
      const y = -lat * scale + offsetY;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const color =
    variant === "ride" ? "!text-fofo-pink" : "!text-fofo-blue";

  return (
    <svg
      viewBox={`0 0 ${vbW} ${vbH}`}
      className={clsx("block w-full bg-fofo-mist/15", className)}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth={4}
        className={color}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
