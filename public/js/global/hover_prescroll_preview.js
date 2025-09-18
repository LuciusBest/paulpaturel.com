/*
  hover_prescroll_preview.js
  - Adds a hover-driven horizontal pre-scroll preview for project containers on pointer devices.
  - Uses real scrollLeft animations while respecting existing scroll-snap settings.
*/

(function () {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const pointerFineQuery = window.matchMedia('(pointer: fine)');
  if (!pointerFineQuery || !pointerFineQuery.matches) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (prefersReducedMotion && prefersReducedMotion.matches) return;

  const containers = Array.from(document.querySelectorAll('.project_container'));
  if (!containers.length) return;

  const PREVIEW_ZONE_RATIO = 0.25;
  const PREVIEW_SHIFT_RATIO = 0.10;
  const PREVIEW_DURATION = 400;
  const FULL_DURATION = 400;
  const EPSILON = 0.5;
  const pointerTypes = new Set(['mouse', 'pen']);

  const easeOutQuad = (t) => 1 - (1 - t) * (1 - t);
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const instances = [];

  const abortAll = () => {
    instances.forEach((inst) => inst.abortImmediate());
  };

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) abortAll();
  });

  window.addEventListener('keydown', abortAll);

  containers.forEach((container) => {
    const instance = setupHoverPreview(container);
    if (instance) instances.push(instance);
  });

  function setupHoverPreview(container) {
    const state = {
      mode: 'idle', // 'idle' | 'preview' | 'preview-hold' | 'returning' | 'full'
      animation: null,
      previewBaseline: container.scrollLeft || 0,
      currentDirection: null,
      pendingDirection: null,
      pointerInside: false,
      snapDisabled: false,
      prevSnapType: '',
      prevSnapStop: '',
      pointerRAF: 0,
      pendingClientX: null,
      lastClientX: null,
    };

    const disableSnap = () => {
      if (state.snapDisabled) return;
      state.snapDisabled = true;
      state.prevSnapType = container.style.scrollSnapType;
      state.prevSnapStop = container.style.scrollSnapStop;
      container.style.setProperty('scroll-snap-type', 'none');
      container.style.setProperty('scroll-snap-stop', 'normal');
    };

    const enableSnap = () => {
      if (!state.snapDisabled) return;
      state.snapDisabled = false;
      if (state.prevSnapType) {
        container.style.scrollSnapType = state.prevSnapType;
      } else {
        container.style.removeProperty('scroll-snap-type');
      }
      if (state.prevSnapStop) {
        container.style.scrollSnapStop = state.prevSnapStop;
      } else {
        container.style.removeProperty('scroll-snap-stop');
      }
      state.prevSnapType = '';
      state.prevSnapStop = '';
    };

    const cancelAnimation = (jumpToEnd) => {
      if (!state.animation) return;
      const anim = state.animation;
      state.animation = null;
      anim.cancel(jumpToEnd);
    };

    const finishIdle = () => {
      state.mode = 'idle';
      state.animation = null;
      state.currentDirection = null;
      state.pendingDirection = null;
      container.style.cursor = '';
      state.previewBaseline = container.scrollLeft;
    };

    const animateTo = (target, duration, ease, onComplete) => {
      const start = container.scrollLeft;
      const delta = target - start;
      if (Math.abs(delta) <= EPSILON || duration <= 0) {
        container.scrollLeft = target;
        if (onComplete) onComplete();
        return null;
      }
      const anim = {
        raf: 0,
        cancelled: false,
        cancel(jump) {
          if (this.cancelled) return;
          this.cancelled = true;
          if (this.raf) cancelAnimationFrame(this.raf);
          if (jump) container.scrollLeft = target;
        },
      };
      const startTime = performance.now();
      const step = (now) => {
        if (anim.cancelled) return;
        const elapsed = now - startTime;
        const t = duration === 0 ? 1 : Math.min(1, elapsed / duration);
        const eased = ease(t);
        container.scrollLeft = start + delta * eased;
        if (t < 1) {
          anim.raf = requestAnimationFrame(step);
        } else {
          anim.cancelled = true;
          anim.raf = 0;
          container.scrollLeft = target;
          state.animation = null;
          if (onComplete) onComplete();
        }
      };
      anim.raf = requestAnimationFrame(step);
      return anim;
    };

    const reprocessIfEligible = () => {
      if (!state.pointerInside || state.lastClientX == null || state.animation) return;
      processPointerPosition(state.lastClientX);
    };

    const updateCursor = (direction) => {
      if (direction === 'left') {
        container.style.cursor = 'w-resize';
      } else if (direction === 'right') {
        container.style.cursor = 'e-resize';
      } else {
        container.style.cursor = '';
      }
    };

    const exitPreview = () => {
      if (state.mode !== 'preview' && state.mode !== 'preview-hold') {
        state.currentDirection = null;
        updateCursor(null);
        return;
      }
      const target = state.previewBaseline;
      state.mode = 'returning';
      state.pendingDirection = null;
      cancelAnimation(false);
      if (Math.abs(container.scrollLeft - target) <= EPSILON) {
        enableSnap();
        finishIdle();
        return;
      }
      disableSnap();
      state.animation = animateTo(target, PREVIEW_DURATION, easeOutQuad, () => {
        enableSnap();
        finishIdle();
        reprocessIfEligible();
      });
    };

    const startPreview = (direction) => {
      if (state.mode === 'full' || state.animation) return;
      state.previewBaseline = container.scrollLeft;
      const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth);
      const shift = container.clientWidth * PREVIEW_SHIFT_RATIO;
      let target = direction === 'left'
        ? state.previewBaseline - shift
        : state.previewBaseline + shift;
      target = clamp(target, 0, maxScroll);
      if (Math.abs(target - state.previewBaseline) <= EPSILON) {
        state.pendingDirection = null;
        state.currentDirection = null;
        updateCursor(null);
        enableSnap();
        state.mode = 'idle';
        return;
      }
      disableSnap();
      state.currentDirection = direction;
      updateCursor(direction);
      cancelAnimation(false);
      state.mode = 'preview';
      state.animation = animateTo(target, PREVIEW_DURATION, easeOutQuad, () => {
        if (state.mode === 'preview') {
          state.mode = 'preview-hold';
        }
      });
    };

    const computeSnapPositions = () => {
      const slides = Array.from(container.children).filter((child) => child.classList && child.classList.contains('slide'));
      const offsets = slides.map((slide) => slide.offsetLeft).sort((a, b) => a - b);
      const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth);
      if (!offsets.length) {
        offsets.push(0);
      }
      if (Math.abs(offsets[offsets.length - 1] - maxScroll) > 1) {
        offsets.push(maxScroll);
      }
      return offsets;
    };

    const findTarget = (direction) => {
      const positions = computeSnapPositions();
      const current = container.scrollLeft;
      if (direction === 'right') {
        for (let i = 0; i < positions.length; i += 1) {
          if (positions[i] > current + 1) return positions[i];
        }
        return null;
      }
      for (let i = positions.length - 1; i >= 0; i -= 1) {
        if (positions[i] < current - 1) return positions[i];
      }
      return null;
    };

    const performFullScroll = (direction) => {
      if (state.mode === 'full') return;
      const target = findTarget(direction);
      if (target == null) {
        exitPreview();
        return;
      }
      disableSnap();
      cancelAnimation(false);
      state.mode = 'full';
      state.currentDirection = null;
      state.pendingDirection = null;
      updateCursor(null);
      state.animation = animateTo(target, FULL_DURATION, easeOutCubic, () => {
        const finalize = () => {
          container.scrollLeft = target;
          enableSnap();
          finishIdle();
          reprocessIfEligible();
        };
        if (document.hidden) {
          finalize();
        } else {
          requestAnimationFrame(finalize);
        }
      });
      if (!state.animation) {
        container.scrollLeft = target;
        enableSnap();
        finishIdle();
        reprocessIfEligible();
      }
    };

    const processPointerPosition = (clientX) => {
      if (!state.pointerInside) return;
      state.lastClientX = clientX;
      const rect = container.getBoundingClientRect();
      const width = rect.width;
      if (!width) {
        state.pendingDirection = null;
        return;
      }
      const relativeX = clientX - rect.left;
      const leftEdge = width * PREVIEW_ZONE_RATIO;
      const rightEdge = width * (1 - PREVIEW_ZONE_RATIO);
      const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth);
      const scrollLeft = container.scrollLeft;
      const canScrollLeft = scrollLeft > EPSILON;
      const canScrollRight = scrollLeft < maxScroll - EPSILON;
      let direction = null;
      if (relativeX <= leftEdge && canScrollLeft) {
        direction = 'left';
      } else if (relativeX >= rightEdge && canScrollRight) {
        direction = 'right';
      }

      if (!direction) {
        state.pendingDirection = null;
        if (state.currentDirection) exitPreview();
        updateCursor(null);
        return;
      }

      state.pendingDirection = direction;

      if (state.currentDirection && state.currentDirection !== direction) {
        if (state.mode === 'preview' || state.mode === 'preview-hold') {
          exitPreview();
        }
        return;
      }

      if (state.mode === 'preview' || state.mode === 'preview-hold') {
        updateCursor(direction);
        return;
      }

      if (state.animation && state.mode !== 'returning') return;

      if (state.mode === 'returning') return;

      startPreview(direction);
    };

    const schedulePointerMove = (event) => {
      if (!pointerTypes.has(event.pointerType)) return;
      state.pendingClientX = event.clientX;
      if (state.pointerRAF) return;
      state.pointerRAF = requestAnimationFrame(() => {
        state.pointerRAF = 0;
        if (state.pendingClientX == null) return;
        const x = state.pendingClientX;
        state.pendingClientX = null;
        processPointerPosition(x);
      });
    };

    const onPointerEnter = (event) => {
      if (!pointerTypes.has(event.pointerType)) return;
      state.pointerInside = true;
      state.previewBaseline = container.scrollLeft;
      processPointerPosition(event.clientX);
    };

    const onPointerLeave = (event) => {
      if (!pointerTypes.has(event.pointerType)) return;
      state.pointerInside = false;
      state.pendingClientX = null;
      state.lastClientX = null;
      if (state.mode === 'preview' || state.mode === 'preview-hold') {
        exitPreview();
      } else if (state.mode === 'returning') {
        // let the return animation finish
      } else {
        cancelAnimation(false);
        enableSnap();
        finishIdle();
      }
    };

    const onClick = (event) => {
      if (event.defaultPrevented) return;
      if (!state.pointerInside) return;
      const direction = state.currentDirection || state.pendingDirection;
      if (!direction) return;
      performFullScroll(direction);
    };

    const abortImmediate = () => {
      if (state.mode === 'idle' && !state.animation) return;
      cancelAnimation(false);
      if (state.mode === 'preview' || state.mode === 'preview-hold' || state.mode === 'returning') {
        container.scrollLeft = state.previewBaseline;
      }
      enableSnap();
      finishIdle();
    };

    const onWheel = () => {
      abortImmediate();
    };

    container.addEventListener('pointerenter', onPointerEnter, { passive: true });
    container.addEventListener('pointerleave', onPointerLeave, { passive: true });
    container.addEventListener('pointercancel', onPointerLeave, { passive: true });
    container.addEventListener('pointermove', schedulePointerMove, { passive: true });
    container.addEventListener('click', onClick);
    container.addEventListener('wheel', onWheel, { passive: true });

    container.addEventListener('scroll', () => {
      if (state.mode === 'idle' && !state.animation) {
        state.previewBaseline = container.scrollLeft;
      }
    }, { passive: true });

    return {
      abortImmediate,
    };
  }
})();
