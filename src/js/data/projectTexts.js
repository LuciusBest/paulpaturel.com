// Centralized loader for project text overlays with shared caching.
(function (global) {
  const resolveAssetVersion = () => {
    if (!global) return '';
    const fromSiteVersion = (() => {
      const sv = global.SiteVersion;
      if (!sv || typeof sv !== 'object') return '';
      if (typeof sv.cacheToken === 'string' && sv.cacheToken.trim()) return sv.cacheToken.trim();
      if (typeof sv.updatedAt === 'string' && sv.updatedAt.trim()) return sv.updatedAt.trim();
      if (typeof sv.timestamp === 'string' && sv.timestamp.trim()) return sv.timestamp.trim();
      if (typeof sv.semantic === 'string' && sv.semantic.trim()) return sv.semantic.trim();
      return '';
    })();
    if (fromSiteVersion) return fromSiteVersion;
    if (typeof global.__assetVersion === 'string' && global.__assetVersion.trim()) {
      return global.__assetVersion.trim();
    }
    return '';
  };

  const assetVersionToken = resolveAssetVersion();
  const CACHE_KEY = assetVersionToken ? `en-${assetVersionToken}` : 'en';
  const ENDPOINT = assetVersionToken
    ? `data/projectTexts.json?v=${encodeURIComponent(assetVersionToken)}`
    : 'data/projectTexts.json';

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
