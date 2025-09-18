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

  const signalUiActivity = () => {
    try {
      window.dispatchEvent(new CustomEvent("ui:activity", { detail: { source: "diapo" } }));
    } catch (_) {
      try {
        window.dispatchEvent(new Event("ui:activity"));
      } catch (_) {}
    }
  };

  // Small utility: ensure an <img> is decoded (and mark it as loaded)
  const isImgLoaded = (img) => img.complete && img.naturalWidth > 0;
  const markLoaded = (img) => { img.dataset.loaded = "1"; };
  const ensureLoaded = (img) => {
    if (isImgLoaded(img) || img.dataset.loaded === "1") {
      markLoaded(img);
      return Promise.resolve(true);
    }
    if (img.__decodePromise) return img.__decodePromise;
    try { img.loading = "eager"; } catch (_) {}
    try { img.fetchPriority = "high"; } catch (_) {}
    try { img.decoding = "async"; } catch (_) {}
    // Decode if supported, otherwise wait for load
    const viaDecode = typeof img.decode === "function"
      ? img.decode().then(() => true).catch(() => false)
      : Promise.resolve(false);
    img.__decodePromise = viaDecode.then((ok) => {
      if (ok) {
        markLoaded(img);
        return true;
      }
      if (isImgLoaded(img)) {
        markLoaded(img);
        return true;
      }
      return new Promise((resolve) => {
        const onDone = () => { markLoaded(img); resolve(true); };
        const onErr = () => { resolve(false); };
        img.addEventListener("load", onDone, { once: true });
        img.addEventListener("error", onErr, { once: true });
      });
    }).finally(() => { img.__decodePromise = null; });
    return img.__decodePromise;
  };

  // Prepare slideshows registry
  const slideshows = frames
    .map((el) => {
      const images = Array.from(el.querySelectorAll("img"));
      if (!images.length) return null;

      const activityTargets = ["pointermove", "pointerdown", "mousemove", "mousedown", "touchstart", "touchmove"];
      activityTargets.forEach((evt) => {
        el.addEventListener(evt, signalUiActivity, { passive: true });
      });

      // Hint the browser for decoding and initial loading policy
      images.forEach((img, i) => {
        try { img.decoding = "async"; } catch (_) {}
        if (i === 0) {
          // First image eager and pre-decoded for instant first paint
          try { img.loading = "eager"; } catch (_) {}
          try { img.fetchPriority = "high"; } catch (_) {}
          ensureLoaded(img);
        } else {
          try { img.loading = "lazy"; } catch (_) {}
          try { img.fetchPriority = "low"; } catch (_) {}
        }
      });

      return {
        el,
        images,
        // Index the user points to (requested), and the one currently visible
        requestedIndex: -1,
        visibleIndex: -1,
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
    // If the target isn't loaded yet, keep current image visible, and schedule a swap
    const target = slideshow.images[index];
    const canShow = target && (target.dataset.loaded === "1" || (target.complete && target.naturalWidth > 0));
    if (!canShow) {
      // Start decoding; when ready, only swap if request still points to this index
      ensureLoaded(target).then(() => {
        if (slideshow.requestedIndex === index) {
          applyActive(slideshow, index);
        }
      });
      return;
    }

    // Swap now; crossfade handled by CSS
    slideshow.images.forEach((img, i) => {
      const isActive = i === index;
      img.classList.toggle("active", isActive);
      if (isActive) img.setAttribute("aria-current", "true");
      else img.removeAttribute("aria-current");
    });
    slideshow.visibleIndex = index;
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
      if (idx !== slideshow.requestedIndex) {
        slideshow.requestedIndex = idx;
        // Hint network priority to the requested image
        try { slideshow.images[idx].fetchPriority = "high"; } catch (_) {}
        // Preload the requested and its neighbors to minimize future waits
        const around = [idx - 1, idx, idx + 1].filter(i => i >= 0 && i < slideshow.images.length);
        around.forEach(i => ensureLoaded(slideshow.images[i]));

        // Only emit/index change when we actually swap the visible image
        const before = slideshow.visibleIndex;
        applyActive(slideshow, idx);
        const after = slideshow.visibleIndex;
        if (after !== before && after >= 0) {
          emitChange(slideshow.el, slideshow.images.length, after);
        }
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

  // Observer: only process visible diaporamas; prep initial decode on entry
  const visibility = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const el = entry.target;
        const ss = slideshows.find((s) => s.el === el);
        if (!ss) return;
        if (entry.isIntersecting) {
          if (!activeSet.has(ss)) {
            // Prime decode for the first few images for quick initial interactions
            const toPrime = ss.images.slice(0, Math.min(3, ss.images.length));
            toPrime.forEach((img) => ensureLoaded(img));
          }
          activeSet.add(ss);
          // Initialize to current mouse position
          const idx = computeIndex(ss, lastClientX);
          if (idx !== ss.requestedIndex) {
            ss.requestedIndex = idx;
            // Prefer showing requested if ready; otherwise keep current or fall back to first
            const target = ss.images[idx];
            const targetReady = target && (target.dataset.loaded === "1" || (target.complete && target.naturalWidth > 0));
            let showIndex = -1;
            if (targetReady) showIndex = idx;
            else if (ss.visibleIndex >= 0) showIndex = ss.visibleIndex; // keep current image on screen
            else showIndex = 0; // first-time entry fallback

            // Kick off decoding for requested and neighbors
            const around = [idx - 1, idx, idx + 1].filter(i => i >= 0 && i < ss.images.length);
            around.forEach(i => ensureLoaded(ss.images[i]));

            const before = ss.visibleIndex;
            if (showIndex >= 0) applyActive(ss, showIndex);
            const after = ss.visibleIndex;
            if (after !== before && after >= 0) {
              emitChange(ss.el, ss.images.length, after);
            }
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
