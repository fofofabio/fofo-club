"use client";

export default function NotFoundClient() {
  return (
    // fixed full-viewport container prevents page scrolling and keeps content perfectly centered
    <main
      className="fixed inset-0 flex items-center justify-center bg-[var(--bg)] overflow-hidden p-6"
      role="main"
      aria-labelledby="notfound-title"
    >
      <div className="max-w-xl text-center w-full">
        <div className="mx-auto w-40 h-40 relative">
          <img
            src="/fofo-logo.png"
            alt="Fofo logo"
            className="mx-auto w-40 h-40 logo-404 logo-404-slowspin"
          />
        </div>

        <h1 id="notfound-title" className="mt-6 font-display text-8xl font-bold tracking-tighter">404</h1>
        <p className="mt-2 text-lg text-black/70">we can&apos;t find that page.</p>
        <p className="mt-3 font-pixel text-[11px] uppercase tracking-widest text-black/50">maybe one of these will help</p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {[
            ["home", "/"],
            ["blog", "/blog"],
            ["about", "/about"],
          ].map(([label, href]) => (
            <a
              key={href}
              href={href}
              className="inline-block border-[2px] border-black bg-white px-4 py-2 font-pixel text-[11px] uppercase tracking-widest transition-all hover:-translate-y-0.5 hover:bg-fofo-blue hover:text-white hover:shadow-brutal-sm"
            >
              {label}
            </a>
          ))}
        </div>

        <p className="mt-6 font-pixel text-[10px] uppercase tracking-widest text-black/40">or press your browser back button to return.</p>
      </div>
    </main>
  );
}
