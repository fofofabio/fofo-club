export default function Home() {
    return (
        <main className="mx-auto max-w-[100vw]">
            <section className="mx-auto max-w-5xl px-6 min-h-screen grid place-items-center text-center padding-bottom-hero">
                <div id="hero-words">
                    <h1 className="font-display text-3xl sm:text-5xl md:text-6xl leading-tight">
                        <span>Not a portfolio. Not a brand.</span>
                        <br />
                        <span>Not a startup. An experience.</span>
                    </h1>
                    <p className="mt-6 font-pixel text-s tracking-widest text-fofo-mist">
                        For Ordinary Fellows, Occasionally exceptional.
                    </p>
                </div>
            </section>

            {/* Section 2 — blue “about” panel (with optional image overlay) */}
            <section className="relative min-h-[100dvh] snap-start overflow-hidden">
                {/* solid blue base */}
                <div className="absolute inset-0 bg-fofo-blue" />

                {/* OPTIONAL: background image with blue overlay — replace path or comment out */}
                {/* tip: use a high-contrast, motiony image */}
                <img
                    src="/fofo-bg.jpg"
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover opacity-40 mix-blend-multiply pointer-events-none"
                />

                <div className="relative z-10 mx-auto max-w-5xl px-6 py-24 text-white">
                    <div className="meta text-white/70 mb-4">ABOUT</div>
                    <h2 className="font-display text-4xl md:text-6xl max-w-3xl">
                        Fofo Club is a creative project of Fabio Unterholzer.
                    </h2>
                    <p className="mt-5 max-w-2xl text-white/90 text-lg md:text-xl">
                        fofo club started in 2024. it wasn’t supposed to be
                        anything — just a space to make things i like. design
                        stuff, code things, print shirts for friends. it turned
                        into a little world about movement, connection, and
                        style. not serious, but honest. it’s about creating,
                        sharing, and going onward together.
                    </p>

                    <ul className="mt-10 grid gap-3 md:grid-cols-2">
                        <li className="meta-section">
                            Tools → code, tools, prototypes
                        </li>
                        <li className="meta-section">
                            Projects → design, art, experiments
                        </li>
                        <li className="meta-section">
                            Fun → games, toys, diversions
                        </li>
                        <li className="meta-section">
                            Gear → apparel, prints, swag
                        </li>
                        <li className="meta-section">
                            About → who I am, what this is
                        </li>
                    </ul>
                </div>
            </section>
        </main>
    );
}
