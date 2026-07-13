import SectionFade from "@/components/Sectionfade";
import HeroUnit from "@/components/HeroUnit";
import GalleryGrid from "@/components/GalleryGrid";
import Marquee from "@/components/Marquee";
import SelectedWork from "@/components/SelectedWork";
import StatsStrip from "@/components/StatsStrip";
import ExploreIndex from "@/components/ExploreIndex";
import Footer from "@/components/Footer";
import PageTransition from "@/components/PageTransition"; // <-- add this

export default function Home() {
  return (
    <PageTransition>
      <main className="mx-auto max-w-[100vw] overflow-x-clip">
        <SectionFade once threshold={0.4}>
          <HeroUnit /> {/* text + right-aligned logo centered as a unit */}
        </SectionFade>

        {/* Play something — real tools, surfaced right below the fold */}
        <SectionFade once threshold={0.15} baseClass="fc-stamp" inClass="fc-stamp-in">
          <SelectedWork />
        </SectionFade>

        {/* scrolling ticker */}
        <Marquee />

        {/* punchy numbers */}
        <SectionFade once threshold={0.2} baseClass="fc-stamp" inClass="fc-stamp-in">
          <div className="py-16">
            <StatsStrip />
          </div>
        </SectionFade>

        {/* ABOUT — editorial blue block */}
        <SectionFade once threshold={0.25}>
          <section className="relative snap-start overflow-hidden border-y-[2.5px] border-black bg-fofo-blue text-white">
            <div className="relative z-10 mx-auto grid max-w-6xl gap-12 px-6 py-28 md:py-40 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
              {/* left: the statement */}
              <div className="relative">
                {/* handwritten margin note in the gutter */}
                <span
                  aria-hidden
                  className="fc-margin-note absolute -left-4 top-16 hidden -rotate-6 text-white/60 md:block lg:-left-12"
                >
                  ← kept saying this,
                  <br />
                  finally believe it
                </span>
                <div className="mb-6">
                  <span className="nb-chip nb-chip-black">02 · About</span>
                </div>
                <h2 className="fc-revised font-display text-4xl font-bold leading-[0.95] tracking-tight md:text-6xl">
                  not a <s>portfolio</s>.
                  <br />
                  <span className="nb-mark text-black">a public notebook.</span>
                </h2>
                <p className="mt-8 max-w-md text-lg text-white/90">
                  fofo club is the creative project of{" "}
                  <span className="font-bold">fabio unterholzer</span>, a place to
                  keep track of what he&apos;s learning, trying, and running toward,
                  out loud and in public.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <span className="nb-tag nb-tag-blue border-white">est. 2024</span>
                  <span className="nb-tag nb-tag-blue border-white">graz, at</span>
                  <span className="nb-tag nb-tag-blue border-white">shared honestly</span>
                </div>
              </div>

              {/* right: the long read, in a bordered card */}
              <div className="nb-card bg-white p-6 text-black md:p-8">
                <p className="text-[15px] leading-relaxed text-black/80">
                  fofo club started in 2024. at the time, it wasn&apos;t meant to
                  become anything in particular. i just needed a name for things i
                  was working on. adding &ldquo;club&rdquo; wasn&apos;t about
                  building a brand; it&apos;s the idea that most things are better
                  when they&apos;re shared, even if it&apos;s just progress or
                  half-finished ideas. what began as a placeholder turned into a
                  space where i collect what i&apos;m working on at any given
                  moment: sometimes training, sometimes code or design, sometimes
                  ideas that go nowhere. not everything here is polished, and it
                  isn&apos;t supposed to be. it&apos;s closer to a notebook that
                  happens to be public. if someone else finds something useful,
                  relatable, or inspiring along the way, that&apos;s a bonus, not
                  the goal.
                </p>
              </div>
            </div>
          </section>
        </SectionFade>

        {/* THE INDEX — bold navigation */}
        <SectionFade once threshold={0.15} baseClass="fc-stamp" inClass="fc-stamp-in">
          <ExploreIndex />
        </SectionFade>

        {/* IMAGE GRID — wired background + blue duotone */}
        <SectionFade once threshold={0.15}>
          <GalleryGrid
            maxPerRow={4}
            targetRowH={250}
            items={[
              { src: "/grid/1.png", w: 1600, h: 2000 },
              { src: "/grid/2.png", w: 2000, h: 2400 },
              { src: "/grid/3.png", w: 1000, h: 1000 },
              { src: "/grid/4.png", w: 3000, h: 3000 },
              { src: "/grid/5.png", w: 2400, h: 2400 },
              { src: "/grid/6.png", w: 1600, h: 2000 },
            ]}
          />
        </SectionFade>

        <Footer />
      </main>
    </PageTransition>
  );
}
