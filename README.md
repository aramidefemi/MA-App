# 間 Ma

A markdown editor that opens fast and gets out of the way.

***

## Install

Jijjij

Go to the [latest release](../../releases/latest) and download the file for your platform:

| Platform | File to download |
|----------|-----------------|
| macOS — Apple Silicon (M1/M2/M3/M4) | `Ma_VERSION_aarch64.dmg` |
| macOS — Intel | `Ma_VERSION_x64.dmg` |
| Windows | `Ma_VERSION_x64-setup.exe` |
| Linux | `Ma_VERSION_amd64.AppImage` |

**macOS:** Open the `.dmg`, drag Ma to Applications.\
**Windows:** Run the `.exe` installer.\
**Linux:** Make the `.AppImage` executable and run it — `chmod +x Ma*.AppImage && ./Ma*.AppImage`

> macOS will warn about an unverified developer the first time.
> Right-click the app → Open → Open anyway.
> This goes away once the app is code-signed.

***

## Why

間 (*ma*) is a Japanese concept — the meaningful space between things.
The pause that makes the music. The gap in a doorway that makes it a door.

Most writing tools fill space. Sidebars, panels, autocomplete, notifications.
They're so busy being helpful that you can't think.

Ma doesn't do that. The blank canvas is the product.
What we didn't add is the feature.

***

## Who actually uses this

Devs who vibe-code and end up with 40 `.md` files — architecture notes,
decision logs, PR checklists. You don't want VS Code for that. You want
something that opens the file and shuts up.

Researchers who write as they think. The tool should feel like a notebook
someone left open, not an application you launched.

Writers and students with ADHD. The moment the UI asks for your attention
you've lost the thread. Ma never asks.

***

## The AI plan

Not "add AI and break the philosophy." The goal is an AI that waits to
be asked, answers inline, and disappears. Still Ma.
Harder to ship than it sounds — which is why it's V2.

***

## Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘O` | Open file |
| `⌘⇧O` | Open folder |
| `⌘S` | Save |
| `⌘B` | Toggle sidebar |
| `⌘\` | Toggle outline panel |
| `⌘⇧T` | Toggle typewriter scrolling |
| `Esc` | Dismiss panels |

***

## Build from source

You need Node ≥ 20 and Rust stable.
Full system dep instructions by OS are in `.agent/BOOTSTRAP.md`.

```bash
npm install
npm run tauri dev     # dev mode — opens desktop window
npm run tauri build   # production build for your current OS
```

***

## V1 scope

Open a `.md` file or folder. Edit inline — `##` becomes a heading,
`**bold**` renders bold, tables render as tables. Save with `⌘S`.

## Coming next

Slash commands → inline AI. Ghost text on pause. Light mode. Multiple tabs.
Full roadmap in `ROADMAP.md`.

***

*Tauri 2 · Svelte 5 · Milkdown 7*
