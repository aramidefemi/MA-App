# 間 Ma

A markdown editor that opens fast and gets out of the way.

---

## Why

間 (*ma*) is a Japanese concept — the meaningful space between things. The pause that makes the music. The gap in a doorway that makes it a door.

Most writing tools fill space. Sidebars, panels, autocomplete, notifications. They're so busy being helpful that you can't think.

Ma doesn't do that. The blank canvas is the product. What we didn't add is the feature.

---

## Who actually uses this

Devs who vibe-code and end up with 40 `.md` files — architecture notes, decision logs, PR checklists. You don't want VS Code for that. You want something that opens the file and shuts up.

Researchers who write as they think. The tool should feel like a notebook someone left open, not an application you launched.

Writers and students with ADHD. The moment the UI asks for your attention you've lost the thread. Ma never asks.

---

## The AI plan

Not "add AI and break the philosophy." The goal is an AI that waits to be asked, answers inline, and disappears. Still Ma. Harder to ship than it sounds — which is why it's V2.

---

## App config

Edit `app.config.json` at the project root for the app name, tagline, empty-state copy, bundle ID, and file-dialog labels. Run `npm run sync-branding` (or any `dev` / `build` / `tauri` script) to push those values into `package.json`, `src-tauri/tauri.conf.json`, and `src-tauri/Cargo.toml`.

---

## Get running

You need Node ≥ 20 and Rust stable. Full system dep instructions by OS are in `.agent/BOOTSTRAP.md`.

```bash
npm install
npm run tauri dev
```

First run compiles Rust. Give it 2–3 minutes. Every run after that is fast.

---

## Shortcuts

| `⌘O` | Open file |
|------|-----------|
| `⌘S` | Save      |

---

## V1 scope

Open a `.md` file. Type `##` and hit space — it becomes a heading, the symbols go away. `**this**` renders bold. Save with `⌘S`. That's the whole thing.

## Coming next

Slash commands → inline AI. Ghost text on pause. Recent files. Light mode. Multiple tabs.

---

*Tauri 2 · Svelte 5 · Milkdown 7*