/** Existing API contracts, with one accessible mutation feedback channel. */
export async function workspaceRequest<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const mutation = Boolean(init?.method && init.method !== "GET");
  const signal = (detail: { message: string; error: boolean }) => window.dispatchEvent(new CustomEvent("workspace-feedback", { detail }));
  try {
    const response = await fetch(input, { ...init, headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers } });
    const body = await response.json().catch(() => ({ error: "Unexpected response. Please try again." }));
    if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : "Request failed. Please try again.");
    if (mutation) signal({ message: init?.method === "DELETE" ? "Deleted." : "Saved.", error: false });
    return body as T;
  } catch (error) {
    signal({ message: `${error instanceof Error ? error.message : "Request failed."} Try again using the same action.`, error: true });
    throw error;
  }
}
