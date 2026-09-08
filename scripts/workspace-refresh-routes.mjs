import { readFile, writeFile } from "node:fs/promises";
import { loadEnvLocal } from "./load-env-local.mjs";
import { pathDistanceMeters, removeRetracedBranches, retainedCoordinateKeys, scaledElevationGain } from "./route-geometry.mjs";

await loadEnvLocal();

const home = (process.env.WORKSPACE_HOME_COORDINATES ?? "").split(",").map(Number);
if (home.length !== 2 || !home.every(Number.isFinite)) {
  throw new Error("WORKSPACE_HOME_COORDINATES must contain private lon,lat coordinates.");
}
const ftpWatts = Math.max(120, Math.min(500, Number(process.env.WORKSPACE_CYCLING_FTP_WATTS ?? 260)));
const enduranceSpeedKmh = Math.max(24, Math.min(36, 30 * Math.sqrt(ftpWatts / 260)));
const climbingPenaltyMinutesPer1000M = 45 * (260 / ftpWatts);

const source = JSON.parse(await readFile(new URL("../src/data/cycling-route-seeds.json", import.meta.url), "utf8"));
const output = [];

function surfaceSummary(messages = [], retainedKeys = null) {
  const header = messages[0] ?? [];
  const longitudeIndex = header.indexOf("Longitude");
  const latitudeIndex = header.indexOf("Latitude");
  const distanceIndex = header.indexOf("Distance");
  const tagsIndex = header.indexOf("WayTags");
  let paved = 0, unpaved = 0, unknown = 0, stressful = 0, quiet = 0;
  for (const row of messages.slice(1)) {
    if (retainedKeys && longitudeIndex >= 0 && latitudeIndex >= 0) {
      const key = `${(Number(row[longitudeIndex]) / 1_000_000).toFixed(6)},${(Number(row[latitudeIndex]) / 1_000_000).toFixed(6)}`;
      if (!retainedKeys.has(key)) continue;
    }
    const distance = Number(row[distanceIndex] ?? 0);
    const tags = String(row[tagsIndex] ?? "");
    if (/surface=(asphalt|concrete|paved|concrete:plates|paving_stones)/.test(tags)) paved += distance;
    else if (/surface=(gravel|fine_gravel|ground|dirt|unpaved|compacted)/.test(tags)) unpaved += distance;
    else unknown += distance;
    if (/highway=(primary|secondary)/.test(tags) && !/cycleway/.test(tags)) stressful += distance;
    if (/highway=(residential|living_street|unclassified|cycleway)/.test(tags)) quiet += distance;
  }
  const total = paved + unpaved + unknown || 1;
  return {
    pavedPercent: Math.round((paved / total) * 100),
    unpavedPercent: Math.round((unpaved / total) * 100),
    unknownPercent: Math.max(0, 100 - Math.round((paved / total) * 100) - Math.round((unpaved / total) * 100)),
    stressfulKm: Number((stressful / 1000).toFixed(1)),
    quietKm: Number((quiet / 1000).toFixed(1)),
  };
}

for (const route of source) {
  const points = route.waypoints.map((point) => point === "HOME" ? home : point);
  let body;
  while (points.length >= 3) {
    const lonlats = points.map(([lon, lat]) => `${lon},${lat}`).join("%7C");
    const url = `https://brouter.de/brouter?lonlats=${lonlats}&profile=fastbike-verylowtraffic&alternativeidx=0&format=geojson`;
    const response = await fetch(url, { signal: AbortSignal.timeout(45_000) });
    if (response.ok) { body = await response.json(); break; }
    const message = await response.text();
    const section = Number(message.match(/section (\d+)/)?.[1]);
    const removable = Number.isInteger(section) ? Math.min(section + 1, points.length - 2) : -1;
    if (removable <= 0) throw new Error(`${route.id}: BRouter returned ${response.status}: ${message.slice(0, 240)}`);
    console.warn(`${route.id}: dropping unreachable shaping point ${removable}`);
    points.splice(removable, 1);
  }
  if (!body) throw new Error(`${route.id}: no routable waypoint set`);
  const feature = body.features?.[0];
  if (!feature?.geometry?.coordinates?.length) throw new Error(`${route.id}: no route geometry`);
  const properties = feature.properties ?? {};
  const originalCoordinates = feature.geometry.coordinates;
  const cleaned = removeRetracedBranches(originalCoordinates);
  const distanceKm = Number((pathDistanceMeters(cleaned.coordinates) / 1000).toFixed(1));
  const elevationGainM = scaledElevationGain(originalCoordinates, cleaned.coordinates, Number(properties["filtered ascend"]));
  const rideMinutes = Math.round((distanceKm / enduranceSpeedKmh) * 60 + (elevationGainM / 1000) * climbingPenaltyMinutesPer1000M);
  output.push({
    ...route,
    waypoints: undefined,
    distanceKm,
    elevationGainM,
    rideMinutes,
    ftpWatts,
    surface: surfaceSummary(properties.messages, retainedCoordinateKeys(cleaned.coordinates)),
    routeQuality: {
      removedBranchCount: cleaned.removedBranchCount,
      removedBacktrackKm: Number((cleaned.removedDistanceMeters / 1000).toFixed(1)),
    },
    coordinates: cleaned.coordinates.map(([lon, lat, elevation]) => [Number(lon.toFixed(6)), Number(lat.toFixed(6)), Math.round(elevation ?? 0)]),
    generatedAt: new Date().toISOString(),
    router: properties.creator ?? "BRouter",
  });
  console.log(`${route.id}: ${distanceKm} km / ${elevationGainM} m / ${rideMinutes} min${cleaned.removedBranchCount ? ` / removed ${cleaned.removedBranchCount} retraced ${cleaned.removedBranchCount === 1 ? "branch" : "branches"} (${(cleaned.removedDistanceMeters / 1000).toFixed(1)} km)` : ""}`);
}

await writeFile(new URL("../src/data/cycling-routes.generated.json", import.meta.url), `${JSON.stringify(output)}\n`, "utf8");
