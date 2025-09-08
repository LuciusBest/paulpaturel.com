/*
  dynamicTextOverlay.js
  - Affiche un texte contextuel superposé pour le .project_container le plus visible.
    • Charge le texte et les mots à surligner depuis "js/projectTexts.json".
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

  if (leftOverlay) {
    const states = ["PAUL", "PATUL", "PATURL", "PATUREL"];
    const highlightSet = new Set(["P", "A", "U", "L"]);
    const dt = 80;
    let currentIndex = 0;
    let targetExpanded = false;
    let letterTimeouts = [];

    const renderState = (index) => {
      const str = states[index];
      leftOverlay.innerHTML = str
        .split("")
        .map((ch) => {
          const cls = highlightSet.has(ch) ? "char highlight" : "char";
          return `<span class="${cls}">${ch}</span>`;
        })
        .join("");
    };

    renderState(currentIndex);

    toggleLetters = () => {
      letterTimeouts.forEach(clearTimeout);
      letterTimeouts = [];
      targetExpanded = !targetExpanded;
      const targetIndex = targetExpanded ? states.length - 1 : 0;
      const step = targetIndex > currentIndex ? 1 : -1;
      const steps = Math.abs(targetIndex - currentIndex);
      for (let k = 1; k <= steps; k++) {
        const idx = currentIndex + step * k;
        const id = setTimeout(() => {
          renderState(idx);
          currentIndex = idx;
        }, k * dt);
        letterTimeouts.push(id);
      }
    };
  }

  const projectContainers = document.querySelectorAll(".project_container");
  if (textOverlay && projectContainers.length) {
    fetch("js/projectTexts.json")
      .then((response) => response.json())
      .then((projectTexts) => {
        let currentText = "";
        let wordsVisible = false;
        let timeouts = [];
        let formatTimeout = null;
        let formatTimeouts = [];
        const HIGHLIGHT_DT = 100; // ms between each highlighted word transformation

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
        const entry = projectTexts[projectName];
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
          currentText = text;
          const nonHighlights = textOverlay.querySelectorAll(
            "span.word:not(.highlight)"
          );
          nonHighlights.forEach((span) => (span.style.display = "none"));
          wordsVisible = false;
          // Ensure highlighted words are formatted for tags-only initially
          updateHighlightText(false);
          // Initial mode: tags-only (chip style)
          textOverlay.classList.add("tags-only");
          textOverlay.classList.remove("is-fulltext");
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
          targets.forEach((span, index) => {
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
          return startDelay + (targets.length ? targets.length : 0) * dt;
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
        }
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
            setOverlayText(mostVisible.getAttribute("data-project"));
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
    })
      .catch((err) => {
        console.error("Failed to load project texts", err);
      });
  }

  document.addEventListener("click", () => {
    toggleWords();
  });
  if (leftOverlay) {
    leftOverlay.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleLetters();
    });
  }
});
