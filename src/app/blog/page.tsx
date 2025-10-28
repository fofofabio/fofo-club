import PaceGrid from "@/components/Pacegrid";
import PageTransition from "@/components/PageTransition";
import SectionFade from "@/components/Sectionfade";
import { getStravaActivitiesCached } from "@/lib/strava";
import Footer from "@/components/Footer";

export const revalidate = 600;

export default async function BlogPage({
  searchParams,
}: {
  searchParams?: { show?: string };
}) {
  const resolvedParams = await searchParams;
  const show = Math.max(1, Math.min(Number(resolvedParams?.show) || 12, 60));
  try {
    const activities = await getStravaActivitiesCached(30); // fetch more, filter client
    if (!activities?.length) throw new Error("no activities");

    return (
      <PageTransition>
        <main className="mx-auto max-w-5xl px-6 pb-24 fc-section-variant">
          <SectionFade once threshold={0.15}>
            <PaceGrid activities={activities} show={show} />
          </SectionFade>
          
        </main>
        <SectionFade once threshold={0.12}>
            <Footer />
          </SectionFade>
      </PageTransition>
    );
  } catch (e: any) {
    return (
      <PageTransition>
        <main className="page-padding">
          <SectionFade once threshold={0.2}>
            <p className="meta text-fofo-blue">strava</p>
            <p className="mt-2 text-sm">{e?.message || "failed to load"}</p>
          </SectionFade>
        </main>
      </PageTransition>
    );
  }
}
