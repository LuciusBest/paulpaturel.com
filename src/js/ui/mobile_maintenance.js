// Simple looped name animation + message for the mobile maintenance screen
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('mobile-maintenance');
  const nameSlot = document.getElementById('mobileMaintenanceName');
  if (!container || !nameSlot) return;

  const states = ["PAUL", "PATUL", "PATURL", "PATUREL", "PATURL", "PATUL"];
  const highlightSet = new Set(["P", "A", "U", "L"]);
  const mobileQuery = typeof window.matchMedia === 'function'
    ? window.matchMedia('(max-width: 900px)')
    : null;
  const reduceMotionQuery = typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null;

  let stateIndex = 0;
  let loopTimeout = null;

  const renderState = (text) => {
    nameSlot.innerHTML = text
      .split("")
      .map((ch) => {
        const cls = highlightSet.has(ch) ? 'char highlight' : 'char';
        return `<span class="${cls}">${ch}</span>`;
      })
      .join("");
  };

  const stopLoop = () => {
    if (loopTimeout !== null) {
      clearTimeout(loopTimeout);
      loopTimeout = null;
    }
  };

  const stepLoop = () => {
    stateIndex = (stateIndex + 1) % states.length;
    const current = states[stateIndex];
    renderState(current);
    const delay =
      current === 'PATUREL' ? 1000 :
      current === 'PAUL' ? 650 :
      150;
    stopLoop();
    loopTimeout = window.setTimeout(stepLoop, delay);
  };

  const applyMode = () => {
    const isMobile = mobileQuery ? mobileQuery.matches : true;
    const prefersReduced = reduceMotionQuery ? reduceMotionQuery.matches : false;

    container.setAttribute('aria-hidden', isMobile ? 'false' : 'true');
    if (!isMobile) {
      stopLoop();
      return;
    }

    if (prefersReduced) {
      stopLoop();
      nameSlot.textContent = 'PAUL / PATUREL';
      return;
    }

    renderState(states[stateIndex]);
    stopLoop();
    loopTimeout = window.setTimeout(stepLoop, 550);
  };

  renderState(states[stateIndex]);
  applyMode();

  if (mobileQuery && typeof mobileQuery.addEventListener === 'function') {
    mobileQuery.addEventListener('change', () => {
      stateIndex = 0;
      renderState(states[stateIndex]);
      applyMode();
    });
  }

  if (reduceMotionQuery && typeof reduceMotionQuery.addEventListener === 'function') {
    reduceMotionQuery.addEventListener('change', applyMode);
  }
});
