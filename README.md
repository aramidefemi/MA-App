# 間 Ma

**The best free writing app on the internet if you actually love writing.**

Ma is not a "productivity." tool. Ma opens in a blink, puts your words front and center, and stays quiet until you ask for help. People who find it tend not to go back. You probably will too.

Free. No account. Your files stay on your machine.

***

## Install

Go to the [latest release](../../releases/latest) and download the file for your platform:

| Platform | File to download |
|----------|-----------------|
| macOS, Apple Silicon (M1/M2/M3/M4) | `Ma_VERSION_aarch64.dmg` |
| macOS, Intel | `Ma_VERSION_x64.dmg` |
| Windows | `Ma_VERSION_x64-setup.exe` |
| Linux | `Ma_VERSION_amd64.AppImage` |

**macOS:** Open the `.dmg`, drag Ma to Applications.\
**Windows:** Run the `.exe` installer.\
**Linux:** Make the `.AppImage` executable and run it: `chmod +x Ma*.AppImage && ./Ma*.AppImage`

> macOS will warn about an unverified developer the first time.
> Right-click the app → Open → Open anyway.
> This goes away once the app is code-signed.

***

## What early adopters say

> "I had 47 markdown files from vibe-coding sessions. Double-click, type, close. I didn't know I wanted this until I had it."

**Marcus T.**, software engineer

> "The research panel doesn't feel like ChatGPT duct-taped to a word processor. I highlight a paragraph, hit explain, read the answer beside my draft, save the good bits as a note. My folder of sources builds itself while I write."

**Dr. Priya N.**, postdoc researcher

> "AI Draft caught three 'Furthermore' paragraphs I didn't even realize I'd pasted from a draft assistant. It highlighted them in the doc."

**Jordan K.**, freelance journalist

> "I have ADHD. Every other editor has something blinking. Ma's Focus mode dims everything except the line I'm on. I wrote 2,000 words before I noticed an hour passed."

**Sam R.**, essayist

> "Typewriter scroll plus session memory means I open Ma and I'm exactly where I left off. Same file, same scroll position, same sidebar state. Small thing. Huge for someone who writes in stolen ten-minute windows."

**Elena V.**, grad student

> "I tried Notion, Obsidian, iA Writer, and three AI wrappers. Ma is the only one that treats writing as the main event. The AI shows up when I ask and shuts up when I don't. That's the whole product philosophy and they actually mean it."

**Chris L.**, indie blogger

***

## Why Ma exists

間 (*ma*) is a Japanese word for the space between things. The pause in music. The gap in a doorway that makes it a door.

Most writing tools fill that space. Sidebars, panels, autocomplete, notifications. They're so busy being helpful that you can't think.

Ma doesn't do that. The blank canvas is the product. What we didn't add is the feature.

***

## Everything that makes Ma worth keeping

### The editor

- **Inline markdown that renders as you type.** Headings, bold, italic, tables, task lists, code blocks. GFM, not a preview pane you toggle to.
- **Opens fast.** Tauri desktop app.
- **Keyboard-first.** Open, save, outline, sidebar, find, settings. All from the keyboard if you want them.
- **Typewriter scrolling.** Your cursor stays at eye level. The page moves under you. `⌘⇧T`.
- **Focus mode.** Everything fades except the paragraph you're in. `⌘⇧F`.
- **Find in document.** Search and jump without leaving the editor.
- **Word goal.** Pick 300, 500, or 1000 words. A thin bar at the bottom fills as you write. Turns green when you hit it. No popup. No confetti.
- **Autosave.** Stop worrying. Ma saves while you type.
- **Session memory.** Close the app, reopen it. Same file, scroll position, folder, and panel state. Like a bookmark already in the book.
- **Light and dark theme.** `⌘⇧L`. Same calm layout, different palette.
- **Three fonts.** Monospace, serif, or sans. That's it. No font rabbit hole.
- **Export to PDF and DOCX.** Clean output from the right rail. No headers or footers unless you add them.
- **Wikilinks.** Type `[[note name]]` to link notes in your folder. Click to open. Missing file? Click to create it.

### Your workspace

