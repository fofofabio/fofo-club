import assert from "node:assert/strict";
import test from "node:test";

import { removeRetracedBranches, scaledElevationGain } from "./route-geometry.mjs";

test("removes an out-and-back branch while preserving the through route", () => {
  const route = [[0, 0, 0], [1, 0, 10], [2, 0, 20], [3, 0, 30], [2, 0, 20], [1, 0, 10], [1, 1, 15], [0, 1, 0], [0, 0, 0]];
  const result = removeRetracedBranches(route, { minimumMeters: 1 });
  assert.deepEqual(result.coordinates, [[0, 0, 0], [1, 0, 10], [1, 1, 15], [0, 1, 0], [0, 0, 0]]);
  assert.equal(result.removedBranchCount, 1);
});

test("keeps a real loop that returns to its starting point", () => {
  const route = [[0, 0, 0], [1, 0, 10], [1, 1, 20], [0, 1, 10], [0, 0, 0]];
  assert.deepEqual(removeRetracedBranches(route, { minimumMeters: 1 }).coordinates, route);
});

test("scales filtered climbing after a climbing branch is removed", () => {
  const original = [[0, 0, 0], [1, 0, 100], [2, 0, 200], [1, 0, 100], [1, 1, 150]];
  const cleaned = [[0, 0, 0], [1, 0, 100], [1, 1, 150]];
  assert.equal(scaledElevationGain(original, cleaned, 250), 150);
});
