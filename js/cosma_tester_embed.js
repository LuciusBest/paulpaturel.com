// Scoped COSMA web font tester embed
(function () {
  // Debug logging
  const DEBUG = false;
  const dbg = (...args) => { try { if (DEBUG) console.log('[COSMA]', ...args); } catch (_) {} };
  const container = document.querySelector(
    '.project_container[data-project="COSMA"] .wrapper--centered'
  );
  if (!container) { dbg('no COSMA container found'); return; }

  const tester = container.querySelector('.cosma-tester');
  const letter = container.querySelector('.cosma-letter');
  if (!tester || !letter) { dbg('tester or letter missing'); return; }

  // Create a dedicated stage area (grid row 1) so controls never affect sizing
  let stage = tester.querySelector('.cosma-stage');
  if (!stage) {
    stage = document.createElement('div');
    stage.className = 'cosma-stage';
    // Place stage as the first child and move the letter inside it
    tester.insertBefore(stage, tester.firstChild);
    stage.appendChild(letter);
  }
  dbg('init', { textLen: (letter.textContent || '').length });

  // Palettes scoped to the tester container (do not touch body)
  const palettes = [
    { name: 'power-signal', background: null, color: '#0080FF' },
    { name: 'monochrome-mix', background: '#FFFFFF', color: '#000000' },
    { name: 'pop-peak', background: '#FFFFFF', color: '#FF0B0B' },
    { name: 'studio-depth', background: '#848C76', color: '#1C1B1A' },
    { name: 'mp3-shell', background: '#000000', color: '#E0E0E0' },
  ];
  let currentPaletteIndex = 0;

  // Variation axes state (driven by sliders)
  let opticalSize = 0;   // opsz target (clamped)
  let weight = 400;      // wght target (clamped)
  let width = 50;        // wdth target (clamped)

  // Utilities
  const map = (value, a1, a2, b1, b2) => b1 + (b2 - b1) * ((value - a1) / (a2 - a1));
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const debounce = (fn, wait) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  };

  // Stable, consistent downscale: keep text fully visible inside the stage
  const MARGIN_FRAC = 0.07; // 7% minimum margin on each side
  let lastFontSize = null;
  const fitsWithin = (fsPx) => {
    if (!fsPx || fsPx <= 0) return false;
    // Disable transitions during measurement to avoid reading in-flight sizes
    const prevTransition = letter.style.transition;
    letter.style.transition = 'none';
    letter.style.fontSize = `${fsPx}px`;
    // Force reflow
    void letter.offsetWidth;
    // Target box with consistent margins on both axes
    const sw = stage.clientWidth;
    const sh = stage.clientHeight;
    const boxW = Math.max(0, sw - 2 * sw * MARGIN_FRAC); // 86% of stage width
    const boxH = Math.max(0, sh - 2 * sh * MARGIN_FRAC); // 86% of stage height
    const pad = 1.0; // px hysteresis to avoid flip-flop
    const lw = letter.scrollWidth;
    const lh = letter.scrollHeight;
    const overW = lw > (boxW - pad);
    const overH = lh > (boxH - pad);
    const ok = !(overW || overH);
    // Restore transition
    letter.style.transition = prevTransition;
    dbg('fitsWithin', { fsPx, sw, sh, boxW: Math.round(boxW), boxH: Math.round(boxH), scrollW: lw, scrollH: lh, overW, overH, ok });
    return ok;
  };

  let lastCause = 'init';
  let fitSeq = 0;
  const fitText = () => {
    const seq = ++fitSeq;
    // Responsive scale: shrink or grow with 7% margins on both axes
    const sw = stage.clientWidth;
    const sh = stage.clientHeight;
    if (!sw || !sh || sw < 10 || sh < 10) { dbg('fit skip, stage not ready', { seq, sw, sh, cause: lastCause }); return; }

    let current = lastFontSize;
    if (!current) {
      const cs = getComputedStyle(letter);
      current = parseFloat(cs.fontSize) || (0.25 * window.innerHeight); // default from CSS 25vh
    }
    dbg('fit start', { seq, cause: lastCause, current });

    // Binary search helper between lo (fits) and hi (overflows)
    const binSearch = (lo, hi) => {
      for (let i = 0; i < 16; i++) {
        const mid = lo + (hi - lo) / 2;
        if (fitsWithin(mid)) lo = mid; else hi = mid;
      }
      return lo;
    };

    const minPx = Math.max(12, 0.05 * window.innerHeight); // 5vh minimum

    if (!fitsWithin(current)) {
      // Shrink to fit
      if (!fitsWithin(minPx)) {
        letter.style.fontSize = `${minPx}px`;
        lastFontSize = minPx;
        dbg('fit result (min enforced)', { seq, fs: minPx });
        return;
      }
      const fitted = binSearch(minPx, Math.max(minPx + 1, current));
      letter.style.fontSize = `${fitted}px`;
      lastFontSize = fitted;
      dbg('fit result (shrink)', { seq, fs: fitted });
      return;
    }

    // Grow to fill but never exceed the CSS default cap (baseFontSize)
    const cap = Math.max(minPx, 0.25 * window.innerHeight); // 25vh cap computed each fit
    if (current >= cap) {
      const clamped = Math.min(current, cap);
      if (clamped !== current) {
        letter.style.fontSize = `${clamped}px`;
        lastFontSize = clamped;
      }
      dbg('fit result (at cap)', { seq, fs: lastFontSize, cap });
      return;
    }
    let lo = current;                  // known to fit
    let hi = Math.min(cap, current * 1.2);
    let probes = 0;
    const MAX_PROBE = 10;
    while (probes++ < MAX_PROBE && hi < cap && fitsWithin(hi)) {
      lo = hi;
      hi = Math.min(cap, hi * 1.2);
    }
    if (hi >= cap && fitsWithin(cap)) {
      letter.style.fontSize = `${cap}px`;
      lastFontSize = cap;
      dbg('fit result (grow to cap)', { seq, fs: cap });
      return;
    }
    hi = Math.max(lo + 1, Math.min(hi, cap));
    const target = binSearch(lo, hi);
    if (lastFontSize == null || Math.abs(target - lastFontSize) > 0.5) {
      letter.style.fontSize = `${target}px`;
      lastFontSize = target;
      dbg('fit result (grow bin)', { seq, fs: target });
    } else {
      dbg('fit result (grow unchanged)', { seq, fs: lastFontSize });
    }
  };
  const fitTextDebounced = debounce(fitText, 50);
  const requestFit = (cause) => { lastCause = cause || 'unknown'; fitTextDebounced(); };

  // Update variation settings from current state
  const applyVariations = () => {
    const cw = clamp(width, 50, 300);
    const cg = clamp(weight, 100, 900);
    const co = clamp(opticalSize, 0, 100);
    letter.style.fontVariationSettings = `'wdth' ${cw.toFixed(1)}, 'wght' ${cg.toFixed(1)}, 'opsz' ${co.toFixed(1)}`;
  };

  // Remove mouse-move driven variation; replaced by sliders

  // Remove wheel-driven variation; use sliders and let page scroll normally

  // Inside tester: just stop propagation (no theme cycling)
  tester.addEventListener('click', (e) => { e.stopPropagation(); });

  // Text input and window resize
  letter.addEventListener('input', () => {
    // If the user edits the content, automatically switch to MANUAL mode
    if (tester.dataset.mode === 'auto') {
      try {
        const btn = tester.querySelector('.cosma-topbar .cosma-mode-toggle');
        if (btn) {
          btn.classList.remove('is-auto');
          btn.setAttribute('aria-pressed', 'false');
          const label = btn.querySelector('.label');
          if (label) label.textContent = 'MANUAL';
        }
      } catch (_) {}
      tester.dataset.mode = 'manual';
      autoToken++; // stop any running auto loop
    }
    lastFontSize = null; dbg('input'); requestFit('input');
  });
  // Also stop click propagation when editing the text itself
  letter.addEventListener('click', (e) => e.stopPropagation());
  window.addEventListener('resize', () => { dbg('resize'); requestFit('resize'); });
  // React to grid/controls size changes precisely
  try {
    const ro = new ResizeObserver(fitTextDebounced);
    ro.observe(stage);
  } catch (_) {}
  // Also observe content mutations inside the letter (programmatic changes)
  try {
    const mo = new MutationObserver(() => { lastFontSize = null; requestFit('mutation'); });
    mo.observe(letter, { childList: true, characterData: true, subtree: true });
  } catch (_) {}

  // Build a top bar for the Manual/Auto toggle
  const topbar = document.createElement('div');
  topbar.className = 'cosma-topbar';
  // Default to AUTO mode visually and semantically
  topbar.innerHTML = `
    <button type="button" class="cosma-mode-toggle is-auto" aria-pressed="true" aria-label="Toggle auto sizing" style="pointer-events:auto">
      <span class="dot" aria-hidden="true"></span>
      <span class="label">AUTO</span>
    </button>`;
  tester.dataset.mode = 'auto';
  tester.appendChild(topbar);

  // Build bottom sliders for axes control
  const controls = document.createElement('div');
  controls.className = 'cosma-controls';
  const initW = Math.round(clamp(weight, 100, 900));
  const initD = Math.round(clamp(width, 50, 300));
  const initO = Math.round(clamp(opticalSize, 0, 100));
  controls.innerHTML = `
    <div class="cosma-row"><span class="cosma-label">WGHT</span><input id="cosma-wght" class="cosma-slider" type="range" min="100" max="900" step="1" value="${initW}" data-axis="wght"><span class="cosma-val" data-for="wght">${initW}</span></div>
    <div class="cosma-row"><span class="cosma-label">WDTH</span><input id="cosma-wdth" class="cosma-slider" type="range" min="50" max="300" step="1" value="${initD}" data-axis="wdth"><span class="cosma-val" data-for="wdth">${initD}</span></div>
    <div class="cosma-row"><span class="cosma-label">CTRST</span><input id="cosma-opsz" class="cosma-slider" type="range" min="0" max="100" step="1" value="${initO}" data-axis="opsz"><span class="cosma-val" data-for="opsz">${initO}</span></div>
  `;
  tester.appendChild(controls);

  // Prevent interactions with controls from bubbling or invoking page scroll hacks
  ['click','mousedown','mouseup','pointerdown','pointerup','wheel','touchstart'].forEach((type) => {
    controls.addEventListener(type, (ev) => ev.stopPropagation());
  });

  const setSliderVisual = (input) => {
    if (!input) return;
    const min = parseFloat(input.min) || 0;
    const max = parseFloat(input.max) || 100;
    const val = parseFloat(input.value);
    const p = isFinite(val) && max > min ? ((val - min) / (max - min)) * 100 : 0;
    input.style.setProperty('--p', `${Math.max(0, Math.min(100, p))}%`);
  };

  // Animate numeric readouts to follow slider fill smoothly
  let isDragging = false;
  const getNumAnimDuration = () => (isDragging ? 0 : (tester.dataset.mode === 'auto' ? 880 : 300));
  const numAnimRAF = { wght: 0, wdth: 0, opsz: 0 };
  const animateNumeric = (axis, toVal, duration = getNumAnimDuration()) => {
    const out = controls.querySelector(`.cosma-val[data-for="${axis}"]`);
    if (!out) return;
    const fromVal = parseFloat(out.textContent) || 0;
    if (!isFinite(toVal)) return;
    try { cancelAnimationFrame(numAnimRAF[axis]); } catch (_) {}
    if (!duration || duration <= 0) { out.textContent = String(Math.round(toVal)); return; }
    const start = performance.now();
    const step = (now) => {
      const t = Math.max(0, Math.min(1, (now - start) / duration));
      const v = fromVal + (toVal - fromVal) * t;
      out.textContent = String(Math.round(v));
      if (t < 1) numAnimRAF[axis] = requestAnimationFrame(step);
    };
    numAnimRAF[axis] = requestAnimationFrame(step);
  };

  // --- AUTO/MANUAL demo player helpers ---
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const placeCaretAtEnd = (el) => {
    try {
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection && window.getSelection();
      if (sel) { sel.removeAllRanges(); sel.addRange(range); }
    } catch (_) {}
  };
  const htmlToPlain = (html) => String(html || '').replace(/<br\s*\/?\s*>/gi, '\n');
  const plainToHTML = (text) => String(text || '').replace(/\n/g, '<br>');
  const setLetterHTML = (html) => {
    // Programmatic content update; rely on MutationObserver for fit
    letter.innerHTML = html;
    // In AUTO mode, keep the caret visible at the paragraph end
    if (tester.dataset.mode === 'auto') placeCaretAtEnd(letter);
  };
  const getSliders = () => ({
    wght: controls.querySelector('#cosma-wght'),
    wdth: controls.querySelector('#cosma-wdth'),
    opsz: controls.querySelector('#cosma-opsz'),
  });
  const setAxis = (axis, value) => {
    const s = getSliders()[axis];
    if (!s) return;
    s.value = String(value);
    try { s.dispatchEvent(new Event('input', { bubbles: true })); } catch (_) {}
  };
  const applyAxesObj = (axes) => {
    if (!axes) return;
    if (typeof axes.wght === 'number') setAxis('wght', axes.wght);
    if (typeof axes.wdth === 'number') setAxis('wdth', axes.wdth);
    if (typeof axes.opsz === 'number') setAxis('opsz', axes.opsz);
  };
  // Slow down typing/erasing by ~30%
  const ERASE_STEP_MS = 39; // was ~30ms per char
  const TYPE_STEP_MS = 65;  // was ~50ms per char

  async function eraseByChar(stepMs = 52) {
    const plain = htmlToPlain(letter.innerHTML);
    for (let i = plain.length; i >= 0; i--) {
      setLetterHTML(plainToHTML(plain.slice(0, i)));
      await sleep(stepMs);
    }
  }
  async function typeByChar(targetHTML, stepMs = 78) {
    const target = htmlToPlain(targetHTML);
    for (let i = 0; i <= target.length; i++) {
      setLetterHTML(plainToHTML(target.slice(0, i)));
      await sleep(stepMs);
    }
  }

  const demoSets = [
    { textHTML: 'Cosma <br> Typeface', axes: { wght: 400, wdth: 50, opsz: 0 } },
    { textHTML: 'LILAS <br> 75020', axes: { wght: 900, wdth: 150, opsz: 0 } },
    { textHTML: 'Playstation', axes: { wght: 500, wdth: 50, opsz: 100 } },
    { textHTML: 'HYPERDRIVE', axes: { wght: 500, wdth: 115, opsz: 50 } },
  ];
  let autoToken = 0;
  async function runAutoLoop(token) {
    // Step 1: load default set immediately
    let idx = 0;
    applyAxesObj(demoSets[idx].axes);
    setLetterHTML(demoSets[idx].textHTML);
    await sleep(5000); // Step 2: wait 5s
    while (token === autoToken) {
      const next = (idx + 1) % demoSets.length;
      // Step 3: erase letter by letter
      await eraseByChar(ERASE_STEP_MS);
      if (token !== autoToken) break;
      // Step 4: change to next style
      applyAxesObj(demoSets[next].axes);
      // Ensure content is empty before typing
      setLetterHTML('');
      if (token !== autoToken) break;
      // Step 5: type next text letter by letter
      await typeByChar(demoSets[next].textHTML, TYPE_STEP_MS);
      if (token !== autoToken) break;
      idx = next;
      // Step 2 again for subsequent sets
      await sleep(5000);
    }
  }

  const updateAxisFromInput = (ev) => {
    const t = ev.target;
    if (!t || t.tagName !== 'INPUT') return;
    const axis = t.getAttribute('data-axis');
    const val = parseFloat(t.value);
    if (!isFinite(val)) return;
    if (axis === 'wght') weight = clamp(val, 100, 900);
    else if (axis === 'wdth') width = clamp(val, 50, 300);
    else if (axis === 'opsz') opticalSize = clamp(val, 0, 100);
    setSliderVisual(t);
    animateNumeric(axis, val);
    applyVariations();
    dbg('axis change', { axis, val });
    requestFit('axis');
  };
  controls.addEventListener('input', updateAxisFromInput);

  // Drag responsiveness: disable transitions during active slider drag
  const startDrag = () => {
    if (isDragging) return;
    isDragging = true;
    tester.classList.add('is-dragging');
  };
  const endDrag = () => {
    if (!isDragging) return;
    isDragging = false;
    tester.classList.remove('is-dragging');
  };
  // Pointer events to detect drag start/end
  ['pointerdown','mousedown','touchstart'].forEach((type) => {
    controls.addEventListener(type, (ev) => {
      if (ev && ev.target && ev.target.classList && ev.target.classList.contains('cosma-slider')) startDrag();
    });
  });
  ['pointerup','mouseup','touchend','touchcancel','pointercancel','mouseleave'].forEach((type) => {
    window.addEventListener(type, endDrag, { passive: true });
  });

  // Mode toggle behavior (UI only; does not alter fitting logic yet)
  const modeBtn = topbar.querySelector('.cosma-mode-toggle');
  if (modeBtn) {
    modeBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const isAuto = modeBtn.classList.toggle('is-auto');
      modeBtn.setAttribute('aria-pressed', String(isAuto));
      const label = modeBtn.querySelector('.label');
      if (label) label.textContent = isAuto ? 'AUTO' : 'MANUAL';
      // Optionally expose state for future logic
      tester.dataset.mode = isAuto ? 'auto' : 'manual';
      // Start/stop the automatic demo sequence
      if (isAuto) {
        autoToken++;
        const token = autoToken;
        runAutoLoop(token);
      } else {
        autoToken++; // invalidate any running loop
      }
    });
  }

  // Initialize slider visual fill
  ['#cosma-wght', '#cosma-wdth', '#cosma-opsz'].forEach((sel) => {
    const el = controls.querySelector(sel);
    setSliderVisual(el);
  });

  // If default mode is AUTO, start the loop after controls are ready
  if (tester.dataset.mode === 'auto') {
    autoToken++;
    const token = autoToken;
    runAutoLoop(token);
  }

  // Disable coordinate overlay from original mini-site (not implemented here)
  // Ensure initial state (readable on white)
  tester.style.backgroundColor = '#ffffff';
  tester.style.color = '#000000';
  letter.style.textShadow = 'none';
  applyVariations();
  // Delay initial fit to ensure fonts are loaded; retry a few times
  const attempts = [0, 100, 300, 800];
  attempts.forEach((ms) => setTimeout(() => { dbg('delayed fit', { ms }); requestFit('init_delay'); }, ms));
})();
