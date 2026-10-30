(() => {
  'use strict';
  const root = document.documentElement;
  const button = document.getElementById('page-theme-toggle');
  if (!button) return;
  function apply(theme) {
    const warm = theme === 'warm-carbon' || theme === 'light';
    root.dataset.theme = warm ? 'warm-carbon' : 'dark';
    const label = `Switch to ${warm ? 'Neutral' : 'Warm Carbon'}`;
    button.setAttribute('aria-label', label);
    button.setAttribute('aria-pressed', String(warm));
    button.title = label;
    document.querySelector('meta[name="theme-color"]').content = warm ? '#171613' : '#151515';
  }
  apply(root.dataset.theme);
  button.addEventListener('click', () => {
    apply(root.dataset.theme === 'warm-carbon' ? 'dark' : 'warm-carbon');
    try { localStorage.setItem('compi-page-theme', root.dataset.theme); } catch { /* Storage is optional. */ }
  });
  root.classList.add('enhanced');
})();
