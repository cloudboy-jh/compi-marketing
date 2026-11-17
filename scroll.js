'use strict';

// Copyable CLI commands and the header's current-section marker.
// Scrolling stays native: no wheel/key interception, snapping or forced scrolling.

const commands = [...document.querySelectorAll('.commands code')].map(code => code.textContent).join('\n');
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

const chapters = [...document.querySelectorAll('section.chapter')];
const chapterLinks = [...document.querySelectorAll('.chapter-link')];

function updateCurrentChapter() {
  const line = document.querySelector('.site-header').getBoundingClientRect().bottom + 80;
  const current = chapters.find(section => {
    const box = section.getBoundingClientRect();
    return box.top <= line && box.bottom > line;
  });
  chapterLinks.forEach(link => {
    if (current && link.hash === `#${current.id}`) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
}

let scheduled = false;
function scheduleUpdate() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    updateCurrentChapter();
  });
}
addEventListener('scroll', scheduleUpdate, { passive: true });
addEventListener('resize', scheduleUpdate, { passive: true });
addEventListener('hashchange', scheduleUpdate);

document.documentElement.classList.add('enhanced');
scheduleUpdate();
