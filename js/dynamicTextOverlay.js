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

      const highlightWords = (text, highlight = []) => {
        const parts = text.split(/(\s+)/);
        const highlightSet = new Set(highlight);
        let wordIndex = 0;

        return parts
          .map((part, i) => {
            if (i % 2 === 1) {
              return part;
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
          textOverlay.innerHTML = text ? highlightWords(text, highlight) : "";
          currentText = text;
          const nonHighlights = textOverlay.querySelectorAll(
            "span.word:not(.highlight)"
          );
          nonHighlights.forEach((span) => (span.style.display = "none"));
          wordsVisible = false;
        }
      };

        toggleWords = () => {
        timeouts.forEach(clearTimeout);
        timeouts = [];

        const spans = Array.from(
          textOverlay.querySelectorAll("span.word:not(.highlight)")
        );
        if (!spans.length) return;

        const hiddenCount = spans.filter(
          (s) => s.style.display === "none"
        ).length;
        wordsVisible = hiddenCount === 0;

        const hide = wordsVisible;
        const targets = spans.filter((span) =>
          hide ? span.style.display !== "none" : span.style.display === "none"
        );

        const steps = targets.length;
        if (steps === 0) return;

        wordsVisible = !wordsVisible;
        const dt = 40;

        targets.forEach((span, index) => {
          const id = setTimeout(() => {
            span.style.display = hide ? "none" : "inline";
          }, (index + 1) * dt);
          timeouts.push(id);
        });
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
