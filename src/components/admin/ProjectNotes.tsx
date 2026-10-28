"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { BookOpen, Copy, X } from "lucide-react";
import { parseObsidianNoteLink, projectNotesStorageKey, readProjectNoteLinks, serializeProjectNoteLinks, type ProjectNoteLinks } from "@/lib/obsidianLinks";
import { workspaceTasksPath } from "@/lib/workspaceLinks";
import { Feedback, WorkspaceButton } from "./WorkspaceUI";

export function useProjectNotes(userId: string) {
  const [saved, setSaved] = useState<{ owner: string; links: ProjectNoteLinks }>({ owner: "", links: new Map() });
  const [storageError, setStorageError] = useState<string | null>(null);
  const key = projectNotesStorageKey(userId);
  useEffect(() => {
    function load() {
      try {
        setSaved({ owner: userId, links: readProjectNoteLinks(localStorage.getItem(key)) });
        setStorageError(null);
      } catch {
        setSaved({ owner: userId, links: new Map() });
        setStorageError("Saved note links could not be read. You can import them again or reconnect a project.");
      }
    }
    load();
    function changed(event: StorageEvent) { if (event.key === key || event.key === null) load(); }
    window.addEventListener("storage", changed);
    return () => window.removeEventListener("storage", changed);
  }, [key, userId]);
  const links = saved.owner === userId ? saved.links : new Map<string, string>();
  function persist(next: ProjectNoteLinks) {
    try {
      localStorage.setItem(key, serializeProjectNoteLinks(next));
      setSaved({ owner: userId, links: next });
      setStorageError(null);
    } catch {
      throw new Error("Your browser could not save these links. Allow site storage and try again.");
    }
  }
  return { links, persist, storageError };
}

export default function ProjectNotes({ projects, initialProject, links, onSave, storageError, onClose }: {
  projects: string[];
  initialProject: string;
  links: ProjectNoteLinks;
  onSave: (links: ProjectNoteLinks) => void;
  storageError: string | null;
  onClose: () => void;
}) {
  const [project, setProject] = useState(initialProject);
  const [uri, setUri] = useState(links.get(initialProject) ?? "");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const parsed = parseObsidianNoteLink(uri);
  const [origin, setOrigin] = useState("");
  useEffect(() => { setOrigin(window.location.origin); }, []);
  const tasksUrl = origin ? new URL(workspaceTasksPath(project), origin).href : "";

  function selectProject(next: string) {
    setProject(next); setUri(links.get(next) ?? ""); setError(null); setMessage(null);
  }
  function save() {
    setError(null); setMessage(null);
    if (!project.trim() || project.trim().length > 200) { setError("Choose a project first."); return; }
    if (!parsed) { setError("Paste an Obsidian note link containing a vault and a file."); return; }
    try {
      const next = new Map(links); next.set(project.trim(), parsed.href); onSave(next);
      setProject(project.trim()); setUri(parsed.href); setMessage("Project notes connected on this browser.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save the link."); }
  }
  function disconnect() {
    try { const next = new Map(links); next.delete(project.trim()); onSave(next); setUri(""); setMessage("Project disconnected on this browser."); setError(null); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not remove the link."); }
  }
  async function importLinks(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file) return;
    setError(null); setMessage(null);
    try {
      if (file.size > 1_300_000) throw new Error("Choose a smaller project-links file.");
      const imported = readProjectNoteLinks(await file.text());
      const next = new Map(links); for (const [name, link] of imported) next.set(name, link);
      onSave(next);
      const first = imported.keys().next().value as string | undefined;
      if (first) { setProject(first); setUri(next.get(first) ?? ""); }
      setError(null); setMessage(`${imported.size} project ${imported.size === 1 ? "link" : "links"} imported on this browser.`);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not import project links."); }
  }
  async function copyTasksLink() {
    try { await navigator.clipboard.writeText(tasksUrl); setError(null); setMessage("Task-board link copied. Paste it into your Obsidian project note."); }
    catch { setError("Could not copy automatically. Select the task-board address below and copy it."); }
  }
  const choices = [...new Set([...projects, ...links.keys(), ...(project ? [project] : [])])].sort();
  return <div className="ws-project-notes-backdrop">
    <section className="ws-project-notes-dialog" role="dialog" aria-modal="true" aria-labelledby="project-notes-title">
      <header><div><h2 id="project-notes-title">Project notes</h2><p>Open the right Obsidian note from your tasks.</p></div><WorkspaceButton onClick={onClose} aria-label="Close project notes"><X size={18} /></WorkspaceButton></header>
      <p className="ws-project-notes-help">Links are saved for your account on this browser. Your vault and note contents stay in Obsidian. Use Obsidian with this vault on the device where you open the link.</p>
      {error || storageError ? <Feedback error>{error ?? storageError}</Feedback> : null}
      {message ? <Feedback>{message}</Feedback> : null}
      <label className="ws-field" htmlFor="obsidian-project">Task project
        <input id="obsidian-project" list="obsidian-projects" value={project} maxLength={200} onChange={(e) => selectProject(e.target.value)} placeholder="Choose a task project" />
        <datalist id="obsidian-projects">{choices.map((name) => <option key={name} value={name} />)}</datalist>
      </label>
      <label className="ws-field" htmlFor="obsidian-note-link">Obsidian note link
        <input id="obsidian-note-link" type="text" inputMode="url" value={uri} maxLength={4096} onChange={(e) => { setUri(e.target.value); setMessage(null); }} placeholder="obsidian://open?vault=…&file=…" aria-describedby="obsidian-link-help" />
      </label>
      <p id="obsidian-link-help" className="ws-project-notes-help">In Obsidian, right-click the note in the file list and choose “Copy Obsidian URL”. Paste that link here.</p>
      {parsed ? <p className="ws-project-notes-preview">{parsed.vault} / {parsed.file}</p> : null}
      <div className="ws-project-notes-buttons">
        <WorkspaceButton primary onClick={save}>Save connection</WorkspaceButton>
        {parsed ? <a className="ws-button" href={parsed.href}><BookOpen size={16} />Open in Obsidian</a> : null}
        {links.has(project.trim()) ? <WorkspaceButton onClick={disconnect}>Disconnect</WorkspaceButton> : null}
      </div>
      <div className="ws-project-notes-return"><h3>Return from Obsidian</h3><p>Paste this address into the matching project note.</p>
        <label className="ws-field" htmlFor="obsidian-tasks-return">Task-board link<input id="obsidian-tasks-return" value={tasksUrl} readOnly onFocus={(e) => e.currentTarget.select()} /></label>
        <WorkspaceButton disabled={!project.trim()} onClick={copyTasksLink}><Copy size={16} />Copy tasks link</WorkspaceButton>
      </div>
      <footer><input ref={fileInput} type="file" accept="application/json,.json" hidden aria-label="Import Obsidian project links" onChange={importLinks} /><WorkspaceButton onClick={() => fileInput.current?.click()}>Import project links</WorkspaceButton><WorkspaceButton onClick={onClose}>Done</WorkspaceButton></footer>
    </section>
  </div>;
}
