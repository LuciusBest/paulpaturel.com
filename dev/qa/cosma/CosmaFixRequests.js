(function () {
  const QA_TAG = '[COSMA_QA]';
  const TEST_TAG = '[COSMA_TEST]';
  const log = (...args) => { try { console.log(TEST_TAG, ...args); } catch (_) {} };

  // Capture COSMA debug logs without silencing originals (hook is inert unless the main tester logs)
  const captured = [];
  try {
    const origLog = console.log.bind(console);
    console.log = (...args) => {
      try {
        if (args && args[0] && typeof args[0] === 'string' && args[0].startsWith('[COSMA]')) {
          captured.push({ t: Date.now(), args });
        }
      } catch (_) {}
      origLog(...args);
    };
  } catch (_) {}

  // Minimal surface for manual QA
  try {
    window.__cosmaQA = {
      getCaptured: () => captured.map((e) => e.args.map(String).join(' ')),
      clear: () => { captured.splice(0, captured.length); },
    };
  } catch (_) {}
})();

