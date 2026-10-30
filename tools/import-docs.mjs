import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const repository = process.argv[2];
const ref = process.argv[3] ?? 'v0.5.0';
if (!repository || !/^v\d+\.\d+\.\d+$/.test(ref)) {
  throw new Error('Usage: node tools/import-docs.mjs COMPI_REPOSITORY v0.5.0');
}
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const version = ref.slice(1);
const output = join(root, 'content', version);
await mkdir(output, { recursive: true });
const git = (...args) => execFileSync('git', ['-C', repository, ...args]);
for (const name of ['INSTALLATION.md', 'USAGE.md', 'CONFIGURATION.md']) {
  await writeFile(join(output, name), git('show', `${ref}:docs/user/${name}`));
}
const sourcePath = 'crates/compi-client/src/cli/help.rs';
const source = git('show', `${ref}:${sourcePath}`).toString('utf8').replace(/\r\n/g, '\n');
const entriesSource = source.split('pub(super) const ENTRIES: &[Entry] = &[', 2)[1]?.split('\n];', 1)[0];
assert(entriesSource, 'Missing CLI entry catalogue');
const stringLiteral = String.raw`"(?:\\.|[^"\\])*"`;
const entries = [...entriesSource.matchAll(/    Entry \{\n([\s\S]*?)\n    \},/g)].map((match) => {
  const block = match[1];
  const entry = {};
  for (const name of ['command', 'usage', 'summary', 'detail', 'example']) {
    const value = block.match(new RegExp(String.raw`\b${name}:\s*(${stringLiteral})`));
    assert(value, `Missing ${name} in CLI entry`);
    entry[name] = JSON.parse(value[1]);
  }
  const action = block.match(new RegExp(String.raw`action:\s*Some\((${stringLiteral})\)`));
  entry.action = action ? JSON.parse(action[1]) : null;
  return entry;
});
assert(entries.length > 0);
assert.equal(entries.length, [...entriesSource.matchAll(/    Entry \{/g)].length, 'Do not silently skip CLI entries');
const commit = git('rev-list', '-n', '1', ref).toString().trim();
await writeFile(join(output, 'cli.json'), `${JSON.stringify({ version, ref, commit, source: sourcePath, entries }, null, 2)}\n`);
console.log(`Imported ${ref} (${commit}): 3 source documents, ${entries.length} CLI entries, ${new Set(entries.map(e => e.command)).size} commands.`);
