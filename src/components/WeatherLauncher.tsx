'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import WeatherCard from '@/components/WeatherCard';

function CloseIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={props.className}>
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export default function WeatherLauncher({ defaultCity = 'Graz' }: { defaultCity?: string }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock background scroll without shifting layout (fixed body technique)
  useEffect(() => {
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    // store previous inline values that we'll touch
    const prev = {
      position: document.body.style.position,
      top: document.body.style.top,
      paddingRight: document.body.style.paddingRight,
    } as const;

    if (open) {
      // compute scrollbar width and compensate with paddingRight to avoid layout shift
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.position = prev.position ?? '';
      document.body.style.top = prev.top ?? '';
      document.body.style.paddingRight = prev.paddingRight ?? '';
      // restore scroll
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const overlay = (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50"
        >
          {/* Backdrop */}
          <button
            aria-label="Close"
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
            className="absolute inset-0 flex items-start justify-center p-4 sm:p-8"
            aria-modal="true"
            role="dialog"
          >
            <div className="relative w-full max-w-5xl">
              <button
                onClick={() => setOpen(false)}
                className="absolute -right-1 -top-1 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white/90 text-black/70 shadow-sm backdrop-blur transition hover:scale-105 hover:text-black"
                aria-label="Close weather"
              >
                <CloseIcon className="h-4 w-4" />
              </button>

              {/* WeatherCard stays untouched */}
              <WeatherCard defaultCity={defaultCity} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm shadow-sm transition hover:-translate-y-0.5 hover:shadow"
      >
        <span className="meta text-fofo-blue">WEATHER</span>
        <span className="text-black/70">Open card</span>
      </button>

      {mounted ? createPortal(overlay, document.body) : null}
    </>
  );
}
