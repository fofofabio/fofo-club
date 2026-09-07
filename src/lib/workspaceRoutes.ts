import "server-only";

import { query } from "@/lib/db";

export type RouteTraffic = "peaceful" | "mixed" | "busy";

export type WorkspaceRouteState = {
  routeId: string;
  saved: boolean;
  ridden: boolean;
  rating: number | null;
  traffic: RouteTraffic | null;
  note: string;
};

export async function listWorkspaceRouteStates(userId: string) {
  const result = await query<WorkspaceRouteState>(
    `select route_id as "routeId", saved, ridden, rating, traffic, note
     from workspace_route_states where user_id = $1`,
    [userId],
  );
  return result.rows;
}

export async function setWorkspaceRouteState(
  userId: string,
  routeId: string,
  input: Omit<WorkspaceRouteState, "routeId">,
) {
  const result = await query<WorkspaceRouteState>(
    `insert into workspace_route_states
       (user_id, route_id, saved, ridden, rating, traffic, note)
     values ($1, $2, $3, $4, $5, $6, $7)
     on conflict (user_id, route_id) do update set
       saved = excluded.saved, ridden = excluded.ridden,
       rating = excluded.rating, traffic = excluded.traffic,
       note = excluded.note, updated_at = now()
     returning route_id as "routeId", saved, ridden, rating, traffic, note`,
    [userId, routeId, input.saved, input.ridden, input.rating, input.traffic, input.note],
  );
  return result.rows[0];
}
