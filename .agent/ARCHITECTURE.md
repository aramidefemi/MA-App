# MA — Architecture

## Overview

```
┌─────────────────────────────────────────────────────┐
│  Tauri Desktop Shell (Rust)                          │
│                                                      │
│   ┌──────────────────────────────────────────────┐  │
│   │  WebView                                      │  │
│   │                                              │  │
│   │   App.svelte          ← root orchestrator    │  │
│   │    ├── Topbar         ← filename + save state │  │
│   │    └── Editor.svelte  ← Milkdown instance     │  │
│   │         └── Milkdown (ProseMirror)            │  │
│   │                                              │  │
│   └──────────────────────────────────────────────┘  │
│                                                      │
│   Rust commands exposed via Tauri IPC:               │
│     tauri_plugin_fs     → readTextFile, writeTextFile│
│     tauri_plugin_dialog → open file picker           │
└─────────────────────────────────────────────────────┘
```

## Data flow

```
User clicks "Open"
  → @tauri-apps/plugin-dialog  (open file picker)
  → filePath = selected path
  → @tauri-apps/plugin-fs      (readTextFile)
  → content = raw markdown string
  → {#key filePath} destroys + remounts Editor.svelte
  → Milkdown initialises with content via defaultValueCtx
  → User edits
  → listener plugin fires markdownUpdated
  → onContentChange(markdown) callback
  → content = new markdown string
  → isDirty = true (content !== savedContent)

User hits ⌘S
  → saveFile()
  → @tauri-apps/plugin-fs (writeTextFile)
  → savedContent = content
  → isDirty = false
```

## File structure

```
ma/
├── app.config.json          Branding + copy (source of truth)
├── src/
│   ├── main.js              Svelte mount point
│   ├── app.css              Global styles + Milkdown overrides
│   ├── App.svelte           Root: file state, keyboard, layout
│   └── lib/
│       └── components/
│           └── Editor.svelte  Milkdown lifecycle wrapper
│
├── src-tauri/
│   ├── src/main.rs          Tauri builder, plugin registration
│   ├── Cargo.toml           Rust deps + release profile
│   ├── tauri.conf.json      App config, window size, identifier
│   └── capabilities/
│       └── default.json     Tauri v2 permission grants
│
└── .agent/
    ├── GUARDRAILS.md        Rules for agents + contributors
    ├── DECISIONS.md         ADRs
    ├── ARCHITECTURE.md      This file
    └── BOOTSTRAP.md         Getting started
```

## V2 roadmap (not V1 scope)

- Slash command (`/ask`) → streams AI response inline
- Ghost text suggestions on pause
- Recent files list
- Multiple tabs
- Light/dark theme toggle
- Export to PDF
