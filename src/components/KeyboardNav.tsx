"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Paper & Wire — the web as a place you love.
 * Single-key navigation: t/b/v route to the sections, ? and h go to about/home.
 * Mirrors the [t] [b] [v] [?] hints rendered in the hero. Ignored while the
 * user is typing in a field or holding a modifier (so browser shortcuts win).
 */
const ROUTES: Record<string, string> = {
    t: "/tools",
    b: "/blog",
    v: "/videos",
    "?": "/about",
    h: "/",
};

export default function KeyboardNav() {
    const router = useRouter();

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.metaKey || e.ctrlKey || e.altKey) return;

            const el = e.target as HTMLElement | null;
            const tag = el?.tagName;
            if (
                tag === "INPUT" ||
                tag === "TEXTAREA" ||
                tag === "SELECT" ||
                el?.isContentEditable
            ) {
                return;
            }

            const dest = ROUTES[e.key.toLowerCase()];
            if (dest) {
                e.preventDefault();
                router.push(dest);
            }
        };

        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [router]);

    return null;
}
