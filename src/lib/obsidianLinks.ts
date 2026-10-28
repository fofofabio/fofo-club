export type ProjectNoteLinks = Map<string, string>;
const MAX_PROJECTS = 300;

function validProject(project: unknown): project is string {
  return typeof project === "string" && !!project.trim() && project.trim().length <= 200 && !/[\u0000-\u001f\u007f]/.test(project);
}

/** Only open an existing note. Create/append/command URIs are deliberately unsupported. */
export function parseObsidianNoteLink(input: string): { href: string; vault: string; file: string } | null {
  if (input.length > 4096 || /[\u0000-\u001f\u007f]/.test(input)) return null;
  try {
    const url = new URL(input.trim());
    if (url.protocol !== "obsidian:" || url.hostname !== "open" || (url.pathname && url.pathname !== "/") || url.username || url.password || url.port || url.hash) return null;
    if ([...url.searchParams.keys()].some((key) => key !== "vault" && key !== "file")) return null;
    if (url.searchParams.getAll("vault").length !== 1 || url.searchParams.getAll("file").length !== 1) return null;
    const vault = url.searchParams.get("vault")?.trim();
    const file = url.searchParams.get("file")?.trim().replace(/\\/g, "/");
    if (!vault || !file || /[\u0000-\u001f\u007f]/.test(vault + file)) return null;
    const path = file.split("#")[0];
    if (!path || path.startsWith("/") || /^[a-z]:/i.test(path) || path.split("/").some((part) => part === ".." || part === ".")) return null;
    const href = `obsidian://open?vault=${encodeURIComponent(vault)}&file=${encodeURIComponent(file)}`;
    return { href, vault, file };
  } catch {
    return null;
  }
}

export function projectNotesStorageKey(userId: string) {
  return `fofo-workspace-obsidian:v1:${encodeURIComponent(userId)}`;
}

export function readProjectNoteLinks(raw: string | null): ProjectNoteLinks {
  if (raw === null) return new Map();
  if (raw.length > 1_300_000) throw new Error("Saved note links are too large.");
  const data: unknown = JSON.parse(raw);
  if (!data || typeof data !== "object" || !("version" in data) || data.version !== 1 || !("projects" in data) || !Array.isArray(data.projects) || data.projects.length > MAX_PROJECTS) throw new Error("This is not a supported project-links file.");
  const links: ProjectNoteLinks = new Map();
  for (const entry of data.projects) {
    if (!entry || typeof entry !== "object" || !validProject(entry.project) || typeof entry.url !== "string") throw new Error("A project link is incomplete.");
    const parsed = parseObsidianNoteLink(entry.url);
    if (!parsed) throw new Error("Use an Obsidian link that opens a note.");
    const project = entry.project.trim();
    if (links.has(project)) throw new Error("The same project appears more than once.");
    links.set(project, parsed.href);
  }
  return links;
}

export function serializeProjectNoteLinks(links: ProjectNoteLinks) {
  const raw = JSON.stringify({ version: 1, projects: [...links].map(([project, url]) => ({ project, url })) });
  readProjectNoteLinks(raw);
  return raw;
}
