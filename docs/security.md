# Security rules

These are enforced by tools where possible, so they don't depend on anyone
remembering them. `pnpm check` and `pnpm build` fail when a rule is broken.

## Dependencies (supply chain)

2025–2026 saw several large npm attacks (the Shai-Hulud / "ChainDrop" worms,
the `@mastra` and `@redhat-cloud-services` hijacks). Almost all started with a
hijacked maintainer account publishing a poisoned new version.

| Rule | Where it's enforced |
| --- | --- |
| Use **the newest version that is at least 7 days old** | `minimumReleaseAge` in `pnpm-workspace.yaml` |
| **Security fixes are taken right away**, after checking the advisory and that the release came from the official repo | Added by exact version to `minimumReleaseAgeExclude`, with a comment |
| **No install scripts** from dependencies unless explicitly approved | `strictDepBuilds` + `allowBuilds` in `pnpm-workspace.yaml` |
| Refuse versions published with **weaker trust** than earlier ones (e.g. provenance dropped) | `trustPolicy: no-downgrade` |
| **Exact versions** only; the lockfile is committed | `package.json`, `pnpm-lock.yaml` |
| **As few dependencies as possible.** Anything new needs a one-line reason in its commit | Review |
| Run `pnpm audit` after every dependency change | `pnpm audit` |

The whole frontend toolchain is 6 direct and 47 total packages.

## The UI

| Rule | Why | Enforced by |
| --- | --- | --- |
| Strict Content Security Policy: only our own files; no inline scripts or styles; no remote anything | Blocks injected code and IP-leaking remote loads | `vite.config.ts` (built output) |
| Never use `{@html}`, `innerHTML`, `insertAdjacentHTML` or `document.write` | Building HTML from strings is how chat apps get XSS | `scripts/check-security.mjs` |
| No `style="..."` attributes; use classes or `style:prop={value}` | Inline style attributes break the CSP | `scripts/check-security.mjs` |
| No `{...spread}` onto HTML elements | Can smuggle in event handlers from data | `scripts/check-security.mjs` |
| No `eval`, `new Function`, or string timers | Running text as code | `scripts/check-security.mjs` |
| No remote fonts, images, scripts or styles | Each one tells a third party your IP | `scripts/check-security.mjs` + CSP |
| Assets are never inlined as `data:` URLs | Keeps the CSP strict | `vite.config.ts` |
| The dev server only listens on `127.0.0.1` | A Vite dev-server bug in 2026 only mattered when exposed | `vite.config.ts` |

## The UI/backend boundary

- The UI only talks to the backend through `src/lib/core/types.ts`.
- The UI never holds keys, never opens network connections and never reads files.
- Everything the backend sends is treated as untrusted display data.

## Later (Tauri)

- The webview gets only the specific commands it needs; updater commands are never exposed.
- The CSP never allows `data:` or `blob:` scripts.
- Keep Tauri, its plugins and WebView2 current with the same 7-day rule.
