"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { BookOpen, Check, ChevronDown, Crosshair, Flame, Minus, Plus, RefreshCw, Swords, Wrench } from "lucide-react";

import {
  BUFF_RITUAL,
  DONT_MISS,
  MILESTONES,
  ROTATION_NOTES,
  TALENT_PLAN,
  WEAPON_PATH,
} from "@/data/wowHunter";

type WowState = {
  level: number;
  engineeringSkill: number;
  libraryBooks: number;
  talents: Record<string, number>;
  checked: string[];
  characterSlug: string;
  syncedAt: string;
  equippedRanged: string;
};

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "Request failed.");
  return body as T;
}

const ALL_TALENT_ROWS = TALENT_PLAN.flatMap((phase) => phase.rows);
const TOTAL_TALENT_POINTS = ALL_TALENT_ROWS.reduce((sum, row) => sum + row.maxPoints, 0);

export default function WowDesk() {
  const [state, setState] = useState<WowState | null>(null);
  const [message, setMessage] = useState("Summoning the hunter’s desk…");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "error">("idle");
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    requestJson<{ state: WowState }>("/api/workspace/wow")
      .then((data) => { setState(data.state); setMessage(""); })
      .catch((error) => setMessage(error.message));
  }, []);

  // Debounced save: every mutation schedules a PUT of the full state blob.
  const update = useCallback((mutate: (current: WowState) => WowState) => {
    setState((current) => {
      if (!current) return current;
      const next = mutate(current);
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        setSaveState("saving");
        requestJson<{ state: WowState }>("/api/workspace/wow", { method: "PUT", body: JSON.stringify({ state: next }) })
          .then(() => setSaveState("idle"))
          .catch(() => setSaveState("error"));
      }, 600);
      return next;
    });
  }, []);

  if (!state) {
    return (
      <section className="scroll-mt-20">
        <ZoneHeading />
        <div className="border-[2.5px] border-black bg-white p-6 font-mono text-sm text-black/60 shadow-brutal">{message || "…"}</div>
      </section>
    );
  }

  const spentPoints = ALL_TALENT_ROWS.reduce((sum, row) => sum + (state.talents[row.id] ?? 0), 0);
  const availablePoints = Math.max(0, state.level - 9);
  const toggleChecked = (id: string) =>
    update((s) => ({ ...s, checked: s.checked.includes(id) ? s.checked.filter((x) => x !== id) : [...s.checked, id] }));

  return (
    <section className="scroll-mt-20">
      <ZoneHeading saveState={saveState} />

      <div className="grid gap-4 lg:grid-cols-2">
        <CharacterCard state={state} update={update} />
        <NextUpCard state={state} spentPoints={spentPoints} availablePoints={availablePoints} />
        <TalentPlanner state={state} update={update} spentPoints={spentPoints} availablePoints={availablePoints} />
        <div className="flex flex-col gap-4">
          <WeaponPath state={state} update={update} toggleChecked={toggleChecked} />
          <DontMissList state={state} toggleChecked={toggleChecked} />
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <BuffRitual />
        <RotationSheet />
      </div>
    </section>
  );
}

function ZoneHeading({ saveState }: { saveState?: "idle" | "saving" | "error" }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="meta text-fofo-blue">{"// zone: azeroth"}</span>
      <span className="h-px flex-1 bg-black/10" />
      {saveState === "saving" && <span className="font-mono text-[10px] uppercase tracking-wide text-black/40">saving…</span>}
      {saveState === "error" && <span className="font-mono text-[10px] uppercase tracking-wide text-red-600">save failed</span>}
    </div>
  );
}

