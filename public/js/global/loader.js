/*
  loader.js — Loader basé sur le nom de gauche
  - Pendant le chargement, boucle l’animation du nom (PAUL → PATUREL → PAUL)
    en reprenant la même cadence que le clic gauche.
  - Place un masque noir sous le nom et au-dessus du contenu.
  - Bloque toute interaction utilisateur pendant le chargement.
*/
(function () {
  var body = document.body;
  if (!body) return;

  // Retour au comportement normal: fin quand le site est chargé
  // et que l'animation est revenue sur "PAUL".
  var MIN_DELAY_MS = 0;       // pas de délai forcé
  var MAX_TIMEOUT_MS = 3000;  // sécurité en dernier recours

  function waitForWindowLoad() {
    return new Promise(function (resolve) {
      if (document.readyState === 'complete') return resolve();
      window.addEventListener('load', function onLoad() {
        window.removeEventListener('load', onLoad);
        resolve();
      });
    });
  }

  function delay(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  // Démarre la boucle d’animation quand #left_name existe
  function startNameLoop(finalize) {
    var nameEl = document.getElementById('left_name');
    if (!nameEl) return; // left overlay pas encore prêt

    var states = ["PAUL", "PATUL", "PATURL", "PATUREL"];
    var highlight = { P:1, A:1, U:1, L:1 };
    var dt = 320; // encore deux fois plus lent pour le loading
    var idx = 0;
    var direction = 1; // 1: vers PATUREL, -1: vers PAUL
    var running = true;
    var timer = null;
    var finishing = false; // demande d'arrêt quand on repasse sur PAUL

    function render(str) {
      nameEl.innerHTML = String(str)
        .split('')
        .map(function (ch) {
          var cls = highlight[ch] ? 'char highlight' : 'char';
          return '<span class="' + cls + '">' + ch + '</span>';
        })
        .join('');
    }

    function stepOnce() {
      if (!running) return;
      render(states[idx]);
      // Si on a demandé la fin et que l'état affiché est "PAUL" (idx 0)
      if (finishing && idx === 0) {
        running = false;
        if (timer) { clearTimeout(timer); timer = null; }
        if (typeof finalize === 'function') finalize();
        return;
      }
      // Prochain index
      var next = idx + direction;
      if (next >= states.length) { next = states.length - 2; direction = -1; }
      if (next < 0) { next = 1; direction = 1; }
      idx = next;
      timer = setTimeout(stepOnce, dt);
    }

    // Lancer
    stepOnce();

    // Arrêt propre quand le chargement se termine
    function finishWhenPaul() { finishing = true; }
    function forceStopReset() {
      running = false;
      if (timer) { clearTimeout(timer); timer = null; }
      render(states[0]);
      if (typeof finalize === 'function') finalize();
    }
    return { finishWhenPaul: finishWhenPaul, forceStopReset: forceStopReset };
  }

  // Attendre la disponibilité de #left_name (créé par dynamicTextOverlay à DOMContentLoaded)
  function waitForLeftName(timeoutMs) {
    var start = Date.now();
    return new Promise(function (resolve) {
      (function poll() {
        if (document.getElementById('left_name')) return resolve();
        if (Date.now() - start > (timeoutMs || 2000)) return resolve();
        setTimeout(poll, 30);
      })();
    });
  }

  var windowLoaded = waitForWindowLoad();

  var loopCtrl = null;
  // Démarrer la boucle dès que possible
  waitForLeftName(2500).then(function () {
    if (body.classList.contains('is-loading')) {
      loopCtrl = startNameLoop(finalizeOnce);
    }
  });

  // Finalisation unique
  var finalized = false;
  function finalizeOnce() {
    if (finalized) return; finalized = true;
    body.classList.remove('is-loading');
    body.classList.add('is-loaded');
    var mask = document.getElementById('loading-mask');
    if (mask && mask.parentNode) {
      setTimeout(function () {
        if (mask.parentNode) mask.parentNode.removeChild(mask);
      }, 720);
    }
  }

  // Fin de chargement: attendre window 'load' (+ éventuel petit délai) puis arrêter sur PAUL
  Promise.race([
    windowLoaded.then(function () { return delay(MIN_DELAY_MS); }),
    delay(MAX_TIMEOUT_MS)
  ]).then(function () {
    if (loopCtrl && typeof loopCtrl.finishWhenPaul === 'function') {
      loopCtrl.finishWhenPaul();
    } else {
      // Aucun loop (ou left_name absent) => finaliser directement
      finalizeOnce();
    }
  });
})();
