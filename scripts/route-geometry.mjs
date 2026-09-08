const EARTH_RADIUS_METERS = 6_371_000;

function coordinateKey(point) {
  return `${Number(point[0]).toFixed(6)},${Number(point[1]).toFixed(6)}`;
}

export function distanceMeters(a, b) {
  const latA = Number(a[1]) * Math.PI / 180;
  const latB = Number(b[1]) * Math.PI / 180;
  const deltaLat = latB - latA;
  const deltaLon = (Number(b[0]) - Number(a[0])) * Math.PI / 180;
  const h = Math.sin(deltaLat / 2) ** 2 + Math.cos(latA) * Math.cos(latB) * Math.sin(deltaLon / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}

export function pathDistanceMeters(coordinates) {
  let total = 0;
  for (let index = 1; index < coordinates.length; index += 1) total += distanceMeters(coordinates[index - 1], coordinates[index]);
  return total;
}

function segmentBacktrackRatio(coordinates, start, end) {
  const edges = new Map();
  let total = 0;
  for (let index = start; index < end; index += 1) {
    const from = coordinateKey(coordinates[index]);
    const to = coordinateKey(coordinates[index + 1]);
    const key = `${from}>${to}`;
    const length = distanceMeters(coordinates[index], coordinates[index + 1]);
    const edge = edges.get(key) ?? { count: 0, length };
    edge.count += 1;
    edges.set(key, edge);
    total += length;
  }
  if (!total) return 0;
  let matched = 0;
  for (const [key, edge] of edges) {
    const [from, to] = key.split(">");
    const reverse = edges.get(`${to}>${from}`);
    if (reverse) matched += Math.min(edge.count, reverse.count) * edge.length;
  }
  return matched / total;
}

export function removeRetracedBranches(input, { minimumMeters = 100, minimumRatio = 0.82 } = {}) {
  let coordinates = input.map((point) => [...point]);
  const removed = [];

  for (let pass = 0; pass < 40; pass += 1) {
    const occurrences = new Map();
    coordinates.forEach((point, index) => {
      const key = coordinateKey(point);
      occurrences.set(key, [...(occurrences.get(key) ?? []), index]);
    });

    let candidate = null;
    for (const indexes of occurrences.values()) {
      for (let occurrence = 1; occurrence < indexes.length; occurrence += 1) {
        const start = indexes[occurrence - 1];
        const end = indexes[occurrence];
        if (end - start < 2) continue;
        if (start === 0 && end === coordinates.length - 1) continue;
        const meters = pathDistanceMeters(coordinates.slice(start, end + 1));
        if (meters < minimumMeters || segmentBacktrackRatio(coordinates, start, end) < minimumRatio) continue;
        if (!candidate || meters > candidate.meters) candidate = { start, end, meters };
      }
    }

    if (!candidate) break;
    removed.push(candidate.meters);
    coordinates = [...coordinates.slice(0, candidate.start + 1), ...coordinates.slice(candidate.end + 1)];
  }

  return {
    coordinates,
    removedBranchCount: removed.length,
    removedDistanceMeters: removed.reduce((sum, meters) => sum + meters, 0),
  };
}

export function scaledElevationGain(originalCoordinates, cleanedCoordinates, filteredGainMeters) {
  const positiveGain = (coordinates) => coordinates.slice(1).reduce((gain, point, index) => gain + Math.max(0, Number(point[2] ?? 0) - Number(coordinates[index][2] ?? 0)), 0);
  const originalGain = positiveGain(originalCoordinates);
  const cleanedGain = positiveGain(cleanedCoordinates);
  if (!originalGain) return Math.round(filteredGainMeters);
  return Math.round(Number(filteredGainMeters) * cleanedGain / originalGain);
}

export function retainedCoordinateKeys(coordinates) {
  return new Set(coordinates.map(coordinateKey));
}
