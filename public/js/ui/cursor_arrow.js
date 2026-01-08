// Custom right-arrow cursor using IS-Arzier font on links and Camille video

document.addEventListener('DOMContentLoaded', () => {
  const SELECTOR = [
    'a[href]',
    '[role="link"]',
    '.contact-chip[data-url]',
    '[data-link-cursor]',
    '.project_container[data-project-key=\"CamilleLeprinceWEB\"] video',
    '.project_container[data-project=\"CamilleLeprinceWEB\"] video',
    '.project_container[data-project-key=\"GRIME_INDEX\"] video',
    '.project_container[data-project=\"GRIME_INDEX\"] video',
    '.project_container[data-project=\"Grime Index\"] video',
    '.project_container[data-project-key=\"LAMANT\"] .slide:nth-of-type(2) .wrapper--centered img'
  ].join(', ');
  let activeEl = null;
  let arrow = document.getElementById('cursor_arrow');
  if (!arrow) {
    arrow = document.createElement('div');
    arrow.id = 'cursor_arrow';
    arrow.innerHTML = '<span class="cursor-arrow-glyph">→</span><span class="cursor-arrow-text"> see</span>';
    document.body.appendChild(arrow);
  }

  const showArrow = () => { arrow.style.opacity = '1'; };
  const hideArrow = () => { arrow.style.opacity = '0'; };
  const moveArrow = (e) => {
    arrow.style.left = `${e.clientX}px`;
    arrow.style.top = `${e.clientY}px`;
  };

  const shouldSkip = (el) => {
    if (!el) return false;
    try {
      return el.closest('[data-no-custom-cursor]') != null;
    } catch (_) {
      return false;
    }
  };

  const activate = (el) => {
    if (shouldSkip(el)) {
      if (activeEl) deactivate(activeEl);
      return;
    }
    if (activeEl === el) return;
    if (activeEl) activeEl.classList.remove('use-arrow-cursor');
    activeEl = el;
    if (activeEl) activeEl.classList.add('use-arrow-cursor');
    // Suppress native title tooltip while hovered
    if (activeEl && activeEl.hasAttribute('title')) {
      const t = activeEl.getAttribute('title');
      if (t != null) {
        activeEl.setAttribute('data-title-saved', t);
        activeEl.removeAttribute('title');
      }
    }
    showArrow();
  };

  const deactivate = (el) => {
    if (!activeEl) return;
    // Only deactivate when actually leaving the active element
    if (el !== activeEl) return;
    // Restore title tooltip if we suppressed it
    const saved = activeEl.getAttribute('data-title-saved');
    if (saved != null) {
      activeEl.setAttribute('title', saved);
      activeEl.removeAttribute('data-title-saved');
    }
    activeEl.classList.remove('use-arrow-cursor');
    activeEl = null;
    hideArrow();
  };

  // Pointer movement to position the arrow
  window.addEventListener('mousemove', (e) => {
    if (arrow) moveArrow(e);
  }, { passive: true });

  // Delegated enter/leave logic
  document.addEventListener('mouseover', (e) => {
    const el = e.target.closest(SELECTOR);
    if (el) activate(el);
  }, true);

  document.addEventListener('mouseout', (e) => {
    const el = e.target.closest(SELECTOR);
    if (!el) return;
    // If moving to a descendant still within el, ignore
    const to = e.relatedTarget;
    if (to && el.contains(to)) return;
    deactivate(el);
  }, true);
});
