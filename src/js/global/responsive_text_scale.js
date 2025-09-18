/*
  responsive_text_scale.js
  - Keeps UI typography proportionate to viewport size using CSS custom properties.
  - Reference device: 13" MacBook Pro (≈1280x800 CSS pixels).
*/

(function () {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const REF_WIDTH = 1280;
  const REF_HEIGHT = 800;
  const REF_FONT_SIZE = 15; // px
  const REF_LINE_HEIGHT = 1.25;
  const REF_MARGIN = 5; // px
  const MIN_SCALE = 0.80;
  const MAX_SCALE = 1.10;

  const root = document.documentElement;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const computeScale = () => {
    const width = window.innerWidth || REF_WIDTH;
    const height = window.innerHeight || REF_HEIGHT;

    const diagRef = Math.hypot(REF_WIDTH, REF_HEIGHT);
    const diag = Math.hypot(width, height);
    let scale = diag / diagRef;

    scale = clamp(scale, MIN_SCALE, MAX_SCALE);

    if (width >= 1024) {
      scale = Math.max(scale, 0.94);
    } else if (width < 600) {
      scale = Math.max(scale, 0.90);
    }

    return clamp(scale, MIN_SCALE, MAX_SCALE);
  };

  const applyScale = () => {
    const scale = computeScale();
    const fontSize = REF_FONT_SIZE * scale;
    const lineHeight = Math.max(1.15, REF_LINE_HEIGHT * scale);
    const margin = clamp(REF_MARGIN * scale, 4, 8);

    root.style.setProperty('--ui-font-size', `${fontSize.toFixed(2)}px`);
    root.style.setProperty('--ui-line-height', lineHeight.toFixed(3));
    root.style.setProperty('--ui-margin', `${margin.toFixed(2)}px`);
    root.style.setProperty('--ui-scale', scale.toFixed(3));
  };

  let resizeRaf = null;
  const scheduleUpdate = () => {
    if (resizeRaf !== null) cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => {
      resizeRaf = null;
      applyScale();
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyScale, { once: true });
  } else {
    applyScale();
  }

  window.addEventListener('resize', scheduleUpdate, { passive: true });
  window.addEventListener('orientationchange', scheduleUpdate);
})();
