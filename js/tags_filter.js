/*
  tags_filter.js
  - Turns right-overlay tags into interactive, accessible chips.
  - Single-select filter: clicking a tag toggles it active and filters projects.
  - Derives project tag sets from js/projectTexts.json (<tag> ... </tag> segments).
  - Resilient to overlay re-renders via MutationObserver.
*/

(function () {
  if (window.__tagsFilterInitialized) return;
  window.__tagsFilterInitialized = true;

  const OVERLAY_SELECTOR = '#text_overlay_container';
  const PROJECT_SELECTOR = '.project_container[data-project]';
  const FILTERED_CLASS = 'is-filtered';
  const ACTIVE_CLASS = 'is-active';

  const overlay = document.querySelector(OVERLAY_SELECTOR);
  if (!overlay) return; // nothing to bind

  // Normalization: trim, collapse internal whitespace, lower-case; strip diacritics
  const normalizeTag = (s) => {
    if (!s) return '';
    const collapsed = String(s).trim().replace(/\s+/g, ' ');
    // Remove diacritics for robust matching
    // Strip combining marks after NFD to drop accents (broad browser support)
    const stripped = collapsed
      .normalize('NFD')
      .replace(/[\u0300-\u036f]+/g, '');
    return stripped.toLowerCase();
  };

  // Extract <tag>...</tag> tokens from a text blob, return Set of normalized labels
  const extractTags = (text) => {
    const tags = new Set();
    if (!text) return tags;
    // Simple non-greedy matching is sufficient for our JSON content
    const re = /<tag>([\s\S]*?)<\/tag>/gi;
    let m;
    while ((m = re.exec(text))) {
      const labelRaw = m[1] || '';
      const label = normalizeTag(labelRaw.replace(/\s+/g, ' '));
      if (label) tags.add(label);
    }
    return tags;
  };

  // Build project -> Set(tags)
  let projectTags = new Map();
  let activeTag = null; // normalized or null

  const buildProjectTags = (texts) => {
    projectTags = new Map();
    // Collect all existing projects from DOM
    const projects = document.querySelectorAll(PROJECT_SELECTOR);
    projects.forEach((el) => {
      const key = el.getAttribute('data-project');
      const entry = texts && texts[key];
      let text = '';
      if (typeof entry === 'string') text = entry;
      else if (entry && typeof entry === 'object') text = entry.text || '';
      const set = extractTags(text);
      projectTags.set(key, set);
    });
  };

  // Apply filtering to projects based on activeTag
  const applyFilter = () => {
    const projects = document.querySelectorAll(PROJECT_SELECTOR);
    projects.forEach((el) => {
      const key = el.getAttribute('data-project');
      const tags = projectTags.get(key) || new Set();
      const shouldHide = activeTag ? !tags.has(activeTag) : false;
      if (shouldHide) el.classList.add(FILTERED_CLASS);
      else el.classList.remove(FILTERED_CLASS);
    });
    // Nudge layout/observers after style changes
    Promise.resolve().then(() => {
      window.dispatchEvent(new Event('resize'));
    });
  };

  // For a chip element, derive its label (visible token text)
  const deriveChipLabel = (el) => {
    // If it's a wrapper .tag.highlight, use its full text (includes spaces)
    if (el.classList.contains('tag')) {
      // Normalize spaces within
      const raw = (el.textContent || '').replace(/\s+/g, ' ').trim();
      return normalizeTag(raw);
    }
    // Else assume single word highlight
    const raw = (el.textContent || '').trim();
    return normalizeTag(raw);
  };

  // Update all current chips to reflect activeTag
  const syncActiveChips = () => {
    const chips = overlay.querySelectorAll('.tag.highlight, .word.highlight');
    chips.forEach((chip) => {
      // Skip inner .word inside a .tag wrapper; the wrapper is the interactive node
      if (chip.classList.contains('word') && chip.closest('.tag.highlight')) return;
      const tagNorm = chip.getAttribute('data-tag') || deriveChipLabel(chip);
      chip.setAttribute('data-tag', tagNorm);
      const isOn = activeTag && tagNorm === activeTag;
      chip.setAttribute('aria-pressed', isOn ? 'true' : 'false');
      chip.classList.toggle(ACTIVE_CLASS, !!isOn);
    });
  };

  const toggleTag = (tagNorm) => {
    activeTag = activeTag === tagNorm ? null : tagNorm;
    syncActiveChips();
    applyFilter();
  };

  // Add semantics and interactions to chips in current overlay DOM
  const enhanceChips = () => {
    const nodes = overlay.querySelectorAll('.tag.highlight, .word.highlight');
    nodes.forEach((node) => {
      // Interact only on wrapper if present
      if (node.classList.contains('word') && node.closest('.tag.highlight')) return;

      // Semantics
      if (!node.hasAttribute('role')) node.setAttribute('role', 'button');
      if (!node.hasAttribute('tabindex')) node.setAttribute('tabindex', '0');
      const tagNorm = deriveChipLabel(node);
      node.setAttribute('data-tag', tagNorm);
      node.setAttribute('aria-pressed', activeTag && activeTag === tagNorm ? 'true' : 'false');

      // Avoid double-binding
      if (node.__chipBound) return;
      node.__chipBound = true;

      const onActivate = (ev) => {
        // Prevent the global right-side click toggle in dynamicTextOverlay
        ev.stopPropagation();
        if (ev.type === 'keydown') {
          const e = ev;
          const key = e.key;
          if (key !== 'Enter' && key !== ' ') return;
          e.preventDefault();
        }
        const label = node.getAttribute('data-tag') || deriveChipLabel(node);
        toggleTag(label);
      };

      node.addEventListener('click', onActivate);
      node.addEventListener('keydown', onActivate);
    });

    // Reflect current activeTag
    syncActiveChips();
  };

  // Observe overlay for content changes and enhance chips accordingly
  const mo = new MutationObserver(() => {
    enhanceChips();
  });

  const init = () => {
    // Build project tag map from JSON
    fetch('js/projectTexts.json')
      .then((r) => r.json())
      .then((texts) => {
        buildProjectTags(texts);
        applyFilter(); // ensure initial state visible
        // Observe overlay subtree
        mo.observe(overlay, { childList: true, subtree: true });
        // Enhance any existing chips
        enhanceChips();
      })
      .catch((err) => {
        console.error('tags_filter: failed to load projectTexts.json', err);
        // Even if JSON fails, enable chip semantics so user still gets hover/active feedback
        mo.observe(overlay, { childList: true, subtree: true });
        enhanceChips();
      });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
