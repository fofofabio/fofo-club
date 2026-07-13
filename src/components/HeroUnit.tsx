"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import SectionFade from "./Sectionfade";
import Stars from "./Stars";

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

  const size = Math.max(180, Math.min(blockH, 420));

  return (
    <section className="relative mx-auto w-full max-w-6xl px-6 min-h-[82vh] flex items-center pb-20">
      <Stars />
      {/* rotated sticker, top-right */}
      <SectionFade once threshold={0.25} delay={200}>
        <div className="pointer-events-none absolute right-6 top-24 hidden md:block">
          <div className="nb-sticker max-w-[15rem] rotate-[-6deg]">
            For Ordinary Fellows,
            <br />
            Occasionally Exceptional
          </div>
        </div>
      </SectionFade>

      <div className="grid w-full items-center gap-10 md:grid-cols-[minmax(0,1fr)_auto]">
        {/* headline block */}
        <div ref={wordsRef} className="text-left">
          <h1
            className="
              font-display font-bold
              text-5xl sm:text-7xl md:text-[5.5rem]
              leading-[0.95]
              tracking-[-0.02em]
              [text-wrap:balance]
            "
          >
            <span className="block">not a portfolio.</span>
            <span className="block">not a brand.</span>
            <span className="block text-fofo-blue">an experience.</span>
          </h1>

          <p className="mt-7 max-w-xl text-base sm:text-lg text-black/80">
            heya! im <span className="font-bold">fabio</span>. this is where i
            keep what i&apos;m working on.{" "}
            <span className="nb-mark font-medium">out loud and in public.</span>
          </p>
        </div>

        {/* animated logo */}
        <SectionFade once threshold={0.25} delay={120}>
          <div className="flex flex-shrink-0 justify-center md:justify-end">
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
