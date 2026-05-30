# MA — Agent Guardrails

These rules apply to any AI agent or developer working on this codebase.

## Core principles

1. **Speed is a feature.** Never add a dependency, abstraction, or pattern
   that adds measurable startup latency or memory footprint. If in doubt,
   benchmark before merging.

2. **The editor is sacred.** Nothing interrupts the writing surface.
   No toasts, no modals mid-session, no unsolicited animations on the canvas.

3. **One concern per file.** Components handle rendering. Stores handle state.
   Services handle I/O. Never collapse these boundaries.

4. **No framework creep.** The stack is Tauri + Svelte + Milkdown.
   No new UI frameworks, state machines, or component libraries without
   an explicit ADR (see DECISIONS.md).

5. **Rust stays thin.** The Rust layer handles file I/O and native OS calls
   only. Business logic lives in JS. Do not move logic to Rust just because
   you can.

6. **No network calls in V1.** The app is fully local. No analytics, no crash
   reporting, no telemetry until there is an explicit decision to add it.

## What agents must NOT do

- Touch `src-tauri/src/main.rs` without an ADR
- Add npm packages without checking bundle size impact first
- Add state to App.svelte that belongs in a store
- Make the topbar taller than 40px
- Remove keyboard shortcuts
- Add any feature that requires an internet connection in V1
- Use `localStorage` or `sessionStorage` (no browser context in Tauri)
