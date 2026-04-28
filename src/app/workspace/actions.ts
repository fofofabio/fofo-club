"use server";

import { AuthError } from "next-auth";

import { signIn, signOut } from "@/auth";

export type AdminAuthState = {
  error: string | null;
};

export async function loginAdminAction(
  _previousState: AdminAuthState,
  formData: FormData,
): Promise<AdminAuthState> {
  const email = typeof formData.get("email") === "string" ? String(formData.get("email")).trim() : "";
  const password = typeof formData.get("password") === "string" ? String(formData.get("password")) : "";

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/workspace",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Wrong email or password." };
    }

    throw error;
  }

  return { error: null };
}

export async function logoutAdminAction() {
  await signOut({
    redirectTo: "/workspace/login",
  });
}
