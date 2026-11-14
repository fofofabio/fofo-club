// Pure request checks for the workspace routes, so bad input gets a 400 instead of a
// database error (500). Kept free of Next.js imports so the tests can load them.

export const LIMITS = { text: 1000, project: 200, notes: 50_000 } as const;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** A real calendar date in YYYY-MM-DD form (rejects 2026-02-30, which Date.parse rolls over). */
export function isDateKey(value: unknown): value is string {
  if (typeof value !== "string" || !DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function isUuid(value: string) {
  return UUID.test(value);
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
    if (!isDateKey(due)) return "Due date must be a real date like 2026-11-14.";
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
  if (!isDateKey(body.date)) return "Date must be a real date like 2026-11-14.";
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
