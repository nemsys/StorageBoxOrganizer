/**
 * IndexedDB cache for full-size images.
 *
 * Full-res photos live in their own Firestore `images` collection and are
 * fetched on demand (fullscreen). To stay well inside the Spark free read quota
 * — and to render instantly on repeat views / offline — every fetched full
 * image is cached here keyed by its image id. A given image is therefore read
 * from the network at most once per device.
 *
 * All operations fail soft: if IndexedDB is unavailable (private mode, quota,
 * old engine) we degrade to always-fetch rather than throw.
 */

const DB_NAME = 'sbo-images';
const STORE = 'full';
const VERSION = 1;

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function withStore(mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    const result = fn(store);
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export const imageCache = {
  async get(key) {
    if (!key) return null;
    try {
      const db = await openDb();
      return await new Promise((resolve) => {
        const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  },

  async set(key, value) {
    if (!key || !value) return;
    try {
      await withStore('readwrite', (store) => store.put(value, key));
    } catch {
      /* best-effort */
    }
  },

  async del(key) {
    if (!key) return;
    try {
      await withStore('readwrite', (store) => store.delete(key));
    } catch {
      /* best-effort */
    }
  },
};

export default imageCache;
