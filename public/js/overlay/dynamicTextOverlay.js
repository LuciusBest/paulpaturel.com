/*
  dynamicTextOverlay.js
  - Affiche un texte contextuel superposé pour le .project_container le plus visible.
    • Charge le texte et les mots à surligner depuis "data/projectTexts.json".
    • Utilise IntersectionObserver avec des seuils fins pour suivre le projet le plus visible
      et mettre à jour le texte en conséquence.
  - Animation d'apparition des mots : au clic, alterne l'affichage des mots non surlignés
    de manière échelonnée ; les mots surlignés restent visibles.
  - Morphing du nom à gauche : au clic sur l'overlay gauche, anime lettre par lettre
    entre les variantes compacte et complète (ex. « PAUL » ↔ « PATUREL »).
  - Nettoie les timeouts lors des changements d'état et empêche la propagation d'événements si nécessaire.
*/

document.addEventListener("DOMContentLoaded", () => {
  const textOverlay = document.getElementById("text_overlay_container");
  const leftOverlay = document.getElementById("text_overlay_container_left");
  const toperBioSlot = document.getElementById("toperBio");
  const toperTitle = document.getElementById("toperTitle");
  const toperTitleText = document.getElementById("toperTitleText");
  const toperHeader = document.getElementById("toper");

  let toggleWords = () => {};
  let toggleLetters = () => {};
  let openLeftBio = () => {};
  try { document.documentElement.setAttribute('lang', 'en'); } catch (_) {}
  if (toperTitle) {
    try { toperTitle.setAttribute('aria-controls', 'text_overlay_container'); } catch (_) {}
    try { toperTitle.setAttribute('aria-expanded', 'false'); } catch (_) {}
    try { toperTitle.setAttribute('type', 'button'); } catch (_) {}
    toperTitle.disabled = true;
  }

  let toperHeightRaf = null;
  const refreshToperHeight = () => {
    toperHeightRaf = null;
    if (!toperHeader) return;
    const height = toperHeader.offsetHeight;
    if (!Number.isFinite(height) || height <= 0) return;
    try {
      document.documentElement.style.setProperty('--toper-height', `${Math.round(height)}px`);
    } catch (_) {}
  };
  const scheduleToperHeightRefresh = () => {
    if (typeof requestAnimationFrame !== 'function') {
      refreshToperHeight();
      return;
    }
    if (toperHeightRaf !== null) return;
    toperHeightRaf = requestAnimationFrame(refreshToperHeight);
  };

  scheduleToperHeightRefresh();
  try { window.addEventListener('resize', scheduleToperHeightRefresh, { passive: true }); } catch (_) {}

  if (leftOverlay) {
    try { leftOverlay.style.position = 'static'; } catch (_) {}
    try { leftOverlay.style.width = 'auto'; } catch (_) {}
    try { leftOverlay.style.maxWidth = '30vw'; } catch (_) {}
    try { leftOverlay.style.pointerEvents = 'auto'; } catch (_) {}
    try { leftOverlay.style.margin = '0'; } catch (_) {}
    try { leftOverlay.style.padding = '0'; } catch (_) {}
    let siteVersion = {
      semantic: 'V1.00.00',
      timestamp: '1970/01/01/00/00',
      updatedAt: '',
      cacheToken: ''
    };
    const resolveSiteVersionToken = () => {
      if (!siteVersion || typeof siteVersion !== 'object') return '';
      const candidates = [
        siteVersion.cacheToken,
        siteVersion.updatedAt,
        siteVersion.timestamp,
        siteVersion.semantic
      ];
      for (let i = 0; i < candidates.length; i += 1) {
        const candidate = candidates[i];
        if (typeof candidate === 'string' && candidate.trim()) {
          return candidate.trim();
        }
      }
      return '';
    };
    const buildSiteVersionUrl = () => {
      const base = 'data/siteVersion.json';
      const token = resolveSiteVersionToken();
      return token ? `${base}?v=${encodeURIComponent(token)}` : base;
    };
    const states = ["PAUL", "PATUL", "PATURL", "PATUREL"];
    const highlightSet = new Set(["P", "A", "U", "L"]);
    const dt = 80;
    const BIO_DELAY = 450; // ms gap between name and bio animations
    let currentIndex = 0;
    let targetExpanded = false;
    let isNameHovered = false;
    let letterTimeouts = [];
    let bioTimeouts = [];
    let bioWordTimeouts = [];

    // Build structure: name container + bio container
    const nameEl = document.createElement("div");
    nameEl.id = "left_name";
    // Make the name focusable/clickable for accessibility
    try { nameEl.setAttribute('role', 'button'); nameEl.setAttribute('tabindex', '0'); } catch (_) {}
    const bioEl = document.createElement("div");
    bioEl.id = "left_bio";
    leftOverlay.innerHTML = "";
    leftOverlay.appendChild(bioEl);
    if (toperBioSlot) {
      toperBioSlot.innerHTML = "";
      toperBioSlot.appendChild(nameEl);
      toperBioSlot.appendChild(leftOverlay);
    } else {
      leftOverlay.appendChild(nameEl);
    }

    const clearBioTimeouts = () => {
      bioTimeouts.forEach(clearTimeout);
      bioTimeouts = [];
      bioWordTimeouts.forEach(clearTimeout);
      bioWordTimeouts = [];
    };

    const hideAllBioTokens = () => {
      const tokens = bioEl.querySelectorAll('.word, .space');
      tokens.forEach((span) => { span.style.display = 'none'; });
      const breaks = bioEl.querySelectorAll('br');
      breaks.forEach((br) => { br.style.display = 'none'; });
    };

    const flagBioVisibility = (expanded) => {
      try { leftOverlay.setAttribute('aria-hidden', expanded ? 'false' : 'true'); } catch (_) {}
      try { bioEl.style.pointerEvents = expanded ? 'auto' : 'none'; } catch (_) {}
    };

    const applyBioLayoutState = (expanded) => {
      const method = expanded ? 'add' : 'remove';
      try { leftOverlay.classList[method]('bio-expanded'); } catch (_) {}
      if (toperBioSlot) {
        try { toperBioSlot.classList[method]('bio-expanded'); } catch (_) {}
      }
    };

    // Simple word/space wrapper (no highlight), matching right overlay tokenization
    const wrapWords = (text) => {
      const parts = String(text).split(/(\s+)/);
      return parts
        .map((part, i) => {
          if (i % 2 === 1) return `<span class="space">${part}</span>`;
          if (!part) return "";
          return `<span class="word">${part}</span>`;
        })
        .join("");
    };

    // --- Version formatting helpers (English) ---
    const fmt = {
      monthShort: [
        'Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'
      ]
    };
    const tidy = (s) => String(s || '').trim();
    const parseLooseTimestamp = (rawTs, isoFallback) => {
      const iso = tidy(isoFallback);
      if (iso && !Number.isNaN(Date.parse(iso))) return new Date(iso);
      const s = tidy(rawTs);
      // Expect something like YYYY/MM/DD/HH/MM or YYYY/MM/DD/mm/ss (script inconsistency safe-guard)
      const bits = s.split('/')
        .map((x) => x.trim())
        .filter(Boolean);
      if (bits.length >= 3) {
        const Y = parseInt(bits[0], 10) || 1970;
        const M = Math.max(1, Math.min(12, parseInt(bits[1], 10) || 1));
        const D = Math.max(1, Math.min(31, parseInt(bits[2], 10) || 1));
        // Try to guess hour/min from remaining parts; tolerate missing hour
        const HH = bits.length >= 4 ? Math.max(0, Math.min(23, parseInt(bits[3], 10) || 0)) : 0;
        const mm = bits.length >= 5 ? Math.max(0, Math.min(59, parseInt(bits[4], 10) || 0)) : 0;
        try { return new Date(Y, M - 1, D, HH, mm); } catch (_) { /* noop */ }
      }
      const d = new Date(s);
      return Number.isNaN(d.getTime()) ? new Date(0) : d;
    };
    const formatDateShort = (date) => {
      const day = String(date.getDate()).padStart(2, '0');
      const month = fmt.monthShort[date.getMonth()] || '';
      const year = date.getFullYear();
      return `${day} ${month} ${year}`;
    };

    // Bio content (English only)
    const bioCopy = {
      s1:
        "Born in Paris, I moved to Lausanne to study at ECAL, where I am now based as a graphic designer.",
      s2:
        "I am available for commissions and collaborations, with a focus on typography, web design, 3D, and print.",
      contact: "Contact",
    };

    const renderBio = () => {
      // Respect line skips exactly
      const emailHTML = `<span class="word contact-chip" role="link" tabindex="0" data-no-custom-cursor="true" data-url="mailto:paulpaturel75@gmail.com">paulpaturel75@gmail.com</span>`;
      const instaHTML = `<span class="word contact-chip" role="link" tabindex="0" data-no-custom-cursor="true" data-url="https://www.instagram.com/_paul_pat_/">@_paul_pat_</span>`;
      const html = [
        // Next line after name
        "<br>",
        // First sentence
        wrapWords(bioCopy.s1),
        // Next line
        "<br>",
        // Second sentence
        wrapWords(bioCopy.s2),
        // Blank line after BIO
        "<br>",
        "<br>",
        // Contact block
        wrapWords(bioCopy.contact),
        "<br>",
        emailHTML,
        "<br>",
        instaHTML,
        // Meta paragraph with font credits + last updated date (with leading blank line)
        '<span class="left-meta">',
          '<br>',
          '<br>',
          // Line 1: font credit
          wrapWords('Font → Arzier by '),
          // Linked author token
          '<span class="word contact-chip" role="link" tabindex="0" data-no-custom-cursor="true" data-url="https://hugoscholl.ch/">Hugo Scholl</span>',
          '<span class="space"> </span>',
          // "- Interscript." as tokenized words
          wrapWords('- Interscript.'),
          '<br>',
          // Line 2 (last line): last updated with abbreviated month name
          (() => {
            const tsRaw = siteVersion && typeof siteVersion.timestamp === 'string' ? siteVersion.timestamp : '';
            const updatedAtRaw = siteVersion && typeof siteVersion.updatedAt === 'string' ? siteVersion.updatedAt : '';
            const date = parseLooseTimestamp(tsRaw, updatedAtRaw);
            const dateStr = formatDateShort(date);
            return wrapWords(`Last updated – ${dateStr}`);
          })(),
        '</span>',
      ].join("");
      bioEl.innerHTML = html;
      // Make contact chips behave like links without using <a> (avoids URL preview)
      const chips = bioEl.querySelectorAll('.contact-chip[data-url]');
      chips.forEach((chip) => {
        const url = chip.getAttribute('data-url');
        const open = (e) => {
          e.preventDefault();
          e.stopPropagation();
          try {
            if (url && url.startsWith('mailto:')) {
              window.location.href = url;
            } else {
              window.open(url, '_blank', 'noopener,noreferrer');
            }
          } catch (_) {}
        };
        chip.addEventListener('click', open);
        chip.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            open(e);
          }
        });
      });
      // Hide all words/spaces initially; they will reveal with animation
      hideAllBioTokens();
      if (!targetExpanded) {
        bioEl.style.display = 'none';
        bioEl.style.opacity = '0';
      }
    };

    const animateBio = (show) => {
      clearBioTimeouts();
      const words = Array.from(bioEl.querySelectorAll('span.word'));
      const dt = 40;
      if (show) {
        bioEl.style.display = 'block';
        bioEl.style.opacity = '1';
        scheduleToperHeightRefresh();
        hideAllBioTokens();
        words.forEach((span, index) => {
          const id = setTimeout(() => {
            span.style.display = 'inline';
            // Reveal adjacent spaces and any preceding line breaks
            let prev = span.previousElementSibling;
            while (prev) {
              if (prev.classList && prev.classList.contains('space')) {
                prev.style.display = 'inline';
              } else if (prev.tagName === 'BR') {
                prev.style.display = 'inline';
              } else {
                break;
              }
              prev = prev.previousElementSibling;
            }
            // Recompute topper height in sync with reveal
            scheduleToperHeightRefresh();
          }, index * dt);
          bioWordTimeouts.push(id);
        });
        const finalize = setTimeout(() => {
          scheduleToperHeightRefresh();
        }, words.length * dt + 20);
        bioWordTimeouts.push(finalize);
        return Math.max(words.length * dt, 250);
      }

      const ordered = words.slice().reverse();
      scheduleToperHeightRefresh();
      ordered.forEach((span, index) => {
        const id = setTimeout(() => {
          span.style.display = 'none';
          const prev = span.previousElementSibling;
          if (prev && prev.classList && prev.classList.contains('space')) {
            prev.style.display = 'none';
          }
        }, index * dt);
        bioWordTimeouts.push(id);
      });

      const total = Math.max(ordered.length * dt, 250);
      const fadeId = setTimeout(() => {
        bioEl.style.opacity = '0';
        const hide = setTimeout(() => {
          bioEl.style.display = 'none';
          hideAllBioTokens();
          scheduleToperHeightRefresh();
        }, 250);
        bioTimeouts.push(hide);
      }, total);
      bioWordTimeouts.push(fadeId);
      return total + 250;
    };

    const renderState = (index) => {
      const str = states[index];
      nameEl.innerHTML = str
        .split("")
        .map((ch) => {
          const cls = highlightSet.has(ch) ? "char highlight" : "char";
          return `<span class="${cls}">${ch}</span>`;
        })
        .join("");
    };

    // Initial rendering
    renderState(currentIndex);
    renderBio();
    const refreshBioWithVersion = () => {
      clearBioTimeouts();
      const wasExpanded = targetExpanded;
      renderBio();
      if (wasExpanded) {
        flagBioVisibility(true);
        applyBioLayoutState(true);
        setTimeout(() => animateBio(true), 10);
      } else {
        flagBioVisibility(false);
        applyBioLayoutState(false);
      }
    };
    const applySiteVersion = (payload) => {
      if (!payload || typeof payload !== 'object') return;
      let changed = false;
      const semantic = typeof payload.semantic === 'string' ? payload.semantic.trim() : '';
      const timestamp = typeof payload.timestamp === 'string' ? payload.timestamp.trim() : '';
      const updatedAt = typeof payload.updatedAt === 'string' ? payload.updatedAt.trim() : '';
      const cacheToken = typeof payload.cacheToken === 'string' ? payload.cacheToken.trim() : '';
      if (semantic) {
        siteVersion.semantic = semantic;
        changed = true;
      }
      if (timestamp) {
        siteVersion.timestamp = timestamp;
        changed = true;
      }
      if (updatedAt) {
        siteVersion.updatedAt = updatedAt;
        changed = true;
      }
      if (cacheToken) {
        siteVersion.cacheToken = cacheToken;
        changed = true;
      }
      if (changed) refreshBioWithVersion();
    };
    const fetchSiteVersion = () => {
      try {
        fetch(buildSiteVersionUrl())
          .then((res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
          })
          .then(applySiteVersion)
          .catch((error) => {
            console.warn('[dynamicTextOverlay] site version fetch failed', error);
          });
      } catch (error) {
        console.warn('[dynamicTextOverlay] site version fetch threw', error);
      }
    };
    const inlineVersion =
      typeof window !== 'undefined' && window.SiteVersion && typeof window.SiteVersion === 'object'
        ? window.SiteVersion
        : null;
    if (inlineVersion) {
      applySiteVersion(inlineVersion);
    } else {
      fetchSiteVersion();
    }
    flagBioVisibility(false);
    applyBioLayoutState(false);

    const animateLettersTo = (targetIndex, startDelay = 0) => {
      letterTimeouts.forEach(clearTimeout);
      letterTimeouts = [];
      const step = targetIndex > currentIndex ? 1 : -1;
      const steps = Math.abs(targetIndex - currentIndex);
      for (let k = 1; k <= steps; k++) {
        const idx = currentIndex + step * k;
        const id = setTimeout(() => {
          renderState(idx);
          currentIndex = idx;
        }, startDelay + k * dt);
        letterTimeouts.push(id);
      }
      return steps * dt; // duration (without startDelay)
    };

    toggleLetters = () => {
      if (targetExpanded) {
        collapseLeftBio();
      } else {
        openLeftBio();
      }
    };

    // Open-only action: ensure PATUREL + reveal bio (idempotent)
    openLeftBio = () => {
      flagBioVisibility(true);
      applyBioLayoutState(true);
      // If already expanded, ensure name is fully expanded and bail
      if (targetExpanded) {
        if (currentIndex !== states.length - 1) animateLettersTo(states.length - 1, 0);
        return;
      }
      // Clear any pending animations
      letterTimeouts.forEach(clearTimeout);
      letterTimeouts = [];
      clearBioTimeouts();

      const targetIndex = states.length - 1;

      // If the name is already visually PATUREL (hover path) or at final index,
      // snap to final state and show bio instantly (no delay).
      if (isNameHovered || currentIndex === targetIndex) {
        // Snap render to final if needed
        if (currentIndex !== targetIndex) {
          renderState(targetIndex);
          currentIndex = targetIndex;
        }
        const bioDuration = animateBio(true); // instant reveal
        targetExpanded = true;
        scheduleToperHeightRefresh();
        if (bioDuration > 0) {
          const finalize = setTimeout(() => scheduleToperHeightRefresh(), bioDuration + 10);
          bioTimeouts.push(finalize);
        }
        return;
      }

      // Otherwise, animate letters then reveal after the usual delay
      const steps = Math.abs(targetIndex - currentIndex);
      const totalLetterTime = steps * dt;
      animateLettersTo(targetIndex, 0);
      const start = setTimeout(() => {
        const duration = animateBio(true);
        if (duration > 0) {
          const finalize = setTimeout(() => scheduleToperHeightRefresh(), duration + 10);
          bioTimeouts.push(finalize);
        } else {
          scheduleToperHeightRefresh();
        }
      }, totalLetterTime + BIO_DELAY);
      bioTimeouts.push(start);
      targetExpanded = true;
      scheduleToperHeightRefresh();
    };

    // Collapse-only: hide bio, then collapse name back to PAUL if not hovered
    const collapseLeftBio = () => {
      if (!targetExpanded) return;
      // Clear any pending animations
      letterTimeouts.forEach(clearTimeout);
      letterTimeouts = [];
      clearBioTimeouts();
      flagBioVisibility(false);
      // Hide the bio first
      const bioDuration = animateBio(false);
      // After a gap, collapse the name only if not hovered
      if (!isNameHovered) {
        const start = setTimeout(() => { animateLettersTo(0, 0); }, bioDuration + BIO_DELAY);
        letterTimeouts.push(start);
      }
      targetExpanded = false;
      const layoutReset = setTimeout(() => {
        applyBioLayoutState(false);
        scheduleToperHeightRefresh();
      }, Math.max(bioDuration, 0) + 10);
      bioTimeouts.push(layoutReset);
      scheduleToperHeightRefresh();
      if (bioDuration > 0) {
        const finalize = setTimeout(() => scheduleToperHeightRefresh(), bioDuration + BIO_DELAY + 10);
        bioTimeouts.push(finalize);
      }
    };

    // Hover: only morph the name, do not touch the bio
    const hoverIn = () => {
      isNameHovered = true;
      if (targetExpanded) return; // keep as PATUREL when expanded
      letterTimeouts.forEach(clearTimeout);
      letterTimeouts = [];
      animateLettersTo(states.length - 1, 0);
    };
    const hoverOut = () => {
      isNameHovered = false;
      if (targetExpanded) return; // keep as PATUREL when expanded
      letterTimeouts.forEach(clearTimeout);
      letterTimeouts = [];
      animateLettersTo(0, 0);
    };
    try {
      nameEl.addEventListener('mouseenter', hoverIn);
      nameEl.addEventListener('mouseleave', hoverOut);
      nameEl.addEventListener('focus', hoverIn);
      nameEl.addEventListener('blur', hoverOut);
    } catch (_) {}

    // Click/keyboard on the name opens the full bio
    const activateOpen = (e) => {
      try { if (e) { e.preventDefault(); e.stopPropagation(); } } catch (_) {}
      if (targetExpanded) collapseLeftBio(); else openLeftBio();
      // If this came from a pointer click, drop focus so spacebar scrolls won't retrigger
      const pointerClick = e && e.type === 'click' && typeof e.detail === 'number' && e.detail > 0;
      if (pointerClick) {
        try { nameEl.blur(); } catch (_) {}
      }
    };
    try {
      nameEl.addEventListener('click', activateOpen);
      nameEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') activateOpen(e);
      });
    } catch (_) {}

    // Ensure the name does not stay auto-focused when the page loads
    try {
      if (document.activeElement === nameEl) nameEl.blur();
    } catch (_) {}

    // Click anywhere in the bio text to collapse it (chips stopPropagation so they won't close)
    try {
      bioEl.addEventListener('click', (e) => {
        if (!targetExpanded) return;
        // Allow interactive chips to prevent this via stopPropagation
        try { e.preventDefault(); e.stopPropagation(); } catch (_) {}
        collapseLeftBio();
      });
    } catch (_) {}
  }

  const projectContainers = document.querySelectorAll(".project_container");
  const getProjectKey = (el) => {
    if (!el) return "";
    const key = el.getAttribute("data-project-key") || el.getAttribute("data-project") || "";
    return String(key).trim();
  };
  if (textOverlay && projectContainers.length) {
    const loader = (window.ProjectTexts && typeof window.ProjectTexts.load === 'function')
      ? window.ProjectTexts.load('en')
      : Promise.resolve({});

    loader
      .catch((error) => {
        console.error('[dynamicTextOverlay] project texts failed to load', error);
        return {};
      })
      .then((loadedTexts) => {
        const projectTexts = loadedTexts && typeof loadedTexts === 'object' ? loadedTexts : {};
        const projectList = Array.from(projectContainers);
        const projectByKey = new Map();
        projectList.forEach((container) => {
          const key = getProjectKey(container);
          if (key) projectByKey.set(key, container);
        });

        const tidyLabel = (str) => String(str || '').replace(/\s+/g, ' ').trim();

        const deriveProjectLabel = (key) => {
          const el = projectByKey.get(key);
          if (!el) return tidyLabel(key);
          const explicit =
            el.getAttribute('data-project-label') ||
            el.getAttribute('data-project-name');
          if (explicit) return tidyLabel(explicit);
          const fallback = tidyLabel(el.getAttribute('data-project') || key);
          if (!fallback) return '';
          const hasSpace = /\s/.test(fallback);
          const hasSeparator = /[-_]/.test(fallback);
          let label = fallback;
          if (!hasSpace || hasSeparator) {
            label = fallback
              .replace(/[_-]+/g, ' ')
              .replace(/([a-z])([A-Z])/g, '$1 $2')
              .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2');
            label = tidyLabel(label);
            label = label
              .split(' ')
              .map((word) =>
                /^[A-Z0-9]+$/.test(word)
                  ? word
                  : word.charAt(0).toUpperCase() + word.slice(1)
              )
              .join(' ');
          }
          return tidyLabel(label);
        };

        const LEGACY_TAG_REGEX = /<tag>([\s\S]*?)<\/tag>/gi;

        const sanitizeLegacyMarkup = (raw) =>
          String(raw || '').replace(LEGACY_TAG_REGEX, (_, inner) => inner || '');

        const normalizeDisplayTag = (label) => {
          const tidy = tidyLabel(label);
          if (!tidy) return '';
          const first = tidy.charAt(0);
          if (!first) return '';
          return first.toUpperCase() + tidy.slice(1);
        };

        const collectEntryTags = (entry, fallbackRaw) => {
          const tags = [];
          const seen = new Set();
          const push = (label) => {
            const display = normalizeDisplayTag(label);
            if (!display) return;
            const normalized = display
              .normalize('NFD')
              .replace(/[\u0300-\u036f]+/g, '')
              .toLowerCase();
            if (seen.has(normalized)) return;
            seen.add(normalized);
            tags.push(display);
          };

          if (entry && typeof entry === 'object' && Array.isArray(entry.tags)) {
            entry.tags.forEach(push);
          }

          if (!tags.length && fallbackRaw) {
            let match;
            while ((match = LEGACY_TAG_REGEX.exec(String(fallbackRaw || '')))) {
              push(match[1] || '');
            }
          }

          return tags;
        };

        const resolveEntryPayload = (entry) => {
          const rawText =
            typeof entry === 'string'
              ? entry
              : entry && typeof entry === 'object'
              ? entry.text || ''
              : '';
          const sanitized = sanitizeLegacyMarkup(rawText);
          const tags = collectEntryTags(entry, rawText);
          return { text: sanitized, tags };
        };

        const tokenize = (textValue) => {
          const parts = String(textValue || '').split(/(\s+)/);
          return parts
            .map((part, index) => {
              if (index % 2 === 1) return `<span class="space">${part}</span>`;
              if (!part) return '';
              return `<span class="word">${part}</span>`;
            })
            .join('');
        };

        const emitToperUpdate = (detail) => {
          try {
            window.dispatchEvent(new CustomEvent('toper:update', { detail }));
          } catch (_) {}
        };

        let activeProjectKey = '';
        let currentDescription = '';
        let descriptionVisible = false;
        let wordTimeouts = [];

        const clearWordTimeouts = () => {
          wordTimeouts.forEach((id) => clearTimeout(id));
          wordTimeouts = [];
        };

        const syncTitle = (projectKey) => {
          if (!toperTitleText) return '';
          const label = tidyLabel(deriveProjectLabel(projectKey));
          toperTitleText.textContent = label;
          if (toperTitle) {
            const hasContent = currentDescription.trim().length > 0;
            toperTitle.disabled = !hasContent;
            toperTitle.setAttribute('aria-controls', 'text_overlay_container');
            toperTitle.setAttribute(
              'aria-expanded',
              hasContent && descriptionVisible ? 'true' : 'false'
            );
          }
          return label;
        };

        const setDescriptionContent = (textValue, keepVisible) => {
          if (!textOverlay) return;
          clearWordTimeouts();
          currentDescription = String(textValue || '');
          const hasText = currentDescription.trim().length > 0;

          if (!hasText) {
            textOverlay.innerHTML = "";
            descriptionVisible = false;
            textOverlay.classList.remove('is-open');
            textOverlay.setAttribute('aria-hidden', 'true');
            if (toperTitle) {
              toperTitle.disabled = true;
              toperTitle.setAttribute('aria-expanded', 'false');
              toperTitle.classList.remove('is-description-open');
            }
            scheduleToperHeightRefresh();
            return;
          }

          textOverlay.innerHTML = tokenize(currentDescription);
          const words = textOverlay.querySelectorAll('span.word');
          const spaces = textOverlay.querySelectorAll('span.space');

          if (keepVisible) {
            words.forEach((span) => (span.style.display = 'inline'));
            spaces.forEach((space) => (space.style.display = 'inline'));
            descriptionVisible = true;
            textOverlay.classList.add('is-open');
            textOverlay.setAttribute('aria-hidden', 'false');
            if (toperTitle) {
              toperTitle.disabled = false;
              toperTitle.setAttribute('aria-expanded', 'true');
              toperTitle.classList.add('is-description-open');
            }
          } else {
            words.forEach((span) => (span.style.display = 'none'));
            spaces.forEach((space) => (space.style.display = 'none'));
            descriptionVisible = false;
            textOverlay.classList.remove('is-open');
            textOverlay.setAttribute('aria-hidden', 'true');
            if (toperTitle) {
              toperTitle.disabled = false;
              toperTitle.setAttribute('aria-expanded', 'false');
              toperTitle.classList.remove('is-description-open');
            }
          }
          scheduleToperHeightRefresh();
        };

        const showDescription = () => {
          if (!textOverlay) return;
          if (descriptionVisible) return;
          if (!currentDescription || !currentDescription.trim()) return;
          clearWordTimeouts();
          descriptionVisible = true;
          textOverlay.classList.add('is-open');
          textOverlay.setAttribute('aria-hidden', 'false');
          if (toperTitle) {
            toperTitle.setAttribute('aria-expanded', 'true');
            toperTitle.classList.add('is-description-open');
          }
          scheduleToperHeightRefresh();
          const words = Array.from(textOverlay.querySelectorAll('span.word'));
          const dt = 40;
          words.forEach((span, index) => {
            const id = window.setTimeout(() => {
              span.style.display = 'inline';
              const prev = span.previousElementSibling;
              if (prev && prev.classList && prev.classList.contains('space')) {
                prev.style.display = 'inline';
              }
            }, index * dt);
            wordTimeouts.push(id);
          });
          const finalId = window.setTimeout(() => {
            scheduleToperHeightRefresh();
          }, words.length * dt + 20);
          wordTimeouts.push(finalId);
        };

        const hideDescription = () => {
          if (!textOverlay) return;
          if (!descriptionVisible) return;
          clearWordTimeouts();
          descriptionVisible = false;
          const words = Array.from(textOverlay.querySelectorAll('span.word'));
          const dt = 40;
          const ordered = words.slice().reverse();
          ordered.forEach((span, index) => {
            const id = window.setTimeout(() => {
              span.style.display = 'none';
              const prev = span.previousElementSibling;
              if (prev && prev.classList && prev.classList.contains('space')) {
                prev.style.display = 'none';
              }
            }, index * dt);
            wordTimeouts.push(id);
          });
          const finalId = window.setTimeout(() => {
            textOverlay.classList.remove('is-open');
            textOverlay.setAttribute('aria-hidden', 'true');
            if (toperTitle) {
              toperTitle.setAttribute('aria-expanded', 'false');
              toperTitle.classList.remove('is-description-open');
            }
            scheduleToperHeightRefresh();
          }, ordered.length * dt + 20);
          wordTimeouts.push(finalId);
        };

        toggleWords = () => {
          if (!currentDescription || !currentDescription.trim()) return;
          if (descriptionVisible) hideDescription();
          else showDescription();
        };

        const applyProject = (projectKey) => {
          if (!projectKey || !projectTexts[projectKey]) {
            activeProjectKey = '';
            currentDescription = '';
            setDescriptionContent('', false);
            if (toperTitleText) toperTitleText.textContent = '';
            emitToperUpdate({ key: '', title: '', tags: [] });
            return;
          }
          if (projectKey === activeProjectKey) return;
          const entry = projectTexts[projectKey];
          const { text: entryText, tags: entryTags } = resolveEntryPayload(entry);
          const wasVisible = descriptionVisible;
          activeProjectKey = projectKey;
          setDescriptionContent(entryText, wasVisible);
          const title = syncTitle(projectKey);
          emitToperUpdate({ key: projectKey, title, tags: entryTags });
        };

        if (projectList[0]) {
          const firstKey = getProjectKey(projectList[0]);
          if (firstKey) applyProject(firstKey);
        } else {
          emitToperUpdate({ key: '', title: '', tags: [] });
        }

        if (toperTitle) {
          toperTitle.addEventListener('click', (ev) => {
            try { ev.preventDefault(); } catch (_) {}
            toggleWords();
          });
        }

        if (textOverlay) {
          textOverlay.addEventListener(
            'click',
            (ev) => {
              if (!descriptionVisible) return;
              try {
                ev.preventDefault();
                ev.stopPropagation();
              } catch (_) {}
              hideDescription();
            },
            true
          );
        }

        const setOverlayText = (projectName) => {
          if (!projectName) {
            applyProject('');
            return;
          }
          applyProject(projectName);
        };

        const thresholds = Array.from({ length: 101 }, (_, i) => i / 100);
        const visibilityMap = new Map();

        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              visibilityMap.set(entry.target, entry.intersectionRatio);
            });

            let mostVisible = null;
            let maxRatio = 0;

            visibilityMap.forEach((ratio, element) => {
              if (ratio > maxRatio) {
                maxRatio = ratio;
                mostVisible = element;
              }
            });

            if (mostVisible && maxRatio > 0) {
              const key = getProjectKey(mostVisible) || mostVisible.getAttribute('data-project') || '';
              setOverlayText(key);
            } else {
              setOverlayText('');
            }
          },
          { threshold: thresholds }
        );

        projectContainers.forEach((container) => {
          visibilityMap.set(container, 0);
          observer.observe(container);
        });
      })
      .catch((err) => {
        console.error("Failed to load project texts", err);
      });
  }

  // Interactions now live on explicit controls: PAUL in the topper and the project title button.
  // (Retain no-op listener only if future global behaviors are added.)
});
