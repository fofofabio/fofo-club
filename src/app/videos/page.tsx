import type { Metadata } from "next";
import { Camera, Music, Play, Scissors, Smartphone, Sun } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import SectionFade from "@/components/Sectionfade";
import PageHeader from "@/components/PageHeader";
import Footer from "@/components/Footer";
import { videos } from "@/data/videos";

export const metadata: Metadata = {
  title: "Videos | Fofo Club",
  description: "Short films and action cam edits.",
};

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(`${dateStr}T12:00:00`));
}

export default function VideosPage() {
  const [featured, ...rest] = videos;

  return (
    <PageTransition>
      <main className="pb-24">

        {/* Header */}
        <PageHeader
          eyebrow="Videos"
          title="Film"
          description="Rides, trips, random afternoons. Stuff I wanted to remember."
        />

        {/* Featured — full-bleed dark strip */}
        {featured && (
          <SectionFade once threshold={0.05}>
            <div className="w-full bg-black">
              <div className="mx-auto max-w-7xl page-shell-wide py-10">
                <div className="grid gap-8 lg:grid-cols-[1fr_260px] lg:items-center">

                  {/* Embed */}
                  <div className="aspect-video w-full overflow-hidden border-[2.5px] border-white">
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${featured.youtubeId}?rel=0&modestbranding=1`}
                      title={featured.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      loading="lazy"
                      className="h-full w-full"
                    />
                  </div>

                  {/* Info */}
                  <div>
                    <div className="flex items-center gap-3">
                      <p className="meta text-white/40">{formatDate(featured.date)}</p>
                      {featured.duration && (
                        <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs text-white/50">
                          {featured.duration}
                        </span>
                      )}
                    </div>
                    <h2 className="mt-2 font-display text-3xl tracking-tight text-white leading-tight md:text-4xl">
                      {featured.title}
                    </h2>
                    <p className="mt-4 text-base leading-relaxed text-white/55">
                      {featured.description}
                    </p>
                    {featured.song && (
                      <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/40">
                        <Music className="h-3.5 w-3.5 shrink-0" />
                        {featured.song}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </SectionFade>
        )}

        {/* Archive grid */}
        {rest.length > 0 && (
          <SectionFade once threshold={0.1}>
            <div className="page-shell-wide mt-12">
              <div className="mb-6"><span className="nb-eyebrow">More</span></div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((video) => (
                  <a
                    key={`${video.youtubeId}-${video.date}`}
                    href={`https://www.youtube.com/watch?v=${video.youtubeId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="nb-card group overflow-hidden bg-black p-0"
                  >
                    <div className="relative aspect-video overflow-hidden">
                      <img
                        src={`https://img.youtube.com/vi/${video.youtubeId}/maxresdefault.jpg`}
                        alt={video.title}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105 group-hover:brightness-50"
                      />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 transition duration-300 group-hover:opacity-100">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg">
                          <Play className="h-5 w-5 translate-x-0.5 fill-black text-black" />
                        </div>
                      </div>
                      {video.duration && (
                        <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 font-mono text-xs text-white/90">
                          {video.duration}
                        </span>
                      )}
                    </div>

                    <div className="px-4 py-4">
                      <p className="meta text-white/35">{formatDate(video.date)}</p>
                      <h3 className="mt-1 font-display text-xl tracking-tight text-white leading-tight">
                        {video.title}
                      </h3>
                      <p className="mt-1.5 text-sm text-white/50">{video.description}</p>
                      {video.song && (
                        <div className="mt-3 flex items-center gap-1.5 text-xs text-white/30">
                          <Music className="h-3 w-3 shrink-0" />
                          {video.song}
                        </div>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </SectionFade>
        )}

        {/* Why + Setup */}
        <SectionFade once threshold={0.1}>
          <div className="page-shell-wide mt-16">

            {/* Summer 2026 callout */}
            <div className="mb-8 overflow-hidden border-[2.5px] border-black bg-fofo-blue px-6 py-8 text-white shadow-brutal md:px-8">
              <span className="nb-chip nb-chip-black">Project · Summer 2026</span>
              <h2 className="mt-2 font-display text-2xl tracking-tight md:text-3xl">
                One full summer, on camera.
              </h2>
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-white/75">
                My project this summer is to film at least a few seconds of everything I do.
                Rides, hangouts, random Tuesdays, whatever. I want to reach September and have
                the whole thing documented from start to finish. One full summer, properly
                captured for the first time.
              </p>
            </div>

            {/* Two columns */}
            <div className="grid gap-5 md:grid-cols-2">

              {/* Why */}
              <div className="nb-card bg-white px-6 py-6 md:px-7">
                <span className="nb-eyebrow">Why I film</span>
                <h3 className="mt-2 font-display text-2xl tracking-tight text-black">
                  The small stuff matters.
                </h3>
                <p className="mt-4 text-sm leading-7 text-black/65">
                  Lying in the grass on top of a mountain with nowhere to be. The vibe after a
                  long group ride when everyone is tired and happy. A random beautiful corner you
                  stumble into on a Tuesday. Those are the things I want to hold onto.
                </p>
                <p className="mt-4 text-sm leading-7 text-black/65">
                  There is something really special about being able to share these moments with
                  the people you experienced them with. Filming it means it lives somewhere after
                  the day is over. And honestly I just want to look back on all of it someday and
                  remember exactly how it felt.
                </p>
              </div>

              {/* Setup */}
              <div className="nb-card bg-white px-6 py-6 md:px-7">
                <span className="nb-eyebrow">Setup</span>
                <h3 className="mt-2 font-display text-2xl tracking-tight text-black">
                  What I shoot with.
                </h3>

                <div className="mt-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center border-[2px] border-black bg-fofo-paper">
                      <Camera className="h-4 w-4 text-black/50" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-black">DJI Osmo Action 6</p>
                      <p className="mt-0.5 text-sm text-black/50">
                        Main camera. Always shooting with an ND filter on it. It really pops
                        the image, colors look so much better especially in good outdoor light.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center border-[2px] border-black bg-fofo-paper">
                      <Smartphone className="h-4 w-4 text-black/50" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-black">iPhone 15 Pro</p>
                      <p className="mt-0.5 text-sm text-black/50">
                        When I don&apos;t have the action cam on me I just pull out my phone.
                        The 15 Pro shoots really well.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center border-[2px] border-black bg-fofo-paper">
                      <Scissors className="h-4 w-4 text-black/50" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-black">DaVinci Resolve Studio</p>
                      <p className="mt-0.5 text-sm text-black/50">
                        Where the actual editing happens. Color grading, longer cuts, the
                        whole thing.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center border-[2px] border-black bg-fofo-paper">
                      <Sun className="h-4 w-4 text-black/50" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-black">CapCut</p>
                      <p className="mt-0.5 text-sm text-black/50">
                        Quick cuts for socials, nothing more.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SectionFade>

      </main>

      <SectionFade once threshold={0.12}>
        <Footer />
      </SectionFade>

    </PageTransition>
  );
}
