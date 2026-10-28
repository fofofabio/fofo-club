"use client";

import { useActionState } from "react";
import { Feedback, WorkspaceButton } from "@/components/admin/WorkspaceUI";

import type { AdminAuthState } from "../actions";
import { loginAdminAction } from "../actions";

const initialState: AdminAuthState = {
  error: null,
};

export default function AdminLoginForm({ returnPath = "/workspace" }: { returnPath?: string }) {
  const [state, formAction, pending] = useActionState(loginAdminAction, initialState);

  return <div className="ws-login-card">
    <div><h1>Workspace</h1><p>Your personal workbench. Sign in to continue.</p></div>
    <form action={formAction}>
      <input type="hidden" name="returnPath" value={returnPath} />
      <label className="ws-field" htmlFor="workspace-email">Email
        <input id="workspace-email" type="email" name="email" autoComplete="username" inputMode="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="name@example.com" required />
      </label>
      <label className="ws-field" htmlFor="workspace-password">Password
        <input id="workspace-password" type="password" name="password" autoComplete="current-password" required aria-describedby={state.error ? "workspace-login-error" : undefined} />
      </label>
      {state.error ? <div id="workspace-login-error"><Feedback error>{state.error}</Feedback></div> : null}
      <WorkspaceButton primary type="submit" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</WorkspaceButton>
    </form>
  </div>;
}
