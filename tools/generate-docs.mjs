import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { marked } from 'marked';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const version = '0.5.0';
const sourceDir = join(root, 'content', version);
const ref = `v${version}`;
const repository = `https://github.com/cloudboy-jh/compi/blob/${ref}`;
const readNormalized = async (file) => (await readFile(file, 'utf8')).replace(/\r\n/g, '\n');
const read = (name) => readNormalized(join(sourceDir, name));
const [installation, usage, configuration, catalogueRaw, index] = await Promise.all([
  read('INSTALLATION.md'), read('USAGE.md'), read('CONFIGURATION.md'), read('cli.json'), readNormalized(join(root, 'index.html')),
]);
const catalogue = JSON.parse(catalogueRaw);
assert.equal(catalogue.version, version);
const escape = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function markdown(text, source = 'USAGE.md') {
  return marked.parse(text, { gfm: true, async: false }).replace(/href="([^"]+)"/g, (whole, href) => {
    if (/^(?:https?:|mailto:|#)/.test(href)) return whole;
    return `href="${escape(new URL(href, `${repository}/docs/user/${source}`).href)}"`;
  });
}
function bullet(label) {
  const line = usage.split('\n').find(line => line.startsWith(`- **${label}:**`));
  assert(line, `Source bullet missing: ${label}`);
  return line.slice(2);
}
function paragraph(prefix) {
  const paragraph = usage.split(/\n\s*\n/).find(part => part.startsWith(prefix));
  assert(paragraph, `Source paragraph missing: ${prefix}`);
  return paragraph;
}
function subsection(text, heading) {
  const lines = text.split('\n');
  const start = lines.findIndex(line => line === heading);
  assert(start >= 0, `Source heading missing: ${heading}`);
  const depth = heading.match(/^#+/)[0].length;
  let end = start + 1;
  while (end < lines.length && !new RegExp(`^#{1,${depth}} `).test(lines[end])) end++;
  return lines.slice(start + 1, end).filter(line => !line.startsWith('[Back to README]')).join('\n').trim();
}
const code = (text) => `<pre><code>${escape(text)}</code></pre>`;
const details = (title, text, source = 'USAGE.md') => `<details class="source-detail"><summary>${escape(title)}</summary><div class="detail-body">${markdown(text, source)}</div></details>`;
const sourceLink = (file, anchor = '') => `<a class="source-link" href="${repository}/docs/user/${file}${anchor}">Source: ${escape(file)} ↗</a>`;
const groups = [
  ['Workspaces and tabs', ['workspace', 'tab']],
  ['Panes and layouts', ['pane', 'split', 'layout', 'window']],
  ['Terminal input and output', ['run', 'attach', 'detach']],
  ['Files and views', ['files', 'edit', 'notes', 'diff', 'browse', 'settings', 'monitor']],
  ['Palette actions', ['command']],
  ['Application', ['theme', 'update', 'changes', 'help']],
];
const unique = new Set(catalogue.entries.map(entry => entry.command));
assert.deepEqual([...unique].sort(), groups.flatMap(([, commands]) => commands).sort(), 'Every command must be grouped');
const commandReference = groups.map(([title, commands]) => `<div class="cli-group"><h3>${escape(title)}</h3>${catalogue.entries.filter(entry => commands.includes(entry.command)).map(entry => `<details class="cli-entry"><summary><code>compi ${escape(entry.command)}${entry.action ? ` ${escape(entry.action)}` : ''}</code><span>${escape(entry.summary)}</span></summary><div class="detail-body"><h4>Usage</h4>${code(`compi ${entry.usage}`)}<p>${escape(entry.detail)}</p><h4>Example from Compi’s help</h4>${code(entry.example)}</div></details>`).join('\n')}</div>`).join('\n');
const sections = [
  {
    id: 'get-started', title: 'Get started', content: `
<p class="section-lead">Install Compi, open a shell and make your first split.</p>
<div class="platform-grid"><div><h3>Windows</h3>${markdown(subsection(installation, '### Windows'), 'INSTALLATION.md')}</div><div><h3>macOS</h3>${markdown(subsection(installation, '### macOS'), 'INSTALLATION.md')}</div></div>
<div class="notice"><strong>First-launch trust warnings</strong><p>0.5.0 Windows packages are unsigned. The Mac app is ad-hoc signed, not notarized. For a download you trust, Windows may offer <strong>More info → Run anyway</strong>; on macOS try opening it, then use <strong>System Settings → Privacy &amp; Security → Open Anyway</strong>. Do not disable operating-system security globally. Managed-device policy may prevent these overrides.</p></div>
<h3>Your first workspace</h3><ol><li>Launch Compi and open the palette with <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd>, or <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd> on macOS.</li><li>Choose <strong>New workspace</strong> to organize a project, then <strong>New terminal tab</strong> to start a shell.</li><li>Choose <strong>Split right</strong> or <strong>Split down</strong>. New tabs and splits inherit the focused terminal’s reported directory.</li></ol>
${code('compi split --right\ncompi --json pane list')}
<p>Run those commands inside a Compi shell. Closing the app window keeps the server-owned shells running; closing a pane or restarting the server is different.</p>
${details('Using the palette and returning to the shell', `${bullet('The palette')}\n\n${bullet('Views in place')}`)}${sourceLink('INSTALLATION.md')}`,
  },
  {
    id: 'workspaces', title: 'Workspaces and panes', content: `
<p class="section-lead">Organize projects into workspaces, tabs and panes without restarting their programs.</p>
<ul><li><strong>Workspace:</strong> a named group of tabs.</li><li><strong>Tab:</strong> one terminal or a layout of split panes.</li><li><strong>Pane:</strong> a terminal or content view that can be resized, moved, zoomed, floated or docked.</li></ul>
<h3>Move and arrange</h3><p>Hover a pane for its <strong>⋯</strong> grip. Click for actions, or drag onto an edge to split beside another pane, the centre to swap, another tab to join it, or empty tab-bar space to make a new tab. Escape cancels.</p>
${details('Pane movement, floats and layout presets', [bullet('Move a pane'), bullet('Float a pane'), bullet('Arrange panes and tabs')].join('\n\n'))}
<h3>Hide, close or end?</h3><div class="table-wrap"><table><thead><tr><th>Action</th><th>What happens</th></tr></thead><tbody><tr><td>Close the app window</td><td>The background server keeps running shells alive.</td></tr><tr><td>Hide a terminal tab</td><td>The tab’s processes keep running; restore it through the palette.</td></tr><tr><td>Close a pane or tab</td><td>Its processes end. GUI close confirmation is optional and off by default.</td></tr><tr><td>End process…</td><td>Asks first and leaves the terminal’s final screen visible.</td></tr><tr><td>Restart daemon</td><td>Asks first and ends the server’s running shells.</td></tr></tbody></table></div>
${details('Close confirmation settings', subsection(configuration, '## Closing tabs and panes'), 'CONFIGURATION.md')}
<h3>Reconnect and recover</h3>${markdown(subsection(usage, '## Shell lifecycle and recovery'))}
${details('Terminal scrolling and retained history', subsection(usage, '## Scrolling'))}${sourceLink('USAGE.md')}`,
  },
  {
    id: 'files', title: 'Files, editing and review', content: `
<p class="section-lead">Open the project’s files where you are already working.</p>
${code('compi files\ncompi edit\ncompi notes\ncompi diff')}
<p>These open the relevant view in the current terminal’s pane while its shell keeps running underneath. <kbd>Ctrl</kbd>/<kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>E</kbd> toggles back. A file path can be passed to <code>edit</code> or <code>notes</code>; a repository is required for <code>diff</code>.</p>
<h3>Edit and read Markdown</h3><p>Use <strong>Edit / Read</strong> in a Markdown tab, or <kbd>Ctrl</kbd>/<kbd>Cmd</kbd> + <kbd>E</kbd> while the file view owns the keyboard. Read uses the same buffer, including unsaved edits. <code>compi edit FILE</code> forces Edit; <code>compi notes FILE</code> opens Read.</p>
<p>Save with <kbd>Ctrl</kbd>/<kbd>Cmd</kbd> + <kbd>S</kbd>, find with <kbd>Ctrl</kbd>/<kbd>Cmd</kbd> + <kbd>F</kbd>. Markdown supports tables, tasks, callouts, wiki links, backlinks, Mermaid and LaTeX.</p>
<div class="notice"><strong>Rendered tasks save the whole buffer.</strong><p>Clicking a task checkbox saves the current buffer, including other unsaved edits, through the normal conflict-checked save.</p></div>
${details('Markdown behavior, notes search and rendering bounds', [paragraph('Markdown tabs have'), paragraph('Clicking a rendered task'), paragraph('**Notes** opens'), paragraph('Rendering bounds:'), paragraph('`compi notes search')].join('\n\n'))}
<h3>Previews and file safety</h3><p>Images and SVG have zoom/pan controls. PDF, audio and video use the system web view. Text over 1 MiB is read-only and paged in parts; syntax highlighting stops above 512 KB. Animated GIF and WebP show their first frame only.</p>
${details('Editor, previews, saves, conflicts and unsaved-edit recovery', bullet('Edit files'))}
${details('Opening files from the palette, terminal paths and image cards', [bullet('Open files from a terminal'), bullet('Open a file printed in a terminal'), bullet('Paste a screenshot or image')].join('\n\n'))}
<h3>Diffs, staging and commits</h3><p>Use <strong>Changes</strong> or <code>compi diff</code> to review uncommitted work. <code>compi diff HEAD~1</code> opens a past commit, read-only, against its first parent. Unsaved buffer edits are not included in a disk-based diff.</p>
<p>Stage a file or hunk, write a commit message and use <kbd>Ctrl</kbd>/<kbd>Cmd</kbd> + <kbd>Enter</kbd> to commit. <strong>Discard changes…</strong> is destructive and asks first; discarding an untracked file deletes it.</p>
${details('Review, staging, commits and branch operations', [bullet('Review changes'), bullet('See changes while editing'), bullet('Stage and commit'), bullet('Branches, fetch, pull and push'), paragraph('`compi diff COMMIT`')].join('\n\n'))}${sourceLink('USAGE.md')}`,
  },
  {
    id: 'browser', title: 'Browser panes', content: `
<p class="section-lead">Keep your local app or documentation beside its terminal.</p>
${code('compi browse\ncompi browse localhost:3000\ncompi browse https://docs.rs --down')}
<p>The local-server example requires something listening on port 3000. With no URL, the browser home page lists responding local servers found in terminal output and the last five sites for the window.</p>
<ul><li><kbd>Ctrl</kbd>/<kbd>Cmd</kbd> + <kbd>L</kbd> or <kbd>F6</kbd> selects the address field; Enter navigates, Escape restores the current address.</li><li>Back, Forward and Reload/Stop use the pane’s toolbar.</li><li>Split, float, move or close it with the normal pane controls. Closing it does not stop a separate terminal’s server.</li><li><code>compi --json window list</code> reports page URL, title, loading address and errors.</li></ul>
<div class="notice"><strong>A pane is not browser automation.</strong><p>Opening or navigating a Browser pane does not give an agent DOM inspection, screenshots or page automation. Those come from the agent’s own browser tools.</p></div>
<p class="platform-note">In 0.5.0, browser panes and PDF/audio/video previews remain visually unqualified on macOS. Web-view behavior and supported media formats depend on the platform.</p>
${details('Browser toolbar, profile, home page and CLI behavior', [bullet('Open a web page beside a terminal'), bullet('Browser home page'), paragraph('`compi browse URL`')].join('\n\n'))}${sourceLink('USAGE.md')}`,
  },
  {
    id: 'agents', title: 'Agents and CLI', content: `
<p class="section-lead">Any agent that can run shell commands can use Compi’s public CLI.</p>
<p>Inside a supported Compi shell, the matching CLI is on <code>PATH</code> and inherits its instance and pane context. It operates the workspace around the agent; it is not an agent harness.</p>
<h3>Discover, inspect, act, read back</h3>${code('compi --json help\ncompi --json pane show\ncompi run -- cargo test --locked -p compi-protocol\ncompi pane capture --scope scrollback --format text')}
<p>The test command is for a shell in Compi’s source repository. <code>run</code> submits without waiting. Capture reads the output available so far; inspect or capture again to check progress. No fabricated success is returned on behalf of the running program.</p>
<h3>Choose the exact target</h3>${markdown(paragraph('Outside a Compi shell,'))}
<h3>Output and safety</h3>${markdown(paragraph('In a terminal, `workspace list`'))}
<p><code>--json</code> returns structured success/error envelopes. Full IDs remain copyable. Unknown commands fail with exit 2 instead of opening a GUI.</p>
<p><code>pane send --text</code> is literal and does not press Enter. Use <code>--key enter</code> explicitly. Capture never takes input ownership. Interactive <code>attach</code> only accepts an unattached terminal and never steals a GUI attachment.</p>
${details('Close confirmations, output envelopes and exit codes', paragraph('Close confirms interactively'))}
${details('Palette command discovery and UI requirements', paragraph('`compi command list`'))}
<div class="table-wrap"><table><thead><tr><th>Exit</th><th>Meaning</th></tr></thead><tbody>${[[0,'Success'],[1,'Operation or transport failure'],[2,'Invalid arguments'],[3,'Missing or ambiguous target'],[4,'Confirmation required or cancelled'],[5,'Daemon or attachment unavailable'],[6,'Concurrent revision, generation or lifetime conflict']].map(([n,label])=>`<tr><td><code>${n}</code></td><td>${label}</td></tr>`).join('')}</tbody></table></div>
<p><a href="#cli-reference">Browse the full command catalogue ↓</a></p>${sourceLink('USAGE.md','#command-line-workspace-control')}`,
  },
  {
    id: 'cli-reference', title: 'Command reference', content: `
<p class="section-lead">Every command and action from Compi ${version}’s own help catalogue.</p>
<p>Expand a command for exact syntax, behavior and a source-provided example. Capitalized arguments such as <code>FILE</code>, <code>NAME</code> and <code>PID</code> are placeholders; substitute your own target. Examples are instructions, not recorded output.</p>
${code('compi help\ncompi help pane\ncompi pane capture --help\ncompi --json help')}
<p class="reference-count">${catalogue.entries.length} entries · ${unique.size} top-level commands · generated from the release source</p>${commandReference}
<p><a href="${repository}/${catalogue.source}">View the versioned CLI catalogue source ↗</a></p>`,
  },
  {
    id: 'appearance', title: 'Appearance and settings', content: `
<p class="section-lead">Configure the workspace without changing your tools.</p>
<p><kbd>Ctrl</kbd>/<kbd>Cmd</kbd> + <kbd>,</kbd> opens Settings as a pane. Search finds controls across every section. From a terminal, use <code>compi settings appearance</code>.</p>
<p>Theme selects application and terminal colors together. Preview a tile, then <strong>Apply</strong> to keep it or <strong>Cancel</strong> to restore the current theme. An optional terminal-palette override lives under <strong>Advanced → Terminal colors</strong>.</p>
<p>Transparency, blur, opacity and fonts are independent preferences. Choose <strong>Comfy</strong> for rounded panes and gutters or <strong>Compact</strong> for edge-to-edge terminal space.</p>
${details('Themes, imports, exports and configuration example', configuration.split('## Pane density')[0].replace(/^# Appearance and configuration\s*/,''), 'CONFIGURATION.md')}
${details('Pane density and focus indicators', `${subsection(configuration,'## Pane density')}\n\n${subsection(configuration,'## Focus indicator')}`, 'CONFIGURATION.md')}
${details('Tab metadata', subsection(configuration,'## Tab metadata'), 'CONFIGURATION.md')}
<h3>Shell prompts</h3><p><strong>Settings → Terminal → Shell prompt</strong> uses your existing Oh My Posh or Starship installation in the environment where the shell runs. Compi does not install a provider or replace it with a native prompt renderer.</p>
${details('Prompt styles, applying, backups and restoration', subsection(usage,'## Shell prompt'))}${sourceLink('CONFIGURATION.md')}`,
  },
  {
    id: 'notifications', title: 'Status and notifications', content: `
<p class="section-lead">See when supporting programs are working, blocked, finished or failed.</p>
<p>Programs report status through OSC 7501. Compi displays their reports instead of guessing from terminal output. Indicators can appear on tabs, panes and the sidebar; hovering shows the reported details.</p>
<p>Open <strong>Settings → Notifications</strong> or run <code>compi settings notifications</code>.</p>
<div class="table-wrap"><table><thead><tr><th>Delivery</th><th>Behavior</th></tr></thead><tbody><tr><td>Automatic</td><td>In-app cards while Compi is active; system notifications while it is in the background.</td></tr><tr><td>In-app only</td><td>Cards inside Compi.</td></tr><tr><td>System only</td><td>Operating-system notifications.</td></tr><tr><td>Both</td><td>Both delivery paths for an eligible event.</td></tr></tbody></table></div>
<p><strong>Needs attention</strong> is on; <strong>Finished</strong> is off by default. Working, idle and failures do not generate notifications in 0.5.0. Existing reports are not replayed on reconnect. Click a card or notification to return to its terminal; dismissing a card does not clear program status.</p>
<p><strong>Sound</strong> starts Off. On Windows choose Default, Message, Mail, Reminder or Text message, and use <strong>Play</strong> to preview. Quiet modes and system notification-sound settings are respected. <strong>Send test</strong> exercises the current delivery settings.</p>
<p class="platform-note">macOS notifications require the app bundle, request OS permission and have no sound in 0.5.0. They remain unverified on a Mac in that release.</p>
${details('Status lifecycle, indicator controls and notifications', subsection(usage,'## Program status').split('A shell function can report status too:')[0])}
${details('Notification configuration', subsection(configuration,'## Notifications'), 'CONFIGURATION.md')}${sourceLink('CONFIGURATION.md','#notifications')}`,
  },
  {
    id: 'remote', title: 'Remote access', content: `
<p class="section-lead">Connect a native Compi client to an SSH host running a matching daemon.</p>
${code('compi --connect USER@HOST:PORT')}
<p>Replace <code>USER</code>, <code>HOST</code> and <code>PORT</code> with your connection. The remote host must provide <code>compi-daemon</code> on <code>PATH</code>. Use a matching client/server release; SSH authentication and host-key checks remain part of the connection.</p>
<p>Reconnect to the same instance to reach the existing workspace. Reconnecting does not itself restart running shells. SSH transport is not automatic cross-machine workspace synchronization or a finished mobile app.</p>
${details('Remote launch and diagnostic client', subsection(usage,'## Remote connections'))}${sourceLink('USAGE.md','#remote-connections')}`,
  },
  {
    id: 'monitor', title: 'Monitor', content: `
<p class="section-lead">Inspect the machine running the workspace’s server.</p>
${code('compi monitor\ncompi monitor sources\ncompi --json monitor totals --history 5m\ncompi --json monitor list --group')}
<p>Overview, Processes, CPU, Memory, GPU, Disk and Network show the selected source. On Windows, choose the host or a WSL 2 distribution; their counters and PIDs are kept separate. An SSH-connected window monitors its remote host.</p>
<p>Select a process for its details, parent/children and recent resource history. <strong>Open terminal</strong> returns to its Compi terminal when available. <strong>Quit…</strong> and <strong>Force quit…</strong> both confirm and recheck process identity. Unavailable values are not zero.</p>
${details('Monitor pages, sampling and source selection', [bullet('Monitor'),bullet('Monitor a WSL distribution')].join('\n\n'))}
${details('Process inspection, quitting and saved columns', [bullet('Inspect and quit processes'),bullet('Monitor columns')].join('\n\n'))}${sourceLink('USAGE.md')}`,
  },
  {
    id: 'updates', title: 'Updates and repair', content: `
<p class="section-lead">Check for updates, understand restarts and recover an installation.</p>
${code('compi update --check')}
<p>Use <strong>Settings → Updates</strong> to check, download and install. Nothing installs or restarts a daemon without your consent.</p>
<div class="notice"><strong>Updating to 0.5.0 restarts the local daemon.</strong><p>Running shells end. Save your work first. Workspace format 8 carries over, but protocol 35 replaces 0.4.x’s protocol 34. The local updater does not restart remote daemons.</p><p>Windows users on 0.3.0 or earlier need to run the rebuilt 0.5.0 Setup once; the older helper cannot replace itself.</p></div>
${details('Update flow and activation recovery', subsection(installation,'## Updates'), 'INSTALLATION.md')}
${details('Updating from a terminal', subsection(usage,'### Updating from the terminal'))}
<h3>Repair and removal</h3>${markdown(subsection(installation,'## Repair and removal'), 'INSTALLATION.md')}
<p><a href="https://github.com/cloudboy-jh/compi/releases/tag/v0.5.0">Read the exact release notes before upgrading ↗</a></p>${sourceLink('INSTALLATION.md')}`,
  },
  {
    id: 'troubleshooting', title: 'Troubleshooting', content: `
<p class="section-lead">Start with the affected environment and preserve the evidence.</p>
<h3>Windows cannot start a shell</h3><p>Confirm WSL2 is installed and the intended distribution starts. For a portable install, keep the entire archive together: the daemon requires its bundled terminal runtime. Use Setup’s repair path for installation problems.</p>
<h3>A pane is disconnected or already attached</h3><p>Use <strong>Reconnect window</strong> from the palette. It does not restart shells or steal another window’s attachment. Inspect <code>compi --json pane show</code> or open Diagnostics for the error. A process that ended is not restored merely by reconnecting.</p>
<h3>A browser page will not load</h3><p>Check the address and that the local server is listening, then use Retry. The Windows browser needs WebView2; browser/media behavior on macOS remains visually unqualified in 0.5.0.</p>
<h3>A file changed outside Compi</h3><p>Use the editor’s Reload / Keep mine / Overwrite choices deliberately. Recover unsaved buffers through <strong>Recover unsaved edits…</strong> in the palette. Do not discard a conflict just to clear the notice.</p>
<h3>A notification makes no sound</h3><p>Check Sound and delivery in Notifications, preview with Play, then check Windows notification sounds and quiet modes. macOS has no notification sound in 0.5.0. Supporting programs must report status; ordinary output does not create an event.</p>
<h3>Collect a useful bug report</h3><ul><li>Compi version, operating system and whether the affected shell/files are on the host, WSL or SSH.</li><li>The exact action, expected result, actual result and a short reproduction.</li><li><strong>Settings → Advanced → Performance → Copy diagnostics</strong>, or the palette’s Diagnostics action.</li><li>Relevant logs only, with tokens, private paths and other sensitive information removed.</li></ul>
<p>Windows repair logs: <code>%LOCALAPPDATA%\\Compi\\doctor.log</code>. Setup logs are <code>installer.log</code> and <code>installer-msi.log</code> there. The update log is <code>.compi-update/update.log</code> in the install folder.</p>
<p><a class="text-link" href="https://github.com/cloudboy-jh/compi/issues">Report an issue on GitHub ↗</a></p>`,
  },
];
const navigation = sections.map(section=>`<a href="#${section.id}" data-doc-link="${section.id}">${escape(section.title)}</a>`).join('\n');
const content = sections.map(section=>`<section class="docs-section" id="${section.id}" data-doc-section><h2>${escape(section.title)}<a class="heading-link" href="#${section.id}" aria-label="Link to ${escape(section.title)}">#</a></h2>${section.content}</section>`).join('\n');
let head = index.match(/<head>[\s\S]*?<\/head>/)?.[0];
assert(head, 'Homepage head missing');
head = head.replace(/<title>[\s\S]*?<\/title>/, `<title>Compi documentation · ${version}</title>`)
  .replace(/<meta name="description"[^>]+>/, '<meta name="description" content="Install and use Compi: workspaces, editing, browser panes, agents, CLI reference, notifications and troubleshooting.">')
  .replace(/<meta property="og:title"[^>]+>/, `<meta property="og:title" content="Compi documentation · ${version}">`)
  .replace('</head>', '<link rel="stylesheet" href="docs.css">\n</head>');
const themeButton = index.match(/<button class="page-theme-toggle[\s\S]*?<\/button>/)?.[0];
assert(themeButton, 'Shared theme button missing');
const header = `<header class="site-header"><div class="header-inner wrap"><a class="brand" href="/" aria-label="Compi home"><img src="assets/compi-icon.png?v=neutral-eye" width="34" height="34" alt="">Compi</a><nav aria-label="Main navigation"><a class="docs-home-link" href="/">Home</a><a class="docs-header-link" href="/docs.html" aria-current="page">Docs</a><a href="https://github.com/cloudboy-jh/compi"><img class="github" src="assets/mark-github.svg" width="16" height="16" alt="">GitHub</a>${themeButton}</nav></div></header>`;
const html = `<!doctype html>\n<html lang="en" data-theme="dark">\n${head}\n<body class="docs-page"><a class="skip" href="#docs-main">Skip to documentation</a>\n${header}\n<div class="docs-shell wrap"><aside class="docs-sidebar" aria-label="Documentation tools"><div class="docs-search js-only"><label for="docs-search">Search docs</label><div class="search-field"><input id="docs-search" type="search" placeholder="Files, shortcuts, commands…" autocomplete="off" aria-controls="docs-main" aria-describedby="search-status"><button type="button" id="clear-search" aria-label="Clear search" hidden>×</button></div><p id="search-status" role="status" aria-live="polite">Type to filter sections. Press / to search.</p></div><details class="docs-contents" id="docs-contents" open><summary>Contents</summary><nav aria-label="Documentation sections">${navigation}</nav></details><a class="docs-source" href="${repository}/docs/user/USAGE.md">View release source ↗</a></aside><main id="docs-main"><div class="docs-title"><p class="eyebrow">Documentation · ${version}</p><h1>Use Compi.</h1><p>A task-focused guide to the released app. Detailed behavior and the CLI catalogue come from the pinned <a href="https://github.com/cloudboy-jh/compi/releases/tag/${ref}">${ref} release</a>, not newer development work.</p><div class="source-badges"><a href="${repository}/docs/user/INSTALLATION.md">Installation source ↗</a><a href="${repository}/docs/user/USAGE.md">Usage source ↗</a><a href="${repository}/docs/user/CONFIGURATION.md">Configuration source ↗</a></div></div><div class="no-results" id="no-results" hidden><h2>No matching sections</h2><p>Try a shorter term, a feature name or a CLI command.</p><button id="reset-search" type="button">Clear search</button></div>${content}<div class="docs-provenance"><p>Sources pinned to <code>${escape(catalogue.commit)}</code>.</p><p>Architecture and development documentation remain <a href="${repository}/docs/dev/DEVELOPMENT.md">in the repository</a>.</p></div></main></div><footer><div class="wrap footer-inner"><div class="footer-brand"><a class="brand" href="/">Compi</a><span>Open source · MIT</span></div><div class="footer-links"><a href="/#downloads">Downloads</a><a href="/docs.html">Documentation</a><a href="https://github.com/cloudboy-jh/compi">GitHub</a><a href="https://github.com/cloudboy-jh/compi/releases/tag/${ref}">Release ${version}</a></div></div></footer><script src="theme.js" defer></script><script src="docs.js" defer></script></body></html>\n`;
if (process.argv.includes('--check')) {
  assert.equal(await readNormalized(join(root,'docs.html')), html, 'docs.html is stale; run npm run build');
  console.log(`Docs up to date: ${sections.length} sections, ${catalogue.entries.length} source-derived CLI entries.`);
} else {
  await writeFile(join(root,'docs.html'),html);
  console.log(`Generated docs.html: ${sections.length} sections, ${catalogue.entries.length} source-derived CLI entries.`);
}
