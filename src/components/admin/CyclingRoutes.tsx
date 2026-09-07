"use client";

import { useEffect, useMemo, useState } from "react";
import { Bike, Bookmark, Car, Check, Download, Route, X } from "lucide-react";
import clsx from "clsx";

import { decodePolyline } from "@/lib/decodePolyline";

type RouteState = { routeId: string; saved: boolean; ridden: boolean; rating: number | null; traffic: "peaceful" | "mixed" | "busy" | null; note: string };
type CyclingRoute = {
  id: string; name: string; kind: "home" | "schmankerl"; reason: string; reward: string; compromise: string;
  shortening?: string; driveMinutes?: number; startLabel?: string; distanceKm: number; elevationGainM: number; rideMinutes: number;
  ftpWatts: number;
  surface: { pavedPercent: number; unpavedPercent: number; unknownPercent: number; stressfulKm: number; quietKm: number };
  coordinates: [number, number, number][]; generatedAt: string; router: string; review: string;
};

const EMPTY_STATE: Omit<RouteState, "routeId"> = { saved: false, ridden: false, rating: null, traffic: null, note: "" };

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "Request failed.");
  return body as T;
}

function duration(minutes: number) {
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return `${h ? `${h}h ` : ""}${m ? `${m}m` : ""}`.trim();
}

function routeBounds(points: [number, number, number][]) {
  const lons = points.map((point) => point[0]), lats = points.map((point) => point[1]);
  return { minX: Math.min(...lons), maxX: Math.max(...lons), minY: Math.min(...lats), maxY: Math.max(...lats) };
}

function mapBounds(points: [number, number, number][], width = 800, height = 420) {
  const raw = routeBounds(points);
  const centerX = (raw.minX + raw.maxX) / 2, centerY = (raw.minY + raw.maxY) / 2;
  let spanX = Math.max(0.006, (raw.maxX - raw.minX) * 1.18);
  let spanY = Math.max(0.004, (raw.maxY - raw.minY) * 1.18);
  const targetAspect = width / height;
  if (spanX / spanY < targetAspect) spanX = spanY * targetAspect;
  else spanY = spanX / targetAspect;
  return { minX: centerX - spanX / 2, maxX: centerX + spanX / 2, minY: centerY - spanY / 2, maxY: centerY + spanY / 2 };
}

function routePath(points: [number, number, number][], bounds = routeBounds(points), width = 800, height = 420) {
  if (!points.length) return "";
  const { minX, maxX, minY, maxY } = bounds;
  const pad = 24, scale = Math.min((width - 2 * pad) / (maxX - minX || 1), (height - 2 * pad) / (maxY - minY || 1));
  const ox = (width - (maxX - minX) * scale) / 2 - minX * scale;
  const oy = (height - (maxY - minY) * scale) / 2 + maxY * scale;
  return points.map(([lon, lat], index) => `${index ? "L" : "M"}${(lon * scale + ox).toFixed(1)},${(-lat * scale + oy).toFixed(1)}`).join(" ");
}

