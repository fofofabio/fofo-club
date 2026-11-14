import { NextResponse } from "next/server";

// Shared request checks for the workspace task routes, so bad input gets a 400
// instead of a database error (500).

export const LIMITS = { text: 1000, project: 200, notes: 50_000 } as const;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

export function isUuid(value: string) {
  return UUID.test(value);
}

/** The JSON body as a plain object, or null when it is missing or not an object. */
export async function readBody(request: Request): Promise<Record<string, unknown> | null> {
  const body: unknown = await request.json().catch(() => null);
  return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
}

/**
 * Checks the optional fields a task or subtask update may carry. Returns an error
 * message for the first invalid one, or null when all present fields are valid.
 */
export function invalidTaskField(body: Record<string, unknown>) {
  const textField = (key: "text" | "project" | "notes", label: string) => {
    const value = body[key];
    if (value === undefined) return null;
    if (typeof value !== "string") return `${label} must be a string.`;
    if (value.length > LIMITS[key]) return `${label} is too long (max ${LIMITS[key].toLocaleString("en-GB")} characters).`;
    return null;
  };
  for (const [key, label] of [["text", "Text"], ["project", "Project"], ["notes", "Notes"]] as const) {
    const error = textField(key, label);
    if (error) return error;
  }
  for (const key of ["done", "pinned"] as const) {
    if (body[key] !== undefined && typeof body[key] !== "boolean") return `${key} must be true or false.`;
  }
  const due = body.dueDate;
  if (due !== undefined && due !== null && due !== "") {
    if (typeof due !== "string" || !DATE.test(due) || Number.isNaN(Date.parse(`${due}T00:00:00Z`))) return "Due date must look like 2026-11-14.";
  }
  return null;
}

const CLOCK = /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$|^24:00(?::00)?$/;

/** Checks a time entry body (project, task, date, start, end) before it reaches Postgres. */
export function invalidTimeEntry(body: Record<string, unknown>) {
  for (const [key, max] of [["project", 200], ["task", 1000]] as const) {
    const value = body[key];
    if (value !== undefined && (typeof value !== "string" || value.length > max)) return `${key} must be text of at most ${max} characters.`;
  }
  if (typeof body.date !== "string" || !DATE.test(body.date) || Number.isNaN(Date.parse(`${body.date}T00:00:00Z`))) return "Date must look like 2026-11-14.";
  for (const key of ["start", "end"] as const) {
    if (typeof body[key] !== "string" || !CLOCK.test(body[key] as string)) return `${key} must be a time like 09:30.`;
  }
  return null;
}

export function isTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}
