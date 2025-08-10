document.addEventListener("DOMContentLoaded", () => {
  const textOverlay = document.getElementById("text_overlay_container");
  if (!textOverlay) return;

  const projectContainers = document.querySelectorAll(".project_container");
  if (!projectContainers.length) return;

  const projectTexts = {
    LOTTOFPRINTS: "Lottofprints Project",
    SYNTHETIC_ORGANIC: "Synthetic Organic Project",
    SENS_UNIK: "Sens Unik Project",
    RLSH: "RLSH Project",
    Relay: "Relay Project",
  };

  let currentText = "";

  const setOverlayText = (projectName) => {
    const nextText = projectTexts[projectName] || "";
    if (nextText !== currentText) {
      textOverlay.textContent = nextText;
      currentText = nextText;
    }
  };

  const thresholds = Array.from({ length: 101 }, (_, i) => i / 100);
  const visibilityMap = new Map();

  const observer = new IntersectionObserver((entries) => {
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
  }, { threshold: thresholds });

  projectContainers.forEach((container) => {
    visibilityMap.set(container, 0);
    observer.observe(container);
  });
});

