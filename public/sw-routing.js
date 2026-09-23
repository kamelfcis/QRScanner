(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SwRouting = factory();
  }
})(typeof self !== 'undefined' ? self : globalThis, function () {
  var CACHE_NAME = 'warda-pwa-v2';
  var LEGACY_CACHE_NAMES = ['doctorburger-v1'];
  var STATIC_ASSETS = ['/', '/menu', '/offline', '/icons/icon.svg'];

  function isFontRequest(pathname) {
    return /\.(woff2?|ttf|otf|eot)$/i.test(pathname);
  }

  function isSupabaseHost(hostname) {
    return hostname.includes('supabase.co') || hostname.includes('supabase.in');
  }

  /**
   * @param {URL} url
   * @param {Request} request
   * @returns {'cache-first' | 'stale-while-revalidate' | 'network-first' | 'network-only'}
   */
  function getRouteStrategy(url, request) {
    if (request.method !== 'GET') {
      return 'network-only';
    }

    var pathname = url.pathname;

    if (
      pathname.startsWith('/_next/static/') ||
      pathname.startsWith('/icons/') ||
      isFontRequest(pathname)
    ) {
      return 'cache-first';
    }

    if (pathname === '/api/menu/snapshot') {
      return 'stale-while-revalidate';
    }

    if (pathname.startsWith('/api/') || isSupabaseHost(url.hostname)) {
      return 'network-only';
    }

    if (request.mode === 'navigate' || request.destination === 'document') {
      return 'network-first';
    }

    return 'network-only';
  }

  return {
    CACHE_NAME: CACHE_NAME,
    LEGACY_CACHE_NAMES: LEGACY_CACHE_NAMES,
    STATIC_ASSETS: STATIC_ASSETS,
    getRouteStrategy: getRouteStrategy,
    isFontRequest: isFontRequest,
    isSupabaseHost: isSupabaseHost,
  };
});
