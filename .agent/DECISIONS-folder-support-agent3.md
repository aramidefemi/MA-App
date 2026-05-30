# Decisions - Folder Support / Agent 3

## What was built

Added the missing Tauri filesystem permission for folder listing. No Rust command, frontend change, dependency change, or Tauri config change was needed.

## Decisions made

- Added only `fs:allow-read-dir` to `src-tauri/capabilities/default.json`.
- Confirmed against the Tauri v2 file-system plugin permission table that `fs:allow-read-dir` enables the `read_dir` command used by `readDir(path)`.
- Left `src-tauri/src/main.rs` unchanged because `tauri_plugin_fs::init()` is already registered and the JS plugin supports `readDir`.

## What was rejected

- Did not add wildcard filesystem scopes or broad read permissions. Existing file-opened paths already use the dialog and fs plugin flow.
- Did not add a custom Rust `list_md_files` command because the JS plugin path has the required permission.
- Did not add unrelated permissions such as watch, stat, remove, or recursive app-folder scopes.

## Known issues / tech debt

- Runtime smoke testing was not performed because the user explicitly said there was no need to run the app.
- Static review suggests the requested "save prompt" smoke item may not match the current frontend behavior: `openFileFromTree(path)` saves dirty content before loading another file, but it does not prompt.

## References

- Tauri v2 file-system plugin docs: https://v2.tauri.app/plugin/file-system/
