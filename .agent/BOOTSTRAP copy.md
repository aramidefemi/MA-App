# Ma — Agent Bootstrap

Read this before touching anything.

---

## What Ma is

A minimal WYSIWYG markdown editor. Tauri 2 + Svelte 5 + Milkdown 7.
The philosophy: what we don't add is the feature.
Full context in `README.md` and `.agent/ARCHITECTURE.md`.

---

## You are an orchestrator

You do not write code directly. You break your assigned task into
sub-tasks and delegate each one to a focused sub-agent. You review
the sub-agent's output before accepting it. You are responsible for
the quality of everything your sub-agents produce.

**Orchestrator loop:**
```
1. Read your TASK file fully before starting anything
2. Read HANDOFF from the previous agent (if one exists)
3. Read the files your task touches — understand before changing
4. Break your task into 2–4 sub-agent operations
5. Run each sub-agent with a tight, specific prompt + hard limits
6. Review output — reject and retry if it violates limits
7. Test that the app still runs: npm run tauri dev
8. Write your DECISIONS file and HANDOFF file
9. Update this BOOTSTRAP.md with your agent number and status
```

---

## Hard limits (apply to every agent and sub-agent)

These are non-negotiable. A sub-agent that violates them gets rejected.

- **Surgical operations only.** Edit existing files with targeted changes.
  Do not rewrite files from scratch unless the task explicitly says so.
- **One concern per operation.** Each sub-agent does one thing.
  FileTree component = one sub-agent. State wiring = another.
- **No new dependencies** without writing a justification in DECISIONS.md.
- **No changes outside your task's file scope.** The file scope is
  listed in your TASK file under "Files to change." If you need to
  touch something outside that scope, stop and flag it.
- **No bloat.** If a sub-agent produces more than ~150 lines for a
  component, question it. Svelte components should be readable in one screen.
- **The app must run after every agent completes.** If `npm run tauri dev`
  throws errors, the agent failed. Fix before writing the handoff.

---

## Tooling

**Svelte 5 runes** — this codebase uses Svelte 5. Use `$state`, `$derived`,
`$props`. Do not use Svelte 4 patterns (`let x = ...` without `$state`,
`export let` for props, reactive `$:` statements).

**Svelte MCP** — if a Svelte MCP tool is available in your environment,
use it for Svelte-specific documentation lookups and component validation
before writing code. Don't guess at Svelte 5 APIs — look them up.

**Tauri JS plugins** — file operations go through `@tauri-apps/plugin-fs`,
dialogs through `@tauri-apps/plugin-dialog`. Both are installed.
Check the Tauri v2 docs before writing any plugin call.

**Design tokens** — all colours and fonts live in CSS variables in
`src/app.css`. Never hardcode a colour. Use `var(--bg)`, `var(--surface)`,
`var(--accent)`, etc.

---

## File scope rules

Each TASK file lists the exact files an agent may touch.
Sub-agents inherit the same scope. If a sub-agent needs to read a file
outside scope for context, that is fine. Writing outside scope is not.

---

## What to produce when done

Every agent must produce three things before finishing:

### 1. `DECISIONS-[task-name].md`
```
# Decisions — [task name]

## What was built
[2-3 sentences, plain language]

## Decisions made
[List of choices made during implementation and why]

## What was rejected
[Approaches considered and discarded, and why]

## Known issues / tech debt
[Anything left rough that needs attention later]
```

### 2. `HANDOFF-agent[N].md`
```
# Handoff — Agent [N]

## Status
[Complete / Partial — what's done and what isn't]

## Files changed
[Exact list with one-line description of each change]

## State shape
[If you added state, describe it here for the next agent]

## What the next agent needs to know
[Anything that would surprise them if they didn't read this]

## How to test
[Exact steps to verify this agent's work is correct]
```

### 3. Update this file
Add a line to the "Agent log" section at the bottom with your
agent number, task, status, and date.

---

## Task files

Tasks live in `.agent/TASK-[name]-agent[N].md`.

Each task file contains:
- What to build
- Hard limits specific to that task
- Files in scope
- Props / state / API contracts (where relevant)
- Acceptance criteria (checkboxes)
- What NOT to do

Read your task file. Then read it again. Start only when you understand
every line of it.

---

## Agent log

| Agent | Task | Status | Date |
|-------|------|--------|------|
| —     | —    | —      | —    |

*(Each agent appends a row when complete)*

---

## Folder support task — reading order

```
BOOTSTRAP.md                          ← you are here
TASK-folder-support-agent1.md         ← Agent 1 reads this
TASK-folder-support-agent2.md         ← Agent 2 reads this (after agent 1 handoff)
TASK-folder-support-agent3.md         ← Agent 3 reads this (after agent 2 handoff)
```
