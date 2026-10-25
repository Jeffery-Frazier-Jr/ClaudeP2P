// Fails the build if source or output breaks the project's security rules.
// No dependencies on purpose: this file must be readable in one sitting.
//
//   node scripts/check-security.mjs          check src/
//   node scripts/check-security.mjs --dist   check the built dist/ as well

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

const root = new URL('..', import.meta.url).pathname;

// Each rule: which files, what pattern, and why it is banned.
const SOURCE_RULES = [
  {
    exts: ['.svelte'],
    pattern: /\{@html\b/,
    why: '{@html} injects raw HTML. All user content must render as text.',
  },
  {
    exts: ['.svelte', '.ts', '.js'],
    pattern: /\.(innerHTML|outerHTML)\s*=|insertAdjacentHTML\s*\(|document\.write\s*\(/,
    why: 'Building HTML from strings is the main way chat apps get XSS.',
  },
  {
    exts: ['.svelte', '.ts', '.js'],
    pattern: /\beval\s*\(|new\s+Function\s*\(|setTimeout\s*\(\s*['"`]|setInterval\s*\(\s*['"`]/,
    why: 'Running strings as code is never needed and breaks the CSP.',
  },
  {
    exts: ['.svelte', '.html'],
    pattern: /<[a-zA-Z][^>]*\sstyle\s*=/,
    why: 'Inline style attributes violate the CSP. Use a class or style:prop={value}.',
  },
  {
    exts: ['.svelte'],
    pattern: /<[a-z][a-z0-9-]*\s[^>]*\{\.\.\.[^}]*\}/,
    why: 'Spreading objects onto DOM elements can smuggle in event handlers.',
  },
  {
    exts: ['.svelte', '.ts', '.js', '.css', '.html'],
    pattern: /\b(?:https?:)?\/\/(?!localhost|127\.0\.0\.1)[a-z0-9-]+\.[a-z]{2,}[^\s'"`)]*\.(?:css|js|woff2?|ttf|png|jpe?g|gif|svg|webp)\b/i,
    why: 'Remote assets leak your IP to third parties. Bundle everything locally.',
  },
];

const DIST_RULES = [
  { pattern: /<script(?![^>]*\bsrc=)[^>]*>/i, why: 'Inline <script> in built HTML.' },
  { pattern: /<style\b/i, why: 'Inline <style> in built HTML.' },
  { pattern: /\sstyle\s*=/i, why: 'Inline style attribute in built HTML.' },
  { pattern: /\son[a-z]+\s*=/i, why: 'Inline event handler in built HTML.' },
];

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

// Comments are allowed to mention banned things (like this file does).
function stripComments(text, ext) {
  let out = text.replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '));
  if (ext !== '.html') {
    out = out
      .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
      .replace(/(^|[^:'"`])\/\/.*$/gm, (m, p) => p + ' '.repeat(m.length - p.length));
  }
  return out;
}

const problems = [];

function check(file, rules) {
  const ext = extname(file);
  const text = stripComments(readFileSync(file, 'utf8'), ext);
  const lines = text.split('\n');
  for (const rule of rules) {
    if (rule.exts && !rule.exts.includes(ext)) continue;
    lines.forEach((line, i) => {
      if (rule.pattern.test(line)) {
        problems.push(`${relative(root, file)}:${i + 1}  ${rule.why}\n    ${line.trim()}`);
      }
    });
  }
}

for (const file of walk(join(root, 'src'))) check(file, SOURCE_RULES);
check(join(root, 'index.html'), SOURCE_RULES);

if (process.argv.includes('--dist')) {
  const dist = join(root, 'dist');
  if (!existsSync(dist)) {
    console.error('dist/ not found. Run the build first.');
    process.exit(1);
  }
  for (const file of walk(dist)) {
    if (extname(file) === '.html') check(file, DIST_RULES);
  }
}

if (problems.length) {
  console.error(`Security check failed (${problems.length}):\n`);
  for (const p of problems) console.error('  ' + p + '\n');
  process.exit(1);
}
console.log('Security check passed.');
