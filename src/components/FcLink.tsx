"use client";

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/**
 * Paper & Wire — hypertext link. The web as a place you love: blue owns the
 * link (blue = live/interactive), and on hover the real destination surfaces
 * in a mono chip. External links open in a new tab; internal ones route.
 */
function prettyUrl(href: string): string {
    if (href.startsWith("mailto:")) return href.replace("mailto:", "");
    if (href.startsWith("/")) return href;
    try {
        const u = new URL(href);
        return u.host.replace(/^www\./, "") + (u.pathname !== "/" ? u.pathname : "");
    } catch {
        return href;
    }
}

type Props = {
    href: string;
    children: ReactNode;
    className?: string;
} & Omit<ComponentProps<typeof Link>, "href" | "className" | "children">;

export default function FcLink({ href, children, className = "", ...rest }: Props) {
    const external = /^https?:/.test(href);
    const glyph = external ? "↗ " : href.startsWith("mailto:") ? "✉ " : "→ ";

    return (
        <span className="group relative inline-flex">
            <Link
                href={href}
                className={`fc-link ${className}`}
                {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
                {...rest}
            >
                {children}
            </Link>
            <span
                aria-hidden
                className="pointer-events-none absolute left-0 top-full z-20 mt-1.5 translate-y-1 whitespace-nowrap border-[2px] border-black bg-fofo-blue px-1.5 py-0.5 font-mono text-[10px] lowercase tracking-[0.06em] text-white opacity-0 shadow-brutal-sm transition-all duration-150 group-hover:translate-y-0 group-hover:opacity-100"
            >
                {glyph}
                {prettyUrl(href)}
            </span>
        </span>
    );
}
