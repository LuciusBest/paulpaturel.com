// Centralized loader for project text overlays with shared caching.
(function (global) {
  const LANG_FALLBACK = 'en';
  const ENDPOINTS = {
    en: 'data/projectTexts.json',
    fr: 'data/projectTexts.fr.json'
  };

  const cache = new Map(); // lang -> Promise<Record<string, any>>

  const normalizeLang = (value) => {
    const normalized = String(value || '').toLowerCase();
    return normalized === 'fr' ? 'fr' : 'en';
  };

  const fetchJSON = (url) => {
    return fetch(url, { credentials: 'same-origin' })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`projectTexts: ${url} responded with ${response.status}`);
        }
        return response.json();
      });
  };

  const loadLang = (lang) => {
    const key = normalizeLang(lang);
    if (!cache.has(key)) {
      const url = ENDPOINTS[key] || ENDPOINTS[LANG_FALLBACK];
      const promise = fetchJSON(url)
        .catch((error) => {
          console.error('[projectTexts] failed to load', url, error);
          return {};
        })
        .then((data) => (data && typeof data === 'object' ? data : {}));
      cache.set(key, promise);
    }
    return cache.get(key);
  };

  const loadAll = () => {
    return Promise.all([loadLang('en'), loadLang('fr')]).then(([en, fr]) => ({ en, fr }));
  };

  const api = {
    load(lang) {
      return loadLang(lang);
    },
    loadAll,
    preload(lang) {
      loadLang(lang);
    },
    reset() {
      cache.clear();
    }
  };

  try {
    global.ProjectTexts = api;
  } catch (error) {
    console.error('[projectTexts] unable to expose API', error);
  }
})(typeof window !== 'undefined' ? window : this);
