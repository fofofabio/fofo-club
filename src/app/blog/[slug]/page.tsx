import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageTransition from "@/components/PageTransition";
import SectionFade from "@/components/Sectionfade";
import Footer from "@/components/Footer";
import { blogStories } from "@/data/blogStories";

export function generateStaticParams() {
  return blogStories.map((story) => ({ slug: story.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const resolved = await params;
  const story = blogStories.find((s) => s.slug === resolved.slug);
  if (!story) {
    return {
      title: "Story not found - Fofo Club",
      description: "The requested story is missing.",
    };
  }

  return {
    title: `${story.title} - Fofo Club`,
    description: story.summary,
    openGraph: {
      title: story.title,
      description: story.summary,
      url: `https://fofoclub.at/blog/${story.slug}`,
      type: "article",
      images: story.heroImage
        ? [{ url: story.heroImage, alt: story.heroImageAlt }]
        : undefined,
    },
  };
}

export default async function BlogStoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const story = blogStories.find((s) => s.slug === slug);
  if (!story) notFound();

  return (
    <PageTransition>
      <article className="mx-auto max-w-2xl px-6 pb-24">
        <SectionFade once threshold={0.12}>
          <div className="mb-8 mt-10 flex flex-col items-start gap-4 text-black">
            <Link
              href="/blog"
              className="border-[2px] border-black bg-white px-3 py-1.5 font-pixel text-[11px] uppercase tracking-widest transition-all hover:-translate-y-0.5 hover:bg-fofo-blue hover:text-white hover:shadow-brutal-sm"
            >
              ← back to blog
            </Link>
            {story.kicker && (
              <span className="nb-eyebrow">{story.kicker}</span>
            )}
            <h1 className="font-display text-4xl font-bold tracking-tight md:text-6xl">
              {story.title}
            </h1>
            <time className="font-pixel text-xs uppercase tracking-widest text-black/50">
              {new Date(story.publishedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </time>
          </div>

          <div className="relative mb-12 overflow-hidden border-[2.5px] border-black bg-black/60 shadow-brutal">
            <div className="relative aspect-[20/9] w-full">
              <img
                src={story.heroImage}
                alt={story.heroImageAlt}
                className="absolute inset-0 h-full w-full object-cover grayscale"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/20 mix-blend-multiply" />
            </div>
            {story.heroImageCredit && (
              <span className="meta absolute bottom-5 left-5 text-white/60">
                {story.heroImageCredit}
              </span>
            )}
          </div>
        </SectionFade>

        <SectionFade once threshold={0.1}>
          <div className="space-y-6 text-base leading-relaxed text-black/80">
            {story.body.map((paragraph, idx) => (
              <p key={idx}>{paragraph}</p>
            ))}
          </div>
        </SectionFade>
      </article>
      <SectionFade once threshold={0.12}>
        <Footer />
      </SectionFade>
    </PageTransition>
  );
}
