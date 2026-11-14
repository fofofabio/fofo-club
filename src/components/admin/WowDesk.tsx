"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Check, Coins, Compass, Crosshair, ExternalLink, Flag, Flame, Lock, MapPin, RefreshCw, Sparkles, Swords, Wrench } from "lucide-react";

import {
  BUFF_RITUAL,
  ENGINEERING_GUIDE_URL,
  ENGINEERING_NOTES,
  ENGINEERING_ROUTE,
  GOLD_CRAFTS,
  GOLD_TIPS,
  LIBRARY_BOOKS_TARGET,
  MILESTONE_GOALS,
  ROTATION_NOTES,
  TALENT_STEPS,
  ZONE_ROUTE,
  type TalentStep,
} from "@/data/wowHunter";

type WowState = {
  level: number;
  engineeringSkill: number;
  libraryBooks: number;
  checked: string[];
  characterSlug: string;
  syncedAt: string;
  equippedRanged: string;
};

type Section = "overview" | "talents" | "engineering" | "zones" | "goals" | "gold";

const SECTIONS: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "Overview", icon: <Compass className="h-4 w-4" /> },
  { id: "talents", label: "Talents", icon: <Swords className="h-4 w-4" /> },
  { id: "engineering", label: "Engineering", icon: <Wrench className="h-4 w-4" /> },
  { id: "zones", label: "Zones", icon: <MapPin className="h-4 w-4" /> },
  { id: "goals", label: "Goals", icon: <Flag className="h-4 w-4" /> },
  { id: "gold", label: "Gold", icon: <Coins className="h-4 w-4" /> },
];

const SECTION_KEY = "fofo-wow-section-v1";
const ENGINEERING_RANKS = [
  { at: 50, label: "Journeyman" },
  { at: 150, label: "Expert" },
  { at: 200, label: "Artisan" },
  { at: 300, label: "Max" },
];

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "Request failed.");
  return body as T;
}

