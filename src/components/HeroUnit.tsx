"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import SectionFade from "./Sectionfade";

export default function HeroUnit({
  logoSrc = "/logotriangle.png",
}: {
  logoSrc?: string;
}) {
  const wordsRef = useRef<HTMLDivElement>(null);
  const [blockH, setBlockH] = useState(0);

  useEffect(() => {
    const el = wordsRef.current;
    if (!el) return;
    const update = () => setBlockH(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  const size = Math.max(140, blockH);

  return (
    <section className="mx-auto max-w-5xl px-6 min-h-screen grid place-items-center text-center padding-bottom-hero">
      <div className="flex flex-col items-center justify-center sm:flex-row sm:items-center sm:gap-8">
        <div
          ref={wordsRef}
          className="flex flex-col items-center sm:items-end text-center sm:text-right"
        >
          <h1
            className="
      font-display
      text-3xl sm:text-5xl md:text-6xl
      leading-[1.05] sm:leading-[1.03]
      tracking-[-0.01em]
      max-w-[18ch] sm:max-w-[20ch]
      [text-wrap:balance]   /* auto-balance lines */
      [text-wrap:pretty]    /* avoid ugly widows/orphans */
    "
          >
            <span className="block">Not a portfolio. Not a brand.</span>
            <span className="block">
              Not a startup.&nbsp;
              <span className="text-fofo-blue">An experience.</span>
            </span>
          </h1>

          <p className="mt-5 font-pixel text-s tracking-widest text-fofo-mist/80">
            For Ordinary Fellows, Occasionally exceptional.
          </p>
        </div>
        <SectionFade once threshold={0.25} delay={120}>
        <div className="mt-8 sm:mt-0 sm:ml-8 flex-shrink-0">
          <div className="relative" style={{ width: size, height: size }}>
            <Image
              src={logoSrc}
              alt="Fofo Club logo"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>
        </SectionFade>
      </div>
    </section>
  );
}
