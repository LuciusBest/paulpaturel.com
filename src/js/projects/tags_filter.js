/*
  tags_filter.js
  - Handles project filtering via the topper tag chips.
  - Single-select filter: clicking a tag toggles it active and filters projects.
  - Preserves scroll position when filters change and emits a change event.
*/

(function () {
  if (window.__tagsFilterInitialized) return;
  window.__tagsFilterInitialized = true;

  const TAGS_CONTAINER_SELECTOR = '#toperTags';
  const PROJECT_SELECTOR = '.project_container[data-project], .project_container[data-project-key]';
  const FILTERED_CLASS = 'is-filtered';
  const ACTIVE_CLASS = 'is-active';

  const resolveAssetVersionToken = () => {
    const scope = typeof window !== 'undefined' ? window : null;
    if (!scope) return '';
    const sv = scope.SiteVersion;
    if (sv && typeof sv === 'object') {
      if (typeof sv.cacheToken === 'string' && sv.cacheToken.trim()) return sv.cacheToken.trim();
      if (typeof sv.updatedAt === 'string' && sv.updatedAt.trim()) return sv.updatedAt.trim();
      if (typeof sv.timestamp === 'string' && sv.timestamp.trim()) return sv.timestamp.trim();
      if (typeof sv.semantic === 'string' && sv.semantic.trim()) return sv.semantic.trim();
    }
    if (typeof scope.__assetVersion === 'string' && scope.__assetVersion.trim()) {
      return scope.__assetVersion.trim();
    }
    return '';
  };

  const assetVersionSuffix = (() => {
    const token = resolveAssetVersionToken();
    return token ? `?v=${encodeURIComponent(token)}` : '';
  })();

  const tagsHost = document.querySelector(TAGS_CONTAINER_SELECTOR);
  if (!tagsHost) return;

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
      getViewportHeight: () =>
        window.innerHeight || (scrollElement ? scrollElement.clientHeight : 0) || 0,
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

  const normalizeTag = (s) => {
    if (!s) return '';
    const collapsed = String(s).trim().replace(/\s+/g, ' ');
    const stripped = collapsed
      .normalize('NFD')
      .replace(/[\u0300-\u036f]+/g, '');
    return stripped.toLowerCase();
  };

  const collectTagSet = (entry) => {
    const tags = new Set();
    const add = (label) => {
      const norm = normalizeTag(label);
      if (norm) tags.add(norm);
    };

    if (entry && typeof entry === 'object' && Array.isArray(entry.tags)) {
      entry.tags.forEach(add);
    } else if (typeof entry === 'string') {
      // legacy fallback: parse inline <tag>...</tag>
      const re = /<tag>([\s\S]*?)<\/tag>/gi;
      let m;
      while ((m = re.exec(entry))) add(m[1] || '');
    } else if (entry && typeof entry === 'object' && entry.text) {
      const re = /<tag>([\s\S]*?)<\/tag>/gi;
      let m;
      while ((m = re.exec(entry.text))) add(m[1] || '');
    }

    return tags;
  };

  let projectTags = new Map();
  let activeTag = null;
  let currentRenderedTags = [];

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
    const projects = document.querySelectorAll(PROJECT_SELECTOR);
    projects.forEach((el) => {
      const key = getProjectKey(el);
      if (!key) return;
      const entry = texts && texts[key];
      const set = collectTagSet(entry);
      projectTags.set(key, set);
    });
  };

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
    Promise.resolve().then(() => {
      window.dispatchEvent(new Event('resize'));
      emitFilterChange();
    });
  };

  const wake = () => {
    try { window.dispatchEvent(new Event('ui:activity')); } catch (_) {}
  };

  const renderTags = (labels) => {
    currentRenderedTags = Array.isArray(labels) ? labels.slice() : [];
    tagsHost.innerHTML = '';
    if (!currentRenderedTags.length) {
      tagsHost.setAttribute('aria-hidden', 'true');
      return;
    }
    tagsHost.removeAttribute('aria-hidden');
    currentRenderedTags.forEach((label) => {
      const norm = normalizeTag(label);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'toper__tag tag';
      btn.textContent = label;
      btn.setAttribute('data-tag', norm);
      const isOn = activeTag && activeTag === norm;
      btn.classList.toggle(ACTIVE_CLASS, !!isOn);
      btn.setAttribute('aria-pressed', isOn ? 'true' : 'false');

      const activate = (ev) => {
        if (ev.type === 'keydown') {
          const key = ev.key;
          if (key !== 'Enter' && key !== ' ') return;
          ev.preventDefault();
        } else {
          ev.preventDefault();
        }
        toggleTag(norm);
      };

      btn.addEventListener('click', activate);
      btn.addEventListener('keydown', activate);
      btn.addEventListener('pointerover', wake);
      btn.addEventListener('focus', wake);
      btn.addEventListener('mousedown', (ev) => {
        if (ev.button === 0) ev.preventDefault();
      });

      tagsHost.appendChild(btn);
    });
  };

  const syncRenderedState = () => {
    const buttons = tagsHost.querySelectorAll('.toper__tag');
    buttons.forEach((btn) => {
      const norm = btn.getAttribute('data-tag') || '';
      const isOn = activeTag && activeTag === norm;
      btn.classList.toggle(ACTIVE_CLASS, !!isOn);
      btn.setAttribute('aria-pressed', isOn ? 'true' : 'false');
    });
  };

  const toggleTag = (tagNorm) => {
    const anchor = captureScrollAnchor();
    activeTag = activeTag === tagNorm ? null : tagNorm;
    syncRenderedState();
    applyFilter();
    if (anchor) restoreScrollAnchor(anchor);
  };

  const onToperUpdate = (event) => {
    const detail = event && event.detail ? event.detail : {};
    const labels = Array.isArray(detail.tags) ? detail.tags : [];
    renderTags(labels);
    syncRenderedState();
  };

  const loader = (window.ProjectTexts && typeof window.ProjectTexts.load === 'function')
    ? window.ProjectTexts.load('en')
    : fetch(`data/projectTexts.json${assetVersionSuffix}`).then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      });

  loader
    .then((texts) => {
      buildProjectTags(texts);
      applyFilter();
      emitFilterChange();
    })
    .catch((err) => {
      console.error('tags_filter: failed to load projectTexts.json', err);
      emitFilterChange();
    });

  window.addEventListener('toper:update', onToperUpdate);
  renderTags([]);
})();