function nameFromSlug(slug: string) {
  if (!slug) return "Your hunter";
  return slug.split("-").filter(Boolean).map((part) => part[0].toUpperCase() + part.slice(1)).join(" ");
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal(key: string, value: unknown) {
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
}

// ---------------------------------------------------------------------------

export default function WowDesk() {
  const [state, setState] = useState<WowState | null>(null);
  const [error, setError] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "error">("idle");
  const [section, setSection] = useState<Section>("overview");
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    const saved = readLocal<Section>(SECTION_KEY, "overview");
    if (SECTIONS.some((s) => s.id === saved)) setSection(saved);
    requestJson<{ state: WowState }>("/api/workspace/wow")
      .then((data) => setState(data.state))
      .catch((err: Error) => setError(err.message));
  }, []);

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
      }, 500);
      return next;
    });
  }, []);

  function choose(next: Section) {
    setSection(next);
    writeLocal(SECTION_KEY, next);
  }

  if (!state) {
    return (
      <div className="wow ws-data-surface">
        <div className="wow-panel wow-loading">{error || "Summoning your hunter…"}</div>
      </div>
    );
  }

  const toggleChecked = (id: string) =>
    update((s) => ({ ...s, checked: s.checked.includes(id) ? s.checked.filter((x) => x !== id) : [...s.checked, id] }));

  return (
    <div className="wow ws-data-surface">
      <Hero state={state} update={update} saveState={saveState} />

      <nav className="wow-tabs" aria-label="WoW sections">
        {SECTIONS.map((s) => (
          <button key={s.id} type="button" className="wow-tab" aria-current={section === s.id ? "page" : undefined} onClick={() => choose(s.id)}>
            {s.icon}
            <span>{s.label}</span>
          </button>
        ))}
      </nav>

      {section === "overview" && <Overview state={state} onJump={choose} />}
      {section === "talents" && <Talents level={state.level} />}
      {section === "engineering" && <Engineering state={state} update={update} />}
      {section === "zones" && <Zones level={state.level} />}
      {section === "goals" && <Goals state={state} update={update} toggleChecked={toggleChecked} />}
      {section === "gold" && <Gold skill={state.engineeringSkill} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hero character card
// ---------------------------------------------------------------------------

function LevelRing({ level }: { level: number }) {
  const r = 46;
  const circumference = 2 * Math.PI * r;
  const progress = Math.min(1, level / 60);
  return (
    <div className="wow-ring" aria-label={`Level ${level} of 60`}>
      <svg viewBox="0 0 110 110" aria-hidden="true">
        <circle cx="55" cy="55" r={r} className="wow-ring-track" />
        <circle
          cx="55" cy="55" r={r}
          className="wow-ring-fill"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          transform="rotate(-90 55 55)"
        />
      </svg>
      <div className="wow-ring-label">
        <span className="wow-ring-level">{level}</span>
        <span className="wow-ring-caption">level</span>
      </div>
    </div>
  );
}

function Hero({ state, update, saveState }: { state: WowState; update: (m: (s: WowState) => WowState) => void; saveState: "idle" | "saving" | "error" }) {
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ text: string; error: boolean } | null>(null);
  const autoSynced = useRef(false);

  const sync = useCallback(async (quiet = false) => {
    setSyncing(true);
    if (!quiet) setSyncMessage(null);
    try {
      const data = await requestJson<{ state: WowState }>("/api/workspace/wow/sync", { method: "POST" });
      update(() => data.state);
      setSyncMessage({ text: "Synced from the armory", error: false });
    } catch (err) {
      if (!quiet) setSyncMessage({ text: err instanceof Error ? err.message : "Sync failed", error: true });
    } finally {
      setSyncing(false);
    }
  }, [update]);

  // Refresh quietly on open if the last sync is more than an hour old.
  useEffect(() => {
    if (autoSynced.current || !state.characterSlug) return;
    autoSynced.current = true;
    const age = state.syncedAt ? Date.now() - new Date(state.syncedAt).getTime() : Infinity;
    if (age > 60 * 60 * 1000) void sync(true);
  }, [state.characterSlug, state.syncedAt, sync]);

  const ticks = useMemo(() => [...new Set([10, 20, 30, 40, 50, 60])], []);
  const nextGate = MILESTONE_GOALS.filter((m) => m.level && m.level > state.level).sort((a, b) => (a.level ?? 0) - (b.level ?? 0))[0];

  return (
    <section className="wow-hero">
      <div className="wow-hero-glow" aria-hidden="true" />
      <div className="wow-hero-main">
        <LevelRing level={state.level} />
        <div className="wow-hero-id">
          <p className="wow-eyebrow">WoW Forever · EU · Horde</p>
          <p className="wow-hero-name">{nameFromSlug(state.characterSlug)}</p>
          <p className="wow-hero-sub">Troll Hunter · Beast Mastery</p>
          <div className="wow-chips">
            {state.equippedRanged && <span className="wow-chip wow-chip-item"><Crosshair className="h-3.5 w-3.5" />{state.equippedRanged}</span>}
            <span className="wow-chip"><Wrench className="h-3.5 w-3.5" />Engineering {state.engineeringSkill}/300</span>
            <span className="wow-chip"><Swords className="h-3.5 w-3.5" />{Math.max(0, state.level - 9)} talent points</span>
          </div>
        </div>
        <div className="wow-hero-sync">
          <button type="button" className="wow-sync-button" onClick={() => sync()} disabled={syncing || !state.characterSlug}>
            <RefreshCw className={syncing ? "h-4 w-4 wow-spin" : "h-4 w-4"} />
            {syncing ? "Syncing…" : "Sync armory"}
          </button>
          <p className={syncMessage?.error ? "wow-sync-note wow-sync-error" : "wow-sync-note"}>
            {syncMessage?.text ?? (state.syncedAt
              ? `Last sync ${new Date(state.syncedAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`
              : state.characterSlug ? "Not synced yet" : "Set your character below")}
            {saveState === "saving" && " · saving…"}
            {saveState === "error" && " · save failed"}
          </p>
          <details className="wow-settings">
            <summary>Character settings</summary>
            <div className="wow-settings-body">
              <label className="wow-field">
                <span>Armory name</span>
                <input
                  type="text"
                  value={state.characterSlug}
                  placeholder="name-surname"
                  spellCheck={false}
                  onChange={(e) => { const characterSlug = e.target.value.toLowerCase(); update((s) => ({ ...s, characterSlug })); }}
                />
              </label>
              <label className="wow-field">
                <span>Level</span>
                <NumberInput value={state.level} min={1} max={60} onChange={(level) => update((s) => ({ ...s, level }))} />
              </label>
              <p className="wow-hint">The armory updates on logout, so a fresh ding can lag behind. Override it here.</p>
            </div>
          </details>
        </div>
      </div>

      <div className="wow-track" aria-hidden="true">
        <div className="wow-track-bar"><div className="wow-track-fill" style={{ width: `${(state.level / 60) * 100}%` }} /></div>
        <div className="wow-track-ticks">
          {ticks.map((t) => (
            <span key={t} className={t <= state.level ? "wow-tick wow-tick-done" : "wow-tick"} style={{ left: `${(t / 60) * 100}%` }}>{t}</span>
          ))}
        </div>
      </div>
      {nextGate && (
        <p className="wow-hero-next"><Sparkles className="h-4 w-4" />Level {nextGate.level}: {nextGate.label}<span className="wow-muted"> · {nextGate.level! - state.level} to go</span></p>
      )}
    </section>
  );
}

function NumberInput({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (n: number) => void }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  function commit() {
    const n = Math.round(Number(draft));
    if (!Number.isFinite(n)) { setDraft(String(value)); return; }
    const clamped = Math.min(max, Math.max(min, n));
    setDraft(String(clamped));
    if (clamped !== value) onChange(clamped);
  }
  return (
    <input
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
    />
  );
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

function nextTalent(level: number): TalentStep | null {
  return TALENT_STEPS.find((s) => s.level === level + 1) ?? null;
}

function currentEngineeringStep(skill: number) {
  return ENGINEERING_ROUTE.find((s) => skill < s.to) ?? null;
}

function currentZone(level: number) {
  const matches = ZONE_ROUTE.filter((z) => level >= z.from && level < z.to);
  return matches[matches.length - 1] ?? (level >= 60 ? ZONE_ROUTE[ZONE_ROUTE.length - 1] : ZONE_ROUTE[0]);
}

function Overview({ state, onJump }: { state: WowState; onJump: (s: Section) => void }) {
  const talent = nextTalent(state.level);
  const eng = currentEngineeringStep(state.engineeringSkill);
  const zone = currentZone(state.level);
  const goal = MILESTONE_GOALS
    .filter((m) => !state.checked.includes(m.id))
    .sort((a, b) => (a.level ?? state.level) - (b.level ?? state.level))[0];

  return (
    <>
      <div className="wow-now">
        <NowTile label={`At level ${state.level + 1}`} icon={<Swords className="h-4 w-4" />} onClick={() => onJump("talents")}
          title={talent ? `${talent.talent}` : "Build complete"}
          sub={talent ? `${talent.phase} · rank ${talent.rank}/${talent.maxRank}` : "All 51 points placed."} />
        <NowTile label={`Engineering ${state.engineeringSkill}`} icon={<Wrench className="h-4 w-4" />} onClick={() => onJump("engineering")}
          title={eng ? eng.craft : "Engineering maxed"}
          sub={eng ? `${eng.from}–${eng.to} · ${eng.count}× · ${eng.mats}` : "Go make some Rocket Boots."} />
        <NowTile label="Quest here" icon={<MapPin className="h-4 w-4" />} onClick={() => onJump("zones")}
          title={zone.zones}
          sub={zone.note || `Levels ${zone.from}–${zone.to}`} />
        <NowTile label={goal?.level ? `Goal · level ${goal.level}` : "Goal"} icon={<Flag className="h-4 w-4" />} onClick={() => onJump("goals")}
          title={goal ? goal.label : "Every goal done"}
          sub={goal ? goal.detail : "Time to write new ones."} />
      </div>

      <div className="wow-grid-2">
        <Ritual />
        <section className="wow-panel">
          <PanelHead icon={<Crosshair className="h-4 w-4" />} title="Rotation cheat sheet" />
          <ul className="wow-bullets">
            {ROTATION_NOTES.map((note) => <li key={note}>{note}</li>)}
          </ul>
        </section>
      </div>
    </>
  );
}

function NowTile({ label, title, sub, icon, onClick }: { label: string; title: string; sub: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" className="wow-now-tile" onClick={onClick}>
      <span className="wow-now-label">{icon}{label}</span>
      <span className="wow-now-title">{title}</span>
      <span className="wow-now-sub">{sub}</span>
    </button>
  );
}

function PanelHead({ icon, title, aside }: { icon: React.ReactNode; title: string; aside?: React.ReactNode }) {
  return (
    <div className="wow-panel-head">
      <span className="wow-panel-icon">{icon}</span>
      <h3 className="wow-panel-title">{title}</h3>
      {aside && <span className="wow-panel-aside">{aside}</span>}
    </div>
  );
}

function Ritual() {
  const key = `fofo-wow-ritual-${todayKey()}`;
  const [done, setDone] = useState<string[]>([]);
  useEffect(() => setDone(readLocal<string[]>(key, [])), [key]);
  function toggle(id: string) {
    setDone((current) => {
      const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
      writeLocal(key, next);
      return next;
    });
  }
  return (
    <section className="wow-panel">
      <PanelHead icon={<Flame className="h-4 w-4" />} title="Before you pull" aside={`${done.length}/${BUFF_RITUAL.length} · resets daily`} />
      <ul className="wow-checklist">
        {BUFF_RITUAL.map((item) => (
          <CheckRow key={item.id} checked={done.includes(item.id)} onToggle={() => toggle(item.id)} label={item.label} detail={item.detail} />
        ))}
      </ul>
    </section>
  );
}

function CheckRow({ checked, onToggle, label, detail, locked, meta, children }: { checked: boolean; onToggle: () => void; label: string; detail?: string; locked?: boolean; meta?: string; children?: React.ReactNode }) {
  return (
    <li className={`wow-check ${checked ? "is-done" : ""} ${locked ? "is-locked" : ""}`}>
      <button type="button" className="wow-check-box" aria-pressed={checked} aria-label={checked ? `Unmark ${label}` : `Mark ${label} done`} onClick={onToggle}>
        {checked ? <Check className="h-3.5 w-3.5" /> : locked ? <Lock className="h-3 w-3" /> : null}
      </button>
      <div className="wow-check-body">
        <p className="wow-check-label">{label}{meta && <span className="wow-check-meta">{meta}</span>}</p>
        {detail && !checked && <p className="wow-check-detail">{detail}</p>}
        {children}
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Talents: read-only plan driven by level
// ---------------------------------------------------------------------------

type TalentGroup = { talent: string; from: number; to: number; points: number; note?: string };

function groupTalents(steps: TalentStep[]): TalentGroup[] {
  const groups: TalentGroup[] = [];
  for (const step of steps) {
    const last = groups[groups.length - 1];
    if (last && last.talent === step.talent && last.to === step.level - 1) {
      last.to = step.level;
      last.points += 1;
    } else {
      groups.push({ talent: step.talent, from: step.level, to: step.level, points: 1, note: step.note });
    }
  }
  return groups;
}

const TALENT_PHASES = ["Foundations", "Pet Power & Bestial Wrath", "Marksmanship"] as const;

function Talents({ level }: { level: number }) {
  const spent = Math.max(0, Math.min(51, level - 9));

  return (
    <section className="wow-panel">
      <PanelHead icon={<Swords className="h-4 w-4" />} title="Talent plan · 31 BM / 20 MM" aside={`${spent}/51 points spent at level ${level}`} />
      <p className="wow-lede">You get one point per level from 10. The highlighted row is where your next point goes. The build follows Method&apos;s Forever hunter leveling guide.</p>
      <div className="wow-phases">
        {TALENT_PHASES.map((phase) => {
          const steps = TALENT_STEPS.filter((s) => s.phase === phase);
          const groups = groupTalents(steps);
          const first = steps[0].level;
          const last = steps[steps.length - 1].level;
          const phaseDone = level >= last;
          const rows = (
            <ol className="wow-talents">
              {groups.map((g) => {
                const status = level >= g.to ? "done" : level + 1 >= g.from ? "next" : "todo";
                const have = Math.max(0, Math.min(g.points, level - g.from + 1));
                return (
                  <li key={`${g.talent}-${g.from}`} className={`wow-talent is-${status}`}>
                    <span className="wow-talent-level">{g.from === g.to ? g.from : `${g.from}–${g.to}`}</span>
                    <span className="wow-talent-name">
                      {g.talent}
                      {status === "next" && <span className="wow-talent-next">Next point at level {level + 1}</span>}
                      {g.note && status !== "done" && <span className="wow-talent-note">{g.note}</span>}
                    </span>
                    <span className="wow-talent-rank">
                      {status === "done" ? <Check className="h-3.5 w-3.5" /> : status === "next" ? `${have}/${g.points}` : `${g.points} pt${g.points > 1 ? "s" : ""}`}
                    </span>
                  </li>
                );
              })}
            </ol>
          );
          return (
            <div key={phase} className={`wow-phase ${phaseDone ? "is-done" : ""}`}>
              {phaseDone ? (
                <details>
                  <summary className="wow-phase-title">
                    <Check className="h-4 w-4" />{phase}<span className="wow-muted"> · lv {first}–{last} · learned</span>
                  </summary>
                  {rows}
                </details>
              ) : (
                <>
                  <p className="wow-phase-title">{phase}<span className="wow-muted"> · lv {first}–{last}</span></p>
                  {rows}
                </>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Engineering
// ---------------------------------------------------------------------------

function Engineering({ state, update }: { state: WowState; update: (m: (s: WowState) => WowState) => void }) {
  const skill = state.engineeringSkill;
  const current = currentEngineeringStep(skill);
  const artisanBlocked = skill >= 195 && state.level < 35;
  const doneSteps = ENGINEERING_ROUTE.filter((s) => skill >= s.to).length;
  const [showDone, setShowDone] = useState(false);

  return (
    <div className="wow-stack">
      <section className="wow-panel">
        <PanelHead icon={<Wrench className="h-4 w-4" />} title="Engineering 1–300"
          aside={<a className="wow-link" href={ENGINEERING_GUIDE_URL} target="_blank" rel="noreferrer">Full guide <ExternalLink className="h-3.5 w-3.5" /></a>} />
        <div className="wow-skill">
          <div className="wow-skill-top">
            <span className="wow-skill-value">{skill}<span className="wow-muted"> / 300</span></span>
            <label className="wow-field wow-field-inline">
              <span>Adjust</span>
              <NumberInput value={skill} min={0} max={300} onChange={(engineeringSkill) => update((s) => ({ ...s, engineeringSkill }))} />
            </label>
          </div>
          <div className="wow-skill-bar"><div className="wow-skill-fill" style={{ width: `${(skill / 300) * 100}%` }} /></div>
          <div className="wow-skill-marks">
            {ENGINEERING_RANKS.map((r) => (
              <span key={r.at} className={skill >= r.at ? "wow-mark is-done" : "wow-mark"} style={{ left: `${(r.at / 300) * 100}%` }}>{r.label}<b>{r.at}</b></span>
            ))}
          </div>
        </div>

        {current && (
          <div className="wow-current-craft">
            <p className="wow-eyebrow">Craft now · {current.from}–{current.to}</p>
            <p className="wow-current-title">{current.count}× {current.craft}</p>
            <p className="wow-current-mats">{current.mats}</p>
            {current.note && <p className="wow-current-note">{current.note}</p>}
            <div className="wow-step-progress">
              <div className="wow-step-bar"><div style={{ width: `${Math.max(0, Math.min(1, (skill - current.from) / (current.to - current.from))) * 100}%` }} /></div>
              <span>{current.to - skill} skill to {current.to}</span>
            </div>
          </div>
        )}
        {artisanBlocked && <p className="wow-warn">Artisan (200+) needs character level 35, so you have {35 - state.level} levels to go. Bank mats until then.</p>}
      </section>

      <section className="wow-panel">
        <PanelHead icon={<Flag className="h-4 w-4" />} title="Route" aside={`${doneSteps}/${ENGINEERING_ROUTE.length} steps`} />
        {doneSteps > 0 && (
          <button type="button" className="wow-fold" onClick={() => setShowDone((v) => !v)} aria-expanded={showDone}>
            <Check className="h-4 w-4" />
            {doneSteps} steps done (1–{ENGINEERING_ROUTE[doneSteps - 1].to})
            <span>{showDone ? "hide" : "show"}</span>
          </button>
        )}
        <ol className="wow-route">
          {ENGINEERING_ROUTE.map((step) => {
            const status = skill >= step.to ? "done" : step === current ? "next" : "todo";
            if (status === "done" && !showDone) return null;
            return (
              <li key={`${step.from}-${step.craft}`} className={`wow-route-row is-${status}`}>
                <span className="wow-route-range">{step.from}–{step.to}</span>
                <span className="wow-route-craft">
                  <b>{step.count}× {step.craft}</b>
                  <span>{step.mats}</span>
                </span>
                <span className="wow-route-note">{status === "done" ? <Check className="h-4 w-4" /> : step.note}</span>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="wow-panel">
        <PanelHead icon={<Sparkles className="h-4 w-4" />} title="Worth knowing" />
        <ul className="wow-bullets">{ENGINEERING_NOTES.map((n) => <li key={n}>{n}</li>)}</ul>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Zones
// ---------------------------------------------------------------------------

function Zones({ level }: { level: number }) {
  const here = currentZone(level);
  return (
    <section className="wow-panel">
      <PanelHead icon={<MapPin className="h-4 w-4" />} title="Horde zone route" aside="25–60" />
      <p className="wow-lede">The standard Horde path. Forever retunes some zones, so treat it as a compass, not rails.</p>
      <ol className="wow-timeline">
        {ZONE_ROUTE.map((z) => {
          const status = z === here ? "here" : level >= z.to ? "done" : "todo";
          return (
            <li key={z.zones} className={`wow-stop is-${status}`}>
              <span className="wow-stop-dot" aria-hidden="true" />
              <div>
                <p className="wow-stop-range">Level {z.from}–{z.to}{status === "here" && <span className="wow-here">You are here</span>}</p>
                <p className="wow-stop-zones">{z.zones}</p>
                {z.note && <p className="wow-stop-note">{z.note}</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Goals
// ---------------------------------------------------------------------------

function Goals({ state, update, toggleChecked }: { state: WowState; update: (m: (s: WowState) => WowState) => void; toggleChecked: (id: string) => void }) {
  const sorted = [...MILESTONE_GOALS].sort((a, b) => (a.level ?? 0) - (b.level ?? 0));
  const done = sorted.filter((g) => state.checked.includes(g.id)).length;
  const available = sorted.filter((g) => !state.checked.includes(g.id) && (g.level === null || g.level <= state.level));
  const upcoming = sorted.filter((g) => !state.checked.includes(g.id) && g.level !== null && g.level > state.level);
  const finished = sorted.filter((g) => state.checked.includes(g.id));

  const renderGoal = (g: (typeof sorted)[number], locked = false) => (
    <CheckRow key={g.id} checked={state.checked.includes(g.id)} onToggle={() => toggleChecked(g.id)} label={g.label} detail={g.detail} locked={locked} meta={g.level ? `lv ${g.level}` : undefined}>
      {g.id === "truthseeker" && !state.checked.includes(g.id) && (
        <div className="wow-books">
          <BookOpen className="h-4 w-4" />
          <div className="wow-books-bar"><div style={{ width: `${(state.libraryBooks / LIBRARY_BOOKS_TARGET) * 100}%` }} /></div>
          <label className="wow-field wow-field-inline">
            <NumberInput value={state.libraryBooks} min={0} max={LIBRARY_BOOKS_TARGET} onChange={(libraryBooks) => update((s) => ({ ...s, libraryBooks }))} />
            <span>/ {LIBRARY_BOOKS_TARGET} books</span>
          </label>
        </div>
      )}
    </CheckRow>
  );

  return (
    <div className="wow-grid-2">
      <section className="wow-panel">
        <PanelHead icon={<Flag className="h-4 w-4" />} title="Do these now" aside={`${done}/${sorted.length} done`} />
        {available.length ? <ul className="wow-checklist">{available.map((g) => renderGoal(g))}</ul> : <p className="wow-empty">Nothing open at your level. Go level up.</p>}
      </section>
      <div className="wow-stack">
        <section className="wow-panel">
          <PanelHead icon={<Lock className="h-4 w-4" />} title="Coming up" />
          <ul className="wow-checklist">{upcoming.map((g) => renderGoal(g, true))}</ul>
        </section>
        {finished.length > 0 && (
          <section className="wow-panel">
            <PanelHead icon={<Check className="h-4 w-4" />} title="Done" />
            <ul className="wow-checklist">{finished.map((g) => renderGoal(g))}</ul>
          </section>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Gold
// ---------------------------------------------------------------------------

function Gold({ skill }: { skill: number }) {
  const verdictLabel = { sell: "Sell", later: "Later", skip: "Skip" } as const;
  return (
    <div className="wow-stack">
      <section className="wow-panel">
        <PanelHead icon={<Coins className="h-4 w-4" />} title="Engineering crafts for gold" aside={`your skill: ${skill}`} />
        <p className="wow-lede">Rough AH margins from 13 Nov 2026 (EU where known). Prices move, so check the AH before crafting a stack.</p>
        <ul className="wow-crafts">
          {GOLD_CRAFTS.map((c) => {
            const canCraft = skill >= c.skill && c.verdict !== "skip";
            return (
              <li key={c.name} className={`wow-craft is-${c.verdict}`}>
                <span className={`wow-badge is-${c.verdict}`}>{verdictLabel[c.verdict]}</span>
                <div className="wow-craft-body">
                  <p className="wow-craft-name">
                    {c.name}
                    <span className="wow-check-meta">skill {c.skill}</span>
                    {canCraft && <span className="wow-ready">You can craft this</span>}
                  </p>
                  <p className="wow-check-detail">{c.detail}</p>
                </div>
                <span className="wow-craft-profit">{c.profit}</span>
              </li>
            );
          })}
        </ul>
      </section>
      <section className="wow-panel">
        <PanelHead icon={<Sparkles className="h-4 w-4" />} title="Hunter gold habits" />
        <div className="wow-tips">
          {GOLD_TIPS.map((t) => (
            <div key={t.title} className="wow-tip">
              <p className="wow-tip-title">{t.title}</p>
              <p className="wow-check-detail">{t.detail}</p>
            </div>
          ))}
        </div>
        <p className="wow-source">Sources: timesaver.gg engineering gold analysis (13 Nov) and warcraftmaps.com hunter gold farming (11 Nov).</p>
      </section>
    </div>
  );
}
