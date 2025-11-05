import Link from "next/link";
import PaceGrid from "@/components/Pacegrid";
import PageTransition from "@/components/PageTransition";
import SectionFade from "@/components/Sectionfade";
import Footer from "@/components/Footer";
import { blogStories } from "@/data/blogStories";
import { getStravaActivitiesCached } from "@/lib/strava";

export const revalidate = 600;

export default async function BlogPage({
  searchParams,
}: {
  searchParams?: { show?: string };
}) {
  const resolvedParams = await searchParams;
  const show = Math.max(1, Math.min(Number(resolvedParams?.show) || 12, 60));

  const orderedStories = [...blogStories].sort(
    (a, b) => Number(Boolean(b.highlight)) - Number(Boolean(a.highlight))
  );

  try {
    const activities = await getStravaActivitiesCached(30);
    if (!activities?.length) throw new Error("no activities");

    return (
      <PageTransition>
        <main className="pb-24 fc-section-variant">
          <div className="space-y-0">
            {orderedStories.map((story) => (
              <SectionFade key={story.slug} once threshold={0.12} className="block">
                <Link
                  href={`/blog/${story.slug}`}
                  className="group block w-full overflow-hidden bg-black text-white"
                  aria-label={`Read story: ${story.title}`}
                >
                  <div className="relative h-[32vh] min-h-[300px] sm:h-[40vh]">
                    <img
                      src={story.heroImage}
                      alt={story.heroImageAlt}
                      className="absolute inset-0 h-full w-full object-cover grayscale transition duration-700 ease-out group-hover:scale-[1.03] group-hover:grayscale-0"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/60 to-black/30 transition-opacity duration-700 group-hover:opacity-100" />
                    <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
                      <h2 className="font-display text-3xl font-semibold tracking-tight text-fofo-blue md:text-4xl lg:text-[2.75rem]">
                        {story.title}
                      </h2>
                    </div>
                  </div>
                </Link>
              </SectionFade>
            ))}
          </div>

          <div className="mx-auto mt-16 max-w-5xl px-6">
            <SectionFade once threshold={0.15}>
              <PaceGrid activities={activities} show={show} />
            </SectionFade>
          </div>
        </main>
        <SectionFade once threshold={0.12}>
          <Footer />
        </SectionFade>
      </PageTransition>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed to load";
    return (
      <PageTransition>
        <main className="page-padding">
          <SectionFade once threshold={0.2}>
            <p className="meta text-fofo-blue">strava</p>
            <p className="mt-2 text-sm">{message}</p>
          </SectionFade>
        </main>
      </PageTransition>
    );
  }
}
