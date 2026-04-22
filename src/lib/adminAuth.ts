export const ADMIN_SESSION_COOKIE = "fofo-admin-session";
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 24 * 14;

const ADMIN_SESSION_CONTEXT = "fofo-club-admin-session-v1";

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function getAdminPassword() {
  return process.env.ADMIN_PASSWORD ?? "";
}

export async function createAdminSessionToken(secret: string) {
  const payload = new TextEncoder().encode(`${ADMIN_SESSION_CONTEXT}:${secret}`);
  const digest = await crypto.subtle.digest("SHA-256", payload);

  return bytesToHex(new Uint8Array(digest));
}

export async function isValidAdminSession(token: string | null | undefined) {
  const password = getAdminPassword();

  if (!password || !token) {
    return false;
  }

  const expectedToken = await createAdminSessionToken(password);
  return token === expectedToken;
}
