# Bootstrap — Getting MA running

## Prerequisites

| Tool    | Version  | Install                          |
|---------|----------|----------------------------------|
| Node.js | ≥ 20     | https://nodejs.org               |
| Rust    | stable   | https://rustup.rs                |
| Tauri CLI deps | — | see below                   |

### macOS
```bash
xcode-select --install
```

### Linux (Debian/Ubuntu)
```bash
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev libappindicator3-dev \
  librsvg2-dev patchelf build-essential curl wget
```

### Windows
Install Microsoft C++ Build Tools and WebView2 Runtime.
See https://tauri.app/start/prerequisites

---

## First run

```bash
# 1. Install JS deps
npm install

# 2. Run in dev mode — opens a real desktop window
npm run tauri dev
```

The first `tauri dev` will compile Rust (~2–3 min). Subsequent runs are fast.

---

## What you'll see

A dark desktop window with "MA" in the centre.
Click **Open file** or hit **⌘O** to open any `.md` file.
The `##` you type becomes a heading as you go.
Hit **⌘S** to save.

---

## Building for distribution

```bash
npm run tauri build
```

Output lands in `src-tauri/target/release/bundle/`.
Binary is typically 3–8 MB on macOS.

---

## Adding AI features (V2 checklist)

When you're ready to wire in the AI layer:

1. Add `ANTHROPIC_API_KEY` handling (env var via Tauri config or local settings)
2. Create `src/lib/services/ai.js` for Anthropic API calls
3. Add a Milkdown plugin or slash command handler in `Editor.svelte`
4. Document the decision in `DECISIONS.md` before shipping
