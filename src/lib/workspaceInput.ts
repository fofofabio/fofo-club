import { NextResponse } from "next/server";

export * from "./workspaceValidation";

export function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

/** The JSON body as a plain object, or null when it is missing or not an object. */
export async function readBody(request: Request): Promise<Record<string, unknown> | null> {
  const body: unknown = await request.json().catch(() => null);
  return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
}
