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
    <div className="relative overflow-hidden rounded-[28px] border border-black/10 bg-white/92 p-8 shadow-xl shadow-black/5 backdrop-blur">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-fofo-blue via-cyan-400 to-lime-300" />

      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-black/10 bg-black text-white">
          <LockKeyhole className="h-5 w-5" />
        </div>
        <div>
          <p className="meta text-fofo-blue">PRIVATE</p>
          <h1 className="mt-1 font-display text-3xl tracking-tight text-black md:text-4xl">
            Workspace
          </h1>
        </div>
      </div>

      <form action={formAction} className="mt-8 space-y-4">
        <label className="block">
          <span className="meta text-fofo-blue">Passcode</span>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            className="mt-2 w-full rounded-2xl border border-black/15 bg-white px-4 py-3 text-base outline-none transition focus:border-fofo-blue focus:ring-2 focus:ring-fofo-blue/10"
            placeholder="Enter workspace passcode"
            required
          />
        </label>

        {state.error ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {state.error}
          </p>
        ) : null}

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex min-w-[160px] items-center justify-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-medium text-white transition hover:-translate-y-0.5 hover:bg-fofo-blue disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ShieldCheck className="h-4 w-4" />
            {pending ? "Unlocking..." : "Unlock"}
          </button>

          <div className="rounded-full border border-black/10 bg-black/[0.03] px-3 py-2 text-xs uppercase tracking-[0.18em] text-black/45">
            Local tools
          </div>
        </div>
      </form>
    </div>
  );
}
