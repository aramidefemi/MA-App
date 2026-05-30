# Architecture Decision Records

---

## ADR-001 — Tauri over Electron
**Date:** 2025-05  
**Status:** Accepted

**Context:** We need a desktop wrapper for a web-based editor.

**Decision:** Use Tauri v2.

**Reasoning:**
- Electron ships its own Chromium → 100–300 MB RAM idle, 80–150 MB installer
- Tauri uses the system WebView (WKWebView / WebView2 / WebKitGTK) → ~15–40 MB RAM, <10 MB installer
- Rust backend gives us access to native file I/O with no Node.js overhead
- Launch time <200ms vs Electron's 1–2s
- Target audience (devs) will notice and appreciate this

**Trade-offs accepted:**
- Minor rendering differences between macOS/Windows/Linux WebViews
- Rust learning curve for backend work
- Smaller ecosystem than Electron

---

## ADR-002 — Svelte over React
**Date:** 2025-05  
**Status:** Accepted

**Context:** Need a frontend framework for the editor shell.

**Decision:** Svelte 5 with runes API.

**Reasoning:**
- Svelte compiles to vanilla JS — no framework runtime in bundle
- For a writing app, every keystroke is a state change; Svelte's compiled
  reactive assignments are surgical DOM updates vs React's Virtual DOM diffing
- UI is structurally simple (one editor canvas, one topbar) — React's overhead
  earns nothing here
- Svelte stores replace Redux/Zustand entirely for this scope

**Trade-offs accepted:**
- Smaller ecosystem and fewer dev resources than React
- Svelte 5 runes API is newer, some community examples still use Svelte 4

---

## ADR-003 — Milkdown over CodeMirror
**Date:** 2025-05  
**Status:** Accepted

**Context:** Need an editor that renders markdown inline (WYSIWYG), not a
source editor with syntax highlighting.

**Decision:** Milkdown with commonmark preset.

**Reasoning:**
- Spec says: type `##` + space → become H2, symbols disappear
- CodeMirror decorates syntax but keeps raw symbols visible
- Milkdown is built on ProseMirror and transforms markdown nodes in real-time
- commonmark preset covers H1–H6, bold, italic, code, lists, blockquote, hr, links
- ~50KB, no framework dependency, works in any webview

**Trade-offs accepted:**
- Less control over rendering than a custom ProseMirror setup
- Plugin API has a learning curve for advanced extensions (relevant for AI layer)

---

## ADR-004 — No global state library in V1
**Date:** 2025-05  
**Status:** Accepted

**Context:** Do we need Zustand, Pinia, or XState?

**Decision:** No. Svelte 5 $state + $derived in App.svelte is enough for V1.

**Reasoning:** V1 state is: `filePath`, `content`, `savedContent`, `saveStatus`.
That is four variables. A state library would be ceremony, not value.

**Revisit when:** multiple open documents, recent files list, or settings panel.
