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
        "relative overflow-hidden rounded-[28px] border-[2.5px] border-black bg-fofo-blue shadow-brutal",
        className,
      )}
    >
      {/* quiet wiring label */}
      <span className="pointer-events-none absolute left-6 top-4 z-10 font-mono text-[10px] uppercase tracking-[0.14em] text-white/55">
        cow of wisdom · daily
      </span>

      <div className="flex flex-col items-center gap-4 px-6 pb-6 pt-10 sm:flex-row sm:items-end sm:gap-6 sm:px-8 sm:pb-8 sm:pt-12">
        {/* the cow, sitting big on the blue */}
        <div className="relative flex h-44 w-40 shrink-0 items-end justify-center sm:h-60 sm:w-52">
          {!imgOk ? (
            <div className="flex h-full w-full items-center justify-center rounded-2xl border-2 border-dashed border-white/40 bg-white/10 p-2 text-center">
              <span className="font-mono text-[10px] leading-tight text-white/60">
                cow-thinker.png
              </span>
            </div>
          ) : null}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={src}
            alt="the thinking cow"
            className={clsx(
              "h-full w-full select-none object-contain",
              imgOk ? "block" : "hidden",
            )}
            onLoad={(e) => {
              if (e.currentTarget.naturalWidth > 0) setImgOk(true);
            }}
            onError={() => setImgOk(false)}
          />
        </div>

        {/* the thought bubble */}
        <div className="relative flex-1 self-center sm:pl-4">
          {/* trail of little thought puffs leading from the cow up to the cloud */}
          <span
            aria-hidden
            className="absolute -left-1 bottom-2 hidden h-4 w-4 rounded-full border-[2.5px] border-black bg-white sm:block"
          />
          <span
            aria-hidden
            className="absolute left-3 -bottom-2 hidden h-2.5 w-2.5 rounded-full border-[2.5px] border-black bg-white sm:block"
          />

          <div className="relative rounded-[36px] border-[2.5px] border-black bg-white px-7 py-7 shadow-brutal-sm sm:px-9 sm:py-9">
            <p className="font-display text-2xl font-bold leading-[1.1] tracking-tight text-black sm:text-4xl">
              {quote ? `${quote}` : "…"}
            </p>
            <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-black/35">
              — the thinking cow
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
