"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

type AnimState = "collapsed" | "expanding" | "expanded" | "retracting";

export default function LogoFly() {
    const pathname = usePathname();
    const isHome = pathname === "/";
    const wrapRef = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);
    const [state, setState] = useState<AnimState>("expanded");
    const stateRef = useRef<AnimState>("expanded");
    const initializedRef = useRef<boolean>(false);
    const spinAnimRef = useRef<Animation | null>(null);
    const currentMRef = useRef<{ dx: number; dy: number; scale: number } | null>(null);
    const consumedFirstScroll = useRef(false);
    const touchStartY = useRef<number | null>(null);

    const setAnimState = (s: AnimState) => {
        stateRef.current = s;
        setState(s);
    };

    // ---- blur/navbar sync
    useEffect(() => {
        const resetNavbar = () => {
            const anchor = document.getElementById("fofo-navbar-logo") as HTMLImageElement | null;
            if (anchor) {
                anchor.style.opacity = "1";
                anchor.style.pointerEvents = "auto";
                anchor.style.transition = "";
            }
        };
        if (!isHome) {
            document.documentElement.classList.remove("fc-blur-on");
            resetNavbar();
            if (wrapRef.current) wrapRef.current.style.visibility = "hidden";
        } else {
            const shouldBlur = state === "expanding" || state === "expanded";
            document.documentElement.classList.toggle("fc-blur-on", shouldBlur);
        }
    }, [isHome, state]);

    useEffect(() => {
        return () => {
            document.documentElement.classList.remove("fc-blur-on");
            const anchor = document.getElementById("fofo-navbar-logo") as HTMLImageElement | null;
            if (anchor) {
                anchor.style.opacity = "1";
                anchor.style.pointerEvents = "auto";
                anchor.style.transition = "";
            }
        };
    }, []);

    // ---- geometry
    const measure = () => {
        const anchor = document.getElementById("fofo-navbar-logo") as HTMLImageElement | null;
        const wrap = wrapRef.current;
        const img = imgRef.current;
        if (!anchor || !wrap || !img) return null;

        const r = anchor.getBoundingClientRect();
        const ax = r.left + r.width / 2;
        const ay = r.top + r.height / 2;
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;

        wrap.style.left = `${ax}px`;
        wrap.style.top = `${ay}px`;
        img.style.width = `${r.width}px`;
        img.style.height = `${r.height}px`;

        const target = 0.8 * Math.min(window.innerWidth, window.innerHeight);
        const scale = target / r.width;
        const dx = cx - ax;
        const dy = cy - ay;

        const m = { dx, dy, scale };
        currentMRef.current = m;
        return m;
    };

    // ---- staggered blur: slow dreamy fade-in, faster clear on retract
    const setPageBlur = (on: boolean, isRetract = false) => {
        document.documentElement.style.setProperty(
            "--fc-blur-dur",
            on ? "1200ms" : isRetract ? "600ms" : "450ms"
        );
        document.documentElement.classList.toggle("fc-blur-on", on);
    };

    // ---- visibility
    const setVisibility = (s: AnimState) => {
        const anchor = document.getElementById("fofo-navbar-logo") as HTMLImageElement | null;
        const wrap = wrapRef.current;
        const active = s === "expanding" || s === "expanded" || s === "retracting";
        setPageBlur(s === "expanding" || s === "expanded", s === "retracting");

        if (anchor) {
            if (s === "retracting") {
                anchor.style.opacity = "0";
                anchor.style.transition = "opacity 150ms ease-in";
            } else if (s === "collapsed") {
                anchor.style.opacity = "1";
                anchor.style.transition = "opacity 300ms ease-out";
            } else {
                anchor.style.opacity = active ? "0" : "1";
                anchor.style.transition = "opacity 150ms ease";
            }
            anchor.style.pointerEvents = active ? "none" : "auto";
        }

        if (wrap) {
            if (s === "collapsed") {
                // Fade out animated logo simultaneously with navbar fade-in (no flash)
                wrap.style.transition = "opacity 300ms ease-out";
                wrap.style.opacity = "0";
                setTimeout(() => {
                    if (wrapRef.current && stateRef.current === "collapsed") {
                        wrapRef.current.style.visibility = "hidden";
                        wrapRef.current.style.opacity = "1";
                        wrapRef.current.style.transition = "";
                    }
                }, 300);
            } else {
                wrap.style.opacity = "1";
                wrap.style.transition = "";
                wrap.style.visibility = "visible";
            }
        }
    };

    // ---- continuous spin
    const startContinuousSpin = (m: { dx: number; dy: number; scale: number }) => {
        const img = imgRef.current;
        if (!img || spinAnimRef.current) return;
        spinAnimRef.current = img.animate(
            [
                { transform: `translate(${m.dx}px, ${m.dy}px) scale(${m.scale}) rotate(390deg)` },
                { transform: `translate(${m.dx}px, ${m.dy}px) scale(${m.scale}) rotate(750deg)` },
            ],
            { duration: 10000, iterations: Infinity, easing: "linear" }
        );
    };

    // Reads the current rotation angle, cancels the spin, and freezes the
    // img transform at that angle. Returns the angle (0–360) for caller use.
    const stopContinuousSpin = (): number => {
        const img = imgRef.current;
        const anim = spinAnimRef.current;

        let angle = 30; // fallback: 390deg mod 360
        if (img) {
            const matrix = new DOMMatrix(getComputedStyle(img).transform);
            const raw = Math.atan2(matrix.b, matrix.a) * (180 / Math.PI);
            angle = raw < 0 ? raw + 360 : raw;
        }

        if (!anim || !img) return angle;

        const m = currentMRef.current;

        // Write the frozen inline transform BEFORE cancelling. WAAPI still overrides
        // it visually while active, but the instant cancel() fires the inline value is
        // already at the correct angle — no snap-back flash to the old inline state.
        if (m) {
            img.style.transform = `translate(${m.dx}px, ${m.dy}px) scale(${m.scale}) rotate(${angle}deg)`;
        }

        anim.cancel();
        spinAnimRef.current = null;

        img.style.transition = "none";
        void img.offsetWidth;

        return angle;
    };

    // ---- initial mount
    useLayoutEffect(() => {
        if (!isHome) return;
        const m = measure();
        const img = imgRef.current;
        if (!m || !img) return;

        img.style.transition = "none";
        const isDirectLoad =
            !document.referrer ||
            document.referrer.indexOf(window.location.origin) === -1;
        const isHomepage = window.location.pathname === "/";

        if ((isDirectLoad && isHomepage) || !isDirectLoad || initializedRef.current) {
            img.style.transform = `translate(${m.dx}px, ${m.dy}px) scale(${m.scale}) rotate(390deg)`;
            setVisibility("expanded");
            setAnimState("expanded");
            initializedRef.current = true;
            void img.offsetWidth;
            img.style.transition = "";
            requestAnimationFrame(() => startContinuousSpin(m));
        } else {
            img.style.transform = `translate(0px, 0px) scale(1) rotate(0deg)`;
            setVisibility("collapsed");
            setAnimState("collapsed");
            void img.offsetWidth;
            img.style.transition = "";
        }
    }, [isHome]);

    // ---- keep geometry on resize
    useEffect(() => {
        if (!isHome) return;
        const onResize = () => {
            const m = measure();
            const img = imgRef.current;
            if (!m || !img) return;

            if (stateRef.current === "expanded") {
                stopContinuousSpin();
                img.style.transition = "none";
                img.style.transform = `translate(${m.dx}px, ${m.dy}px) scale(${m.scale}) rotate(390deg)`;
                void img.offsetWidth;
                img.style.transition = "";
                requestAnimationFrame(() => startContinuousSpin(m));
            } else if (stateRef.current === "expanding") {
                img.style.transform = `translate(${m.dx}px, ${m.dy}px) scale(${m.scale}) rotate(390deg)`;
            } else {
                img.style.transition = "none";
                img.style.transform = `translate(0px, 0px) scale(1) rotate(0deg)`;
                void img.offsetWidth;
                img.style.transition = "";
            }
        };
        window.addEventListener("resize", onResize, { passive: true });
        return () => window.removeEventListener("resize", onResize);
    }, [isHome]);

    // ---- cleanup after interrupted transition
    const cleanupAnimation = () => {
        const img = imgRef.current;
        if (!img) return;
        const m = measure();
        if (!m) return;

        stopContinuousSpin();
        img.style.transition = "none";

        if (stateRef.current === "expanded" || stateRef.current === "expanding") {
            img.style.transform = `translate(${m.dx}px, ${m.dy}px) scale(${m.scale}) rotate(390deg)`;
            setAnimState("expanded");
            setVisibility("expanded");
            consumedFirstScroll.current = false;
            void img.offsetWidth;
            img.style.transition = "";
            requestAnimationFrame(() => startContinuousSpin(m));
        } else {
            img.style.transform = `translate(0px, 0px) scale(1) rotate(0deg)`;
            setAnimState("collapsed");
            setVisibility("collapsed");
            void img.offsetWidth;
            img.style.transition = "";
        }
    };

    // ---- retract: yanked easing + one full backward spin
    const retract = () => {
        const img = imgRef.current;
        if (!img || state === "retracting" || state === "collapsed") return;

        setAnimState("retracting");
        setVisibility("retracting");

        // Capture current spin angle, cancel idle rotation, freeze inline transform
        const currentAngle = stopContinuousSpin();

        img.style.transition = "none";
        void img.offsetWidth;

        // Always land at rotate(-360deg) = visual 0° (upright).
        // Since currentAngle ∈ [0, 360), backward rotation is always [360, 720) — a full spin.
        img.style.transition = "transform 0.9s cubic-bezier(0.7, 0, 0.3, 1)";
        img.style.transform = `translate(0px, 0px) scale(1) rotate(-360deg)`;

        // Safety net: if transitionend never fires (tab blur, interrupted
        // transition, missed event) the state would stay stuck on "retracting"
        // and the wheel handler would keep blocking scroll forever. Force-settle.
        let fallbackId = 0;
        const done = (e?: TransitionEvent) => {
            if (e && e.propertyName !== "transform") return;
            clearTimeout(fallbackId);
            img.removeEventListener("transitionend", done);
            img.removeEventListener("transitioncancel", interrupted);
            setAnimState("collapsed");
            setVisibility("collapsed");
        };
        const interrupted = () => {
            clearTimeout(fallbackId);
            img.removeEventListener("transitioncancel", interrupted);
            cleanupAnimation();
        };
        img.addEventListener("transitionend", done);
        img.addEventListener("transitioncancel", interrupted);
        fallbackId = window.setTimeout(() => done(), 1100);
    };

    // ---- gestures
    useEffect(() => {
        if (!isHome) return;
        const onWheel = (e: WheelEvent) => {
            const atTop = window.scrollY <= 10;

            if ((state === "expanded" || state === "expanding") && e.deltaY > 0 && atTop) {
                if (!consumedFirstScroll.current) {
                    e.preventDefault();
                    consumedFirstScroll.current = true;
                }
                retract();
                return;
            }
            if (state === "retracting" && e.deltaY > 0) {
                e.preventDefault();
                return;
            }
            // Intro plays once: after the logo retracts into the navbar it stays
            // docked — scrolling back to the top no longer re-expands it.
        };

        const onTouchStart = (e: TouchEvent) => {
            touchStartY.current = e.touches[0]?.clientY ?? null;
        };

        const onTouchMove = (e: TouchEvent) => {
            if (touchStartY.current == null) return;
            const y = e.touches[0]?.clientY ?? touchStartY.current;
            const dy = touchStartY.current - y;
            const atTop = window.scrollY <= 10;

            if ((state === "expanded" || state === "expanding") && dy > 6 && atTop) {
                if (!consumedFirstScroll.current) {
                    e.preventDefault();
                    consumedFirstScroll.current = true;
                }
                retract();
                return;
            }
            if (state === "retracting" && dy > 6) {
                e.preventDefault();
                return;
            }
            // Intro plays once — no re-expand on scroll back to top.
        };

        window.addEventListener("wheel", onWheel, { passive: false });
        window.addEventListener("touchstart", onTouchStart, { passive: true });
        window.addEventListener("touchmove", onTouchMove, { passive: false });
        return () => {
            window.removeEventListener("wheel", onWheel);
            window.removeEventListener("touchstart", onTouchStart);
            window.removeEventListener("touchmove", onTouchMove);
        };
    }, [state, isHome]);

    // ---- render
    return (
        <>
            {isHome && <div className="fc-blur-layer" />}

            {isHome && (
                <div
                    ref={wrapRef}
                    className="pointer-events-none fixed z-[60] -translate-x-1/2 -translate-y-1/2"
                    style={{ left: 0, top: 0, visibility: "visible" }}
                >
                    <img
                        ref={imgRef}
                        src="/fofo-logo.png"
                        alt="Fofo Club logo"
                    />
                </div>
            )}

            {/* Scroll hint */}
            {isHome && (
                <div
                    className="pointer-events-none fixed bottom-8 left-1/2 z-[61] -translate-x-1/2 transition-opacity duration-500"
                    style={{ opacity: state === "expanded" ? 1 : 0 }}
                >
                    <div className="flex flex-col items-center gap-1.5">
                        <span className="font-mono text-[9px] tracking-[0.2em] text-white/35 uppercase">
                            scroll
                        </span>
                        <svg
                            className="animate-bounce h-3.5 w-3.5 text-white/25"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M19 9l-7 7-7-7"
                            />
                        </svg>
                    </div>
                </div>
            )}
        </>
    );
}
