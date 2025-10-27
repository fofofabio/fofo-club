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

        <h1 id="notfound-title" className="mt-6 text-7xl font-bold">404</h1>
        <p className="mt-2 text-lg text-fofo-mist">We can't find that page.</p>
        <p className="mt-3 text-sm text-fofo-mist/80">Maybe one of these will help:</p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <a
            href="/"
            className="inline-block px-4 py-2 rounded-md border border-black/10 bg-white hover:shadow-md"
          >
            Home
          </a>
          <a
            href="/blog"
            className="inline-block px-4 py-2 rounded-md border border-black/10 bg-white hover:shadow-md"
          >
            Blog
          </a>
          <a
            href="/about"
            className="inline-block px-4 py-2 rounded-md border border-black/10 bg-white hover:shadow-md"
          >
            About
          </a>
        </div>

        <p className="mt-6 text-xs text-fofo-mist/60">Or press your browser back button to return.</p>
      </div>
    </main>
  );
}