function Card({ title, icon, accent, children }: { title: string; icon: React.ReactNode; accent?: string; children: React.ReactNode }) {
  return (
    <div className="border-[2.5px] border-black bg-white shadow-brutal">
      <div className={clsx("flex items-center gap-2 border-b-[2.5px] border-black px-4 py-2.5", accent ?? "bg-fofo-yellow")}>
        {icon}
        <h3 className="font-mono text-xs font-bold uppercase tracking-wide text-black">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Stepper({ value, onChange, min, max, step = 1 }: { value: number; onChange: (next: number) => void; min: number; max: number; step?: number }) {
  return (
    <span className="inline-flex items-center border-[2px] border-black">
      <button type="button" aria-label="decrease" onClick={() => onChange(Math.max(min, value - step))} className="px-2 py-1 hover:bg-fofo-pink/30"><Minus className="h-3.5 w-3.5" /></button>
      <span className="min-w-[3rem] border-x-[2px] border-black px-2 py-1 text-center font-mono text-sm font-bold tabular-nums">{value}</span>
      <button type="button" aria-label="increase" onClick={() => onChange(Math.min(max, value + step))} className="px-2 py-1 hover:bg-fofo-blue/20"><Plus className="h-3.5 w-3.5" /></button>
    </span>
  );
}

function CharacterCard({ state, update }: { state: WowState; update: (mutate: (s: WowState) => WowState) => void }) {
  const nextMilestone = MILESTONES.find((m) => m.level > state.level);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");

  async function syncFromArmory() {
    setSyncing(true);
    setSyncMessage("");
    try {
      const data = await requestJson<{ state: WowState }>("/api/workspace/wow/sync", { method: "POST" });
      update(() => data.state);
      setSyncMessage("Synced from the armory.");
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : "Sync failed.");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <Card title="Character" icon={<Crosshair className="h-4 w-4" />}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-display text-xl font-bold lowercase tracking-tight">troll hunter · wow forever</p>
          <p className="font-mono text-[11px] uppercase tracking-wide text-black/50">beast mastery · horde</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-wide text-black/50">level</span>
          <Stepper value={state.level} min={1} max={60} onChange={(level) => update((s) => ({ ...s, level }))} />
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1 flex justify-between font-mono text-[11px] uppercase tracking-wide text-black/50">
          <span>progress to 60</span>
          <span>{state.level}/60</span>
        </div>
        <div className="h-4 border-[2px] border-black bg-white">
          <div className="ws-data-surface h-full bg-fofo-blue" style={{ width: `${Math.round((state.level / 60) * 100)}%` }} />
        </div>
      </div>

      {nextMilestone && (
        <p className="mt-3 border-l-[3px] border-fofo-pink pl-3 text-sm text-black/70">
          <span className="font-bold">Level {nextMilestone.level}:</span> {nextMilestone.what}
        </p>
      )}

      {state.equippedRanged && (
        <p className="mt-3 font-mono text-[11px] uppercase tracking-wide text-black/50">
          equipped: <span className="text-black">{state.equippedRanged}</span>
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t-[2px] border-black/10 pt-3">
        <input
          type="text"
          value={state.characterSlug}
          onChange={(event) => {
            const characterSlug = event.target.value.toLowerCase();
            update((s) => ({ ...s, characterSlug }));
          }}
          placeholder="name-surname"
          spellCheck={false}
          className="w-40 border-[2px] border-black px-2 py-1 font-mono text-sm focus:bg-fofo-yellow/30 focus:outline-none"
        />
        <button
          type="button"
          onClick={syncFromArmory}
          disabled={syncing || !state.characterSlug}
          className="inline-flex items-center gap-2 border-[2px] border-black bg-white px-3 py-1 font-mono text-[12px] font-bold uppercase tracking-wide shadow-brutal-sm transition hover:-translate-y-0.5 hover:bg-fofo-blue hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:translate-y-0"
        >
          <RefreshCw className={clsx("h-3.5 w-3.5", syncing && "animate-spin")} />
          {syncing ? "syncing…" : "sync armory"}
        </button>
        {syncMessage ? (
          <span className="font-mono text-[11px] text-black/60">{syncMessage}</span>
        ) : state.syncedAt ? (
          <span className="font-mono text-[11px] text-black/40">
            last sync {new Date(state.syncedAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
          </span>
        ) : null}
      </div>
    </Card>
  );
}

function NextUpCard({ state, spentPoints, availablePoints }: { state: WowState; spentPoints: number; availablePoints: number }) {
  const nextRow = useMemo(() => {
    for (const phase of TALENT_PLAN) {
      for (const row of phase.rows) {
        if ((state.talents[row.id] ?? 0) < row.maxPoints) return { phase, row };
      }
    }
    return null;
  }, [state.talents]);

  const unspent = availablePoints - spentPoints;
  return (
    <Card title="Next up" icon={<Swords className="h-4 w-4" />} accent="bg-fofo-pink text-white">
      {nextRow ? (
        <>
          <p className="text-sm text-black/60">Next talent point goes into</p>
          <p className="mt-1 font-display text-2xl font-bold tracking-tight">{nextRow.row.name}</p>
          <p className="font-mono text-[11px] uppercase tracking-wide text-black/50">
            {nextRow.phase.label} ({nextRow.phase.levels}) · {state.talents[nextRow.row.id] ?? 0}/{nextRow.row.maxPoints}
          </p>
          {nextRow.row.note && <p className="mt-2 text-sm text-black/70">{nextRow.row.note}</p>}
        </>
      ) : (
        <p className="text-sm text-black/70">Build complete — {TOTAL_TALENT_POINTS} points placed. Go shoot something.</p>
      )}
      <p className={clsx("mt-3 border-[2px] border-black px-3 py-1.5 font-mono text-[12px] font-bold uppercase tracking-wide", unspent > 0 ? "bg-fofo-yellow" : unspent < 0 ? "bg-red-100" : "bg-white")}>
        {unspent > 0 ? `${unspent} unspent point${unspent === 1 ? "" : "s"}!` : unspent < 0 ? `${-unspent} more marked than level ${state.level} allows` : "all points accounted for"}
      </p>
    </Card>
  );
}

function TalentPlanner({ state, update, spentPoints, availablePoints }: { state: WowState; update: (mutate: (s: WowState) => WowState) => void; spentPoints: number; availablePoints: number }) {
  const setPoints = (rowId: string, points: number) =>
    update((s) => ({ ...s, talents: { ...s.talents, [rowId]: points } }));

  return (
    <Card title={`Talent plan · ${spentPoints}/${availablePoints} points placed`} icon={<Swords className="h-4 w-4" />}>
      <div className="space-y-4">
        {TALENT_PLAN.map((phase) => (
          <div key={phase.id}>
            <p className="mb-2 font-mono text-[11px] font-bold uppercase tracking-wide text-fofo-blue">
              {phase.label} <span className="text-black/40">· lv {phase.levels}</span>
            </p>
            <ul className="space-y-1.5">
              {phase.rows.map((row) => {
                const spent = state.talents[row.id] ?? 0;
                const full = spent >= row.maxPoints;
                return (
                  <li key={row.id} className="flex items-center justify-between gap-3">
                    <span className={clsx("min-w-0 text-sm", full ? "text-black/40 line-through" : "text-black")} title={row.note}>
                      {row.name}
                    </span>
                    <Stepper value={spent} min={0} max={row.maxPoints} onChange={(points) => setPoints(row.id, points)} />
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-black/40">Order from Method's Forever hunter guide — verify exact ranks in game.</p>
    </Card>
  );
}

function WeaponPath({ state, update, toggleChecked }: { state: WowState; update: (mutate: (s: WowState) => WowState) => void; toggleChecked: (id: string) => void }) {
  return (
    <Card title="Weapon path" icon={<Wrench className="h-4 w-4" />} accent="bg-fofo-blue text-white">
      <ul className="space-y-3">
        {WEAPON_PATH.map((weapon) => {
          const obtained = state.checked.includes(weapon.id);
          const engineeringGap = weapon.engineering ? weapon.engineering - state.engineeringSkill : 0;
          return (
            <li key={weapon.id} className="flex items-start gap-3">
              <CheckBox checked={obtained} onClick={() => toggleChecked(weapon.id)} />
              <div className="min-w-0">
                <p className={clsx("text-sm font-bold", obtained && "text-black/40 line-through")}>
                  {weapon.name} <span className="font-mono text-[10px] font-normal uppercase text-black/40">{weapon.kind} · lv {weapon.level}</span>
                </p>
                <p className="text-[13px] text-black/60">{weapon.source}</p>
                {weapon.libraryBooks && !obtained && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <BookOpen className="h-3.5 w-3.5 text-fofo-blue" />
                    <Stepper value={state.libraryBooks} min={0} max={weapon.libraryBooks} onChange={(libraryBooks) => update((s) => ({ ...s, libraryBooks }))} />
                    <span className="font-mono text-[11px] uppercase text-black/50">/ {weapon.libraryBooks} books</span>
                  </div>
                )}
                {weapon.engineering && !obtained && (
                  <p className={clsx("mt-1 font-mono text-[11px] uppercase tracking-wide", engineeringGap > 0 ? "text-black/50" : "text-green-700")}>
                    {engineeringGap > 0 ? `engineering ${state.engineeringSkill} → needs ${weapon.engineering} (${engineeringGap} to go)` : `engineering requirement met (${state.engineeringSkill})`}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t-[2px] border-black/10 pt-3">
        <Wrench className="h-3.5 w-3.5 text-fofo-blue" />
        <span className="font-mono text-[11px] uppercase tracking-wide text-black/50">engineering skill</span>
        <Stepper value={state.engineeringSkill} min={0} max={300} step={5} onChange={(engineeringSkill) => update((s) => ({ ...s, engineeringSkill }))} />
        <span className="font-mono text-[11px] uppercase text-black/40">/ 300</span>
      </div>
    </Card>
  );
}

function DontMissList({ state, toggleChecked }: { state: WowState; toggleChecked: (id: string) => void }) {
  return (
    <Card title="Don't miss" icon={<Check className="h-4 w-4" />}>
      <ul className="space-y-3">
        {DONT_MISS.map((item) => {
          const done = state.checked.includes(item.id);
          return (
            <li key={item.id} className="flex items-start gap-3">
              <CheckBox checked={done} onClick={() => toggleChecked(item.id)} />
              <div className="min-w-0">
                <p className={clsx("text-sm font-bold", done && "text-black/40 line-through")}>{item.label}</p>
                {!done && <p className="text-[13px] text-black/60">{item.detail}</p>}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function BuffRitual() {
  return (
    <Card title="Before you pull" icon={<Flame className="h-4 w-4" />} accent="bg-fofo-pink text-white">
      <ul className="space-y-3">
        {BUFF_RITUAL.map((item) => (
          <li key={item.id}>
            <p className="text-sm font-bold">{item.label}</p>
            <p className="text-[13px] text-black/60">{item.detail}</p>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function RotationSheet() {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-[2.5px] border-black bg-white shadow-brutal">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-2 border-b-[2.5px] border-black bg-fofo-yellow px-4 py-2.5 text-left">
        <Crosshair className="h-4 w-4" />
        <h3 className="font-mono text-xs font-bold uppercase tracking-wide text-black">Rotation cheat sheet</h3>
        <ChevronDown className={clsx("ml-auto h-4 w-4 transition", open && "rotate-180")} />
      </button>
      {open && (
        <ul className="list-disc space-y-2 p-4 pl-8 text-sm text-black/75">
          {ROTATION_NOTES.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CheckBox({ checked, onClick }: { checked: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={checked}
      className={clsx(
        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border-[2px] border-black transition",
        checked ? "bg-fofo-blue text-white" : "bg-white hover:bg-fofo-yellow",
      )}
    >
      {checked && <Check className="h-3.5 w-3.5" />}
    </button>
  );
}
