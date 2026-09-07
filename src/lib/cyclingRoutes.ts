import routes from "@/data/cycling-routes.generated.json";

export type CyclingRoute = (typeof routes)[number];

export const cyclingRoutes = routes as CyclingRoute[];

export function findCyclingRoute(routeId: string) {
  return cyclingRoutes.find((route) => route.id === routeId) ?? null;
}

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[char]!);
}

export function routeToGpx(route: CyclingRoute) {
  const points = route.coordinates
    .map(([lon, lat, elevation]) => `    <trkpt lat="${lat}" lon="${lon}"><ele>${elevation}</ele></trkpt>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Fofo Club" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>${escapeXml(route.name)}</name></metadata>
  <trk><name>${escapeXml(route.name)}</name><type>cycling</type><trkseg>
${points}
  </trkseg></trk>
</gpx>\n`;
}
