/*
  diaporama_mouse.js
  - Sélection d'image pilotée par la position de la souris pour chaque ".wrapper--diaporama .diapo-frame".
  - Projette la position horizontale du curseur sur l'index d'image et alterne
    la classe "active" pour afficher l'image correspondante.
  - Initialise en supposant le curseur centré à l'écran.
*/

document.addEventListener("DOMContentLoaded", () => {
  const frames = Array.from(document.querySelectorAll(".wrapper--diaporama .diapo-frame"));
  if (!frames.length) return;

  // Prepare slideshows registry
  const slideshows = frames
    .map((el) => {
      const images = Array.from(el.querySelectorAll("img"));
      if (!images.length) return null;

      // Hint the browser for decoding and initial loading policy
      images.forEach((img, i) => {
        try { img.decoding = "async"; } catch (_) {}
        if (i === 0) {
          // First image eager for instant display when visible
          try { img.loading = "eager"; } catch (_) {}
        } else {
          try { img.loading = "lazy"; } catch (_) {}
        }
      });

      return {
        el,
        images,
        lastIndex: -1,
      };
    })
    .filter(Boolean);

  // Helper to emit change events (consumed by pagination)
  const emitChange = (el, total, index) => {
    const ev = new CustomEvent("diapochange", {
      bubbles: true,
      detail: { index, total, source: "mouse" },
    });
    el.dispatchEvent(ev);
  };

  const applyActive = (slideshow, index) => {
    slideshow.images.forEach((img, i) => {
      const isActive = i === index;
      img.classList.toggle("active", isActive);
      if (isActive) img.setAttribute("aria-current", "true");
      else img.removeAttribute("aria-current");
    });
  };

  // Active set controlled by IntersectionObserver
  const activeSet = new Set();

  // Compute index from a clientX for a given slideshow
  const computeIndex = (slideshow, clientX) => {
    const rect = slideshow.el.getBoundingClientRect();
    const relativeX = clientX - rect.left;
    const w = rect.width > 0 ? rect.width : 1;
    const percent = Math.max(0, Math.min(1, relativeX / w));
    const raw = Math.floor(percent * slideshow.images.length);
    return Math.max(0, Math.min(slideshow.images.length - 1, raw));
  };

  // Mousemove batching via rAF
  let lastClientX = window.innerWidth / 2;
  let rafScheduled = false;
  const updateAll = () => {
    rafScheduled = false;
    activeSet.forEach((slideshow) => {
      const idx = computeIndex(slideshow, lastClientX);
      if (idx !== slideshow.lastIndex) {
        slideshow.lastIndex = idx;
        applyActive(slideshow, idx);
        emitChange(slideshow.el, slideshow.images.length, idx);
      }
    });
  };

  const onMouseMove = (e) => {
    lastClientX = e.clientX;
    if (!rafScheduled) {
      rafScheduled = true;
      requestAnimationFrame(updateAll);
    }
  };

  // Observer: only process visible diaporamas; load their images eagerly on first entry
  const visibility = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const el = entry.target;
        const ss = slideshows.find((s) => s.el === el);
        if (!ss) return;
        if (entry.isIntersecting) {
          if (!activeSet.has(ss)) {
            // Upgrade loading policy when entering viewport to avoid blanks on hover
            ss.images.forEach((img) => {
              try { img.loading = "eager"; } catch (_) {}
            });
          }
          activeSet.add(ss);
          // Initialize to current mouse position
          const idx = computeIndex(ss, lastClientX);
          if (idx !== ss.lastIndex) {
            ss.lastIndex = idx;
            applyActive(ss, idx);
            emitChange(ss.el, ss.images.length, idx);
          }
        } else {
          activeSet.delete(ss);
        }
      });
    },
    { threshold: 0.1 }
  );

  slideshows.forEach((ss) => visibility.observe(ss.el));

  // Initial state assuming centered cursor
  updateAll();
  window.addEventListener("mousemove", onMouseMove, { passive: true });
});
