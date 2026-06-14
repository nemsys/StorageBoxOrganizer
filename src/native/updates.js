/* global __BUILD_ID__ */

// Injected at build time by vite (see vite.config.js); 'dev' under the dev server.
export const BUILD_ID = typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : 'dev';

/**
 * Compare the running build against the latest deployed one. Because the app
 * loads from the live URL, an update is just a newer `version.json` on the
 * server (deployed via `npm run deploy`). Cache-busted + no-store so the check
 * never reads a stale copy.
 */
export async function checkForUpdate() {
    const res = await fetch(`/version.json?ts=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('version check failed');
    const data = await res.json();
    const latest = data && data.buildId;
    return {
        current: BUILD_ID,
        latest,
        updateAvailable: Boolean(latest) && latest !== BUILD_ID,
    };
}

/** Reload from the server; index.html is no-cache, so new asset hashes load. */
export function applyUpdate() {
    window.location.reload();
}