function RouteMap({ route, heatmap = [] }: { route: CyclingRoute; heatmap?: string[] }) {
  const overlays = heatmap.map((line) => decodePolyline(line).map(([lat, lon]) => [lon, lat, 0] as [number, number, number]));
  const bounds = mapBounds(route.coordinates);
  const satelliteUrl = `/api/workspace/routes/satellite?bbox=${[bounds.minX, bounds.minY, bounds.maxX, bounds.maxY].map((value) => value.toFixed(6)).join(",")}`;
  const startPath = routePath([route.coordinates[0]], bounds);
  const start = startPath.match(/M([\d.-]+),([\d.-]+)/);
  return (
    <svg viewBox="0 0 800 420" className="block h-full min-h-48 w-full bg-[#dbe9de]" role="img" aria-label={`North-up satellite map and route line for ${route.name}`}>
      <defs><pattern id={`grid-${route.id}`} width="36" height="36" patternUnits="userSpaceOnUse"><path d="M36 0H0V36" fill="none" stroke="#000" strokeOpacity=".08" /></pattern></defs>
      <image href={satelliteUrl} x="0" y="0" width="800" height="420" preserveAspectRatio="none" opacity=".44" />
      <rect width="800" height="420" fill="#dbe9de" opacity=".38" />
      <rect width="800" height="420" fill={`url(#grid-${route.id})`} />
      {overlays.map((points, index) => <path key={index} d={routePath(points, bounds)} fill="none" stroke="#0008ff" strokeOpacity=".13" strokeWidth="9" />)}
      <path d={routePath(route.coordinates, bounds)} fill="none" stroke="#fff" strokeWidth="12" strokeLinejoin="round" strokeLinecap="round" />
      <path d={routePath(route.coordinates, bounds)} fill="none" stroke="#000" strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" />
      {start ? <circle cx={start[1]} cy={start[2]} r="7" fill="#ff3dbe" stroke="#000" strokeWidth="3" /> : null}
      <g transform="translate(39 367)" fontFamily="monospace" fontSize="10" fontWeight="700" textAnchor="middle"><circle r="27" fill="white" fillOpacity=".88" stroke="black" strokeWidth="2" /><path d="M0-18L-5 2L0-1L5 2Z" fill="#111" /><text y="-8">N</text><text x="17" y="4">E</text><text y="21">S</text><text x="-17" y="4">W</text></g>
      <g transform="translate(652 390)"><rect width="136" height="20" fill="white" fillOpacity=".82" /><text x="68" y="14" textAnchor="middle" fontFamily="monospace" fontSize="9">Imagery © Esri</text></g>
    </svg>
  );
}

function segmentDistanceM(a: [number, number, number], b: [number, number, number]) {
  const latitude = ((a[1] + b[1]) / 2) * Math.PI / 180;
  const dx = (b[0] - a[0]) * 111_320 * Math.cos(latitude);
  const dy = (b[1] - a[1]) * 110_540;
  return Math.hypot(dx, dy);
}

function gradeColor(grade: number) {
  if (grade < -0.08) return "#1926c9";
  if (grade < -0.035) return "#00a9e8";
  if (grade < 0.025) return "#27d779";
  if (grade < 0.06) return "#ffe14d";
  if (grade < 0.1) return "#ff8a24";
  return "#ff3dbe";
}

function smoothedCoordinates(points: [number, number, number][]) {
  const elevations = points.map((point) => Number.isFinite(point[2]) ? point[2] : 0);
  const despiked = elevations.map((elevation, index) => {
    const window = elevations.slice(Math.max(0, index - 5), Math.min(elevations.length, index + 6)).sort((a, b) => a - b);
    const median = window[Math.floor(window.length / 2)] ?? elevation;
    const deviations = window.map((value) => Math.abs(value - median)).sort((a, b) => a - b);
    const mad = deviations[Math.floor(deviations.length / 2)] ?? 0;
    const limit = Math.max(10, mad * 3);
    return Math.max(median - limit, Math.min(median + limit, elevation));
  });
  return points.map((point, index) => {
    let weighted = 0, weightTotal = 0;
    for (let offset = -4; offset <= 4; offset += 1) {
      const sampleIndex = Math.max(0, Math.min(despiked.length - 1, index + offset));
      const weight = 5 - Math.abs(offset);
      weighted += despiked[sampleIndex] * weight;
      weightTotal += weight;
    }
    return [point[0], point[1], weighted / weightTotal] as [number, number, number];
  });
}

