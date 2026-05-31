# Ma — Feature Ideas

Every good idea that came up during design.
Not all of these are on the immediate roadmap.
The best ones will earn their way into PHASES.md.

---

## Writing experience

**Typewriter scrolling**
Cursor stays fixed in the vertical centre of the screen.
The document scrolls up beneath you as you type.
Keeps your active line at eye level the whole session.
Standard in iA Writer and Ulysses. Writers notice when it is missing.

**Focus sentence mode**
`⌘⇧F` — everything fades to 20% opacity except the sentence
the cursor is on. Move the cursor, the focus moves with it.
The past is dimmed. The present is bright. Forward is the only direction.
A CSS decoration on the active ProseMirror node.

**Reading mode**
`⌘R` — read-only view. No cursor, no toolbar, no temptation to edit.
Generous line spacing, slightly larger font, soft background.
Reading time at the top. Thin scroll progress marker on the right.
`Esc` returns to editing exactly where you left off.

**Writing session with a word goal**
Set a target before you start — 300 words, 500 words, whatever.
A thin progress bar at the very bottom of the window fills silently.
Turns green when you hit the goal. No pop-up. No celebration.
Just a quiet acknowledgement that you did the thing.
ADHD brains need something to run toward.

---

## Memory and recovery

**Session memory**
Reopen Ma and you are exactly where you stopped.
Same file, same scroll position, same sidebar and panel state.
Like picking up a book with a bookmark already in it.
Small service file. Disproportionate impact.

**Local version snapshots**
Every `⌘S` silently keeps the last 10 versions in `.ma-versions/`
next to the file. A clock icon in the topbar opens a timeline.
Ten dots — hover to see word count and time, click to preview,
click to restore. No git. No setup. Just a safety net.
Writers who know their work is versioned write more freely.

---

## Capture and connection

**Quick capture — `⌘⇧Space` from anywhere**
A small floating window appears over whatever the user is doing —
browser, terminal, anywhere. Type a thought, hit Enter, it vanishes.
Note lands in `inbox.md` in the last opened folder.
Two second interruption instead of five minutes of context switching.
Requires a Tauri background process that stays alive when Ma is closed.
The feature that makes Ma the default tool, not just the writing tool.

**Linked notes — `[[note name]]` syntax**
Type `[[dismaland]]` and Ma looks for `dismaland.md` in the folder.
Found — renders as a clickable link. Click — opens the file.
Not found — click creates and opens it.
Connected notes turn a folder into a thinking environment.
Pairs perfectly with the AI save-as-note feature.
A Milkdown plugin. A weekend of work.

---

## AI features

**Full document context**
The entire current document goes into every AI call silently.
The AI understands what you are writing about without being told.
One change to `ai.js`. Ships fast.

**Explain mode**
Highlight text, click Explain, get a focused streaming response
in the research sidebar. Follow-up questions supported.
No limits on turns. Clears between questions.

**Research mode**
Switch the sidebar to research. The AI searches the web via Tavily
before answering. Sources included. For fact-checking, current events,
things that need real data not just model knowledge.

**Save as note**
AI explains something useful — click save as note.
A new `.md` file appears in the folder, cleanly formatted,
ready to link from the main document.
The personal wiki that builds itself.

**`⌘K` inline transform**
Press `⌘K` on selected text. Type an instruction.
"Make this more concise." "Translate to French." "Turn this into bullets."
The selection transforms in place. The document is still yours.

**Ghost text on pause**
After 1.5 seconds idle, a faint continuation appears ahead of the cursor.
Tab to accept. Keep typing to ignore. Off by default.
The writing equivalent of Cursor's tab completion.

**`@file` references in research panel**
Type `@filename` in the research panel input.
That file's content gets pulled into the AI context.
Ask questions that span multiple documents.

**Agent research mode**
"Build me a reading list on street art in Lagos."
Ma searches, creates multiple notes, links them in an index file.
No browser. No tab switching. The headline feature.
Depends on everything else being stable first.

---

## Cloud and sync

**Google Drive sync**
`md → HTML → Google Docs` via the Drive import API.
One click saves a properly formatted Google Doc to Drive.
Pull back with `Google Docs → HTML → md` via Turndown.
Recent docs panel shows your Ma files in Drive.

**Supabase usage telemetry**
Anonymous, no PII, no consent banner required.
Tracks: first seen, last open, previous open, heartbeat.
Tells us: installs, actives, retention. Nothing about what anyone writes.

**Supabase AI proxy**
NVIDIA key lives as a Supabase secret. Never in the app.
Default users hit the proxy — AI works on first launch, no setup.
BYOK users bypass it. Rate limited by anonymous ID.

**Supabase auth + cloud sync**
Optional sign-in unlocks cross-device sync.
Documents table in Supabase. Open on any machine.
Opt-in only. Local-only users see zero difference.

---

## RAG and deep research

**Folder indexing**
Open a folder — Ma quietly indexes all `.md` files in the background.
Chunks, embeds, stores locally via LanceDB or Supabase pgvector.
AI queries pull the most relevant chunks, not the whole file.
For writers using five books or journals as sources.
Local first. Energy efficient. No cloud required.

---

## Polish

**Light / dark theme toggle — `⌘⇧L`**
Same philosophy. Different palette.

**Focus mode — `⌘⇧F`**
Dims everything except the current paragraph.

**Multiple tabs — `⌘T` / `⌘W`**
Open more than one file at once.

**`⌘P` quick open**
Fuzzy search across recent files.

**PDF export**
Clean output. No headers or footers by default.

**App icon**
間 as the icon. All platform sizes.

**Custom CSS**
Load a local file. For people who want their own thing.

---

*Ideas without task files yet are marked implicitly — if a task file exists*
*it is referenced in PHASES.md. Everything here is fair game.*