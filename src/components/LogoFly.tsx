"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

type AnimState = "collapsed" | "expanding" | "expanded" | "retracting";

export default function LogoFly() {
    const wrapRef = useRef<HTMLDivElement>(null); // fixed box whose origin sits on the NAV logo
    const imgRef = useRef<HTMLImageElement>(null);
    const [state, setState] = useState<AnimState>("expanded"); // start expanded

    // --- geometry helpers ------------------------------------------------------
    const getRect = () => {
        const anchor = document.getElementById(
            "fofo-navbar-logo"
        ) as HTMLImageElement | null;
        if (!anchor) return null;
        return anchor.getBoundingClientRect();
    };

    const measure = () => {
        const r = getRect();
        const wrap = wrapRef.current;
        const img = imgRef.current;
        if (!r || !wrap || !img) return null;

        const ax = r.left + r.width / 2;
        const ay = r.top + r.height / 2;
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;

        // Place wrapper center ON TOP of the navbar logo center
        wrap.style.left = `${ax}px`;
        wrap.style.top = `${ay}px`;

        // Ensure overlay image matches the navbar logo size when collapsed
        img.style.width = `${r.width}px`;
        img.style.height = `${r.height}px`;

        const target = 0.8 * Math.min(window.innerWidth, window.innerHeight); // expanded diameter
        const scale = target / r.width; // base → expanded
        const dx = cx - ax;
        const dy = cy - ay;

        return { dx, dy, scale };
    };

    const setPageBlur = (on: boolean) => {
        document.documentElement.classList.toggle("fc-blur-on", on);
    };

    // --- visibility control (hide double logo + hero text) ---------------------
    const setVisibility = (s: AnimState) => {
        const anchor = document.getElementById(
            "fofo-navbar-logo"
        ) as HTMLImageElement | null;
        const hero = document.getElementById("hero-words");
        const wrap = wrapRef.current;

        const active =
            s === "expanding" || s === "expanded" || s === "retracting";
        setPageBlur(s === "expanding" || s === "expanded");
        if (anchor) {
            anchor.style.opacity = active ? "0" : "1";
            anchor.style.pointerEvents = active ? "none" : "auto";
            anchor.style.transition = "opacity 150ms linear";
        }
        if (hero) {
        }
        if (wrap) wrap.style.visibility = active ? "visible" : "hidden";
    };

    // --- mount: set expanded transform BEFORE first paint ----------------------
    useLayoutEffect(() => {
        const m = measure();
        const img = imgRef.current;
        if (!m || !img) return;
        img.style.transition = "none";
        // since wrapper sits on the NAV logo, expanded == translate to center + scale up
        img.style.transform = `translate(${m.dx}px, ${m.dy}px) scale(${m.scale}) rotate(390deg)`;
        setVisibility("expanded");
        // clear transition override
        void img.offsetWidth;
        img.style.transition = "";
    }, []);

    // --- keep geometry correct on resize (no animation jumps) ------------------
    useEffect(() => {
        const onResize = () => {
            const m = measure();
            const img = imgRef.current;
            if (!m || !img) return;
            img.style.transition = "none";
            if (state === "expanded" || state === "expanding") {
                img.style.transform = `translate(${m.dx}px, ${m.dy}px) scale(${m.scale}) rotate(390deg)`;
            } else {
                img.style.transform = `translate(0px, 0px) scale(1) rotate(0deg)`;
            }
            void img.offsetWidth;
            img.style.transition = "";
        };
        window.addEventListener("resize", onResize, { passive: true });
        return () => window.removeEventListener("resize", onResize);
    }, [state]);

    // --- discrete wheel interactions (never block scroll) ----------------------
    useEffect(() => {
        const onWheel = (e: WheelEvent) => {
            const img = imgRef.current;
            if (!img) return;

            // Expanded → scroll down = retract
            if (state === "expanded" && e.deltaY > 0) {
                const m = measure();
                if (!m) return;
                setState("retracting");
                setVisibility("retracting");
                img.style.transition =
                    "transform 0.9s cubic-bezier(.2,.8,.2,1)";
                // Retract to wrapper origin (navbar center)
                img.style.transform = `translate(0px, 0px) scale(1) rotate(0deg)`;
                // after finish, show real navbar logo and hide overlay
                const done = () => {
                    img.removeEventListener("transitionend", done);
                    setState("collapsed");
                    setVisibility("collapsed");
                    // tiny nudge so continued scroll moves the page
                    if (window.scrollY < 1) window.scrollTo({ top: 1 });
                };
                img.addEventListener("transitionend", done);
                return;
            }

            // Collapsed near top → scroll up = expand
            if (state === "collapsed" && window.scrollY <= 24 && e.deltaY < 0) {
                const m = measure();
                if (!m) return;
                setState("expanding");
                setVisibility("expanding");
                img.style.transition =
                    "transform 0.9s cubic-bezier(.2,.8,.2,1)";
                img.style.transform = `translate(${m.dx}px, ${m.dy}px) scale(${m.scale}) rotate(390deg)`;
                const done = () => {
                    img.removeEventListener("transitionend", done);
                    setState("expanded");
                    setVisibility("expanded");
                    if (window.scrollY !== 0) window.scrollTo({ top: 0 });
                };
                img.addEventListener("transitionend", done);
                return;
            }
            // otherwise do nothing special; native scrolling continues
        };

        window.addEventListener("wheel", onWheel, { passive: true });
        return () => window.removeEventListener("wheel", onWheel);
    }, [state]);

    return (
        <>
            {/* Blur layer sits behind the logo, blurring the page */}
            <div className="fc-blur-layer" />

            <div
                ref={wrapRef}
                className="pointer-events-none fixed z-[60] -translate-x-1/2 -translate-y-1/2"
                style={{ left: 0, top: 0, visibility: "visible" }}
            >
                <img ref={imgRef} src="/fofo-logo.png" alt="Fofo Club logo" />
            </div>
        </>
    );
}