function Route3D({ route }: { route: CyclingRoute }) {
  const [rotation, setRotation] = useState(34);
  const [stretch, setStretch] = useState(1);
  const smoothed = smoothedCoordinates(route.coordinates);
  const step = Math.max(1, Math.ceil(smoothed.length / 180));
  const sampled = smoothed.filter((_, index) => index % step === 0);
  if (sampled.at(-1) !== smoothed.at(-1)) sampled.push(smoothed.at(-1)!);
  const bounds = routeBounds(sampled);
  const elevations = sampled.map((point) => point[2]);
  const minElevation = Math.min(...elevations);
  const elevationScale = 0.1;
  const angle = rotation * Math.PI / 180;
  const spanX = bounds.maxX - bounds.minX || 1;
  const spanY = bounds.maxY - bounds.minY || 1;

  const project = (point: [number, number, number]) => {
    const x = ((point[0] - (bounds.minX + bounds.maxX) / 2) / spanX) * 520;
    const z = ((point[1] - (bounds.minY + bounds.maxY) / 2) / spanY) * 360;
    const rx = x * Math.cos(angle) - z * Math.sin(angle);
    const depth = x * Math.sin(angle) + z * Math.cos(angle);
    const baseY = 300 + depth * 0.24;
    return { x: 400 + rx * 0.76, baseY, y: baseY - (point[2] - minElevation) * elevationScale * stretch, depth };
  };
  const projected = sampled.map(project);
  const faces = sampled.slice(0, -1).map((point, index) => {
    const a = projected[index], b = projected[index + 1];
    const distance = Math.max(1, segmentDistanceM(point, sampled[index + 1]));
    return { index, depth: (a.depth + b.depth) / 2, color: gradeColor((sampled[index + 1][2] - point[2]) / distance), points: `${a.x},${a.y} ${b.x},${b.y} ${b.x},${b.baseY} ${a.x},${a.baseY}` };
  }).sort((a, b) => a.depth - b.depth);
  const topLine = projected.map((point) => `${point.x},${point.y}`).join(" ");
  const groundLine = projected.map((point) => `${point.x},${point.baseY}`).join(" ");

  return <div className="relative h-full min-h-72 overflow-hidden bg-[#e8eee8]">
    <svg viewBox="0 0 800 420" className="h-full w-full" role="img" aria-label={`Interactive three-dimensional elevation ribbon for ${route.name}`}>
      <rect width="800" height="420" fill="#e8eee8" />
      {[-240,-160,-80,0,80,160,240].map((offset) => {
        const a = project([bounds.minX, (bounds.minY + bounds.maxY) / 2 + offset / 360 * spanY, minElevation]);
        const b = project([bounds.maxX, (bounds.minY + bounds.maxY) / 2 + offset / 360 * spanY, minElevation]);
        return <line key={`h${offset}`} x1={a.x} y1={a.baseY} x2={b.x} y2={b.baseY} stroke="#000" strokeOpacity=".12" />;
      })}
      {[-260,-173,-86,0,86,173,260].map((offset) => {
        const a = project([(bounds.minX + bounds.maxX) / 2 + offset / 520 * spanX, bounds.minY, minElevation]);
        const b = project([(bounds.minX + bounds.maxX) / 2 + offset / 520 * spanX, bounds.maxY, minElevation]);
        return <line key={`v${offset}`} x1={a.x} y1={a.baseY} x2={b.x} y2={b.baseY} stroke="#000" strokeOpacity=".12" />;
      })}
      <polyline points={groundLine} fill="none" stroke="#000" strokeOpacity=".18" strokeWidth="2" />
      {faces.map((face) => <polygon key={face.index} points={face.points} fill={face.color} fillOpacity=".88" stroke="#000" strokeOpacity=".28" strokeWidth=".7" />)}
      <polyline points={topLine} fill="none" stroke="#fff" strokeWidth="7" strokeLinejoin="round" strokeLinecap="round" />
      <polyline points={topLine} fill="none" stroke="#000" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
    <div className="absolute bottom-3 left-3 right-3 grid gap-2 border-2 border-black bg-white/95 p-3 sm:grid-cols-2">
      <label className="font-mono text-[9px] uppercase">Rotate <input aria-label="Rotate 3D route" type="range" min="-70" max="70" value={rotation} onChange={(event) => setRotation(Number(event.target.value))} className="block w-full accent-fofo-blue" /></label>
      <label className="font-mono text-[9px] uppercase">Relief × {stretch.toFixed(1)} · 100 m = {Math.round(10 * stretch)} px <input aria-label="Elevation exaggeration" type="range" min="0.5" max="2" step="0.1" value={stretch} onChange={(event) => setStretch(Number(event.target.value))} className="block w-full accent-fofo-pink" /></label>
    </div>
    <div className="absolute right-3 top-3 flex border-2 border-black bg-white font-mono text-[9px] uppercase"><span className="bg-[#1926c9] px-2 py-1 text-white">down</span><span className="bg-[#27d779] px-2 py-1">flat</span><span className="bg-[#ffe14d] px-2 py-1">climb</span><span className="bg-[#ff3dbe] px-2 py-1 text-white">steep</span></div>
  </div>;
}

