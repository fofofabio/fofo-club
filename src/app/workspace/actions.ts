"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE,
  createAdminSessionToken,
  getAdminPassword,
} from "@/lib/adminAuth";

export type AdminAuthState = {
  error: string | null;
};

export async function loginAdminAction(
  _previousState: AdminAuthState,
  formData: FormData,
): Promise<AdminAuthState> {
  const password = formData.get("password");
  const normalizedPassword = typeof password === "string" ? password : "";
  const configuredPassword = getAdminPassword();

  if (!configuredPassword) {
    return { error: "Set ADMIN_PASSWORD in .env.local before using this page." };
  }

  if (normalizedPassword !== configuredPassword) {
    return { error: "Wrong passcode." };
  }

  const cookieStore = await cookies();
  const token = await createAdminSessionToken(configuredPassword);

  cookieStore.set({
    name: ADMIN_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    maxAge: ADMIN_SESSION_MAX_AGE,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  redirect("/workspace");
}

export async function logoutAdminAction() {
  const cookieStore = await cookies();

  cookieStore.set({
    name: ADMIN_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  redirect("/workspace/login");
}
