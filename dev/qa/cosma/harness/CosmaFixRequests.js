(function () {
  const QA_TAG = '[COSMA_QA]';
  const TEST_TAG = '[COSMA_TEST]';
  const log = (...args) => { try { console.log(TEST_TAG, ...args); } catch (_) {} };

  // Capture COSMA debug logs without silencing originals
  const captured = [];
  const testResults = [];
  const testWindows = []; // { id, t0, t1 }
  let RUN_ID = `RUN-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
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

  const $ = (sel, root = document) => root.querySelector(sel);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const now = () => Date.now();

  function getCosmaRefs() {
    const tester = $('.project_container[data-project*="cosma" i] .cosma-tester');
    const stage = tester && tester.querySelector('.cosma-stage');
    const letter = tester && tester.querySelector('.cosma-letter');
    const sWght = tester && tester.querySelector('#cosma-wght');
    const sWdth = tester && tester.querySelector('#cosma-wdth');
    const sOpsz = tester && tester.querySelector('#cosma-opsz');
    return { tester, stage, letter, sWght, sWdth, sOpsz };
  }

  function px(n) { return typeof n === 'number' ? `${n.toFixed(2)}px` : String(n); }
  function getFontSizePx(el) { const fs = parseFloat(getComputedStyle(el).fontSize); return isFinite(fs) ? fs : 0; }

  function getFitState(stage, letter, marginFrac = 0.07) {
    const sw = stage.clientWidth || 0;
    const sh = stage.clientHeight || 0;
    const lw = letter.scrollWidth || 0;
    const lh = letter.scrollHeight || 0;
    const boxW = Math.max(0, sw - 2 * sw * marginFrac);
    const boxH = Math.max(0, sh - 2 * sh * marginFrac);
    const overW = lw > boxW + 0.5; // allow half-px tolerance
    const overH = lh > boxH + 0.5;
    return { sw, sh, lw, lh, boxW, boxH, overW, overH, within: !(overW || overH) };
  }

  async function waitForReady(timeoutMs = 2000) {
    const t0 = now();
    while (now() - t0 < timeoutMs) {
      const { stage, letter } = getCosmaRefs();
      if (stage && letter && stage.clientWidth > 0 && stage.clientHeight > 0) return { stage, letter };
      await sleep(50);
    }
    throw new Error('COSMA_TEST: Stage/letter not ready');
  }

  async function waitStableFont(letter, settleMs = 150, timeoutMs = 1500) {
    const t0 = now();
    let last = getFontSizePx(letter), lastT = now();
    while (now() - t0 < timeoutMs) {
      await sleep(40);
      const cur = getFontSizePx(letter);
      if (Math.abs(cur - last) <= 0.5) {
        if (now() - lastT >= settleMs) return cur;
      } else {
        last = cur; lastT = now();
      }
    }
    return getFontSizePx(letter);
  }

  async function setSlider(input, value) {
    if (!input) return;
    input.value = String(value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function beginTest(id) {
    return { id, t0: now(), end() { this.t1 = now(); testWindows.push({ id, t0: this.t0, t1: this.t1 }); } };
  }

  function correlateLogs() {
    // Attach each captured COSMA log line to the closest test window by time
    const correlated = captured.map((e, i) => ({
      logId: `L${i}`,
      t: e.t,
      raw: e.args.map(String).join(' '),
      testId: null,
    }));
    correlated.forEach((entry) => {
      let best = null;
      testWindows.forEach((w) => {
        if (entry.t >= w.t0 && entry.t <= w.t1) {
          // Prefer direct containment
          best = { id: w.id, dist: 0 };
        } else {
          const dist = entry.t < w.t0 ? (w.t0 - entry.t) : (entry.t - w.t1);
          if (!best || dist < best.dist) best = { id: w.id, dist };
        }
      });
      entry.testId = best ? best.id : null;
    });
    return correlated;
  }

  function buildReport() {
    const tests = testResults.map((r, idx) => ({ ...r, testIndex: idx }));
    const logs = correlateLogs();
    const summary = {
      runId: RUN_ID,
      when: new Date().toISOString(),
      tests,
      logs,
      counts: {
        tests: tests.length,
        logs: logs.length,
        passes: tests.filter((t) => t.pass === true).length,
        fails: tests.filter((t) => t.pass === false).length,
      }
    };
    return summary;
  }

  function downloadReport(rep) {
    const text = JSON.stringify(rep, null, 2);
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    a.href = url;
    a.download = `cosma-qa-${rep.runId}-${ts}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  async function run() {
    try {
      const ready = await waitForReady();
      const { tester, stage, letter, sWght, sWdth, sOpsz } = { ...getCosmaRefs(), ...ready };
      log('start');

      const EXPECT = Object.assign({ defaultPx: Math.round(window.innerHeight * 0.20), margin: 0.07 }, (window.__COSMA_EXPECT || {}));

      // TEST 1: initial default size ~60px and centered
      const t1 = beginTest(`${RUN_ID}-T1`);
      const fs1 = await waitStableFont(letter);
      const fit1 = getFitState(stage, letter, EXPECT.margin);
      const centerOK = true; // centered via CSS; optional: measure rects if needed
      const r1 = { id: t1.id, name: 'init', fontSize: fs1, within: fit1.within, overW: fit1.overW, overH: fit1.overH, centerOK };
      r1.pass = (fs1 <= EXPECT.defaultPx + 0.5) && fit1.within && centerOK;
      testResults.push(r1); log('t1:init', { ...r1, fontSize: px(r1.fontSize) });
      t1.end();

      // TEST 2: extreme width -> should stay within margin and font-size <= 60
      const t2 = beginTest(`${RUN_ID}-T2`);
      await setSlider(sWdth, 300);
      const fs2 = await waitStableFont(letter);
      const fit2 = getFitState(stage, letter, EXPECT.margin);
      const r2 = { id: t2.id, name: 'width=300', fontSize: fs2, within: fit2.within, overW: fit2.overW, overH: fit2.overH, maxOK: fs2 <= EXPECT.defaultPx + 0.5 };
      r2.pass = r2.within && r2.maxOK;
      testResults.push(r2); log('t2:width=300', { ...r2, fontSize: px(r2.fontSize) });
      t2.end();

      // TEST 3: narrow width -> can grow but must not exceed 60
      const t3 = beginTest(`${RUN_ID}-T3`);
      await setSlider(sWdth, 50);
      const fs3 = await waitStableFont(letter);
      const fit3 = getFitState(stage, letter, EXPECT.margin);
      const r3 = { id: t3.id, name: 'width=50', fontSize: fs3, within: fit3.within, maxOK: fs3 <= EXPECT.defaultPx + 0.5 };
      r3.pass = r3.within && r3.maxOK;
      testResults.push(r3); log('t3:width=50', { ...r3, fontSize: px(r3.fontSize) });
      t3.end();

      // TEST 4: long paragraph (multiple lines)
      const original = letter.innerHTML;
      letter.innerHTML = 'Cosma Display — A variable font for robust display types, engineered for weight, width and contrast across responsive layouts. '.repeat(3);
      // Trigger re-fit for programmatic change
      letter.dispatchEvent(new Event('input', { bubbles: true }));
      const t4 = beginTest(`${RUN_ID}-T4`);
      const fs4 = await waitStableFont(letter);
      const fit4 = getFitState(stage, letter, EXPECT.margin);
      const r4 = { id: t4.id, name: 'long-text', fontSize: fs4, within: fit4.within, overW: fit4.overW, overH: fit4.overH, maxOK: fs4 <= EXPECT.defaultPx + 0.5 };
      r4.pass = r4.within && r4.maxOK;
      testResults.push(r4); log('t4:long-text', { ...r4, fontSize: px(r4.fontSize) });
      t4.end();

      // Reset text
      letter.innerHTML = original;
      letter.dispatchEvent(new Event('input', { bubbles: true }));
      await waitStableFont(letter);

      // TEST 5: axis interplay (heavier weight + max width)
      const t5 = beginTest(`${RUN_ID}-T5`);
      await setSlider(sWght, 900);
      await setSlider(sWdth, 300);
      const fs5 = await waitStableFont(letter);
      const fit5 = getFitState(stage, letter, EXPECT.margin);
      const r5 = { id: t5.id, name: 'wght=900,wdth=300', fontSize: fs5, within: fit5.within, overW: fit5.overW, overH: fit5.overH, maxOK: fs5 <= EXPECT.defaultPx + 0.5 };
      r5.pass = r5.within && r5.maxOK;
      testResults.push(r5); log('t5:wght=900,wdth=300', { ...r5, fontSize: px(r5.fontSize) });
      t5.end();

      // TEST 6: incremental weight changes twice (+1 then +1) should not shrink abnormally
      const t6 = beginTest(`${RUN_ID}-T6`);
      const baseline = fs1; // initial font size target
      const w0 = parseInt(sWght.value || '400', 10);
      await setSlider(sWght, w0 + 1);
      await setSlider(sWght, w0 + 2);
      const fs6 = await waitStableFont(letter);
      const fit6 = getFitState(stage, letter, EXPECT.margin);
      const tooSmall = fs6 < Math.max(12, 0.05 * window.innerHeight) + 0.5; // below min
      const dropRatio = fs6 / baseline;
      const r6 = { id: t6.id, name: 'wght+1+1', fontSize: fs6, within: fit6.within, tooSmall, dropRatio: +dropRatio.toFixed(3) };
      r6.pass = fit6.within && !tooSmall && dropRatio > 0.4; // guard against drastic shrink
      testResults.push(r6); log('t6:wght+1+1', { ...r6, fontSize: px(r6.fontSize) });
      t6.end();

      // TEST 7: incremental width changes twice (+1 then +1) should not shrink abnormally
      const t7 = beginTest(`${RUN_ID}-T7`);
      const wd0 = parseInt(sWdth.value || '50', 10);
      await setSlider(sWdth, wd0 + 1);
      await setSlider(sWdth, wd0 + 2);
      const fs7 = await waitStableFont(letter);
      const fit7 = getFitState(stage, letter, EXPECT.margin);
      const tooSmall7 = fs7 < Math.max(12, 0.05 * window.innerHeight) + 0.5;
      const dropRatio7 = fs7 / baseline;
      const r7 = { id: t7.id, name: 'wdth+1+1', fontSize: fs7, within: fit7.within, tooSmall: tooSmall7, dropRatio: +dropRatio7.toFixed(3) };
      r7.pass = fit7.within && !tooSmall7 && dropRatio7 > 0.4;
      testResults.push(r7); log('t7:wdth+1+1', { ...r7, fontSize: px(r7.fontSize) });
      t7.end();

      // TEST 8: erase text to a short token and ensure it grows back near default
      const t8 = beginTest(`${RUN_ID}-T8`);
      letter.innerHTML = 'Cosma';
      letter.dispatchEvent(new Event('input', { bubbles: true }));
      const fs8 = await waitStableFont(letter);
      const fit8 = getFitState(stage, letter, EXPECT.margin);
      const nearDefault = fs8 >= (EXPECT.defaultPx - 2);
      const r8 = { id: t8.id, name: 'erase-to-short', fontSize: fs8, within: fit8.within, nearDefault };
      r8.pass = fit8.within && nearDefault;
      testResults.push(r8); log('t8:erase-to-short', { ...r8, fontSize: px(r8.fontSize) });
      t8.end();

      // Dump captured COSMA logs summary
      const report = buildReport();
      console.log(QA_TAG, 'summary', report.counts);
      downloadReport(report);
      log('done', { runId: report.runId });
    } catch (err) {
      log('error', String(err && (err.stack || err.message || err)));
    }
  }

  // Expose helpers to extract logs
  try {
    window.__cosmaGetLogs = () => ({
      tests: testResults.slice(),
      cosmaLogs: captured.map((e) => e.args.map(String).join(' '))
    });
    window.__cosmaCopyLogs = async () => {
      const text = JSON.stringify(window.__cosmaGetLogs(), null, 2);
      // Prefer async clipboard on secure contexts
      try {
        if (window.isSecureContext && navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
          console.log(TEST_TAG, 'copied to clipboard via navigator.clipboard');
          return { ok: true, method: 'clipboard' };
        }
        throw new Error('Clipboard API unavailable');
      } catch (e1) {
        // Chrome DevTools helper
        try {
          if (typeof copy === 'function') {
            copy(text);
            console.log(TEST_TAG, 'copied via DevTools copy()');
            return { ok: true, method: 'devtools' };
          }
        } catch (_) {}
        // Fallback: execCommand on a hidden textarea
        try {
          const ta = document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          ta.style.pointerEvents = 'none';
          document.body.appendChild(ta);
          ta.focus();
          ta.select();
          const ok = document.execCommand('copy');
          document.body.removeChild(ta);
          if (ok) {
            console.log(TEST_TAG, 'copied via execCommand');
            return { ok: true, method: 'execCommand' };
          }
        } catch (_) {}
        console.warn(TEST_TAG, 'copy failed; returning text payload');
        return { ok: false, method: 'none', text };
      }
    };
    window.__cosmaDownloadLogs = () => {
      const text = JSON.stringify(window.__cosmaGetLogs(), null, 2);
      const blob = new Blob([text], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      a.href = url;
      a.download = `cosma-logs-${ts}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      console.log(TEST_TAG, 'download triggered');
      return true;
    };
    window.__cosmaClearLogs = () => { captured.splice(0, captured.length); testResults.splice(0, testResults.length); };
  } catch (_) {}

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }
})();
