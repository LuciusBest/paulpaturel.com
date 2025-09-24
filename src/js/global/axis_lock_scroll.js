/*
  axis_lock_scroll.js
  - Prevents simultaneous vertical and horizontal scrolling on touch devices.
  - Locks the gesture to an axis based on the initial movement direction.
  - If vertical is chosen: temporarily disables horizontal scroll on the active
    .project_container to avoid diagonal jitter.
  - If horizontal is chosen: performs manual horizontal scrolling while
    preventing page vertical movement for a smooth, stable swipe.
*/

(function () {
  const isCoarse = typeof window !== 'undefined' &&
    (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  if (!isCoarse) return; // Only run on touch-first devices

  const main = document.querySelector('.main_container');
  const containers = Array.from(document.querySelectorAll('.project_container'));
  if (!main || !containers.length) return;

  const THRESHOLD = 8; // px before deciding axis

  let activeEl = null;
  let startX = 0;
  let startY = 0;
  let startScrollLeft = 0;
  let lock = null; // 'x' | 'y' | null
  let canScrollX = false;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const reset = () => {
    if (activeEl) activeEl.classList.remove('no-x-scroll');
    activeEl = null;
    startX = startY = startScrollLeft = 0;
    lock = null;
    canScrollX = false;
  };

  containers.forEach((el) => {
    // Record the start position
    el.addEventListener('touchstart', (ev) => {
      if (!ev.touches || ev.touches.length !== 1) return;
      const t = ev.touches[0];
      activeEl = el;
      startX = t.clientX;
      startY = t.clientY;
      startScrollLeft = el.scrollLeft;
      lock = null;
      canScrollX = (el.scrollWidth - el.clientWidth) > 1;
    }, { passive: true });

    // Decide axis and control scrolling accordingly
    el.addEventListener('touchmove', (ev) => {
      if (!activeEl || activeEl !== el || !ev.touches || ev.touches.length !== 1) return;
      const t = ev.touches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      const maxScrollX = Math.max(0, activeEl.scrollWidth - activeEl.clientWidth);

      if (!lock) {
        const dist = Math.abs(dx) + Math.abs(dy);
        if (dist < THRESHOLD) return; // not enough movement yet
        const preferredLock = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
        if (preferredLock === 'x' && (!canScrollX || maxScrollX <= 0)) {
          lock = 'y';
        } else {
          lock = preferredLock;
        }
        // If user is going vertical, immediately block horizontal on this container
        if (lock === 'y') {
          activeEl.classList.add('no-x-scroll');
        }
      }

      if (lock === 'x') {
        if (maxScrollX <= 0) {
          lock = 'y';
          activeEl.classList.add('no-x-scroll');
          return;
        }

        // If vertical motion becomes dominant mid-gesture, fall back to native vertical scroll.
        if (Math.abs(dy) > Math.abs(dx) * 1.2) {
          lock = 'y';
          activeEl.classList.add('no-x-scroll');
          return;
        }

        // Manual horizontal pan to avoid vertical scroll on the page
        // Prevent default to block vertical page scroll and allow smooth x-only move
        const nextScrollLeft = clamp(startScrollLeft - dx, 0, maxScrollX);

        // If we are against an edge and the user is mostly swiping vertically, release the lock.
        const atStartEdge = nextScrollLeft <= 0 && dx > 0;
        const atEndEdge = nextScrollLeft >= maxScrollX && dx < 0;
        if ((atStartEdge || atEndEdge) && Math.abs(dy) > Math.abs(dx)) {
          lock = 'y';
          activeEl.classList.add('no-x-scroll');
          return;
        }

        ev.preventDefault();
        activeEl.scrollLeft = nextScrollLeft;
        return;
      } else {
        // Vertical: let the browser handle vertical scroll on main_container
        // Horizontal scroll is disabled by class to prevent diagonal drift
      }
    }, { passive: false });

    // Clean up
    el.addEventListener('touchend', reset, { passive: true });
    el.addEventListener('touchcancel', reset, { passive: true });
  });
})();
