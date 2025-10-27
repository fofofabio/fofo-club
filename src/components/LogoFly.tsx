"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

type AnimState = "collapsed" | "expanding" | "expanded" | "retracting";

export default function LogoFly() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [state, setState] = useState<AnimState>("expanded");
  const initializedRef = useRef<boolean>(false);

  // Flag: block the first page scroll once after expansion
  const consumedFirstScroll = useRef(false);
  const touchStartY = useRef<number | null>(null);

  // ------------------------------------------------ geometry
  const getRect = () => {
    const anchor = document.getElementById("fofo-navbar-logo") as HTMLImageElement | null;
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

    wrap.style.left = `${ax}px`;
    wrap.style.top = `${ay}px`;

    img.style.width = `${r.width}px`;
    img.style.height = `${r.height}px`;

    const target = 0.8 * Math.min(window.innerWidth, window.innerHeight);
    const scale = target / r.width;
    const dx = cx - ax;
    const dy = cy - ay;

    return { dx, dy, scale };
  };

  const setPageBlur = (on: boolean) => {
    document.documentElement.classList.toggle("fc-blur-on", on);
  };

  // ------------------------------------------------ visibility
  const setVisibility = (s: AnimState) => {
    const anchor = document.getElementById("fofo-navbar-logo") as HTMLImageElement | null;
    const wrap = wrapRef.current;
    const active = s === "expanding" || s === "expanded" || s === "retracting";
    setPageBlur(s === "expanding" || s === "expanded");

    if (anchor) {
      // Adjust timings for smoother transition
      if (s === "retracting") {
        // Keep the animated logo visible during retraction
        anchor.style.opacity = "0";
        anchor.style.transition = "opacity 150ms ease-in";
      } else if (s === "collapsed") {
        // Fade in the navbar logo after retraction
        anchor.style.opacity = "1";
        anchor.style.transition = "opacity 300ms ease-out";
      } else {
        // Normal cases (expanding/expanded)
        anchor.style.opacity = active ? "0" : "1";
        anchor.style.transition = "opacity 150ms ease";
      }
      
      anchor.style.pointerEvents = active ? "none" : "auto";
    }
    
    // Keep the animated logo visible until the transition is complete
    if (wrap) {
      if (s === "collapsed") {
        // Delay hiding the animated logo until the navbar logo is visible
        setTimeout(() => {
          if (wrapRef.current && state === "collapsed") {
            wrapRef.current.style.visibility = "hidden";
          }
        }, 150);
      } else {
        wrap.style.visibility = "visible";
      }
    }
  };

  // ------------------------------------------------ initial mount
  useLayoutEffect(() => {
    const m = measure();
    const img = imgRef.current;
    if (!m || !img) return;

    img.style.transition = "none";
    const isDirectLoad = !document.referrer || document.referrer.indexOf(window.location.origin) === -1;
    const isHomepage = window.location.pathname === "/";
    
    // Expand on homepage direct load or when navigating between pages
    if ((isDirectLoad && isHomepage) || !isDirectLoad || initializedRef.current) {
      img.style.transform = `translate(${m.dx}px, ${m.dy}px) scale(${m.scale}) rotate(390deg)`;
      setVisibility("expanded");
      setState("expanded");
      initializedRef.current = true;
    } else {
      // Collapse on direct loads to non-homepage routes
      img.style.transform = `translate(0px, 0px) scale(1) rotate(0deg)`;
      setVisibility("collapsed");
      setState("collapsed");
    }

    void img.offsetWidth;
    img.style.transition = "";
  }, []);

  // ------------------------------------------------ keep geometry on resize
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

  // ------------------------------------------------ animations
  const cleanupAnimation = () => {
    const img = imgRef.current;
    if (!img) return;
    const m = measure();
    if (!m) return;

    // Force state based on position
    const currentTransform = img.style.transform;
    const isExpanded = currentTransform.includes('390deg');
    
    img.style.transition = "none";
    if (isExpanded) {
      setState("expanded");
      setVisibility("expanded");
      img.style.transform = `translate(${m.dx}px, ${m.dy}px) scale(${m.scale}) rotate(390deg)`;
      consumedFirstScroll.current = false;
    } else {
      setState("collapsed");
      setVisibility("collapsed");
      img.style.transform = `translate(0px, 0px) scale(1) rotate(0deg)`;
    }
    void img.offsetWidth;
    img.style.transition = "";
  };

  const retract = () => {
    const img = imgRef.current;
    if (!img || state === "retracting" || state === "collapsed") return;

    setState("retracting");
    setVisibility("retracting");
    img.style.transition = "transform 0.9s cubic-bezier(.2,.8,.2,1)";
    img.style.transform = `translate(0px, 0px) scale(1) rotate(0deg)`;

    const done = (e?: TransitionEvent) => {
      if (e && e.propertyName !== 'transform') return;
      img.removeEventListener("transitionend", done);
      setState("collapsed");
      setVisibility("collapsed");
    };

    const interrupted = () => {
      img.removeEventListener("transitioncancel", interrupted);
      cleanupAnimation();
    };

    img.addEventListener("transitionend", done);
    img.addEventListener("transitioncancel", interrupted);
  };

  const expand = () => {
    const img = imgRef.current;
    const m = measure();
    if (!img || !m || state === "expanding" || state === "expanded") return;

    setState("expanding");
    setVisibility("expanding");
    img.style.transition = "transform 0.9s cubic-bezier(.2,.8,.2,1)";
    img.style.transform = `translate(${m.dx}px, ${m.dy}px) scale(${m.scale}) rotate(390deg)`;

    const done = (e?: TransitionEvent) => {
      if (e && e.propertyName !== 'transform') return;
      img.removeEventListener("transitionend", done);
      setState("expanded");
      setVisibility("expanded");
      // 🔄 reset "ignore first scroll" each time we fully expand again
      consumedFirstScroll.current = false;
      try { sessionStorage.setItem('fofoLogoInit', '1'); } catch (e) {}
    };

    const interrupted = () => {
      img.removeEventListener("transitioncancel", interrupted);
      cleanupAnimation();
    };

    img.addEventListener("transitionend", done);
    img.addEventListener("transitioncancel", interrupted);
  };

  // ------------------------------------------------ gestures
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      const atTop = window.scrollY <= 10; // More forgiving top threshold

      // Expanded + scroll down = retract
      if ((state === "expanded" || state === "expanding") && e.deltaY > 0 && atTop) {
        if (!consumedFirstScroll.current) {
          e.preventDefault();
          consumedFirstScroll.current = true;
        }
        retract();
        return;
      }

      // Collapsed + scroll up = expand
      if ((state === "collapsed" || state === "retracting") && atTop && e.deltaY < 0) {
        expand();
        return;
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0]?.clientY ?? null;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (touchStartY.current == null) return;
      const y = e.touches[0]?.clientY ?? touchStartY.current;
      const dy = touchStartY.current - y; // >0 = finger up (scroll down)
      const atTop = window.scrollY <= 10; // More forgiving top threshold

      // Expanded + swipe up -> retract
      if (state === "expanded" && dy > 6 && atTop) {
        if (!consumedFirstScroll.current) {
          e.preventDefault();
          consumedFirstScroll.current = true;
        }
        retract();
        return;
      }

      // Collapsed + swipe down -> expand
      if (state === "collapsed" && atTop && dy < -6) {
        expand();
        return;
      }
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });

    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, [state]);

  // ------------------------------------------------ render
  return (
    <>
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
