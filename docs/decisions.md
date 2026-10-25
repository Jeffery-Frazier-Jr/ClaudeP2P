# Decisions

A running record of what we decided and why, so nothing has to be remembered.
Newest decisions go at the bottom of each section. "Parked" means a good idea
we are deliberately not building yet.

## The project

- **Goal:** a secure, privacy-first chat app that can replace Discord. It is a
  ground-up restart of an earlier P2P chat project; that project is reference
  material only, not code to carry over.
- **Standalone desktop app**, not a browser tab. The earlier project ran in a
  browser, which is why MPV could never be integrated.
- **Two separate services in one app:**
  - **Rooms** (built first): people find each other through a small directory,
    then talk directly peer-to-peer.
  - **Servers** (later): real, self-hosted server programs with their own
    database, channels and roles. Not "special users".

## Technology

| Part | Choice | Why |
| --- | --- | --- |
| Desktop shell | Tauri (later) | Real desktop app with an HTML UI; Rust backend inside |
| UI | Svelte 5 + TypeScript + Vite | Closest to plain HTML; renders text safely by default; small output |
| Package manager | pnpm (pinned in `package.json`) | Release-age delay and blocked install scripts; see `security.md` |
| Backend | Rust (later) | Networking, encryption, storage, MPV |
| Media | MPV in a separate, locked-down process (later) | Untrusted media never runs next to your keys |

- **Frontend first.** The UI is built against a fake backend (`src/lib/core/mock.ts`)
  that has the same shape as the real one will. The real backend replaces one
  file; the UI doesn't change.
- **Plain Svelte, not SvelteKit.** We don't need server rendering or routing, so
  we avoid that code and its security advisories.

## Look and feel

- Discord-style **gray** theme to start. Theme presets (including an
  all-black look) come later.
- The earlier Figma is a source of **ideas**, not a design to copy: browser-style
  channel tabs, a voice/members side panel and a floating message box are worth keeping.
- Everything visual lives in CSS variables (`src/styles/tokens.css`) so users
  can recolor anything later.

## Identity

- Each install creates a key that never leaves the PC. The key **is** the identity.
- **Nicknames are only labels** and can change anytime.
- In rooms, people are shown as **nickname + a short tag made from the key**
  (e.g. `SawrToonz #7F3K`). The tag can't be chosen or faked.
- Real **@handles come with servers**, where a database exists anyway.

## Rooms

- **Size:** 2 to 4 people. Everyone connects to everyone (4 people = 6 links).
- **Visibility:**
  - *Public* rooms are listed on the directory.
  - *Friends* rooms are never listed; the owner's app tells online friends directly.
- **Password (optional):** checked by the owner's app directly using a
  password-authenticated handshake (PAKE). The password is never sent, not
  even encrypted, and the directory never sees it.
- **Blocklist:** chosen by the owner, kept only on the owner's PC, matched by
  key (so a new nickname doesn't get around it). A blocked person is told only
  that they weren't let in, not that they're blocked.
- **Kicking:** the owner can remove people while waiting and after starting.
  After starting, the kick is signed by the owner and every normal app obeys it.
  (A modified app could ignore it; members can still block that person.)
- **Lifecycle:**
  1. *Waiting:* listed on the directory (in memory only); people join; the
     owner's app checks blocklist, password and limit.
  2. *Start:* **only the owner can start**, by clicking Start. A room never
     starts on its own, even when full. If the owner leaves before starting,
     the room closes.
  3. *Connecting:* the room is delisted and **everyone disconnects from the
     directory**. Peers connect directly using public STUN for address discovery.
  4. *Started:* nothing goes through the domain anymore.
- **No relay for rooms.** If a direct connection can't be made, it fails and
  says so. Rooms are the security-first option.
- **History:**
  - *2-person rooms* work like text messages: each side keeps its own copy;
    no syncing. Deleting hides a message; it stays in the local database.
  - *Group rooms* can optionally **sync history** on join. Every message,
    edit and delete is **signed by its author**, so a member sharing history
    can't forge or alter anything. Per-author numbering exposes gaps if a
    member leaves messages out. Declining sync just starts from the join.
  - Anyone can **clear their own history** at any time (a real local wipe).

### Parked

- Joining a room after it started.
- A relay option (more likely for the server software, e.g. behind Cloudflare).

## Planned room features (not built yet)

Messages with Markdown (safe subset, no raw HTML, links confirm before opening,
no automatic loading of outside images); files, images, video (MPV), audio;
saved custom GIFs, stickers and emoji (GIF search opt-in, off by default);
history search with filters (date, person, exact phrase, file size, type);
profiles (picture, about me, signed by your key and sent directly to peers);
heavy customization (movable panels, button placement, per-icon colors,
themes, background images; shared themes are variables and images only);
voice calls and screen sharing.
