# ClaudeP2P

A secure, privacy-first chat app: direct peer-to-peer **rooms** first, real
self-hosted **servers** later.

Right now this is the **frontend**, running against a fake backend so we can get
the look and feel right before building the real networking.

- What we decided and why: [docs/decisions.md](docs/decisions.md)
- Security rules (dependencies and UI): [docs/security.md](docs/security.md)

## Run it

You need:

1. **Node.js**, current LTS, from [nodejs.org](https://nodejs.org) only.
2. **pnpm 12.14.0**:
   ```
   npm install -g pnpm@12.14.0
   ```
3. Optional: **VS Code** with the official Svelte extension (by `svelte`).
   VS Code will suggest it when you open this folder.

Then, in this folder:

```
pnpm install      # once, and after anyone changes dependencies
pnpm dev          # starts the app; open http://127.0.0.1:5173
```

Saving a file updates the page instantly.

## Other commands

| Command | What it does |
| --- | --- |
| `pnpm check` | Type-checks everything and runs the security rules |
| `pnpm build` | Builds the final files into `dist/` (with the strict CSP) and checks them |
| `pnpm preview` | Serves the built files, to test exactly what ships |
| `pnpm audit` | Checks dependencies against known vulnerabilities |

## The simulator

In `pnpm dev`, the wrench button at the bottom of the left rail opens the
**Simulator**. It forces the situations the real network will cause (the
directory going offline, people joining and leaving, the owner leaving, a direct
connection failing) so every screen gets designed, not just the happy path.

Password-protected sample rooms use the password `letmein`.

## Layout

```
src/
  App.svelte                 the window: rail, sidebar, main area
  lib/
    core/                    the boundary to the backend
      types.ts               the contract (what the real backend must provide)
      mock.ts                the fake backend used for now
    state/                   reactive app state fed by backend events
    views/                   full screens (lobby, room)
    components/              reusable pieces (cards, dialogs, avatars, icons…)
  styles/
    tokens.css               every color, size and timing (themes change these)
    base.css                 reset, buttons, inputs, badges
scripts/check-security.mjs   enforces the rules in docs/security.md
```
