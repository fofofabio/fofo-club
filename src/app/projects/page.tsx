"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import PageTransition from "@/components/PageTransition";
import SectionFade from "@/components/Sectionfade";
import Footer from "@/components/Footer";

type ProjectStatus = "WIP" | "ITERATING" | "PLANNING" | "TRAINING";
type ProjectLink = { label: string; href?: string };
type Project = {
  id: string;
  title: string;
  summary: string;
  status: ProjectStatus;
  updated: string;
  notes: string;
  tags: string[];
  artifacts: {
    notes: number;
    sketches: number;
    runs: number;
    commits: number;
    assets: number;
  };
  touched: string;
  active?: boolean;
  stale?: boolean;
  peek: string;
  details: {
    overview: string[];
    next: string[];
    log: string[];
    links: ProjectLink[];
  };
};

type Folder = {
  id: string;
  label: string;
  title: string;
  updated: string;
  projects: Project[];
};

const filters: ProjectStatus[] = ["WIP", "ITERATING", "PLANNING", "TRAINING"];
const views = ["Folders", "List", "Board"] as const;

const folders: Folder[] = [
  {
    id: "apparel",
    label: "APPAREL",
    title: "Apparel",
    updated: "2026-01-27",
    projects: [
      {
        id: "fofo-racing-skinsuit",
        title: "Fofo Racing Skinsuit",
        summary: "Deep blue + black base, white sleeves, grid panels, and stamp accents.",
        status: "WIP",
        updated: "2026-01-27",
        notes: "08 notes",
        tags: ["cycling", "kit", "sponsor-block"],
        artifacts: {
          notes: 8,
          sketches: 4,
          runs: 0,
          commits: 0,
          assets: 6,
        },
        touched: "last touched today",
        active: true,
        peek:
          "Front wordmark reads like a sponsor, back script says \"Just passing through\" over the grid.",
        details: {
          overview: [
            "Deep blue and black base with clean white sleeves.",
            "Vertical grid motif across the blue panels for a technical feel.",
            "Wordmark sits like a sponsor but keeps a softer lifestyle tone.",
            "Back script adds the reflective line \"Just passing through\".",
            "Fofo Club ethos line anchors the story on the lower back.",
          ],
          next: [
            "Finalize sponsor block spacing and stamp sizing.",
            "Balance the pink/red accents against the blue panels.",
            "Confirm leg hem and sleeve cuff finishes.",
          ],
          log: [
            "2026-01-27 - refined grid density on the front panels.",
            "2026-01-23 - adjusted sponsor stack to classic kit proportions.",
            "2026-01-19 - locked the chest wordmark scale.",
          ],
          links: [
            { label: "deck" },
            { label: "layout" },
            { label: "notes" },
          ],
        },
      },
      {
        id: "friends-merch",
        title: "Friends Merch Project",
        summary: "First bigger merch project for friends, built to share.",
        status: "PLANNING",
        updated: "2026-01-21",
        notes: "03 notes",
        tags: ["merch", "friends", "drop"],
        artifacts: {
          notes: 3,
          sketches: 2,
          runs: 0,
          commits: 0,
          assets: 1,
        },
        touched: "last touched 6 days ago",
        peek: "Sorting sizes, blanks, and the first mark set.",
        details: {
          overview: [
            "First bigger merch release meant for friends and community.",
            "Focus on comfortable blanks and minimal Fofo marks.",
          ],
          next: [
            "Confirm blanks and size run.",
            "Lock in print or embroidery method.",
            "Draft the drop list and delivery timing.",
          ],
          log: [
            "2026-01-21 - set the core direction and first marks.",
            "2026-01-18 - collected friend sizes + preferences.",
          ],
          links: [{ label: "notes" }],
        },
      },
    ],
  },
  {
    id: "club",
    label: "CLUB",
    title: "Fofo Club",
    updated: "2026-01-24",
    projects: [
      {
        id: "fofo-club-website",
        title: "Fofo Club Website",
        summary: "Further improvements across pages, systems, and content.",
        status: "ITERATING",
        updated: "2026-01-24",
        notes: "05 notes",
        tags: ["web", "ui", "systems"],
        artifacts: {
          notes: 5,
          sketches: 1,
          runs: 0,
          commits: 12,
          assets: 2,
        },
        touched: "last touched 3 days ago",
        peek: "Workbench layout tightened, new inspector patterns.",
        details: {
          overview: [
            "Ongoing improvements to layout, utilities, and page language.",
            "Keep the workbench metaphor consistent across sections.",
          ],
          next: [
            "Finish the projects workbench polish.",
            "Clean up tool pages and unify metadata.",
            "Ship the new archive structure.",
          ],
          log: [
            "2026-01-24 - refactored project card stacks.",
            "2026-01-20 - updated navigation density.",
          ],
          links: [
            { label: "repo" },
            { label: "issues" },
          ],
        },
      },
    ],
  },
  {
    id: "endurance",
    label: "ENDURANCE",
    title: "Endurance",
    updated: "2026-01-18",
    projects: [
      {
        id: "marathon-training",
        title: "Marathon Training",
        summary: "Building the base, long runs, and controlled pace work.",
        status: "TRAINING",
        updated: "2026-01-18",
        notes: "04 notes",
        tags: ["running", "plan", "fitness"],
        artifacts: {
          notes: 4,
          sketches: 0,
          runs: 14,
          commits: 0,
          assets: 0,
        },
        touched: "last touched 9 days ago",
        peek: "Dialing the weekly rhythm and recovery balance.",
        details: {
          overview: [
            "Training block focused on base + long-run consistency.",
            "Goal is durable pacing and clean recovery rhythm.",
          ],
          next: [
            "Lock the 4-week progression cycle.",
            "Confirm tune-up race options.",
            "Audit recovery sleep + fueling plan.",
          ],
          log: [
            "2026-01-18 - set the long-run ladder.",
            "2026-01-12 - adjusted weekly volume.",
          ],
          links: [{ label: "plan" }],
        },
      },
    ],
  },
];

