// Centralized loader for project text overlays with shared caching.
(function (global) {
  const CACHE_KEY = 'en';
  const ENDPOINT = 'data/projectTexts.json';

  const cache = new Map(); // cache key -> Promise<Record<string, any>>

  const fetchJSON = (url) => {
    return fetch(url, { credentials: 'same-origin' })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`projectTexts: ${url} responded with ${response.status}`);
        }
        return response.json();
      });
  };

  const loadLang = () => {
    if (!cache.has(CACHE_KEY)) {
      const promise = fetchJSON(ENDPOINT)
        .catch((error) => {
          console.error('[projectTexts] failed to load', ENDPOINT, error);
          return {};
        })
        .then((data) => (data && typeof data === 'object' ? data : {}));
      cache.set(CACHE_KEY, promise);
    }
    return cache.get(CACHE_KEY);
  };

  const loadAll = () => {
    return loadLang().then((en) => ({ en }));
  };

  const api = {
    load() {
      return loadLang();
    },
    loadAll,
    preload() {
      loadLang();
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
