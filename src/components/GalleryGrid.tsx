// src/components/GalleryGridJustified.tsx
"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

type Item = { src: string; alt?: string; w: number; h: number };

export default function GalleryGridJustified({
  items,
  targetRowH = 220,
  gap = 12,
  maxPerRow = 3,
}: {
  items: Item[];
  targetRowH?: number;
  gap?: number;
  maxPerRow?: number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [wrapW, setWrapW] = useState<number>(1000);

  // measure container width
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setWrapW(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  // build rows
  const rows = useMemo(() => {
    const result: { items: (Item & { wPx: number; hPx: number })[]; h: number }[] = [];
    let row: Item[] = [];
    let rowAR = 0;

    const flush = () => {
      if (row.length === 0) return;
      const gaps = gap * (row.length - 1);
      const scale = (wrapW - gaps) / (rowAR * targetRowH);
      const hPx = Math.round(targetRowH * scale);
      const sized = row.map((it) => {
        const ar = it.w / it.h;
        const wPx = Math.round(hPx * ar);
        return { ...it, wPx, hPx };
      });
      result.push({ items: sized, h: hPx });
      row = [];
      rowAR = 0;
    };

    for (const it of items) {
      const ar = it.w / it.h;
      const nextCount = row.length + 1;
      const wouldBeAR = rowAR + ar;

      // cap items per row
      if (nextCount > maxPerRow) {
        flush();
      }

      row.push(it);
      rowAR += ar;

      // If adding next would exceed width a lot, flush now
      const predictedW = wouldBeAR * targetRowH + gap * (nextCount - 1);
      if (predictedW > wrapW * 1.1 || nextCount === maxPerRow) {
        flush();
      }
    }

    // last row: keep target height (no stretch to full width)
    if (row.length) {
      const hPx = targetRowH;
      const sized = row.map((it) => {
        const ar = it.w / it.h;
        return { ...it, wPx: Math.round(hPx * ar), hPx };
      });
      result.push({ items: sized, h: hPx });
    }

    return result;
  }, [items, wrapW, gap, targetRowH, maxPerRow]);

  return (
    <section className="relative isolate">
      <div className="absolute inset-0 grid-bg pointer-events-none" />
      <div ref={wrapRef} className="relative mx-auto max-w-5xl px-6 py-16">
        <div className="flex flex-col gap-[--g]" style={{ ["--g" as any]: `${gap}px` }}>
          {rows.map((row, r) => (
            <div key={r} className="flex gap-[--g]">
              {row.items.map((it, i) => (
                <figure
                  key={i}
                  className="relative overflow-hidden rounded-xl"
                  style={{ width: it.wPx, height: it.hPx }}
                >
                  <Image src={it.src} alt={it.alt ?? ""} fill className="object-cover" sizes={`${it.wPx}px`} />
                  <div className="absolute inset-0 bg-fofo-blue mix-blend-multiply opacity-20" />
                </figure>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
