'use strict';

// All visuals are actual supplied screenshots. Scroll changes the selected view,
// never the screenshot's colors, content, or relationship to a CLI invocation.
const scenes = {
  research: {
    src: 'assets/gpui-research.png',
    alt: 'GPUI Markdown notes beside browser documentation inside Compi',
    caption: 'Markdown notes beside a live documentation page.',
    count: '01 / 03',
  },
  agent: {
    src: 'assets/agent-diff-terminal.png',
    alt: 'An agent reviewing notification changes beside a code diff and terminal inside Compi',
    caption: 'Agent review, code changes and a running terminal.',
    count: '02 / 03',
  },
  monitor: {
    src: 'assets/monitor-and-build.png',
    alt: 'Compi host resource Monitor beside terminal compilation output',
    caption: 'Live host resources beside a terminal build.',
    count: '03 / 03',
  },
};

const root = document.documentElement;

const commands = [
  'compi --json pane list',
  'compi split --right',
  'compi browse http://localhost:3000',
].join('\n');
const copyButton = document.getElementById('copy-example');
copyButton.addEventListener('click', async () => {
  const status = document.getElementById('copy-status');
  try {
    await navigator.clipboard.writeText(commands);
    copyButton.textContent = 'Copied';
    status.textContent = 'Commands copied.';
  } catch {
    status.textContent = 'Clipboard unavailable. Select and copy the commands above.';
  }
});

const sceneImage = document.getElementById('scene-image');
const sceneLink = document.getElementById('scene-full-size');
const sceneCaption = document.getElementById('scene-caption');
const sceneCount = document.getElementById('scene-count');
const sceneSteps = [...document.querySelectorAll('[data-scene]')];
const sceneNav = [...document.querySelectorAll('[data-scene-link]')];
const commandSteps = [...document.querySelectorAll('[data-command-step]')];
const commandRows = [...document.querySelectorAll('[data-command-row]')];
const chapters = [...document.querySelectorAll('section.chapter')];
const chapterLinks = [...document.querySelectorAll('.chapter-link')];
const desktop = matchMedia('(min-width: 901px) and (min-height: 701px)');
const decodedImages = new Map();
let desiredScene = null;

function loadScene(name) {
  if (!decodedImages.has(name)) {
    const preload = new Image();
    preload.src = scenes[name].src;
    decodedImages.set(name, preload);
  }
  return decodedImages.get(name);
}

async function selectScene(name) {
  if (name === desiredScene) return;
  desiredScene = name;
  const scene = scenes[name];
  try {
    await loadScene(name).decode();
    if (desiredScene !== name) return;
    sceneImage.src = scene.src;
    sceneImage.alt = scene.alt;
    sceneLink.href = scene.src;
    sceneCaption.textContent = scene.caption;
    sceneCount.textContent = scene.count;
    sceneSteps.forEach(step => { step.dataset.active = String(step.dataset.scene === name); });
    sceneNav.forEach(link => {
      if (link.dataset.sceneLink === name) link.setAttribute('aria-current', 'step');
      else link.removeAttribute('aria-current');
    });
  } catch {
    // Leave the previous real image intact; each step also has its own image link.
    desiredScene = null;
  }
}

function nearestToReadingLine(elements) {
  const target = innerHeight * 0.48;
  return elements.reduce((nearest, element) => {
    const box = element.getBoundingClientRect();
    const distance = Math.abs(box.top + box.height * 0.5 - target);
    return !nearest || distance < nearest.distance ? { element, distance } : nearest;
  }, null)?.element;
}

function updateReadingState() {
  if (desktop.matches) {
    const step = nearestToReadingLine(sceneSteps);
    if (step) selectScene(step.dataset.scene);
  }
  const command = nearestToReadingLine(commandSteps);
  if (command) commandRows.forEach(row => row.classList.toggle('active', row.dataset.commandRow === command.dataset.commandStep));
  const activeChapter = chapters.find(section => {
    const box = section.getBoundingClientRect();
    return box.top <= 155 && box.bottom > 155;
  });
  chapterLinks.forEach(link => {
    if (activeChapter && link.hash === `#${activeChapter.id}`) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
}

let scheduled = false;
function scheduleUpdate() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    updateReadingState();
  });
}
// Native scroll and hash links remain in charge. No wheel/key interception,
// scroll snapping, forced scrolling, or automatic image cycling.
addEventListener('scroll', scheduleUpdate, { passive: true });
addEventListener('resize', scheduleUpdate, { passive: true });
addEventListener('hashchange', scheduleUpdate);
desktop.addEventListener('change', scheduleUpdate);

const demo = document.getElementById('notification-demo');
if ('IntersectionObserver' in window) {
  const visibility = new IntersectionObserver(entries => {
    if (!entries[0].isIntersecting && !demo.paused) demo.pause();
  });
  visibility.observe(demo);
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) demo.pause();
});

root.classList.add('enhanced');
scheduleUpdate();
