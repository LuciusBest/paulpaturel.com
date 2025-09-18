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

  const reset = () => {
    if (activeEl) activeEl.classList.remove('no-x-scroll');
    activeEl = null;
    startX = startY = startScrollLeft = 0;
    lock = null;
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
    }, { passive: true });

    // Decide axis and control scrolling accordingly
    el.addEventListener('touchmove', (ev) => {
      if (!activeEl || activeEl !== el || !ev.touches || ev.touches.length !== 1) return;
      const t = ev.touches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;

      if (!lock) {
        const dist = Math.abs(dx) + Math.abs(dy);
        if (dist < THRESHOLD) return; // not enough movement yet
        lock = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
        // If user is going vertical, immediately block horizontal on this container
        if (lock === 'y') {
          activeEl.classList.add('no-x-scroll');
        }
      }

      if (lock === 'x') {
        // Manual horizontal pan to avoid vertical scroll on the page
        // Prevent default to block vertical page scroll and allow smooth x-only move
        ev.preventDefault();
        activeEl.scrollLeft = startScrollLeft - dx;
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

