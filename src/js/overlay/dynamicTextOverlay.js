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

  let toggleWords = () => {};
  let toggleLetters = () => {};
  let openLeftBio = () => {};
  // i18n state
  let currentLang = 'en';
  try {
    const stored = localStorage.getItem('pp.lang');
    if (stored) currentLang = stored;
  } catch (error) {
    console.warn('[dynamicTextOverlay] localStorage unavailable, defaulting to EN', error);
  }
  let switchLanguage = () => {};
  let refreshRightOverlayForLang = () => {};
  try { document.documentElement.setAttribute('lang', currentLang); } catch (_) {}

  if (leftOverlay) {
    let siteVersion = {
      semantic: 'V00.00.00',
      timestamp: '1970/01/01/00/00'
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

    // Build structure: name container + bio container
    const nameEl = document.createElement("div");
    nameEl.id = "left_name";
    // Make the name focusable/clickable for accessibility
    try { nameEl.setAttribute('role', 'button'); nameEl.setAttribute('tabindex', '0'); } catch (_) {}
    const bioEl = document.createElement("div");
    bioEl.id = "left_bio";
    leftOverlay.innerHTML = "";
    leftOverlay.appendChild(nameEl);
    leftOverlay.appendChild(bioEl);

    const clearBioTimeouts = () => {
      bioTimeouts.forEach(clearTimeout);
      bioTimeouts = [];
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

    // Bio content in both languages
    const bioCopy = {
      en: {
        s1:
          "Born in Paris, I moved to Lausanne to study at ECAL, <br>where I am now based as a graphic designer.",
        s2:
          "I am available for commissions and collaborations, with a focus on typography, web design, 3D, and print.",
        contact: "Contact",
      },
      fr: {
        s1:
          "Né à Paris, j’ai déménagé à Lausanne pour étudier à l’ECAL, <br>où je suis désormais basé en tant que designer graphique.",
        s2:
          "Je suis disponible pour des commandes et des collaborations, avec un intérêt <br>pour la typographie, le web, la 3D et l’impression.",
        contact: "Contact",
      },
    };

    const langToggleHTML = () => {
      const enActive = currentLang === 'en';
      const frActive = currentLang === 'fr';
      return [
        '<span class="lang-toggle" role="group" aria-label="Language">',
        `<span class="word lang-option ${enActive ? 'active' : 'inactive'}" data-lang="en" role="button" tabindex="0" data-no-custom-cursor="true">EN</span>`,
        '<span class="space">  </span>',
        `<span class="word lang-option ${frActive ? 'active' : 'inactive'}" data-lang="fr" role="button" tabindex="0" data-no-custom-cursor="true">FR</span>`,
        '</span>'
      ].join("");
    };

    const renderBio = () => {
      // Respect line skips exactly
      const emailHTML = `<span class="word contact-chip" role="link" tabindex="0" data-no-custom-cursor="true" data-url="mailto:paulpaturel75@gmail.com">paulpaturel75@gmail.com</span>`;
      const instaHTML = `<span class="word contact-chip" role="link" tabindex="0" data-no-custom-cursor="true" data-url="https://www.instagram.com/_paul_pat_/">@_paul_pat_</span>`;
      const copy = bioCopy[currentLang] || bioCopy.en;
      const html = [
        // Next line after name
        "<br>",
        // First sentence
        wrapWords(copy.s1),
        // Next line
        "<br>",
        // Second sentence
        wrapWords(copy.s2),
        // Blank line after BIO (no top toggle)
        "<br>",
        "<br>",
        // Contact block
        wrapWords(copy.contact),
        "<br>",
        emailHTML,
        "<br>",
        instaHTML,
        // Blank line after Contact, then EN FR again
        "<br>",
        "<br>",
        langToggleHTML(),
        // Meta paragraph under EN/FR with extra spacing
        "<br>",
        "<br>",
        '<span class="left-meta">',
          // Line 1: dynamic version + timestamp
          (() => {
            const semantic = siteVersion && typeof siteVersion.semantic === 'string' && siteVersion.semantic.trim()
              ? siteVersion.semantic.trim()
              : 'V00.00.00';
            const timestamp = siteVersion && typeof siteVersion.timestamp === 'string' && siteVersion.timestamp.trim()
              ? siteVersion.timestamp.trim()
              : '1970/01/01/00/00';
            const verb = currentLang === 'fr' ? 'publié le' : 'released';
            return wrapWords(`${semantic} ${verb} ${timestamp}.`);
          })(),
          '<br>',
          // Line 2: font credit
          wrapWords('Font → Arzier by '),
          // Linked author token
          '<span class="word contact-chip" role="link" tabindex="0" data-no-custom-cursor="true" data-url="https://hugoscholl.ch/">Hugo Scholl</span>',
          '<span class="space"> </span>',
          // "- Interscript." as tokenized words
          wrapWords('- Interscript.'),
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
      // Language toggle: click/keyboard handlers
      const langOpts = bioEl.querySelectorAll('.lang-option[data-lang]');
      langOpts.forEach((el) => {
        const lang = el.getAttribute('data-lang');
        const activate = (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (typeof switchLanguage === 'function') switchLanguage(lang);
        };
        el.addEventListener('click', activate);
        el.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') activate(e);
        });
      });
      // Hide all words/spaces initially; they will reveal with animation
      bioEl.querySelectorAll("span.word").forEach((s) => (s.style.display = "none"));
      bioEl.querySelectorAll("span.space").forEach((s) => (s.style.display = "none"));
    };

    const animateBio = (show) => {
      clearBioTimeouts();
      const words = Array.from(bioEl.querySelectorAll("span.word"));
      if (!words.length) return 0;
      const dtBio = 40;
      const targets = words.filter((w) =>
        show ? w.style.display === "none" : w.style.display !== "none"
      );
      const ordered = show ? targets : targets.slice().reverse();
      const duration = ordered.length * dtBio;
      ordered.forEach((span, index) => {
        const id = setTimeout(() => {
          const reveal = show;
          span.style.display = reveal ? "inline" : "none";
          const prev = span.previousElementSibling;
          if (prev && prev.classList && prev.classList.contains("space")) {
            prev.style.display = reveal ? "inline" : "none";
          }
        }, (index + 1) * dtBio);
        bioTimeouts.push(id);
      });
      return duration;
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
      if (wasExpanded) setTimeout(() => animateBio(true), 10);
    };
    const applySiteVersion = (payload) => {
      if (!payload || typeof payload !== 'object') return;
      let changed = false;
      const semantic = typeof payload.semantic === 'string' ? payload.semantic.trim() : '';
      const timestamp = typeof payload.timestamp === 'string' ? payload.timestamp.trim() : '';
      if (semantic) {
        siteVersion.semantic = semantic;
        changed = true;
      }
      if (timestamp) {
        siteVersion.timestamp = timestamp;
        changed = true;
      }
      if (changed) refreshBioWithVersion();
    };
    const fetchSiteVersion = () => {
      try {
        fetch('data/siteVersion.json', { cache: 'no-store' })
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
    fetchSiteVersion();
    try { leftOverlay.classList.remove('bio-expanded'); } catch (_) {}

    // Language switching: update currentLang, persist, re-render bio and reveal if expanded
    switchLanguage = (lang) => {
      if (!lang || lang === currentLang) return;
      currentLang = (lang === 'fr' ? 'fr' : 'en');
      try { localStorage.setItem('pp.lang', currentLang); } catch (_) {}
      try { document.documentElement.setAttribute('lang', currentLang); } catch (_) {}
      const wasExpanded = targetExpanded;
      renderBio();
      if (wasExpanded) setTimeout(() => animateBio(true), 10);
      // Ask right overlay to refresh its text for the new language
      try { refreshRightOverlayForLang(); } catch (_) {}
    };

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
      // Clear any pending animations
      letterTimeouts.forEach(clearTimeout);
      letterTimeouts = [];
      clearBioTimeouts();

      // Toggle target state
      const goingToExpanded = !targetExpanded;
      const targetIndex = goingToExpanded ? states.length - 1 : 0;
      const steps = Math.abs(targetIndex - currentIndex);
      const totalLetterTime = steps * dt;

      if (goingToExpanded) {
        // 1) Morph name immediately to PATUREL
        animateLettersTo(targetIndex, 0);
        // 2) After a 0.7s gap from name completion, reveal the bio
        const start = setTimeout(() => {
          animateBio(true);
        }, totalLetterTime + BIO_DELAY);
        bioTimeouts.push(start);
      } else {
        // 1) Hide the bio first
        const bioDuration = animateBio(false);
        // 2) After a 0.7s gap from bio completion, morph the name back to PAUL
        animateLettersTo(targetIndex, bioDuration + BIO_DELAY);
      }

      targetExpanded = goingToExpanded;
    };

    // Open-only action: ensure PATUREL + reveal bio (idempotent)
    openLeftBio = () => {
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
        animateBio(true); // instant reveal
        try { leftOverlay.classList.add('bio-expanded'); } catch (_) {}
        targetExpanded = true;
        return;
      }

      // Otherwise, animate letters then reveal after the usual delay
      const steps = Math.abs(targetIndex - currentIndex);
      const totalLetterTime = steps * dt;
      animateLettersTo(targetIndex, 0);
      const start = setTimeout(() => { animateBio(true); }, totalLetterTime + BIO_DELAY);
      bioTimeouts.push(start);
      targetExpanded = true;
      try { leftOverlay.classList.add('bio-expanded'); } catch (_) {}
    };

    // Collapse-only: hide bio, then collapse name back to PAUL if not hovered
    const collapseLeftBio = () => {
      if (!targetExpanded) return;
      // Clear any pending animations
      letterTimeouts.forEach(clearTimeout);
      letterTimeouts = [];
      clearBioTimeouts();
      // Hide the bio first
      const bioDuration = animateBio(false);
      // After a gap, collapse the name only if not hovered
      if (!isNameHovered) {
        const start = setTimeout(() => { animateLettersTo(0, 0); }, bioDuration + BIO_DELAY);
        letterTimeouts.push(start);
      }
      targetExpanded = false;
      try { leftOverlay.classList.remove('bio-expanded'); } catch (_) {}
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

    // Click anywhere in the bio text to collapse it (chips/lang stopPropagation so they won't close)
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
    const loader = (window.ProjectTexts && typeof window.ProjectTexts.loadAll === 'function')
      ? window.ProjectTexts.loadAll()
      : Promise.resolve({ en: {}, fr: {} });

    loader
      .catch((error) => {
        console.error('[dynamicTextOverlay] project texts failed to load', error);
        return { en: {}, fr: {} };
      })
      .then(({ en, fr }) => {
        const byLang = { en: en || {}, fr: fr || {} };
        let currentText = "";
        let wordsVisible = false;
        let timeouts = [];
        let formatTimeout = null;
        let formatTimeouts = [];
        const HIGHLIGHT_DT = 100; // ms between each highlighted word transformation
        let lastProjectName = "";
        let controlChipEl = null;
        const YEAR_TAG_PATTERN = /^(?:19|20)\d{2}$/;

        const ensureControlChip = () => {
          if (controlChipEl) return controlChipEl;
          controlChipEl = document.createElement('span');
          controlChipEl.className = 'control-chip';
          controlChipEl.setAttribute('role', 'button');
          controlChipEl.setAttribute('tabindex', '0');
          const activate = (e) => {
            try { if (e) { e.preventDefault(); e.stopPropagation(); } } catch (_) {}
            if (typeof toggleWords === 'function') toggleWords();
          };
          controlChipEl.addEventListener('click', activate);
          controlChipEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') activate(e);
          });
          return controlChipEl;
        };

        const setControlSymbol = (isFull) => {
          const el = ensureControlChip();
          el.textContent = isFull ? '–' : '+';
          el.setAttribute('aria-label', isFull ? 'Collapse description' : 'Expand description');
          el.classList.toggle('is-active', !!isFull);
        };

        const isHighlightToken = (node) => {
          if (!node || node.nodeType !== 1) return false;
          if (node.parentElement !== textOverlay) return false;
          const cls = node.classList;
          if (!cls) return false;
          if (cls.contains('tag') && cls.contains('highlight')) return true;
          if (cls.contains('word') && cls.contains('highlight')) return true;
          return false;
        };

        const isSpaceNode = (node) =>
          !!node && node.nodeType === 1 && node.classList && node.classList.contains('space');

        const getTokenText = (node) => ((node && node.textContent) || '').trim();

        const reorderTagTokens = () => {
          if (!textOverlay) return;
          const groups = [];
          let cursor = textOverlay.firstElementChild;
          while (cursor) {
            if (isHighlightToken(cursor)) {
              const nodes = [cursor];
              let walker = cursor.nextElementSibling;
              while (walker && isSpaceNode(walker)) {
                nodes.push(walker);
                walker = walker.nextElementSibling;
              }
              groups.push({ token: cursor, nodes });
              cursor = walker;
            } else {
              cursor = cursor.nextElementSibling;
            }
          }

          if (!groups.length) return;

          const dateGroups = groups.filter(({ token }) =>
            YEAR_TAG_PATTERN.test(getTokenText(token))
          );
          if (!dateGroups.length) return;

          dateGroups.forEach(({ nodes }) => {
            const fragment = document.createDocumentFragment();
            nodes.forEach((node) => fragment.appendChild(node));
            textOverlay.appendChild(fragment);
          });
        };

        // Format a tag token depending on the display mode (no '#')
        const capitalizeFirst = (s) =>
          s && s.length ? s.charAt(0).toUpperCase() + s.slice(1) : s;

        const clearFormatTimers = () => {
          if (formatTimeout) {
            clearTimeout(formatTimeout);
            formatTimeout = null;
          }
          formatTimeouts.forEach(clearTimeout);
          formatTimeouts = [];
        };

        const updateHighlightText = (isFullText) => {
          const spans = textOverlay.querySelectorAll("span.word.highlight");
          spans.forEach((span) => {
            if (!span.dataset.original) {
              span.dataset.original = span.textContent;
            }
            if (isFullText) {
              // Restore original wording in full text mode
              span.textContent = span.dataset.original;
            } else {
              // Show as Tag (capitalize first letter) in tags-only mode
              const token = span.dataset.original || "";
              span.textContent = capitalizeFirst(token);
            }
          });
        };

        const animateHighlightText = (isFullText) => {
          clearFormatTimers();
          const spans = Array.from(
            textOverlay.querySelectorAll("span.word.highlight")
          );
          const dtAnim = HIGHLIGHT_DT;
          spans.forEach((span, index) => {
            if (!span.dataset.original) {
              span.dataset.original = span.textContent;
            }
            const id = setTimeout(() => {
              const token = span.dataset.original || "";
              span.textContent = isFullText ? token : capitalizeFirst(token);
            }, index * dtAnim);
            formatTimeouts.push(id);
          });
        };

      const highlightWords = (text, highlight = []) => {
        const parts = text.split(/(\s+)/);
        const highlightSet = new Set(highlight);
        let wordIndex = 0;

        return parts
          .map((part, i) => {
            if (i % 2 === 1) {
              // Wrap whitespace so it can be styled/hidden per mode
              return `<span class="space">${part}</span>`;
            }
            if (!part) return part;
            const cls = highlightSet.has(wordIndex)
              ? "word highlight"
              : "word";
            const wrapped = `<span class="${cls}">${part}</span>`;
            wordIndex++;
            return wrapped;
          })
          .join("");
      };

      // Support inline <tag> ... </tag> to mark highlighted words
      // Multi-word tags are wrapped as a single chip wrapper containing inner word/spaces
      const renderFromTagged = (text) => {
        let out = [];
        let i = 0;
        let depth = 0;
        const len = text.length;

        let groupParts = null; // holds inner spans while inside a top-level <tag>

        const emit = (html) => out.push(html);

        const pushWord = (word, highlighted) => {
          if (!word) return;
          const cls = highlighted ? "word highlight" : "word";
          const node = `<span class="${cls}">${word}</span>`;
          if (highlighted && groupParts) groupParts.push(node);
          else emit(node);
        };

        const pushSpace = (spaceStr) => {
          const inTag = depth > 0 ? ' in-tag' : '';
          const node = `<span class="space${inTag}">${spaceStr}</span>`;
          if (depth > 0 && groupParts) groupParts.push(node);
          else emit(node);
        };

        const flushGroup = () => {
          if (groupParts) {
            emit(`<span class="tag highlight">${groupParts.join("")}</span>`);
            groupParts = null;
          }
        };

        while (i < len) {
          if (text.startsWith("<tag>", i)) {
            if (depth === 0) groupParts = [];
            depth++;
            i += 5;
            continue;
          }
          if (text.startsWith("</tag>", i)) {
            depth = Math.max(0, depth - 1);
            i += 6;
            if (depth === 0) flushGroup();
            continue;
          }

          const ch = text[i];
          if (/\s/.test(ch)) {
            let j = i + 1;
            while (j < len && /\s/.test(text[j])) j++;
            pushSpace(text.slice(i, j));
            i = j;
            continue;
          }

          let j = i + 1;
          while (
            j < len &&
            !/\s/.test(text[j]) &&
            !text.startsWith("<tag>", j) &&
            !text.startsWith("</tag>", j)
          ) {
            j++;
          }
          const token = text.slice(i, j);
          pushWord(token, depth > 0);
          i = j;
        }

        // flush if an opening tag was not closed
        flushGroup();

        return out.join("");
      };

      const renderWords = (text, highlight = []) => {
        if (text && (text.includes("<tag>") || text.includes("</tag>"))) {
          return renderFromTagged(text);
        }
        // fallback to legacy index-based highlighting
        return highlightWords(text, highlight);
      };

      const setOverlayText = (projectName) => {
        lastProjectName = projectName;
        const dict = byLang[currentLang] && Object.keys(byLang[currentLang]).length
          ? byLang[currentLang]
          : byLang.en;
        const wasFull = textOverlay.classList.contains('is-fulltext');
        const entry = dict[projectName];
        let text = "";
        let highlight = [];
        if (typeof entry === "string") {
          text = entry;
        } else if (entry && typeof entry === "object") {
          text = entry.text || "";
          highlight = Array.isArray(entry.highlight) ? entry.highlight : [];
        }
        if (text !== currentText) {
          timeouts.forEach(clearTimeout);
          timeouts = [];
          clearFormatTimers();
          textOverlay.innerHTML = text ? renderWords(text, highlight) : "";
          reorderTagTokens();
          currentText = text;
          // Append the +/– control chip when there is content
          if (currentText) {
            const chip = ensureControlChip();
            try {
              const firstElement = textOverlay.firstElementChild;
              if (firstElement) textOverlay.insertBefore(chip, firstElement);
              else textOverlay.appendChild(chip);
            } catch (_) {}
          } else if (controlChipEl && controlChipEl.parentNode) {
            try { controlChipEl.parentNode.removeChild(controlChipEl); } catch (_) {}
          }
          if (!currentText && controlChipEl) controlChipEl.classList.remove('is-active');
          const nonHighlights = textOverlay.querySelectorAll("span.word:not(.highlight)");
          const spaces = textOverlay.querySelectorAll('span.space');
          if (wasFull) {
            // Preserve full-text mode across language switches
            nonHighlights.forEach((span) => (span.style.display = "inline"));
            spaces.forEach((sp) => (sp.style.display = 'inline'));
            updateHighlightText(true);
            textOverlay.classList.remove("tags-only");
            textOverlay.classList.add("is-fulltext");
            wordsVisible = true;
            setControlSymbol(true);
            // In full-text mode: clicking anywhere in the description collapses back to tags
          } else {
            nonHighlights.forEach((span) => (span.style.display = "none"));
            wordsVisible = false;
            updateHighlightText(false);
            textOverlay.classList.add("tags-only");
            textOverlay.classList.remove("is-fulltext");
            setControlSymbol(false);
          }
        }
      };

        // Utility: clear inline display on all spaces so CSS can control visibility
        const normalizeSpaces = () => {
          const spaces = textOverlay.querySelectorAll('span.space');
          spaces.forEach((sp) => (sp.style.display = ''));
        };

        // Utility: when expanding from tags, keep spaces between already-visible words
        // (e.g., between highlighted tokens) but hide spaces that precede hidden words
        const prepareSpacesForExpand = () => {
          const spaces = textOverlay.querySelectorAll('span.space:not(.in-tag)');
          spaces.forEach((sp) => {
            const next = sp.nextElementSibling;
            if (
              next &&
              next.matches('span.word:not(.highlight)') &&
              next.style.display === 'none'
            ) {
              sp.style.display = 'none';
            } else {
              sp.style.display = 'inline';
            }
          });
        };

        toggleWords = () => {
        timeouts.forEach(clearTimeout);
        timeouts = [];
        clearFormatTimers();

        const spans = Array.from(
          textOverlay.querySelectorAll("span.word:not(.highlight)")
        );
        if (!spans.length) return;

        const hiddenCount = spans.filter(
          (s) => s.style.display === "none"
        ).length;
        const currentlyFullText = hiddenCount === 0;
        const targetWordsVisible = !currentlyFullText; // after toggle

        const hide = currentlyFullText; // hide when leaving full text
        const targets = spans.filter((span) =>
          hide ? span.style.display !== "none" : span.style.display === "none"
        );

        const dt = 40;

        const scheduleNonHighlightToggle = (startDelay) => {
          // When collapsing (hiding), remove from the end first to keep the prefix longest
          const ordered = hide ? targets.slice().reverse() : targets;
          ordered.forEach((span, index) => {
            const id = setTimeout(() => {
              const show = !hide;
              span.style.display = show ? "inline" : "none";
              const prev = span.previousElementSibling;
              if (
                prev &&
                prev.classList &&
                prev.classList.contains("space") &&
                !prev.classList.contains("in-tag")
              ) {
                // When showing, reveal its preceding space; when hiding, hide it too
                prev.style.display = show ? "inline" : "none";
              }
            }, startDelay + (index + 1) * dt);
            timeouts.push(id);
          });
          return startDelay + (ordered.length ? ordered.length : 0) * dt;
        };

        if (currentlyFullText) {
          // Full -> Tags
          // 1) Immediately morph highlighted tokens to majuscule format
          // 2) Hide non-highlighted words (staggered)
          // 3) After both are done, switch to chip backgrounds (tags-only)
          animateHighlightText(false);
          const endDelay = scheduleNonHighlightToggle(0);
          const highlightTotal =
            textOverlay.querySelectorAll("span.word.highlight").length *
            HIGHLIGHT_DT;
          const totalDelay = Math.max(endDelay, highlightTotal) + 10;
          formatTimeout = setTimeout(() => {
            textOverlay.classList.add("tags-only");
            textOverlay.classList.remove("is-fulltext");
            // Cleanup any inline space display so CSS fully controls in chips view
            normalizeSpaces();
          }, totalDelay);
          timeouts.push(formatTimeout);
          wordsVisible = false;
          setControlSymbol(false);
        } else {
          // Tags -> Full: enable per-word background first and keep spaces between visible words
          textOverlay.classList.remove("tags-only");
          textOverlay.classList.add("is-fulltext");
          // Prepare space visibility before revealing hidden words
          prepareSpacesForExpand();
          // Normalize highlighted tags, then reveal hidden words after the text morph
          animateHighlightText(true);
          const highlightTotal =
            textOverlay.querySelectorAll("span.word.highlight").length *
            HIGHLIGHT_DT;
          const endDelay = scheduleNonHighlightToggle(highlightTotal + 10);
          // After words are revealed, allow CSS to control spaces again
          const cleanup = setTimeout(() => {
            normalizeSpaces();
          }, endDelay + 10);
          timeouts.push(cleanup);
          wordsVisible = true;
          setControlSymbol(true);
        }
      };

      // When in full-text mode, allow clicking anywhere in the overlay to collapse back to tags
      const onFullTextClick = (e) => {
        if (!textOverlay.classList.contains('is-fulltext')) return;
        // Prevent tag filter or other handlers from also acting
        try { e.preventDefault(); e.stopPropagation(); } catch (_) {}
        if (typeof toggleWords === 'function') toggleWords();
      };
      try {
        textOverlay.addEventListener('click', onFullTextClick, true); // capture to intercept
      } catch (_) {}

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
            const key = getProjectKey(mostVisible) || mostVisible.getAttribute("data-project") || "";
            setOverlayText(key);
          } else {
            setOverlayText("");
          }
        },
        { threshold: thresholds }
      );

      projectContainers.forEach((container) => {
        visibilityMap.set(container, 0);
        observer.observe(container);
      });
      // Provide a hook for the left overlay language switcher to refresh the right overlay
      refreshRightOverlayForLang = () => {
        setOverlayText(lastProjectName || "");
      };
    })
      .catch((err) => {
        console.error("Failed to load project texts", err);
      });
  }

  // Global click routing disabled for right overlay toggling and left bio.
  // Interactions now live on explicit controls: NAME on the left, +/– chip on the right.
  // (Retain no-op listener only if future global behaviors are added.)
});
