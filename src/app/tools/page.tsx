import PageTransition from "@/components/PageTransition";
import SectionFade from "@/components/Sectionfade";
import WeatherCard from "@/components/WeatherCard";
import Footer from "@/components/Footer";

export default function ToolsPage() {
  return (
    <PageTransition>
      <main className="relative isolate mx-auto max-w-5xl px-6 py-16 lg:py-24">
        <div className="absolute inset-0 grid-bg pointer-events-none" />
        <SectionFade once threshold={0.12}>
          <header className="mb-10">
            <p className="meta text-fofo-blue">TOOLS</p>
            <h1 className="mt-2 font-semibold leading-tight tracking-tight text-4xl md:text-5xl">
              Weather. simple.
            </h1>
            <p className="mt-3 max-w-2xl text-black/60">
              Type a city — get a clean 5-day read.
            </p>
          </header>

          <WeatherCard defaultCity="Graz" />
        </SectionFade>
        
      </main>
      <SectionFade once threshold={0.12}>
            <Footer />
        </SectionFade>
    </PageTransition>
  );
}