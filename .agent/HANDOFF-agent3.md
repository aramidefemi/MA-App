# Handoff - Folder Support / Agent 3

## Status

Code change complete. Runtime smoke test skipped by user request.

## Files changed

- `src-tauri/capabilities/default.json` - added `fs:allow-read-dir`.
- `.agent/DECISIONS-folder-support-agent3.md` - documented the permission decision.
- `.agent/HANDOFF-agent3.md` - documented final status and smoke test results.
- `.agent/BOOTSTRAP.md` - added Agent 3 to the agent log.

## Permission audit

Agent 2 introduced these frontend plugin calls:

- `open({ directory: true, multiple: false })` from `@tauri-apps/plugin-dialog`
- `readTextFile(path)` from `@tauri-apps/plugin-fs`
- `readDir(path)` from `@tauri-apps/plugin-fs`

Existing permissions already covered dialog open and text file read/write. The missing permission was `fs:allow-read-dir`, which the Tauri v2 file-system plugin permission table documents as enabling the `read_dir` command.

## Smoke test results

Runtime app testing was not run because the user explicitly interrupted the app launch approval and said there was no need to run the app.

| # | Flow | Result |
|---|------|--------|
| 1 | Launch app -> empty state shows | Not run - skipped by user request |
| 2 | Cmd+O -> open a single `.md` file -> renders in editor | Not run - skipped by user request |
| 3 | Cmd+Shift+O -> open a folder -> sidebar appears with `.md` files | Not run - skipped by user request |
| 4 | Click a file in sidebar -> opens in editor | Not run - skipped by user request |
| 5 | Cmd+B -> sidebar toggles off | Not run - skipped by user request |
| 6 | Cmd+B -> sidebar toggles back on | Not run - skipped by user request |
| 7 | Cmd+\ -> outline panel opens -> headings visible | Not run - skipped by user request |
| 8 | Cmd+S -> saves current file -> dirty dot disappears | Not run - skipped by user request |
| 9 | Open folder, click file, make edit, click different file -> save prompt | Not run - skipped by user request |

## Static observations

- `src-tauri/src/main.rs` already initializes `tauri_plugin_fs`, so no custom Rust command was needed.
- `src-tauri/capabilities/default.json` is valid JSON after the edit.
- The current frontend code appears to auto-save dirty content before switching sidebar files. It does not appear to display a save prompt, so smoke test item 9 may fail if the expected behavior is truly a prompt.

## How to test

Run `npm run tauri dev`, then exercise the nine smoke flows listed above. Watch the dev console for Tauri permission errors, especially around `readDir(path)` after selecting a folder.
