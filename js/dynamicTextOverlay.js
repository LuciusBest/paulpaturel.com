document.addEventListener("DOMContentLoaded", () => {
  const textOverlay = document.getElementById("text_overlay_container");
  if (!textOverlay) return;

  const projectContainers = document.querySelectorAll(".project_container");
  if (!projectContainers.length) return;

  fetch("js/projectTexts.json")
    .then((response) => response.json())
    .then((projectTexts) => {
      let currentText = "";
      let wordsVisible = true;
      let timeouts = [];

      const highlightWords = (text) => {
        const rawWords = text.split(/\s+/);
        const highlightCount = Math.min(
          rawWords.length,
          3 + Math.floor(Math.random() * 5)
        );
        const indices = new Set();

        while (indices.size < highlightCount) {
          const index = Math.floor(Math.random() * rawWords.length);
          if (rawWords[index].trim()) {
            indices.add(index);
          }
        }

        return rawWords
          .map((word, i) => {
            const content = word + (i < rawWords.length - 1 ? " " : "");
            return indices.has(i)
              ? `<span class="word highlight">${content}</span>`
              : `<span class="word">${content}</span>`;
          })
          .join("");
      };

      const setOverlayText = (projectName) => {
        const nextText = projectTexts[projectName] || "";
        if (nextText !== currentText) {
          timeouts.forEach(clearTimeout);
          timeouts = [];
          textOverlay.innerHTML = nextText ? highlightWords(nextText) : "";
          currentText = nextText;
          wordsVisible = true;
        }
      };

      const toggleWords = () => {
        timeouts.forEach(clearTimeout);
        timeouts = [];

        const spans = Array.from(
          textOverlay.querySelectorAll('span.word:not(.highlight)')
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
        const dt = 4000 / steps;

        targets.forEach((span, index) => {
          const id = setTimeout(() => {
            span.style.display = hide ? "none" : "inline";
          }, (index + 1) * dt);
          timeouts.push(id);
        });
      };

      document.addEventListener("click", toggleWords);

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
});

