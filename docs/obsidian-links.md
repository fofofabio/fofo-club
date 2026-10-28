# Obsidian project links

Tasks and their status stay in the private workspace. Project notes stay in Obsidian. This feature connects them with links; it does not sync note contents or create another task list.

## Connect a project

1. Open Tasks, then **Project notes**.
2. Choose the exact task-project name.
3. In Obsidian, right-click the project note and choose **Copy Obsidian URL**. Paste that address into **Obsidian note link**.
4. Save the connection. Every task in that project gains **Open notes**.
5. Use **Copy tasks link** and paste the address into the matching Obsidian project note.

An optional version 1 project-links JSON file can be imported from the same panel. Importing merges projects and replaces matching project connections only. Files are read in the browser, not uploaded.

## Storage and device behavior

Connections are stored in localStorage under a versioned key scoped to the signed-in workspace user ID. Each browser/device needs its own connections. Clearing site storage removes the connections; it does not remove tasks or vault notes. The OS/browser may ask to open Obsidian, and that device must have the linked vault available.

Only `obsidian://open` links with a vault and a relative note path are accepted. Create, append, command, external-web and file-system-path links are rejected. Existing note names or folders can change: copy the updated Obsidian URL into Project notes if that happens.

## Return links

`/workspace?view=tasks&project=<encoded exact project name>` opens the filtered task board. Project selection survives refresh and browser back/forward navigation. A missing project shows an explicit empty view. The quick-capture project is prefilled without replacing an existing draft.

Signed-out visitors return to the intended project after sign-in. Return destinations are restricted to the local workspace task board. Existing session validation and API user ownership checks remain in place.

## Validation

Run `node --test scripts/obsidian-links.test.mjs` for URI validation, import rules, account-key separation and redirect constraints. Typecheck and build directly with Next; avoid the repository's unrelated route-refresh prebuild hook. Browser checks should use isolated task data and must distinguish a rendered link from a verified OS-level Obsidian launch.
