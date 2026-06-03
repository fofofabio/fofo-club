import SectionFade from "@/components/Sectionfade";
import HeroUnit from "@/components/HeroUnit";
import GalleryGrid from "@/components/GalleryGrid";
import Footer from "@/components/Footer";
import PageTransition from "@/components/PageTransition"; // <-- add this

export default function Home() {
  return (
    <PageTransition>
      <main className="mx-auto max-w-[100vw]">
        <SectionFade once={false} threshold={0.6}>
          <HeroUnit /> {/* text + right-aligned logo centered as a unit */}
        </SectionFade>

        {/* Section 2 — blue “about” panel */}
        <SectionFade once={false} threshold={0.25}>
          <section className="relative min-h-[100dvh] snap-start overflow-hidden">
            <div className="absolute inset-0 bg-fofo-blue" />
            <div className="relative z-10 mx-auto max-w-5xl px-6 py-24 text-white">
              <div className="meta text-white/70 mb-4">ABOUT</div>
              <h2 className="font-display text-4xl md:text-6xl max-w-3xl">
                Fofo Club is a creative project of Fabio Unterholzer.
              </h2>
              <p className="mt-5 max-w-2xl text-white/90 text-lg md:text-xl">
                fofo club started in 2024. at the time, it wasn’t meant to
                become anything in particular. i just needed a name for things i
                was working on, and using my nickname felt like the simplest
                option. adding “club” wasn’t about creating a brand or a
                community in the usual sense. it’s more about the idea that most
                things in life are better when they’re shared, even if it’s just
                sharing progress, thoughts, or half-finished ideas. what began
                as a placeholder slowly turned into a space where i collect what
                i’m working on at any given moment. sometimes that’s sports and
                training, sometimes coding or design, sometimes ideas that don’t
                go anywhere. not everything here is polished or finished, and
                it’s not supposed to be. this space exists so things don’t stay
                only in my head. fofo club isn’t a portfolio and it’s not a
                statement. it’s closer to a notebook that happens to be public.
                i use it to keep track of what i’m learning, what i’m trying,
                and what interests me right now. if someone else finds something
                useful, relatable, or inspiring along the way, that’s a bonus -
                but it’s not the goal. there’s no expectation to understand
                everything here or to follow along with all of it. you can dip
                in, take what makes sense to you, and ignore the rest. that’s
                fine. fofo club is simply a record of doing things, paying
                attention, and sharing honestly.{" "}
              </p>

              <ul className="mt-10 grid gap-3 md:grid-cols-2">
                <li className="meta-section">
                  Tools → code, tools, prototypes
                </li>
                <li className="meta-section">
                  Projects → design, art, experiments
                </li>
                <li className="meta-section">
                  Blog → thoughts, projects, updates
                </li>
                <li className="meta-section">
                  Videos → rides, trips, random days
                </li>
                <li className="meta-section">
                  About → who I am, what this is
                </li>
              </ul>
            </div>
          </section>
        </SectionFade>

        {/* IMAGE GRID — wired background + blue duotone */}
        <SectionFade once={false} threshold={0.15}>
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
