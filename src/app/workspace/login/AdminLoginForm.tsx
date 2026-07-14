"use client";

import { useActionState } from "react";
import { LockKeyhole, ShieldCheck } from "lucide-react";

import type { AdminAuthState } from "../actions";
import { loginAdminAction } from "../actions";

const initialState: AdminAuthState = {
  error: null,
};

export default function AdminLoginForm() {
  const [state, formAction, pending] = useActionState(loginAdminAction, initialState);

  return (
    <div className="relative w-full border-[2.5px] border-black bg-white p-7 shadow-brutal md:p-9">
      {/* solid signal bar replaces the old cyan→lime gradient */}
      <div className="absolute inset-x-0 top-0 h-2 bg-fofo-blue" />

      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center border-[2.5px] border-black bg-black text-white">
          <LockKeyhole className="h-5 w-5" />
        </div>
        <div>
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-fofo-blue">
            // private
          </span>
          <h1 className="font-display text-3xl font-bold tracking-tight text-black md:text-4xl">
            workspace
          </h1>
        </div>
      </div>

      <form action={formAction} className="mt-8 space-y-5">
        <div>
          <label
            htmlFor="workspace-email"
            className="font-mono text-[11px] uppercase tracking-[0.12em] text-black/55"
          >
            email
          </label>
          <input
            id="workspace-email"
            type="email"
            name="email"
            autoComplete="username"
            inputMode="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="mt-2 w-full border-[2.5px] border-black bg-white px-4 py-3 text-base outline-none transition focus:-translate-y-0.5 focus:shadow-brutal-sm"
            placeholder="name@example.com"
            required
          />
        </div>

        <div>
          <label
            htmlFor="workspace-password"
            className="font-mono text-[11px] uppercase tracking-[0.12em] text-black/55"
          >
            password
          </label>
          <input
            id="workspace-password"
            type="password"
            name="password"
            autoComplete="current-password"
            className="mt-2 w-full border-[2.5px] border-black bg-white px-4 py-3 text-base outline-none transition focus:-translate-y-0.5 focus:shadow-brutal-sm"
            placeholder="enter password"
            required
          />
        </div>

        {state.error ? (
          <p className="border-[2px] border-black bg-fofo-pink px-4 py-3 font-mono text-[12px] uppercase tracking-wide text-white">
            {state.error}
          </p>
        ) : null}

        <div className="pt-1">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex w-full items-center justify-center gap-2 border-[2.5px] border-black bg-fofo-blue px-5 py-3.5 text-sm font-bold uppercase tracking-wide text-white shadow-brutal-sm transition hover:-translate-y-0.5 hover:bg-black disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
          >
            <ShieldCheck className="h-4 w-4" />
            {pending ? "signing in…" : "sign in"}
          </button>
        </div>
      </form>
    </div>
  );
}
