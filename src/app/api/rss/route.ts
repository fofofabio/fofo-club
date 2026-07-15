import { blogStories } from "@/data/blogStories";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://fofoclub.at";
  const feedUrl = `${siteUrl}/api/rss`;
  const now = new Date().toUTCString();

  const items = [...blogStories]
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    )
    .map((story) => {
      const storyUrl = `${siteUrl}/blog/${story.slug}`;
      const publishedDate = new Date(story.publishedAt).toUTCString();
      return [
        "<item>",
        `<title>${escapeXml(story.title)}</title>`,
        `<link>${escapeXml(storyUrl)}</link>`,
        `<guid>${escapeXml(storyUrl)}</guid>`,
        `<pubDate>${publishedDate}</pubDate>`,
        `<description>${escapeXml(story.summary)}</description>`,
        "</item>",
      ].join("");
    })
    .join("");

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    "<channel>",
    "<title>Fofo Club</title>",
    `<link>${escapeXml(siteUrl)}</link>`,
    "<description>Fofo Club blog feed</description>",
    "<language>en-us</language>",
    `<lastBuildDate>${now}</lastBuildDate>`,
    `<atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" xmlns:atom="http://www.w3.org/2005/Atom" />`,
    items,
    "</channel>",
    "</rss>",
  ].join("");

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
