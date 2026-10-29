import { cp, mkdir, readFile, rm, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = join(root, 'dist');
// Only public page files go to Pages. Never upload the repository directory:
// it contains local skills, design drafts and other non-public working files.
const files = [
  'index.html',
  'style.css',
  'scroll.js',
  'assets/compi-icon.png',
  'assets/Compi-desktopappicon-v4.ico',
  'assets/mark-github.svg',
  'assets/agent-diff-terminal.png',
  'assets/gpui-research.png',
  'assets/monitor-and-build.png',
  'assets/notifications-demo.mp4',
  'assets/notifications-poster.jpg',
];
const allowed = new Set(files);
const html = await readFile(join(root, 'index.html'), 'utf8');
const script = await readFile(join(root, 'scroll.js'), 'utf8');
const localRefs = [
  ...[...html.matchAll(/(?:src|href|poster)="([^"#]+)"/g)].map(match => match[1]),
  ...[...script.matchAll(/src:\s*'(assets\/[^']+)'/g)].map(match => match[1]),
];
for (const ref of localRefs) {
  if (/^(?:https?:|data:|mailto:)/.test(ref)) continue;
  const clean = ref.split(/[?#]/)[0];
  if (!allowed.has(clean)) throw new Error(`Public asset not in deployment allowlist: ${clean}`);
}
for (const file of files) {
  const info = await stat(join(root, file));
  if (!info.isFile() || info.size === 0) throw new Error(`Missing/empty asset: ${file}`);
  if (info.size > 25 * 1024 * 1024) throw new Error(`Asset exceeds Pages' per-file limit: ${file}`);
}
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const file of files) {
  const target = join(output, file);
  await mkdir(dirname(target), { recursive: true });
  await cp(join(root, file), target);
}
console.log(`Built ${files.length} public files into dist/. Local references verified.`);
