# Ma — Roadmap

This is a living document. Features get added when they earn their place.
The bar is simple: does it reduce friction, or does it add it?

---

## V1 — The quiet editor ✓ *current*

The foundation. Nothing clever, just reliable.

- [x] Open a single `.md` file
- [x] Inline WYSIWYG rendering (GFM — headings, bold, italic, tables, task lists, code)
- [x] Save with `⌘S` — dirty dot when unsaved
- [x] Document outline panel — headings in hierarchy, click to jump, word count + reading time
- [x] Native macOS overlay titlebar — traffic lights inside the app
- [x] Keyboard-first: `⌘O` open, `⌘S` save, `⌘\` outline, `Esc` dismiss

---

## V2 — The AI layer

The rule: AI that waits to be asked. Nothing proactive, nothing unsolicited.
It surfaces when you want it and disappears when you don't.

- [ ] **Slash commands** — type `/` to get a command palette inline
  - `/ask` — ask a question about what you're writing
  - `/expand` — expand a bullet or rough idea into prose  
  - `/compress` — trim a section down
  - `/argue` — steelman or challenge the current paragraph
  - `/fix` — grammar and clarity pass on selection
- [ ] **Ghost text on pause** — after 2–3 seconds idle, a faint suggestion appears. Tab to accept, keep typing to ignore. Off by default.
- [ ] **Inline response rendering** — AI responses appear in the document as a distinct block, not a popup. You decide whether to keep, edit, or delete it.
- [ ] **API key settings** — local only, stored in system keychain via Tauri, never leaves the machine

The `/argue` command is the most important one. It's the whole thesis — a thinking partner for people who write to think.

---

## V3 — Multi-file

Still minimal. Not a file manager, not a second brain app.

- [ ] **Recent files** — last 10 files, `⌘R` to open the list
- [ ] **Multiple tabs** — open more than one file at a time, `⌘T` new tab, `⌘W` close
- [ ] **Drag and drop** — drop a `.md` file onto the window to open it
- [ ] **`⌘P` quick open** — fuzzy search across recent files

---

## V4 — Polish

The things that make it feel finished.

- [ ] **Light mode** — `⌘⇧L` to toggle. Same philosophy, different palette.
- [ ] **Font picker** — monospace, serif, or sans. Three options, not fifteen.
- [ ] **Focus mode** — dims everything except the current paragraph. `⌘⇧F`.
- [ ] **Export to PDF** — clean, minimal. No headers, no footers by default.
- [ ] **Custom CSS** — for people who want their own thing. Loaded from a local file.
- [ ] **App icon** — 間 as the icon. Needs a proper macOS-sized asset.

---

## Not on the roadmap

Things we've considered and said no to — at least for now.

- **Cloud sync** — files live where you put them. Use Dropbox, iCloud, or nothing.
- **Collaboration** — wrong product. Use Notion.
- **Plugins / extensions** — too early. We'd be building infrastructure for a user base we don't have yet.
- **Mobile** — Tauri 2 supports iOS/Android but the use case isn't there yet. Devs don't edit architecture docs on their phones.
- **AI writing assistant in V1** — the philosophy has to come first. A distraction-free editor that secretly nags you with suggestions is just a polite distraction.
- **Vim mode** — probably coming but not until V3. Terminal devs who want Vim are using Neovim anyway.

---

## How features get added

1. Someone actually needs it — not "it would be cool if"
2. It fits in the philosophy — the editor stays the main character
3. It has a keyboard shortcut — if it's worth doing, it's worth doing fast
4. It goes in `DECISIONS.md` first

*Last updated: May 2026*