/*
  deeplink_projects.js
  - Permet d'ouvrir une URL avec un hash (#Cosma) et de faire défiler le portfolio
    directement jusqu'au projet correspondant.
  - Maintient l'URL à jour pendant le scroll sans modifier le hash tant que
    l'utilisateur n'a pas interagi, afin de préserver l'URL racine sur l'accueil.
*/

document.addEventListener('DOMContentLoaded', () => {
  const projects = Array.from(document.querySelectorAll('.project_container'));
  if (!projects.length) return;

  const mainContainer = document.querySelector('.main_container');

  const tidy = (value) => String(value || '').replace(/\s+/g, ' ').trim();

  const stripDiacritics = (value) => {
    if (!value) return '';
    let normal = value;
    try {
      normal = value.normalize('NFD');
    } catch (_) {
      // normalize can fail on older environments; fallback to raw string
    }
    return normal.replace(/[\u0300-\u036f]+/g, '');
  };

  const slugify = (raw) => {
    const base = stripDiacritics(tidy(raw));
    if (!base) return '';
    const cleaned = base
      .replace(/[^A-Za-z0-9]+/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^-+|-+$/g, '');
    return cleaned || '';
  };

  const slugEntries = new Map(); // lower-case slug -> { slug, el }
  const used = new Set(); // lower-case slug uniqueness

  projects.forEach((project, index) => {
    const rawKey = project.getAttribute('data-project-key');
    const rawName = project.getAttribute('data-project');
    const fallback = project.id || `project-${index + 1}`;
    let slug = slugify(rawKey || rawName || fallback);
    if (!slug) slug = `project-${index + 1}`;

    let candidate = slug;
    let suffix = 2;
    while (used.has(candidate.toLowerCase())) {
      candidate = `${slug}-${suffix}`;
      suffix += 1;
    }
    slug = candidate;

    used.add(slug.toLowerCase());
    project.dataset.hash = slug;
    if (!project.id) {
      project.id = slug;
    }
    slugEntries.set(slug.toLowerCase(), { slug, el: project });
  });

  const scrollToProject = (slug, behavior) => {
    if (!slug) return false;
    const entry = slugEntries.get(String(slug).toLowerCase());
    if (!entry) return false;

    const target = entry.el;
    const scrollBehavior = behavior || 'smooth';

    try {
      target.scrollIntoView({ behavior: scrollBehavior, block: 'start', inline: 'nearest' });
    } catch (_) {
      try {
        target.scrollIntoView(true);
      } catch (_) {}
    }
    return true;
  };

  const initialHashRaw = window.location.hash ? window.location.hash.slice(1) : '';
  let lastWrittenSlug = initialHashRaw || '';
  let currentSlug = initialHashRaw || '';
  let hashActivated = !!initialHashRaw;

  if (initialHashRaw) {
    const entry = slugEntries.get(initialHashRaw.toLowerCase());
    if (entry) {
      currentSlug = entry.slug;
      lastWrittenSlug = entry.slug;
      scrollToProject(entry.slug, 'auto');
    } else {
      currentSlug = '';
    }
  } else {
    currentSlug = '';
  }

  const writeHash = (slug) => {
    if (!slug) return;
    if (lastWrittenSlug === slug) return;
    lastWrittenSlug = slug;
    try {
      history.replaceState(null, '', `#${slug}`);
    } catch (_) {
      // Fallback for environments where replaceState is unavailable
      window.location.hash = slug;
    }
  };

  const applyActiveSlug = (slug) => {
    if (!slug) return;
    if (currentSlug === slug) return;
    currentSlug = slug;
    if (hashActivated) {
      writeHash(slug);
    }
  };

  const activateHashSync = () => {
    if (hashActivated) return;
    hashActivated = true;
    if (currentSlug && currentSlug !== lastWrittenSlug) {
      writeHash(currentSlug);
    }
  };

  if (!hashActivated) {
    const markActive = () => activateHashSync();
    const scrollSource = mainContainer || window;
    scrollSource.addEventListener('scroll', markActive, { once: true, passive: true });
    document.addEventListener('pointerdown', markActive, { once: true });
    document.addEventListener('keydown', markActive, { once: true });
    window.addEventListener('ui:activity', markActive, { once: true });
  }

  const ratios = new Map();
  projects.forEach((project) => ratios.set(project, 0));

  const chooseMostVisible = () => {
    let best = null;
    let bestRatio = 0;
    ratios.forEach((ratio, project) => {
      if (!project || !project.isConnected) return;
      if (project.classList && project.classList.contains('is-filtered')) return;
      if (ratio > bestRatio) {
        best = project;
        bestRatio = ratio;
      }
    });
    return bestRatio > 0 ? best : null;
  };

  const syncFromObserver = () => {
    const best = chooseMostVisible();
    if (!best) return;
    const slug = best.dataset && best.dataset.hash;
    if (!slug) return;
    applyActiveSlug(slug);
  };

  const thresholds = Array.from({ length: 101 }, (_, i) => i / 100);
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        ratios.set(entry.target, entry.intersectionRatio || 0);
      });
      syncFromObserver();
    },
    {
      root: mainContainer || null,
      threshold: thresholds,
    }
  );

  projects.forEach((project) => observer.observe(project));

  const scheduleSync = () => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(syncFromObserver);
    } else {
      setTimeout(syncFromObserver, 0);
    }
  };

  window.addEventListener('projects:filter-change', scheduleSync);

  window.addEventListener('hashchange', () => {
    const raw = window.location.hash ? window.location.hash.slice(1) : '';
    if (!raw) return;
    const entry = slugEntries.get(raw.toLowerCase());
    if (!entry) return;
    hashActivated = true; // user explicitly interacted with the address bar / link
    lastWrittenSlug = entry.slug;
    currentSlug = entry.slug;
    scrollToProject(entry.slug, 'smooth');
  });

  scheduleSync();
});