- **Open a file or a whole folder.** Folder view shows your `.md` files in a sidebar tree. Create, rename, duplicate, delete from a right-click menu.
- **Recent projects on the welcome screen.** Pick up where you left off in one click.
- **Document outline.** Heading hierarchy in a side panel. Click to jump. Word count and reading time in the meta bar.
- **Preview non-markdown files in the tree.** PDF, DOCX, and HTML open as read-only previews without leaving Ma.
- **Hidden chrome that appears when you need it.** The right rail fades in on hover. Tools stay reachable, not in your face.

### Research panel (not a chatbox)

Most AI writing tools give you a chat window. You copy text in, copy text out, lose context, repeat.

Ma's research panel works differently:

- **Start from your writing.** Highlight text, click ✦, get a streaming explanation in a side panel. Your selection stays visible as a context chip at the top.
- **Follow-up questions stay grounded.** After the first answer, ask more. Ma keeps the original context and sends your full document along silently. The AI knows what you're working on without you pasting it every time.
- **Save as note.** Something useful in the response? One click writes a new `.md` file in your folder, formatted and ready to link from your draft.
- **Resizable panel.** Drag the edge. It remembers you're writing, not chatting.
- **Local API key.** Stored in the system keychain. Your key, your machine.

This is research while you write. Not a separate conversation you have to manage.

### AI Draft (drift detection)

Paste from ChatGPT once and your whole essay sounds like ChatGPT.

- **Deterministic scan, not vibes.** Built on the same patterns Wikipedia's AI Cleanup project tracks: AI vocabulary, significance inflation, promotional language, em dashes, copula avoidance, weasel words, signposting, and more.
- **Highlights in your document.** Drifty passages get marked inline. Click the badge to jump between them.
- **Rescans when you pause typing.** Edit for a bit, stop for two seconds, Ma rechecks in the background. Results go stale if you keep editing, so you're never looking at outdated flags.
- **Works on long documents.** Chunked scanning with guardrails for big files. Partial results are labeled honestly.
- **No auto-rewrite.** Ma shows you where the voice slipped. You fix it. Your words stay yours.

### Privacy and ownership

- **No account required.** Open a file and write.
- **Files live where you put them.** Dropbox, iCloud, a USB stick, nowhere. Ma doesn't care.
- **No cloud sync we control.** Your documents never pass through our servers.

***

## Who actually uses this

Devs who vibe-code and end up with 40 `.md` files: architecture notes, decision logs, PR checklists. You don't want VS Code for that. You want something that opens the file and shuts up.

Researchers who write as they think. The tool should feel like a notebook someone left open, not an application you launched.

Writers and students with ADHD. The moment the UI asks for your attention you've lost the thread. Ma never asks.

Anyone who tried an AI writing app and hated the chat window glued to the side.

***

## Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘N` | Start writing (new untitled doc) |
| `⌘O` | Open file |
| `⌘⇧O` | Open folder |
| `⌘S` | Save |
| `⌘⇧B` | Toggle sidebar |
| `⌘\` | Toggle outline panel |
| `⌘⇧T` | Toggle typewriter scrolling |
| `⌘⇧F` | Toggle focus mode |
| `⌘⇧L` | Toggle light/dark theme |
| `⌘,` | Settings |
| `Esc` | Dismiss panels |

**Editor** (when focus is in the document):

| Shortcut | Action |
|----------|--------|
| `⌘Z` | Undo |
| `⌘⇧Z` | Redo |
| `⌘B` | Bold |
| `⌘I` | Italic |
| `⌘⌥1` to `⌘⌥6` | Heading 1 to 6 |
| `⌘⌥7` | Ordered list |
| `⌘⌥8` | Bullet list |

***

## Build from source

You need Node ≥ 20 and Rust stable.
Full system dep instructions by OS are in `.agent/BOOTSTRAP.md`.

```bash
npm install
npm run tauri dev     # dev mode, opens desktop window
npm run tauri build   # production build for your current OS
```

***

## Coming next

Slash commands for inline AI. Ghost text on pause. Multiple tabs. `@file` references in research. Full roadmap in `ROADMAP.md`.

If you're reading this before those ship, you're early. The people who download Ma now get the quiet editor before the crowd finds it.

***

*Tauri 2 · Svelte 5 · Milkdown 7*
