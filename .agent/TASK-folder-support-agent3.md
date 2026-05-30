# Task — Folder Support / Agent 3
## Tauri permissions + integration smoke test

**Agent:** 3 of 3  
**Reads:** `BOOTSTRAP.md`, `HANDOFF-agent2.md`, `src-tauri/capabilities/default.json`, `src-tauri/src/main.rs`  
**Produces:** Updated `capabilities/default.json`, `DECISIONS-folder-support-agent3.md`, `HANDOFF-agent3.md`  
**Must NOT touch:** Any frontend files (`src/`), `Cargo.toml`, `tauri.conf.json`

---

## Your job

Two things only:

1. Add the permissions `readDir` needs to `capabilities/default.json`
2. Verify the whole feature works end to end and document what you find

This is the smallest of the three tasks. The temptation is to over-engineer.
Resist it. One file changes. You run the app. You write what happened.

---

## Hard limits

- **One file to change:** `capabilities/default.json` only
- **Do not touch `main.rs`** unless `readDir` genuinely cannot work
  through the JS plugin and requires a custom Rust command.
  If you need to touch `main.rs`, write an ADR in your DECISIONS file first.
- **No new Rust dependencies.**
- **No frontend changes.** If you spot a bug in the frontend, document it
  in your HANDOFF. Do not fix it.
- **Max 3 new permission strings** added to the capabilities file.

---

## Sub-agent breakdown

**Sub-agent A — Permission audit**
Read `HANDOFF-agent2.md` to get the exact list of JS plugin calls
Agent 2 is making. Cross-reference each call against the Tauri v2
`plugin-fs` permission docs to find what's missing.

Current permissions (from existing capabilities file):
```json
"fs:allow-read-text-file",
"fs:allow-write-text-file"
```

New calls being made:
- `readDir(path, { recursive: false })` — lists directory contents

Find the exact permission string needed. It is likely `"fs:allow-read-dir"`.
Confirm against Tauri v2 docs before adding it.

**Sub-agent B — Capabilities update**
Make the surgical addition to `capabilities/default.json`.
Add only what Sub-agent A identified as missing.
Do not add speculative permissions "just in case."

**Sub-agent C — Smoke test**
Run `npm run tauri dev` and test these exact flows:

```
1. Launch app → empty state shows → ✓/✗
2. ⌘O → open a single .md file → renders in editor → ✓/✗
3. ⌘⇧O → open a folder → sidebar appears with .md files → ✓/✗
4. Click a file in sidebar → opens in editor → ✓/✗
5. ⌘B → sidebar toggles off → ✓/✗
6. ⌘B → sidebar toggles back on → ✓/✗
7. ⌘\ → outline panel opens → headings visible → ✓/✗
8. ⌘S → saves current file → dirty dot disappears → ✓/✗
9. Open folder, click file, make edit, click different file → save prompt → ✓/✗
```

Document results in your HANDOFF. Any ✗ gets a description of what
happened instead. Do not fix frontend bugs — document them.

---

## If readDir needs a custom Rust command

Stop. Write the ADR first:
- Why the JS plugin can't handle it
- What the Rust command will look like
- What the IPC contract is

Then implement. Keep the Rust command thin:
```rust
#[tauri::command]
fn list_md_files(path: String) -> Result<Vec<String>, String> {
    // filter to .md only, max 2 levels deep
    // return Vec of absolute path strings
}
```

Register it in `main.rs`:
```rust
.invoke_handler(tauri::generate_handler![list_md_files])
```

This is a last resort. Try the JS plugin first.

---

## Acceptance criteria

- [ ] `readDir` calls succeed without Tauri permission errors in the console
- [ ] No new permission errors appear for any existing feature
- [ ] Smoke test items 1–8 all pass
- [ ] Item 9 (dirty save prompt on file switch) passes
- [ ] DECISIONS file written
- [ ] HANDOFF file written with full smoke test results
- [ ] Bootstrap agent log updated

---

## What NOT to do

- Do not add `fs:allow-read-dir` with a wildcard scope unless necessary
- Do not add permissions for features not in this task (no `fs:allow-watch`, etc.)
- Do not refactor the capabilities file structure
- Do not write a custom Rust command if the JS plugin works
- Do not attempt to fix bugs found during smoke test — document them
