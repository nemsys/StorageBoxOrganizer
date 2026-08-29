/* eslint-env serviceworker */
/* global __BUILD_ID__, __PRECACHE__ */

/**
 * Service worker. Emitted to /sw.js at build time by the `emit-service-worker`
 * plugin in vite.config.js, which substitutes the build id and the list of
 * hashed asset files — this file is never imported by the app.
 *
 * What it is for: without it the app cannot be opened at all without a network,
 * because index.html and the bundle come from the server every time. Firestore's
 * persistent cache already covers the *data* offline; this covers the shell.
 *
 * What it deliberately does not touch: anything cross-origin (Firestore, Auth,
 * every googleapis call) is left to the network untouched — the SDK has its own
 * offline machinery and must not be second-guessed — and /version.json, which
 * is how the running app finds out a newer build exists.
 */

const CACHE = 'sbo-' + __BUILD_ID__;
const PRECACHE = __PRECACHE__;

/**
 * ignoreVary is not optional here. Hosting answers /assets/* with `Vary: Origin`,
 * precaching stores the response against a plain same-origin request that
 * carries no Origin header, and the page then asks for the same file with a
 * `crossorigin` module request that does. Vary-aware matching calls those two
 * different, misses every cached asset, falls through to the network and fails
 * — an app that looks cached and is not. Every entry in this cache is either
 * content-hashed or the one index.html, so there is nothing for Vary to
 * disambiguate anyway.
 */
const MATCH = { ignoreVary: true };

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches
            .open(CACHE)
            // Individually, so one 404 cannot fail the whole install.
            .then((cache) => Promise.all(PRECACHE.map((url) => cache.add(url).catch(() => {}))))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

/**
 * Documents: network first. The running app checks /version.json to discover a
 * new build and then reloads, so a reload with a connection must reach the
 * server. The cached copy is the offline fallback, nothing more.
 */
async function networkFirstDocument(request) {
    try {
        const response = await fetch(request);
        const cache = await caches.open(CACHE);
        cache.put('/index.html', response.clone());
        return response;
    } catch {
        const cached =
            (await caches.match('/index.html', MATCH)) || (await caches.match('/', MATCH));
        if (cached) return cached;
        throw new Error('offline and no cached document');
    }
}

/**
 * Everything else same-origin: cache first. The bundle's filenames carry a
 * content hash, so a cached asset can never be the wrong version of itself, and
 * the cache is keyed by build id, so a deploy starts a clean one.
 */
async function cacheFirst(request) {
    const cached = await caches.match(request, MATCH);
    if (cached) return cached;

    const response = await fetch(request);
    if (response && response.ok && response.type === 'basic') {
        const cache = await caches.open(CACHE);
        cache.put(request, response.clone());
    }
    return response;
}

self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;
    if (url.pathname === '/version.json') return;

    if (request.mode === 'navigate') {
        event.respondWith(networkFirstDocument(request));
        return;
    }

    event.respondWith(cacheFirst(request));
});
