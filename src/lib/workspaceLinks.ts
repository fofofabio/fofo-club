/** Shared URL rules. No vault names, note paths, or account data belong here. */
export function workspaceTasksPath(project?: string | null) {
  const params = new URLSearchParams({ view: "tasks" });
  if (project?.trim() && !/[\u0000-\u001f\u007f]/.test(project)) params.set("project", project.trim().slice(0, 200));
  return `/workspace?${params}`;
}

/** Accept only a relative workspace destination; never an external redirect. */
export function safeWorkspaceReturnPath(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/workspace?") || value.length > 3000 || /[\\\u0000-\u001f\u007f]/.test(value)) return "/workspace";
  try {
    const url = new URL(value, "https://workspace.invalid");
    if (url.origin !== "https://workspace.invalid" || url.pathname !== "/workspace" || url.searchParams.get("view") !== "tasks") return "/workspace";
    return workspaceTasksPath(url.searchParams.get("project"));
  } catch {
    return "/workspace";
  }
}

export function requestedTaskProject(search: string): string | null {
  const project = new URLSearchParams(search).get("project")?.trim();
  return project && project.length <= 200 && !/[\u0000-\u001f\u007f]/.test(project) ? project : null;
}
