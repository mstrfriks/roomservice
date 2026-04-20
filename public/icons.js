(function () {
  'use strict';

  const ICON_PATHS = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V20a1 1 0 0 0 1 1H10v-6h4v6h3.5a1 1 0 0 0 1-1V9.5"/>',
    settings: '<path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.32-1.915"/><circle cx="12" cy="12" r="3"/>',
    'arrow-left': '<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',
    check: '<path d="m5 12 4.2 4.2L19 6.4"/>',
    bell: '<path d="M10.3 21a2 2 0 0 0 3.4 0"/><path d="M6 8.5a6 6 0 1 1 12 0c0 6 2.5 7 2.5 7h-17s2.5-1 2.5-7"/>',
    crown: '<path d="m3 18 1.8-9 4.2 4 3-6 3 6 4.2-4L21 18Z"/><path d="M4 18h16v3H4z"/>',
    bed: '<path d="M3 18v-7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7"/><path d="M3 14h18"/><path d="M7 10V8a2 2 0 0 1 2-2h3"/><path d="M3 21v-3"/><path d="M21 21v-3"/>',
    monitor: '<rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M9 20h6"/><path d="M12 16v4"/>',
    dining: '<path d="M4 3v8"/><path d="M7 3v8"/><path d="M4 7h3"/><path d="M5.5 11v10"/><path d="M15 3v18"/><path d="M18.5 3c0 2.5-1.5 4-3.5 4"/>',
    sofa: '<path d="M5 12V9a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v3"/><path d="M4 12h16a1 1 0 0 1 1 1v4H3v-4a1 1 0 0 1 1-1Z"/><path d="M5 17v2"/><path d="M19 17v2"/>',
    kitchen: '<path d="M4 8h16"/><path d="M7 8V6a5 5 0 0 1 10 0v2"/><path d="M6 8v9a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8"/>',
    wellness: '<path d="M12 20c4-2.3 6-5.3 6-9a4 4 0 0 0-4-4c-.9 0-1.8.3-2.5.8A4.7 4.7 0 0 0 9 7a4 4 0 0 0-4 4c0 3.7 2 6.7 7 9Z"/><path d="M12 8v7"/><path d="M9.5 12.5h5"/>',
    gym: '<path d="M3 10h3v4H3z"/><path d="M18 10h3v4h-3z"/><path d="M6 9h2v6H6z"/><path d="M16 9h2v6h-2z"/><path d="M8 12h8"/>',
    pool: '<path d="M3 17c1.5 1 2.5 1 4 0s2.5-1 4 0 2.5 1 4 0 2.5-1 4 0"/><path d="M7 14V8a5 5 0 0 1 10 0"/><path d="M9.5 14V9.5"/><path d="M12 14V8"/><path d="M14.5 14v-4.5"/>',
    coffee: '<path d="M5 8h10v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4Z"/><path d="M15 10h1.5a2.5 2.5 0 0 1 0 5H15"/><path d="M8 4c0 1-1 1.5-1 2.5"/><path d="M12 4c0 1-1 1.5-1 2.5"/>',
    tea: '<path d="M5 9h11v5a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4Z"/><path d="M16 10.5h1a2 2 0 1 1 0 4h-1"/><path d="M8.5 5.5c0 1-1 1.5-1 2.5"/>',
    milk: '<path d="M10 3h4l1 3v12a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2V6Z"/><path d="M10 7h5"/><path d="M9 10h7"/>',
    chocolate: '<rect x="5" y="4" width="14" height="16" rx="2"/><path d="M9.5 4v16"/><path d="M14.5 4v16"/><path d="M5 9.5h14"/><path d="M5 14.5h14"/>',
    water: '<path d="M12 3c3 3.7 5 6.4 5 9a5 5 0 0 1-10 0c0-2.6 2-5.3 5-9Z"/>',
    juice: '<path d="M8 3h8"/><path d="M12 3v4"/><path d="M7 7h10l-1 11a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2Z"/><path d="M9 11h6"/>'
  };

  const LEGACY_MAP = {
    '\u{1F451}': 'crown',
    '\u{1F6CF}\uFE0F': 'bed',
    '\u{1F5A5}\uFE0F': 'monitor',
    '\u{1F37D}\uFE0F': 'dining',
    '\u{1F6CB}\uFE0F': 'sofa',
    '\u{1F373}': 'kitchen',
    '\u{1F9D8}': 'wellness',
    '\u{1F3CB}\uFE0F': 'gym',
    '\u{1F3CA}': 'pool',
    '\u2615': 'coffee',
    '\u{1F95B}': 'milk',
    '\u{1F375}': 'tea',
    '\u{1F36B}': 'chocolate',
    '\u{1F4A7}': 'water',
    '\u{1F9C3}': 'juice',
    '\u{1F514}': 'bell',
    '\u{1F3E0}': 'home',
    '\u2699\uFE0F': 'settings'
  };

  function normalizeIconName(name, fallback) {
    const raw = String(name || '').trim();
    if (ICON_PATHS[raw]) return raw;
    if (LEGACY_MAP[raw]) return LEGACY_MAP[raw];
    return fallback || 'coffee';
  }

  function svg(name, title) {
    const icon = normalizeIconName(name, 'coffee');
    const titleMarkup = title ? '<title>' + String(title).replace(/[&<>"]/g, function (char) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char];
    }) + '</title>' : '';
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="' + (title ? 'false' : 'true') + '" focusable="false">' + titleMarkup + ICON_PATHS[icon] + '</svg>';
  }

  function markup(name, className, title) {
    const classes = className ? 'rs-icon ' + className : 'rs-icon';
    return '<span class="' + classes + '">' + svg(name, title) + '</span>';
  }

  function hydrate(root) {
    (root || document).querySelectorAll('[data-icon]').forEach(function (node) {
      const className = node.getAttribute('data-icon-class') || '';
      const title = node.getAttribute('data-icon-title') || '';
      node.innerHTML = svg(node.getAttribute('data-icon'), title);
      node.classList.add('rs-icon');
      if (className) node.classList.add(className);
    });
  }

  window.RoomServiceIcons = {
    names: Object.keys(ICON_PATHS),
    normalizeIconName: normalizeIconName,
    svg: svg,
    markup: markup,
    hydrate: hydrate
  };
})();
