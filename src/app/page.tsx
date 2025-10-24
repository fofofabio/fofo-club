import SectionFade from "@/components/Sectionfade";
import HeroUnit from "@/components/HeroUnit";
import GalleryGrid from "@/components/GalleryGrid";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="mx-auto max-w-[100vw]">
      <SectionFade once={false} threshold={0.6}>
        <HeroUnit /> {/* <-- text + right-aligned logo centered as a unit */}
      </SectionFade>

      {/* Section 2 — blue “about” panel (with optional image overlay) */}
      <SectionFade once={false} threshold={0.25}>
        <section className="relative min-h-[100dvh] snap-start overflow-hidden">
          {/* solid blue base */}
          <div className="absolute inset-0 bg-fofo-blue" />

          {/* OPTIONAL: background image with blue overlay — replace path or comment out */}
          {/* tip: use a high-contrast, motiony image */}

          <div className="relative z-10 mx-auto max-w-5xl px-6 py-24 text-white">
            <div className="meta text-white/70 mb-4">ABOUT</div>
            <h2 className="font-display text-4xl md:text-6xl max-w-3xl">
              Fofo Club is a creative project of Fabio Unterholzer.
            </h2>
            <p className="mt-5 max-w-2xl text-white/90 text-lg md:text-xl">
              fofo club started in 2024. it wasn’t supposed to be anything —
              just a space to make things i like. design stuff, code things,
              print shirts for friends. it turned into a little world about
              movement, connection, and style. not serious, but honest. it’s
              about creating, sharing, and learning.
            </p>

            <ul className="mt-10 grid gap-3 md:grid-cols-2">
              <li className="meta-section">Tools → code, tools, prototypes</li>
              <li className="meta-section">
                Projects → design, art, experiments
              </li>
              <li className="meta-section">Fun → games, toys, diversions</li>
              <li className="meta-section">Gear → apparel, prints, swag</li>
              <li className="meta-section">About → who I am, what this is</li>
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
  );
}
