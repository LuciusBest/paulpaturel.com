/*
  tags_filter.js
  - Turns right-overlay tags into interactive, accessible chips.
  - Single-select filter: clicking a tag toggles it active and filters projects.
  - Derives project tag sets from data/projectTexts.json (<tag> ... </tag> segments).
  - Resilient to overlay re-renders via MutationObserver.
*/

(function () {
  if (window.__tagsFilterInitialized) return;
  window.__tagsFilterInitialized = true;

  const OVERLAY_SELECTOR = '#text_overlay_container';
  const PROJECT_SELECTOR = '.project_container[data-project], .project_container[data-project-key]';
  const FILTERED_CLASS = 'is-filtered';
  const ACTIVE_CLASS = 'is-active';

  const overlay = document.querySelector(OVERLAY_SELECTOR);
  if (!overlay) return; // nothing to bind

  const getScrollContext = () => {
    const container = document.querySelector('.main_container');
    if (container) {
      return {
        getViewportTop: () => container.getBoundingClientRect().top,
        getViewportHeight: () => container.clientHeight || 0,
        getScrollTop: () => container.scrollTop || 0,
        setScrollTop: (value) => {
          container.scrollTop = value;
        },
        dispatchScroll: () => {
          try {
            container.dispatchEvent(new Event('scroll'));
          } catch (_) {}
        },
      };
    }

    const scrollElement =
      document.scrollingElement || document.documentElement || document.body || null;

    const getScrollTop = () => {
      if (typeof window.pageYOffset === 'number') return window.pageYOffset;
      if (scrollElement && typeof scrollElement.scrollTop === 'number') return scrollElement.scrollTop;
      return 0;
    };

    const setScrollTop = (value) => {
      if (scrollElement && typeof scrollElement.scrollTop === 'number') {
        scrollElement.scrollTop = value;
      }
      if (typeof window.scrollTo === 'function') {
        try {
          window.scrollTo({ top: value, behavior: 'auto' });
        } catch (_) {
          try {
            window.scrollTo(0, value);
          } catch (_) {}
        }
      }
    };

    return {
      getViewportTop: () => 0,
      getViewportHeight: () => window.innerHeight || (scrollElement ? scrollElement.clientHeight : 0) || 0,
      getScrollTop,
      setScrollTop,
      dispatchScroll: () => {
        try {
          window.dispatchEvent(new Event('scroll'));
        } catch (_) {}
      },
    };
  };

  const captureScrollAnchor = () => {
    const context = getScrollContext();
    const viewportTop = context.getViewportTop();
    const viewportHeight = context.getViewportHeight() || window.innerHeight || 0;
    if (!viewportHeight) return null;
    const viewportCenter = viewportTop + viewportHeight / 2;

    let anchor = null;
    let bestDistance = Infinity;

    const projects = Array.from(document.querySelectorAll(PROJECT_SELECTOR));
    projects.forEach((project) => {
      if (!project || !project.isConnected) return;
      if (project.classList.contains(FILTERED_CLASS)) return;
      const rect = project.getBoundingClientRect();
      if (!rect || rect.height <= 0) return;
      const mid = rect.top + rect.height / 2;
      const distance = Math.abs(mid - viewportCenter);
      if (distance < bestDistance) {
        bestDistance = distance;
        anchor = {
          el: project,
          relativeTop: rect.top - viewportTop,
          context,
        };
      }
    });

    return anchor;
  };

  const restoreScrollAnchor = (anchor) => {
    if (!anchor || !anchor.el || !anchor.el.isConnected) return;
    const ctx = anchor.context || getScrollContext();

    const adjust = () => {
      if (!anchor.el || !anchor.el.isConnected) return;
      if (anchor.el.classList && anchor.el.classList.contains(FILTERED_CLASS)) {
        ctx.dispatchScroll();
        return;
      }
      const viewportTop = ctx.getViewportTop();
      const rect = anchor.el.getBoundingClientRect();
      if (!rect || rect.height <= 0) {
        ctx.dispatchScroll();
        return;
      }
      const newRelativeTop = rect.top - viewportTop;
      const delta = newRelativeTop - anchor.relativeTop;
      if (Number.isFinite(delta) && Math.abs(delta) > 0.5) {
        const current = ctx.getScrollTop();
        if (Number.isFinite(current)) {
          ctx.setScrollTop(current + delta);
        }
      }
      ctx.dispatchScroll();
    };

    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(adjust);
    } else {
      setTimeout(adjust, 0);
    }
  };

  const getProjectKey = (el) => {
    if (!el) return '';
    const key = el.getAttribute('data-project-key') || el.getAttribute('data-project') || '';
    return String(key).trim();
  };

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

  const emitFilterChange = () => {
    try {
      window.dispatchEvent(
        new CustomEvent('projects:filter-change', {
          detail: { activeTag },
        })
      );
    } catch (_) {}
  };

  const buildProjectTags = (texts) => {
    projectTags = new Map();
    // Collect all existing projects from DOM
    const projects = document.querySelectorAll(PROJECT_SELECTOR);
    projects.forEach((el) => {
      const key = getProjectKey(el);
      if (!key) return;
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
      const key = getProjectKey(el);
      if (!key) return;
      const tags = projectTags.get(key) || new Set();
      const shouldHide = activeTag ? !tags.has(activeTag) : false;
      if (shouldHide) el.classList.add(FILTERED_CLASS);
      else el.classList.remove(FILTERED_CLASS);
    });
    // Nudge layout/observers after style changes
    Promise.resolve().then(() => {
      window.dispatchEvent(new Event('resize'));
      emitFilterChange();
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
    const anchor = captureScrollAnchor();
    activeTag = activeTag === tagNorm ? null : tagNorm;
    syncActiveChips();
    applyFilter();
    if (anchor) restoreScrollAnchor(anchor);
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

      // Wake idle UI on hover/focus over interactive chips
      const wake = () => {
        try { window.dispatchEvent(new Event('ui:activity')); } catch (_) {}
      };
      node.addEventListener('pointerover', wake);
      node.addEventListener('focus', wake);
    });

    // Reflect current activeTag
    syncActiveChips();
  };

  // Observe overlay for content changes and enhance chips accordingly
  const mo = new MutationObserver(() => {
    enhanceChips();
  });

  const init = () => {
    const loader = (window.ProjectTexts && typeof window.ProjectTexts.load === 'function')
      ? window.ProjectTexts.load('en')
      : fetch('data/projectTexts.json').then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        });

    loader
      .then((texts) => {
        buildProjectTags(texts);
        applyFilter(); // ensure initial state visible
        emitFilterChange();
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
        emitFilterChange();
      });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