function Elevation({ route }: { route: CyclingRoute }) {
  const values = smoothedCoordinates(route.coordinates).map((point) => point[2]);
  const min = Math.min(...values), max = Math.max(...values), range = max - min || 1;
  const d = values.map((value, index) => `${index ? "L" : "M"}${((index / Math.max(1, values.length - 1)) * 800).toFixed(1)},${(155 - ((value - min) / range) * 125).toFixed(1)}`).join(" ");
  return <svg viewBox="0 0 800 170" className="w-full border-y-2 border-black bg-fofo-yellow/30" role="img" aria-label={`Elevation profile, ${Math.round(min)} to ${Math.round(max)} metres`}><path d={`${d} L800,170 L0,170 Z`} fill="#ffe14d" stroke="#000" strokeWidth="3" /></svg>;
}

export default function CyclingRoutes() {
  const [routes, setRoutes] = useState<CyclingRoute[]>([]);
  const [states, setStates] = useState<Record<string, RouteState>>({});
  const [heatmap, setHeatmap] = useState<string[]>([]);
  const [kind, setKind] = useState<"home" | "schmankerl" | "saved" | "ridden">("home");
  const [maxDistance, setMaxDistance] = useState(160);
  const [maxMinutes, setMaxMinutes] = useState(720);
  const [maxElevation, setMaxElevation] = useState(3500);
  const [selected, setSelected] = useState<CyclingRoute | null>(null);
  const [message, setMessage] = useState("Loading the route book…");
  const [homeLabel, setHomeLabel] = useState("Home · Graz");

  useEffect(() => {
    Promise.all([
      requestJson<{ routes: CyclingRoute[]; states: RouteState[]; homeLabel: string }>("/api/workspace/routes"),
      requestJson<{ polylines: string[] }>("/api/workspace/routes/heatmap"),
    ]).then(([data, heat]) => {
      setRoutes(data.routes);
      setHomeLabel(data.homeLabel);
      setStates(Object.fromEntries(data.states.map((state) => [state.routeId, state])));
      setHeatmap(heat.polylines);
      setMessage("");
    }).catch((error) => setMessage(error.message));
  }, []);

  const filtered = useMemo(() => routes.filter((route) => {
    const state = states[route.id];
    const collection = kind === "saved" ? state?.saved : kind === "ridden" ? state?.ridden : route.kind === kind;
    return collection && route.distanceKm <= maxDistance && route.rideMinutes <= maxMinutes && route.elevationGainM <= maxElevation;
  }), [routes, states, kind, maxDistance, maxMinutes, maxElevation]);

  async function saveState(routeId: string, patch: Partial<RouteState>) {
    const next = { ...(states[routeId] ?? { routeId, ...EMPTY_STATE }), ...patch };
    setStates((current) => ({ ...current, [routeId]: next }));
    try {
      const result = await requestJson<{ state: RouteState }>(`/api/workspace/routes/${routeId}`, { method: "PATCH", body: JSON.stringify(next) });
      setStates((current) => ({ ...current, [routeId]: result.state }));
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save route."); }
  }

  return (
    <section className="border-[2.5px] border-black bg-white shadow-brutal">
      <div className="grid border-b-[2.5px] border-black bg-black text-white lg:grid-cols-[1.1fr_.9fr]">
        <div className="p-6 md:p-9"><p className="meta !text-fofo-yellow">{"// from the front door"}</p><h2 className="mt-3 max-w-3xl font-display text-4xl font-bold lowercase leading-[.95] md:text-6xl">roads worth leaving home for.</h2><p className="mt-5 max-w-xl text-sm leading-6 text-white/65">Paved road-bike loops, shaped for quiet stretches, flow and a clear reward. Popularity comes from your private ride history; traffic and surface are modeled and remain visible.</p></div>
        <div className="border-t-[2.5px] border-white/20 bg-fofo-blue p-6 lg:border-l lg:border-t-0"><p className="font-mono text-xs uppercase tracking-widest text-white/60">Home base</p><p className="mt-2 text-xl font-bold">{homeLabel}</p><p className="mt-5 text-sm leading-6 text-white/70">The exact start comes from private environment configuration and is exposed only inside this authenticated workspace.</p></div>
      </div>

      <div className="flex flex-wrap gap-2 border-b-[2.5px] border-black bg-fofo-paper p-3">
        {[(["home", Bike, "From home"]), (["schmankerl", Car, "Schmankerl"]), (["saved", Bookmark, "Saved"]), (["ridden", Check, "Ridden"])].map(([value, Icon, label]) => <button key={String(value)} type="button" onClick={() => setKind(value as typeof kind)} className={clsx("flex items-center gap-2 border-2 border-black px-4 py-2 font-mono text-xs font-bold uppercase", kind === value ? "bg-black text-white" : "bg-white hover:bg-fofo-yellow")}><Icon className="h-4 w-4" />{String(label)}</button>)}
      </div>

      <div className="grid border-b-[2.5px] border-black md:grid-cols-3">
        <Range label="Distance" value={maxDistance} setValue={setMaxDistance} min={30} max={170} step={10} unit="km" />
        <Range label="Riding time" value={maxMinutes} setValue={setMaxMinutes} min={90} max={720} step={30} unit="min" />
        <Range label="Climbing" value={maxElevation} setValue={setMaxElevation} min={300} max={3500} step={100} unit="m" />
      </div>

      {message ? <p className="p-6 font-mono text-sm">{message}</p> : null}
      <div className="grid gap-px bg-black lg:grid-cols-2 xl:grid-cols-3">
        {filtered.map((route) => {
          const state = states[route.id] ?? { routeId: route.id, ...EMPTY_STATE };
          return <article key={route.id} className="group bg-white"><button type="button" onClick={() => setSelected(route)} className="block w-full text-left"><div className="h-52 overflow-hidden border-b-2 border-black"><RouteMap route={route} /></div><div className="p-5"><div className="flex items-start justify-between gap-4"><div><p className="font-mono text-[10px] uppercase tracking-widest text-fofo-blue">{route.kind === "home" ? "starts at home" : `${route.driveMinutes} min drive · Schmankerl`}</p><h3 className="mt-1 font-display text-2xl font-bold lowercase">{route.name}</h3></div><Route className="h-5 w-5 shrink-0 transition group-hover:translate-x-1" /></div><p className="mt-3 min-h-12 text-sm leading-5 text-black/60">{route.reason}</p><div className="mt-4 grid grid-cols-3 border-2 border-black font-mono text-xs"><Metric value={`${route.distanceKm} km`} label="distance" /><Metric value={duration(route.rideMinutes)} label="moving" /><Metric value={`${route.elevationGainM} m`} label="up" /></div>{route.surface.unpavedPercent > 0 ? <p className="mt-3 bg-fofo-pink px-2 py-1 font-mono text-[10px] uppercase text-white">{route.surface.unpavedPercent}% possible unpaved — inspect</p> : null}</div></button><div className="flex border-t-2 border-black"><button type="button" onClick={() => saveState(route.id, { saved: !state.saved })} className={clsx("flex flex-1 items-center justify-center gap-2 p-3 font-mono text-xs uppercase", state.saved ? "bg-fofo-yellow" : "hover:bg-fofo-yellow/40")}><Bookmark className="h-4 w-4" fill={state.saved ? "currentColor" : "none"} />{state.saved ? "Saved" : "Save"}</button><a href={`/api/workspace/routes/${route.id}/gpx`} className="flex flex-1 items-center justify-center gap-2 border-l-2 border-black p-3 font-mono text-xs uppercase hover:bg-fofo-blue hover:text-white"><Download className="h-4 w-4" />GPX</a></div></article>;
        })}
      </div>
      {!message && !filtered.length ? <p className="p-10 text-center text-black/45">No routes fit those limits yet.</p> : null}

      {selected ? <RouteDetail route={selected} routes={routes} state={states[selected.id] ?? { routeId: selected.id, ...EMPTY_STATE }} heatmap={heatmap} onClose={() => setSelected(null)} onSelect={setSelected} onChange={(patch) => saveState(selected.id, patch)} /> : null}
    </section>
  );
}

function Range({ label, value, setValue, min, max, step, unit }: { label: string; value: number; setValue: (value: number) => void; min: number; max: number; step: number; unit: string }) {
  return <label className="border-b-2 border-black p-4 last:border-b-0 md:border-b-0 md:border-r-2 md:last:border-r-0"><span className="flex justify-between font-mono text-[11px] uppercase"><span>{label}</span><strong>{value} {unit}</strong></span><input type="range" value={value} onChange={(event) => setValue(Number(event.target.value))} min={min} max={max} step={step} className="mt-3 w-full accent-fofo-blue" /></label>;
}

function Metric({ value, label }: { value: string; label: string }) { return <div className="border-r-2 border-black p-2 last:border-r-0"><strong className="block">{value}</strong><span className="text-[9px] uppercase text-black/45">{label}</span></div>; }

function RouteDetail({ route, routes, state, heatmap, onClose, onSelect, onChange }: { route: CyclingRoute; routes: CyclingRoute[]; state: RouteState; heatmap: string[]; onClose: () => void; onSelect: (route: CyclingRoute) => void; onChange: (patch: Partial<RouteState>) => void }) {
  const [note, setNote] = useState(state.note);
  const [routeView, setRouteView] = useState<"map" | "3d">("3d");
  useEffect(() => setNote(state.note), [state.note]);
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", closeOnEscape); };
  }, [onClose]);
  const peers = routes.filter((candidate) => candidate.kind === route.kind && candidate.id !== route.id);
  const alternatives = [
    { label: "Shorter", route: peers.filter((candidate) => candidate.distanceKm < route.distanceKm - 5).sort((a, b) => b.distanceKm - a.distanceKm)[0] },
    { label: "Less climbing", route: peers.filter((candidate) => candidate.elevationGainM < route.elevationGainM - 150).sort((a, b) => b.elevationGainM - a.elevationGainM)[0] },
    { label: "Quieter model", route: peers.filter((candidate) => candidate.surface.stressfulKm < route.surface.stressfulKm - 2).sort((a, b) => Math.abs(a.distanceKm - route.distanceKm) - Math.abs(b.distanceKm - route.distanceKm))[0] },
  ].filter((item): item is { label: string; route: CyclingRoute } => Boolean(item.route));
  return <div className="fixed inset-0 z-[200] overflow-y-auto bg-black/70 p-3 pt-24 md:p-8 md:pt-28" role="dialog" aria-modal="true" aria-label={route.name} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><button type="button" onClick={onClose} aria-label="Close route" className="fixed right-4 top-24 z-[220] grid h-12 w-12 place-items-center border-[3px] border-black bg-white shadow-brutal hover:bg-fofo-pink hover:text-white md:right-8"><X className="h-7 w-7" /></button><div className="mx-auto max-w-6xl border-[3px] border-black bg-white shadow-brutal-lg"><div className="sticky top-0 z-20 border-b-[3px] border-black bg-fofo-yellow p-4 pr-20"><p className="font-mono text-[10px] uppercase tracking-widest">{route.kind === "home" ? "from home" : "Schmankerl"}</p><h2 className="font-display text-3xl font-bold lowercase">{route.name}</h2></div><div className="grid lg:grid-cols-[1.35fr_.65fr]"><div className="border-b-[3px] border-black lg:border-b-0 lg:border-r-[3px]"><div className="relative h-[52vh] min-h-80"><div className="absolute left-3 top-3 z-10 flex border-2 border-black bg-white"><button type="button" onClick={() => setRouteView("map")} className={clsx("px-4 py-2 font-mono text-[10px] uppercase", routeView === "map" && "bg-black text-white")}>Map</button><button type="button" onClick={() => setRouteView("3d")} className={clsx("border-l-2 border-black px-4 py-2 font-mono text-[10px] uppercase", routeView === "3d" && "bg-black text-white")}>3D profile</button></div>{routeView === "map" ? <RouteMap route={route} heatmap={heatmap} /> : <Route3D route={route} />}</div><Elevation route={route} /><div className="grid grid-cols-3"><Metric value={`${route.distanceKm} km`} label="distance" /><Metric value={duration(route.rideMinutes)} label={`${route.ftpWatts} W estimate`} /><Metric value={`${route.elevationGainM} m`} label="elevation" /></div></div><div className="p-6"><p className="meta">Why ride it</p><p className="mt-2 text-lg leading-7">{route.reason}</p><dl className="mt-6 space-y-4 text-sm"><DetailTerm label="The reward" value={route.reward} /><DetailTerm label="The compromise" value={route.compromise} />{route.shortening ? <DetailTerm label="Shorter option" value={route.shortening} /> : null}{route.startLabel ? <DetailTerm label="Start" value={route.startLabel} /> : null}</dl>{alternatives.length ? <div className="mt-6"><p className="font-mono text-[10px] uppercase tracking-widest">Adjust the ride</p><div className="mt-2 grid gap-2">{alternatives.map((item) => <button type="button" key={item.label} onClick={() => onSelect(item.route)} className="border-2 border-black p-3 text-left hover:bg-fofo-yellow"><strong className="font-mono text-xs uppercase">{item.label}: {item.route.name}</strong><span className="mt-1 block text-xs text-black/55">{item.route.distanceKm - route.distanceKm > 0 ? "+" : ""}{(item.route.distanceKm - route.distanceKm).toFixed(1)} km · {item.route.elevationGainM - route.elevationGainM > 0 ? "+" : ""}{item.route.elevationGainM - route.elevationGainM} m · {item.route.surface.stressfulKm - route.surface.stressfulKm > 0 ? "+" : ""}{(item.route.surface.stressfulKm - route.surface.stressfulKm).toFixed(1)} stressful km</span></button>)}</div></div> : null}<div className="mt-6 border-2 border-black bg-fofo-paper p-4"><p className="font-mono text-[10px] uppercase tracking-widest">Modeled evidence</p><p className="mt-2 text-sm">{route.surface.pavedPercent}% confirmed paved · {route.surface.unknownPercent}% unknown · {route.surface.quietKm} km on quieter road classes · {route.surface.stressfulKm} km potentially stressful</p><p className="mt-2 text-xs text-black/45">Generated with {route.router}. Time uses your {route.ftpWatts} W FTP endurance estimate. Personal blue traces show recent Strava rides when available. Inspect before riding; this is not a safety guarantee.</p></div><div className="mt-6"><p className="font-mono text-[10px] uppercase tracking-widest">After the ride</p><div className="mt-2 flex gap-2">{(["peaceful", "mixed", "busy"] as const).map((traffic) => <button key={traffic} type="button" onClick={() => onChange({ ridden: true, traffic })} className={clsx("border-2 border-black px-3 py-2 text-xs uppercase", state.traffic === traffic ? "bg-black text-white" : "bg-white")}>{traffic}</button>)}</div><div className="mt-3 flex gap-1" aria-label="Route rating">{[1,2,3,4,5].map((rating) => <button type="button" key={rating} onClick={() => onChange({ ridden: true, rating })} className={clsx("h-8 w-8 border-2 border-black font-mono text-xs", state.rating === rating ? "bg-fofo-pink text-white" : "bg-white")}>{rating}</button>)}</div><textarea value={note} onChange={(event) => setNote(event.target.value)} onBlur={() => onChange({ note })} placeholder="Lovely road, awkward crossing, café idea…" className="mt-3 min-h-20 w-full border-2 border-black p-3 text-sm" /></div><div className="mt-6 grid grid-cols-2 gap-2"><button type="button" onClick={() => onChange({ saved: !state.saved })} className="border-2 border-black bg-fofo-yellow p-3 font-mono text-xs uppercase">{state.saved ? "Saved" : "Save route"}</button><a href={`/api/workspace/routes/${route.id}/gpx`} className="flex items-center justify-center gap-2 border-2 border-black bg-fofo-blue p-3 font-mono text-xs uppercase text-white"><Download className="h-4 w-4" />GPX</a></div></div></div></div></div>;
}

function DetailTerm({ label, value }: { label: string; value: string }) { return <div><dt className="font-mono text-[10px] uppercase tracking-widest text-fofo-blue">{label}</dt><dd className="mt-1 text-black/65">{value}</dd></div>; }
