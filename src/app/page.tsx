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
                fofo club started in 2024. it wasn’t supposed to be anything special. just a codename because i thought if you do something, anything at all, it’s better to do it with a name, a brand, a vibe. so i picked my nickname - fofo - and slapped on club because life is better when shared with others. and here we are. fofo club is my personal space to share my thoughts, projects, and passions with you. whether it’s sports, coding, or just exploring new ideas, fofo club is all about connection and community. welcome to the club. i’m glad you’re here.
              </p>

              <ul className="mt-10 grid gap-3 md:grid-cols-2">
                <li className="meta-section">Tools → code, tools, prototypes</li>
                <li className="meta-section">Projects → design, art, experiments</li>
                <li className="meta-section">Blog → thoughts, projects, updates</li>
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
    </PageTransition>
  );
}
