"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";

import { COW_QUOTES } from "@/data/cowQuotes";

/** Day-of-year, so the quote is stable for a whole day and rotates daily. */
function dayOfYear(date: Date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / 86_400_000);
}

type Props = {
  className?: string;
  /** Path to the cow image in /public. Falls back to a wired placeholder. */
  src?: string;
};

export default function DailyCow({ className, src = "/cow-thinker.png" }: Props) {
  // Compute on the client to avoid a server/client date hydration mismatch.
  const [quote, setQuote] = useState<string | null>(null);
  const [imgOk, setImgOk] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setQuote(COW_QUOTES[dayOfYear(new Date()) % COW_QUOTES.length]);
    // If the image was already cached/complete before hydration, onLoad won't
    // fire — reconcile from the element's state on mount.
    const el = imgRef.current;
    if (el?.complete) setImgOk(el.naturalWidth > 0);
  }, []);

  return (
    <div
      className={clsx(
        "overflow-hidden rounded-none border-[2.5px] border-black bg-white shadow-brutal",
        className,
      )}
    >
      {/* window title bar — shows the wiring */}
      <div className="flex items-center gap-2 border-b-[2.5px] border-black bg-black px-3 py-1.5">
        <span aria-hidden className="h-2 w-2 rounded-full bg-fofo-pink" />
        <span aria-hidden className="h-2 w-2 rounded-full bg-fofo-yellow" />
        <span aria-hidden className="h-2 w-2 rounded-full bg-fofo-blue" />
        <span className="ml-1 font-mono text-[10px] uppercase tracking-[0.12em] text-white/70">
          cow of wisdom
        </span>
        <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.12em] text-white/40">
          daily
        </span>
      </div>

      {/* body */}
      <div className="flex items-center gap-3 px-3 py-3">
        <div className="relative flex h-20 w-16 shrink-0 items-end justify-center">
          {/* Placeholder shows by default; the image reveals only once it loads
              successfully, so a missing file never leaves a broken icon. */}
          {!imgOk ? (
            <div className="flex h-full w-full items-center justify-center border border-dashed border-black/30 bg-black/[0.03] p-1 text-center">
              <span className="font-mono text-[8px] leading-tight text-black/40">
                cow-thinker.png
              </span>
            </div>
          ) : null}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={src}
            alt="the thinking cow"
            className={clsx("h-full w-full object-contain", imgOk ? "block" : "hidden")}
            onLoad={(e) => {
              if (e.currentTarget.naturalWidth > 0) setImgOk(true);
            }}
            onError={() => setImgOk(false)}
          />
        </div>

        {/* speech bubble in the human hand */}
        <div className="relative min-w-0 flex-1">
          <p className="font-hand text-xl leading-tight text-black">
            {quote ? `"${quote}"` : "…"}
          </p>
          <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-black/35">
            — the thinking cow
          </p>
        </div>
      </div>
    </div>
  );
}
