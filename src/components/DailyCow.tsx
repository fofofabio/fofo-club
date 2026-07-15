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
  const [quoteIdx, setQuoteIdx] = useState<number | null>(null);
  const [imgOk, setImgOk] = useState(false);
  // Each fresh quote mirrors the cow — she turns to think it over.
  const [flipped, setFlipped] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    setQuoteIdx(dayOfYear(new Date()) % COW_QUOTES.length);
    // If the image was already cached/complete before hydration, onLoad won't
    // fire — reconcile from the element's state on mount.
    const el = imgRef.current;
    if (el?.complete) setImgOk(el.naturalWidth > 0);
    const pending = timers.current;
    return () => pending.forEach((t) => window.clearTimeout(t));
  }, []);

  /** The cow turns around, the old thought puffs away, a new one drifts in. */
  function newMoo() {
    if (swapping || quoteIdx === null) return;
    setSwapping(true);
    setFlipped((f) => !f);
    timers.current.push(
      window.setTimeout(() => {
        setQuoteIdx((cur) => {
          if (cur === null) return cur;
          if (COW_QUOTES.length < 2) return cur;
          let next = cur;
          while (next === cur) {
            next = Math.floor(Math.random() * COW_QUOTES.length);
          }
          return next;
        });
      }, 280),
      window.setTimeout(() => setSwapping(false), 340),
    );
  }

  const quote = quoteIdx === null ? null : COW_QUOTES[quoteIdx];

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
        {/* the cow, big on the blue — oversized with negative margins so she
            fills the empty space without growing the card itself */}
        <div className="relative -mb-4 -mt-8 flex h-56 w-52 shrink-0 items-end justify-center sm:-mb-7 sm:-mt-12 sm:h-80 sm:w-72">
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
              "h-full w-full select-none object-contain transition-transform duration-500 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none",
              imgOk ? "block" : "hidden",
            )}
            style={{ transform: flipped ? "scaleX(-1)" : "scaleX(1)" }}
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
            <div
              className={clsx(
                "origin-left transition-all duration-300 motion-reduce:transition-none",
                swapping ? "scale-90 opacity-0 blur-[2px]" : "scale-100 opacity-100 blur-0",
              )}
            >
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

      {/* almost-hidden: ask the cow to think of something else */}
      <button
        type="button"
        onClick={newMoo}
        aria-label="show another quote"
        className="absolute bottom-2.5 right-5 z-10 font-mono text-[9px] lowercase tracking-[0.14em] text-white/30 transition-colors duration-200 hover:text-white/85 focus-visible:text-white/85"
      >
        new moo?
      </button>
    </div>
  );
}
