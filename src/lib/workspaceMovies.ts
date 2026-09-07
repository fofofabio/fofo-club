import "server-only";

import { query } from "@/lib/db";

export type MovieState = "watchlist" | "seen" | "dismissed";

export type WorkspaceMovieState = {
  movieKey: string;
  state: MovieState;
  note: string;
};

export async function listWorkspaceMovieStates(userId: string) {
  const result = await query<WorkspaceMovieState>(
    `select movie_key as "movieKey", state, note
     from workspace_movie_states where user_id = $1`,
    [userId],
  );
  return result.rows;
}

export async function setWorkspaceMovieState(
  userId: string,
  movieKey: string,
  state: MovieState | null,
  note: string,
) {
  if (state === null) {
    await query(
      `delete from workspace_movie_states where user_id = $1 and movie_key = $2`,
      [userId, movieKey],
    );
    return null;
  }

  const result = await query<WorkspaceMovieState>(
    `insert into workspace_movie_states (user_id, movie_key, state, note)
     values ($1, $2, $3, $4)
     on conflict (user_id, movie_key) do update
       set state = excluded.state, note = excluded.note, updated_at = now()
     returning movie_key as "movieKey", state, note`,
    [userId, movieKey, state, note],
  );
  return result.rows[0];
}
