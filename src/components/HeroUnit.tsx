"use client";

import Image from "next/image";
import SectionFade from "./Sectionfade";
import Stars from "./Stars";

export default function HeroUnit({
  logoSrc = "/logotriangle.png",
}: {
  logoSrc?: string;
}) {
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
        <div className="text-left">
          <h1
            className="
              font-display font-bold
              text-5xl sm:text-7xl md:text-[5.5rem]
              leading-[0.95]
              tracking-[-0.02em]
              [text-wrap:balance]
            "
          >
            <span className="fc-revised block">
              not a <s>portfolio</s>.
            </span>
            <span className="fc-revised block">
              not a <s>brand</s>.
            </span>
            <span className="block text-fofo-blue">a notebook.</span>
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
            {/* Sized with clamp() — tracks the viewport natively, no
                ResizeObserver → setState → measure reflow loop. */}
            <div className="relative aspect-square w-[clamp(180px,32vw,420px)]">
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