const stampClass =
  "font-pixel text-[10px] uppercase tracking-[0.28em] text-fofo-mist/90 transition-colors duration-[900ms] ease-[cubic-bezier(0.2,0.8,0.2,1)]";

export default function ProjectsPage() {
  const [activeFilter, setActiveFilter] = useState<ProjectStatus | "ALL">("ALL");
  const [activeView, setActiveView] = useState<(typeof views)[number]>("Folders");
  const [query, setQuery] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("fofo-racing-skinsuit");

  const allProjects = useMemo(
    () => folders.flatMap((folder) => folder.projects),
    []
  );

  const filteredFolders = useMemo(() => {
    const loweredQuery = query.trim().toLowerCase();
    return folders
      .map((folder) => {
        const projects = folder.projects.filter((project) => {
          const matchesFilter =
            activeFilter === "ALL" ? true : project.status === activeFilter;
          const matchesQuery =
            loweredQuery.length === 0
              ? true
              : [
                  project.title,
                  project.summary,
                  project.tags.join(" "),
                  project.status,
                ]
                  .join(" ")
                  .toLowerCase()
                  .includes(loweredQuery);
          return matchesFilter && matchesQuery;
        });
        return { ...folder, projects };
      })
      .filter((folder) => folder.projects.length > 0);
  }, [activeFilter, query]);

  const listItems = useMemo(
    () =>
      filteredFolders.flatMap((folder) =>
        folder.projects.map((project) => ({
          ...project,
          folderTitle: folder.title,
          folderLabel: folder.label,
        }))
      ),
    [filteredFolders]
  );

  const boardColumns = useMemo(() => {
    const columnStatuses =
      activeFilter === "ALL" ? filters : ([activeFilter] as ProjectStatus[]);
    return columnStatuses.map((status) => ({
      status,
      projects: listItems.filter((project) => project.status === status),
    }));
  }, [activeFilter, listItems]);

  const counts = useMemo(() => {
    const statusCounts = allProjects.reduce<Record<ProjectStatus, number>>(
      (acc, project) => {
        acc[project.status] += 1;
        return acc;
      },
      { WIP: 0, ITERATING: 0, PLANNING: 0, TRAINING: 0 }
    );

    return {
      active: allProjects.length,
      runs: allProjects.filter((project) => project.artifacts.runs > 0).length,
      systems: allProjects.filter((project) => project.tags.includes("systems")).length,
      statusCounts,
    };
  }, [allProjects]);

  const selectedProject =
    allProjects.find((project) => project.id === selectedProjectId) ||
    allProjects[0];

  const pathSlug = selectedProject?.id ?? "desk";
  return (
    <PageTransition>
      <div className="flex min-h-dvh flex-col">
        <main className="relative isolate flex-1">
          <div className="absolute inset-0 hidden lg:block grid-bg opacity-[0.08]" />

          <div className="relative mx-auto max-w-6xl px-6 py-14 lg:py-20">
            <SectionFade once threshold={0.15}>
              <header className="mb-10">
                <p className="meta text-fofo-blue/80">PROJECTS</p>
                <h1 className="mt-2 font-display text-4xl md:text-5xl leading-tight">
                  Workbench
                </h1>
                <p className="mt-3 max-w-2xl text-black/60">
                  Check out what I am currently working working on!
                </p>
              </header>
            </SectionFade>

            <SectionFade once threshold={0.12}>
              <div className="rounded-2xl border border-black/10 bg-white/80 p-4 lg:p-5">
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <div className="flex items-center gap-2 font-pixel text-[11px] uppercase tracking-[0.22em] text-black/50">
                    <span className="rounded-full border border-black/15 px-2 py-1">
                      path
                    </span>
                    <span className="text-black/40">projects / active / {pathSlug}</span>
                  </div>
                  <div className="ml-auto flex flex-1 items-center gap-3">
                    <label className="relative flex-1">
                      <span className="sr-only">Search projects</span>
                      <input
                        type="search"
                        placeholder="search the desk"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        className="w-full rounded-full border border-black/10 bg-white/80 px-4 py-2 text-sm text-black/70 outline-none transition duration-[900ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] focus:border-fofo-blue/50 focus:ring-2 focus:ring-fofo-blue/10"
                      />
                    </label>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setActiveFilter("ALL")}
                      className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.22em] transition duration-[900ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
                        activeFilter === "ALL"
                          ? "border-fofo-blue/60 bg-fofo-blue/10 text-fofo-blue"
                          : "border-black/10 text-black/50 hover:border-fofo-blue/60 hover:text-fofo-blue"
                      }`}
                    >
                      ALL
                    </button>
                    {filters.map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setActiveFilter(filter)}
                        className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.22em] transition duration-[900ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
                          activeFilter === filter
                            ? "border-fofo-blue/60 bg-fofo-blue/10 text-fofo-blue"
                            : "border-black/10 text-black/50 hover:border-fofo-blue/60 hover:text-fofo-blue"
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    {views.map((view) => (
                      <button
                        key={view}
                        aria-pressed={view === "Folders"}
                        onClick={() => setActiveView(view)}
                        className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.22em] transition duration-[900ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
                          activeView === view
                            ? "border-fofo-blue/60 bg-fofo-blue/10 text-fofo-blue"
                            : "border-black/10 text-black/50 hover:border-fofo-blue/60 hover:text-fofo-blue"
                        }`}
                      >
                        {view}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </SectionFade>

            <SectionFade once threshold={0.1}>
              <div className="mt-8 grid gap-8 lg:grid-cols-[180px_minmax(0,1fr)_320px]">
                <aside className="order-2 lg:order-none">
                  <div className="rounded-2xl border border-black/10 bg-white/70 p-4">
                    <div className="meta text-fofo-blue/70">bins</div>
                    <ul className="mt-4 space-y-2">
                      {[
                        { label: "Active", count: counts.active, active: true },
                        { label: "Archive", count: 0 },
                        { label: "Ideas", count: 0 },
                        { label: "Scraps", count: 0 },
                        { label: "Runs", count: counts.runs },
                        { label: "Systems", count: counts.systems },
                      ].map((item) => (
                        <li key={item.label}>
                          <button
                            className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-sm transition duration-[900ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
                              item.active
                                ? "border-fofo-blue/60 bg-fofo-mist/20 text-fofo-blue"
                                : "border-black/10 text-black/60 hover:border-fofo-blue/40 hover:text-fofo-blue"
                            }`}
                          >
                            <span className="font-display text-sm">{item.label}</span>
                            <span className="font-pixel text-[11px] uppercase tracking-[0.2em] text-black/40">
                              {item.count}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>

                </aside>

                <section className="order-1 lg:order-none">
                  {activeView === "Folders" && (
                    <div className="grid gap-5 md:grid-cols-2">
                      {filteredFolders.map((folder) => (
                        <div
                          key={folder.id}
                          className="group relative rounded-2xl border border-black/10 bg-white/80 p-5 transition duration-[900ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:-translate-y-0.5"
                        >
                          <div className="absolute inset-0 rounded-2xl border border-black/10 opacity-0 transition duration-[900ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover:translate-x-[1px] group-hover:translate-y-[1px] group-hover:opacity-100" />
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-pixel text-[11px] uppercase tracking-[0.28em] text-fofo-blue/70">
                                {folder.label}
                              </div>
                              <h3 className="mt-2 font-display text-xl">{folder.title}</h3>
                            </div>
                            <span className="text-xs text-black/40">
                              updated {folder.updated}
                            </span>
                          </div>

                          <div className="mt-4 space-y-3">
                            {folder.projects.map((project) => (
                              <div
                                key={project.title}
                                onClick={() => setSelectedProjectId(project.id)}
                                className={`group/project relative rounded-2xl border p-4 transition duration-[900ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
                                  project.active
                                    ? "border-fofo-blue/70 bg-fofo-mist/15"
                                    : "border-black/10 bg-white/70 hover:border-fofo-blue/40"
                                }`}
                              >
                                <div className="absolute right-3 top-3 text-black/40 opacity-0 transition duration-[900ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover/project:opacity-100">
                                  &gt;
                                </div>
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <h4 className="font-display text-base text-black/90">
                                      {project.title}
                                    </h4>
                                    <p className="mt-1 text-sm text-black/60">
                                      {project.summary}
                                    </p>
                                  </div>
                                </div>

                                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-black/50">
                                  <span
                                    className={`${stampClass} group-hover/project:text-fofo-blue`}
                                  >
                                    {project.status}
                                  </span>
                                  <span className="text-black/40">
                                    updated {project.updated}
                                  </span>
                                  <span className="text-black/40">{project.notes}</span>
                                </div>

                                <div className="mt-3 flex flex-wrap gap-2">
                                  {project.tags.map((tag) => (
                                    <span key={tag} className="badge text-black/60">
                                      {tag}
                                    </span>
                                  ))}
                                </div>

                                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-black/50">
                                  <span>notes {project.artifacts.notes}</span>
                                  <span>sketches {project.artifacts.sketches}</span>
                                  <span>runs {project.artifacts.runs}</span>
                                  <span>commits {project.artifacts.commits}</span>
                                  <span>assets {project.artifacts.assets}</span>
                                </div>

                                <div className="mt-2 flex items-center gap-2 text-xs text-black/40">
                                  <span>{project.touched}</span>
                                  {project.stale && (
                                    <span className="font-pixel text-[10px] uppercase tracking-[0.28em] text-fofo-blue/70">
                                      stale
                                    </span>
                                  )}
                                </div>

                                <div className="mt-3 max-h-0 overflow-hidden text-xs text-black/50 opacity-0 transition duration-[900ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover/project:max-h-16 group-hover/project:opacity-100">
                                  {project.peek}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeView === "List" && (
                    <div className="rounded-2xl border border-black/10 bg-white/80">
                      <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_120px] gap-4 border-b border-black/10 px-5 py-3 text-xs uppercase tracking-[0.22em] text-black/40">
                        <span>project</span>
                        <span>status</span>
                        <span>updated</span>
                      </div>
                      <div className="divide-y divide-black/10">
                        {listItems.map((project) => (
                          <button
                            key={project.id}
                            onClick={() => setSelectedProjectId(project.id)}
                            className="grid w-full grid-cols-[minmax(0,2fr)_minmax(0,1fr)_120px] gap-4 px-5 py-4 text-left transition duration-[900ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:bg-fofo-mist/20"
                          >
                            <div>
                              <div className="font-display text-base text-black/90">
                                {project.title}
                              </div>
                              <div className="mt-1 text-sm text-black/60">
                                {project.summary}
                              </div>
                              <div className="mt-2 text-[11px] uppercase tracking-[0.22em] text-black/40">
                                {project.folderLabel} · {project.folderTitle}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-black/50">
                              <span className={stampClass}>{project.status}</span>
                              <span>{project.notes}</span>
                            </div>
                            <div className="text-xs text-black/50"> {project.updated}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeView === "Board" && (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                      {boardColumns.map((column) => (
                        <div
                          key={column.status}
                          className="rounded-2xl border border-black/10 bg-white/80 p-4"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-pixel text-[11px] uppercase tracking-[0.28em] text-fofo-blue/70">
                              {column.status}
                            </span>
                            <span className="text-xs text-black/40">
                              {column.projects.length}
                            </span>
                          </div>
                          <div className="mt-3 space-y-3">
                            {column.projects.map((project) => (
                              <button
                                key={project.id}
                                onClick={() => setSelectedProjectId(project.id)}
                                className="w-full rounded-2xl border border-black/10 bg-white/70 p-4 text-left transition duration-[900ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:border-fofo-blue/40"
                              >
                                <div className="font-display text-sm text-black/90">
                                  {project.title}
                                </div>
                                <div className="mt-2 text-xs text-black/50 line-clamp-3">
                                  {project.summary}
                                </div>
                                <div className="mt-3 text-[10px] uppercase tracking-[0.22em] text-black/40">
                                  updated {project.updated}
                                </div>
                              </button>
                            ))}
                            {column.projects.length === 0 && (
                              <div className="rounded-2xl border border-dashed border-black/10 bg-white/60 p-4 text-xs uppercase tracking-[0.22em] text-black/30">
                                empty
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <aside className="order-3">
                  <div className="lg:sticky lg:top-24">
                    <div className="relative overflow-hidden rounded-2xl border border-black/10 bg-white/90 p-5">
                      <div className="absolute inset-0 grid-bg opacity-[0.08]" />
                      <div className="absolute inset-0 bg-fofo-blue/5" />
                      <div className="relative">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="meta text-fofo-blue/80">inspector</div>
                            <h3 className="mt-2 font-display text-xl">
                              {selectedProject?.title}
                            </h3>
                          </div>
                          <span className="rounded-full border border-fofo-blue/40 px-2 py-1 text-[10px] uppercase tracking-[0.22em] text-fofo-blue">
                            {selectedProject?.status}
                          </span>
                        </div>
                        <div className="mt-2 text-xs text-black/50">
                          updated {selectedProject?.updated}
                        </div>

                        <div className="mt-6 space-y-5 text-sm text-black/70">
                          <div>
                            <div className="font-pixel text-[11px] uppercase tracking-[0.28em] text-black/50">
                              overview
                            </div>
                            <ul className="mt-2 space-y-2 text-black/60">
                              {selectedProject?.details.overview.map((note) => (
                                <li key={note}>- {note}</li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <div className="font-pixel text-[11px] uppercase tracking-[0.28em] text-black/50">
                              next
                            </div>
                            <ul className="mt-2 space-y-2 text-black/60">
                              {selectedProject?.details.next.map((item) => (
                                <li key={item}>- {item}</li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <div className="font-pixel text-[11px] uppercase tracking-[0.28em] text-black/50">
                              log
                            </div>
                            <ul className="mt-2 space-y-2 text-black/60">
                              {selectedProject?.details.log.map((item) => (
                                <li key={item}>- {item}</li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <div className="font-pixel text-[11px] uppercase tracking-[0.28em] text-black/50">
                              links
                            </div>
                            <div className="mt-2 flex flex-wrap gap-3">
                              {selectedProject?.details.links.map((link) =>
                                link.href ? (
                                  <Link
                                    key={link.label}
                                    href={link.href}
                                    className="rounded-full border border-black/15 px-3 py-1 text-xs uppercase tracking-[0.22em] text-black/50 transition duration-[900ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:border-fofo-blue/60 hover:text-fofo-blue"
                                  >
                                    {link.label}
                                  </Link>
                                ) : (
                                  <span
                                    key={link.label}
                                    className="rounded-full border border-black/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-black/30"
                                  >
                                    {link.label}
                                  </span>
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </aside>
              </div>
            </SectionFade>
          </div>
        </main>
        <SectionFade once threshold={0.12}>
          <Footer />
        </SectionFade>
      </div>
    </PageTransition>
  );
}
