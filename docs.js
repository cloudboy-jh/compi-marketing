(() => {
  'use strict';
  const input = document.getElementById('docs-search');
  const clear = document.getElementById('clear-search');
  const status = document.getElementById('search-status');
  const empty = document.getElementById('no-results');
  const reset = document.getElementById('reset-search');
  const main = document.getElementById('docs-main');
  const contents = document.getElementById('docs-contents');
  const mobile = matchMedia('(max-width: 900px)');
  const sections = [...document.querySelectorAll('[data-doc-section]')];
  const links = [...document.querySelectorAll('[data-doc-link]')];
  const entries = [...document.querySelectorAll('.cli-entry')];
  const groups = [...document.querySelectorAll('.cli-group')];
  const details = [...main.querySelectorAll('details')];
  const text = new Map([...sections, ...entries, ...details].map(element => [element, element.textContent.toLowerCase()]));
  let previousDetails = null;
  let queryActive = false;
  const contains = (element, words) => words.every(word => text.get(element).includes(word));

  function filter() {
    const query = input.value.trim().toLowerCase();
    const words = query.split(/\s+/).filter(Boolean);
    queryActive = words.length > 0;
    if (queryActive && !previousDetails) previousDetails = new Map(details.map(element => [element, element.open]));
    let matchingEntries = 0;
    const reference = document.getElementById('cli-reference');
    const referenceIntro = reference.querySelector('h2').textContent.toLowerCase();
    const matchWholeCatalogue = words.every(word => referenceIntro.includes(word));
    entries.forEach(entry => {
      entry.hidden = queryActive && !matchWholeCatalogue && !contains(entry, words);
      if (!entry.hidden) matchingEntries++;
    });
    groups.forEach(group => { group.hidden = ![...group.querySelectorAll('.cli-entry')].some(entry => !entry.hidden); });
    const matching = sections.filter(section => {
      let matches = !queryActive || contains(section, words);
      if (section === reference && queryActive) matches = matchingEntries > 0;
      section.hidden = !matches;
      const link = links.find(link => link.dataset.docLink === section.id);
      link.hidden = !matches;
      return matches;
    });
    if (queryActive) {
      details.forEach(detail => { detail.open = !detail.hidden && contains(detail, words); });
    } else if (previousDetails) {
      previousDetails.forEach((open, element) => { element.open = open; });
      previousDetails = null;
    }
    clear.hidden = !queryActive;
    empty.hidden = matching.length > 0;
    status.textContent = queryActive
      ? `${matching.length} matching section${matching.length === 1 ? '' : 's'} · ${matchingEntries} matching CLI entries`
      : 'Type to filter sections. Press / to search.';
    scheduleCurrent();
  }
  input.addEventListener('input', filter);
  function clearSearch(focus = true) {
    input.value = '';
    filter();
    if (focus) input.focus();
  }
  clear.addEventListener('click', () => clearSearch());
  reset.addEventListener('click', () => clearSearch());
  links.forEach(link => link.addEventListener('click', () => {
    if (queryActive) clearSearch(false);
    if (mobile.matches) contents.open = false;
  }));
  document.addEventListener('keydown', event => {
    const target = event.target;
    const editing = target instanceof HTMLElement && (target.matches('input, textarea, select') || target.isContentEditable);
    if (event.key === '/' && !editing && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      input.focus();
    } else if (event.key === 'Escape' && target === input) {
      if (input.value) clearSearch();
      else input.blur();
    }
  });
  const syncContents = () => { contents.open = !mobile.matches; };
  mobile.addEventListener('change', syncContents);
  syncContents();

  let scheduled = false;
  function scheduleCurrent() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      const visible = sections.filter(section => !section.hidden);
      let current = visible[0];
      for (const section of visible) if (section.getBoundingClientRect().top <= 180) current = section;
      links.forEach(link => {
        if (current && link.dataset.docLink === current.id) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    });
  }
  addEventListener('scroll', scheduleCurrent, { passive: true });
  addEventListener('resize', scheduleCurrent, { passive: true });
  main.addEventListener('toggle', scheduleCurrent, true);
  addEventListener('hashchange', scheduleCurrent);

  main.querySelectorAll('pre').forEach(pre => {
    const wrapper = document.createElement('div');
    wrapper.className = 'code-block';
    pre.before(wrapper);
    wrapper.append(pre);
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'code-copy';
    copy.textContent = 'Copy';
    copy.setAttribute('aria-label', 'Copy code block');
    copy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(pre.textContent.replace(/\n$/, ''));
        copy.textContent = 'Copied';
      } catch {
        copy.textContent = 'Select to copy';
      }
    });
    wrapper.prepend(copy);
  });
  document.documentElement.classList.add('enhanced');
  scheduleCurrent();
})();
