import { defineConfig, type Plugin } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// The production Content Security Policy. Everything must come from our own
// files: no inline scripts, no inline styles, no remote anything. The desktop
// shell (Tauri) will enforce the same policy later.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self'",
  "font-src 'self'",
  "connect-src 'self'",
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

// Only added to built output. The dev server injects styles at runtime for
// instant reloads, which a strict policy would block.
function contentSecurityPolicy(): Plugin {
  return {
    name: 'content-security-policy',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler: () => [
        {
          tag: 'meta',
          attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP },
          injectTo: 'head-prepend',
        },
      ],
    },
  };
}

export default defineConfig({
  plugins: [svelte(), contentSecurityPolicy()],
  server: {
    // Never expose the dev server to the network.
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true,
    headers: { 'Content-Security-Policy': CSP },
  },
  build: {
    // Never turn assets into inline data: URLs; keep every resource a file.
    assetsInlineLimit: 0,
    modulePreload: { polyfill: false },
    sourcemap: false,
  },
});
