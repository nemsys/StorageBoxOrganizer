import { v4 as uuidv4 } from 'uuid';
import { db, auth } from '../firebase';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  getDoc,
  writeBatch
} from 'firebase/firestore';
import { makeDerivatives } from '../utils/imageUtils';
import { imageCache } from '../utils/imageCache';
import { normalizeTag, normalizeTags } from '../utils/tagUtils';

const BOXES_COLL = 'boxes';
const ITEMS_COLL = 'items';
const IMAGES_COLL = 'images';

/**
 * Hand a write to Firestore without waiting for the server to acknowledge it.
 *
 * setDoc/updateDoc/deleteDoc apply to the local cache synchronously and resolve
 * the returned promise only once the server has the write. Offline that promise
 * never settles — so awaiting it, as this file used to, means every mutation
 * hangs: the modal never closes, no toast, nothing. The data is not lost either
 * way; the SDK queues the write in IndexedDB and flushes it when the connection
 * comes back. That queue is the whole of "syncs when it can".
 *
 * The rejection is still worth hearing about, just not worth blocking on.
 */
function queueWrite(promise) {
  promise.catch((e) => {
    // 'unavailable' is the offline case, which is not an error here.
    if (e?.code !== 'unavailable') console.error('Queued write failed', e);
  });
  return promise;
}

// Get user ID or throw
function getUserId() {
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");
  return user.uid;
}

// The read helpers below swallow failures and return an empty result so that
// one bad fetch never blanks the UI. A permission-denied is different in kind:
// it means the account is not approved, and App.jsx needs to see it so it can
// swap in AccessPendingScreen.
//
// Only the three list reads that refreshData() drives use this. The on-demand
// single-document reads (getBox, getFullImage) stay soft, because their callers
// rely on a null return rather than catching — and they are unreachable anyway
// once the pending screen is up.
function rethrowIfDenied(e) {
  if (e?.code === 'permission-denied') throw e;
}

// --- Image collection helpers -------------------------------------------------
// Full-size images live in their own collection (one doc each) so entity docs
// stay tiny (just inline thumbnails) and full bytes are fetched only on demand.

// Persist one full-size image and return the lightweight ref to embed on the
// owning entity: { id, thumb }.
async function saveImageInternal({ thumb, full }, { ownerType, ownerId, uid }) {
  const id = uuidv4();
  queueWrite(setDoc(doc(db, IMAGES_COLL, id), {
    id,
    userId: uid,
    ownerType: ownerType || '',
    ownerId: ownerId || '',
    full,
    createdAt: Date.now(),
  }));
  imageCache.set(id, full);
  return { id, thumb };
}

// Normalise any stored/exported entity image list into [{ thumb?, full }].
function normalizeImageList(entity) {
  const imgs = entity?.images;
  if (Array.isArray(imgs) && imgs.length > 0) {
    if (typeof imgs[0] === 'object' && imgs[0] !== null) {
      return imgs
        .filter(Boolean)
        .map((r) => ({ thumb: r.thumb, full: r.full || r.thumb }))
        .filter((r) => r.full);
    }
    return imgs.filter(Boolean).map((s) => ({ full: s })); // legacy strings
  }
  if (entity?.image) return [{ full: entity.image }];
  return [];
}

// Build a fresh set of image-collection docs for an entity from inline/legacy
// image data, returning the refs ({id, thumb}) to store on the entity. Used by
// import and the one-tap migration. Re-derives proper thumbs when missing.
async function rebuildImages(entity, ownerType, ownerId, uid) {
  const list = normalizeImageList(entity);
  const refs = [];
  for (const im of list) {
    let { thumb, full } = im;
    if (!full) full = thumb;
    if (!full) continue;
    if (!thumb || thumb === full) {
      // Legacy/full-only source — generate a real small thumbnail.
      const d = await makeDerivatives(full);
      if (d) ({ thumb, full } = d);
    }
    refs.push(await saveImageInternal({ thumb, full }, { ownerType, ownerId, uid }));
  }
  return refs;
}

// Delete every image doc owned by an entity (cascade on entity delete).
async function deleteImagesByOwner(ownerId, uid) {
  if (!ownerId) return;
  const q = query(
    collection(db, IMAGES_COLL),
    where('userId', '==', uid),
    where('ownerId', '==', ownerId)
  );
  const snap = await getDocs(q);
  snap.docs.forEach((d) => {
    imageCache.del(d.id);
    queueWrite(deleteDoc(doc(db, IMAGES_COLL, d.id)));
  });
}

// Where an imported entity should land:
//   - already namespaced for this user → keep as-is (don't double-prefix)
//   - a document we still own          → update it in place, so an export/import
//                                        round trip on one account is a no-op
//                                        rather than a second copy of everything
//   - anything else                    → namespaced, so restoring into a fresh
//                                        account can't collide with a stranger's id
export function resolveImportId(rawId, uid, ownedIds) {
  if (!rawId) return `${uid}_${uuidv4()}`;
  const id = String(rawId);
  if (id.startsWith(`${uid}_`)) return id;
  if (ownedIds.has(id)) return id;
  return `${uid}_${id}`;
}

// Documents in `collName` carrying any of the given tag spellings.
// `array-contains-any` caps at 10 values per query, so the variants are fetched
// in chunks and de-duplicated. Boxes carry tags too, so this is not item-only.
async function findDocsWithAnyTag(collName, tags) {
  const uid = getUserId();
  const wanted = tags.filter(Boolean);
  if (wanted.length === 0) return [];
  const byId = new Map();
  for (let i = 0; i < wanted.length; i += 10) {
    const q = query(
      collection(db, collName),
      where('userId', '==', uid),
      where('tags', 'array-contains-any', wanted.slice(i, i + 10))
    );
    const snap = await getDocs(q);
    snap.docs.forEach((d) => byId.set(d.id, d));
  }
  return Array.from(byId.values());
}

// Apply a tag rewrite across both tagged collections. `rewrite` returns the new
// tag array for a document's current one. Items record `modifiedAt`; boxes
// deliberately do not get `updatedAt` touched — that field means "the contents
// changed", and renaming a tag is not a contents change.
async function rewriteTags(targets, rewrite) {
  const matches = new Set(targets.map(normalizeTag));
  for (const [collName, stamp] of [[ITEMS_COLL, true], [BOXES_COLL, false]]) {
    const docs = await findDocsWithAnyTag(collName, targets);
    docs.forEach((docSnap) => {
      const data = docSnap.data();
      const next = rewrite(data.tags || [], matches);
      queueWrite(setDoc(doc(db, collName, docSnap.id), {
        ...data,
        tags: next,
        ...(stamp ? { modifiedAt: Date.now() } : {}),
      }));
    });
  }
}

// Whether an entity still holds legacy inline images (needs migration).
function isLegacyImages(entity) {
  const imgs = entity?.images;
  if (Array.isArray(imgs) && imgs.length > 0) {
    return typeof imgs[0] !== 'object' || imgs[0] === null;
  }
  // Has a legacy single image but no images array entries.
  return !!entity?.image && !(Array.isArray(imgs) && imgs.length > 0);
}

export const firebaseStorage = {
  getBoxes: async () => {
    try {
      const uid = getUserId();
      const q = query(
        collection(db, BOXES_COLL),
        where("userId", "==", uid),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      rethrowIfDenied(e);
      console.error("Error fetching boxes:", e);
      return [];
    }
  },

  // Persist one full image and return its { id, thumb } ref.
  saveImage: async (derivatives, owner = {}) => {
    const uid = getUserId();
    return saveImageInternal(derivatives, { ...owner, uid });
  },

  // Resolve a full-size image by id. Cache-first: each image is read from the
  // network at most once per device.
  getFullImage: async (id) => {
    if (!id) return null;
    const cached = await imageCache.get(id);
    if (cached) return cached;
    try {
      const snap = await getDoc(doc(db, IMAGES_COLL, id));
      if (!snap.exists()) return null;
      const full = snap.data().full || '';
      if (full) imageCache.set(id, full);
      return full;
    } catch (e) {
      console.error('Error fetching full image:', e);
      return null;
    }
  },

  // Delete a set of image docs by id (used when removing photos during edit).
  deleteImagesByIds: async (ids = []) => {
    await Promise.all((ids || []).filter(Boolean).map((id) => {
      imageCache.del(id);
      queueWrite(deleteDoc(doc(db, IMAGES_COLL, id)));
      return undefined;
    }));
  },

  getBox: async (id) => {
    try {
      const docRef = doc(db, BOXES_COLL, id);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
    } catch (e) {
      console.error("Error fetching box:", e);
      return null;
    }
  },

  // Persist a box. Image refs are prepared by the caller (App handlers); this
  // layer just writes the document.
  addBox: async (box) => {
    const uid = getUserId();
    const id = box.id || uuidv4();
    const newBox = { ...box, id, userId: uid };
    queueWrite(setDoc(doc(db, BOXES_COLL, id), newBox));
    return newBox;
  },

  updateBox: async (id, updates) => {
    const uid = getUserId();
    const boxRef = doc(db, BOXES_COLL, id);
    const boxSnap = await getDoc(boxRef);
    if (!boxSnap.exists()) throw new Error("Box not found");

    const updatedBox = {
      ...boxSnap.data(),
      ...updates,
      userId: uid,
      id, // Ensure ID doesn't change
    };
    queueWrite(setDoc(boxRef, updatedBox));
    return updatedBox;
  },

  // Stamp a box as "contents changed" (item added / removed / moved / deleted).
  // Deliberately NOT called for edits to a box's or an item's own fields —
  // photos, text and tags don't count as a contents change. Single field write,
  // no read, so it stays cheap on the Spark quota.
  touchBox: async (id, updatedAt = Date.now()) => {
    getUserId();
    queueWrite(updateDoc(doc(db, BOXES_COLL, id), { updatedAt }));
    return updatedAt;
  },

  deleteBox: async (id) => {
    const uid = getUserId();
    // The box document goes first, before any await. The cascade below needs
    // two reads, and a list refresh landing in that gap used to see a box whose
    // items were already gone — or keep the box for good if a read failed.
    queueWrite(deleteDoc(doc(db, BOXES_COLL, id)));

    // Cascade: delete the box's own images.
    await deleteImagesByOwner(id, uid);

    // Delete items in the box plus their images.
    const q = query(collection(db, ITEMS_COLL), where("userId", "==", uid), where("boxId", "==", id));
    const snapshot = await getDocs(q);
    await Promise.all(snapshot.docs.map(async (d) => {
      await deleteImagesByOwner(d.id, uid);
      queueWrite(deleteDoc(doc(db, ITEMS_COLL, d.id)));
    }));
  },

  getItems: async (boxId) => {
    try {
      const uid = getUserId();
      const q = query(
        collection(db, ITEMS_COLL),
        where("userId", "==", uid),
        where("boxId", "==", boxId)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      rethrowIfDenied(e);
      console.error("Error fetching items:", e);
      return [];
    }
  },

  getAllItems: async () => {
    try {
      const uid = getUserId();
      const q = query(
        collection(db, ITEMS_COLL),
        where("userId", "==", uid)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      rethrowIfDenied(e);
      console.error("Error fetching all items:", e);
      return [];
    }
  },

  addItem: async (item) => {
    const uid = getUserId();
    const id = item.id || uuidv4();
    const newItem = { ...item, id, userId: uid };
    queueWrite(setDoc(doc(db, ITEMS_COLL, id), newItem));
    return newItem;
  },

  updateItem: async (id, updates) => {
    const uid = getUserId();
    const itemRef = doc(db, ITEMS_COLL, id);
    const itemSnap = await getDoc(itemRef);
    if (!itemSnap.exists()) throw new Error("Item not found");

    const updatedItem = {
      ...itemSnap.data(),
      ...updates,
      userId: uid,
      id, // Ensure ID doesn't change
      modifiedAt: Date.now()
    };
    queueWrite(setDoc(itemRef, updatedItem));
    return updatedItem;
  },

  /**
   * Apply changes to many items at once, as `{ [id]: fieldsToMerge }`.
   *
   * The caller computes the fields from the copy of the item already in local
   * state, so nothing is read back first: on the Spark plan, N reads to write N
   * documents is a quota bill for information the screen is already showing.
   * `update` merges, so only the named fields are touched — no need to carry
   * the whole document through a `set`.
   *
   * Batched in chunks of 400; Firestore caps a batch at 500 operations.
   */
  bulkUpdateItems: async (updatesById) => {
    getUserId();
    const entries = Object.entries(updatesById || {});
    if (entries.length === 0) return;

    for (let i = 0; i < entries.length; i += 400) {
      const batch = writeBatch(db);
      entries.slice(i, i + 400).forEach(([id, fields]) => {
        batch.update(doc(db, ITEMS_COLL, id), { ...fields, modifiedAt: Date.now() });
      });
      queueWrite(batch.commit());
    }
  },

  deleteItem: async (id) => {
    const uid = getUserId();
    await deleteImagesByOwner(id, uid);
    queueWrite(deleteDoc(doc(db, ITEMS_COLL, id)));
  },

  /**
   * Rename a tag across every item. `oldNames` is the list of stored spellings
   * that map to the tag (see tagVariants) — Firestore array queries are
   * case-sensitive, so a legacy "Books" would be missed by a query for "books".
   * The result is re-normalised, which merges the tag into an existing one when
   * `newName` already exists on the same item.
   */
  renameTag: async (oldNames, newName) => {
    const canonical = normalizeTag(newName);
    if (!canonical) return;
    const targets = Array.isArray(oldNames) ? oldNames : [oldNames];
    await rewriteTags(targets, (tags, matches) =>
      normalizeTags(tags.map(t => matches.has(normalizeTag(t)) ? canonical : t)));
  },

  /** Remove a tag — and any other-cased spelling of it — everywhere it occurs. */
  deleteTag: async (tagNames) => {
    const targets = Array.isArray(tagNames) ? tagNames : [tagNames];
    await rewriteTags(targets, (tags, matches) =>
      tags.filter(t => !matches.has(normalizeTag(t))));
  },

  seed: async () => {
    // No automatic seeding for cloud storage to avoid clutter
  },

  importData: async (data, onProgress) => {
    const uid = getUserId();
    const { boxes, items } = data;
    const boxIdMap = {};

    // Which documents this user already holds. Needed to tell a *restore* from a
    // *re-import*: the export writes each entity's current id, so a backup taken
    // from this same account carries the un-namespaced ids of documents that are
    // still here. Writing those to `${uid}_${id}` would file a second copy
    // alongside the original — which is exactly how an export/import round trip
    // used to duplicate an entire inventory.
    //
    // Scoped by userId, so it never reads a document the rules would deny.
    const ownedIds = async (coll) => new Set(
      (await getDocs(query(collection(db, coll), where('userId', '==', uid)))).docs.map(d => d.id)
    );
    const ownedBoxIds = await ownedIds(BOXES_COLL);
    const ownedItemIds = await ownedIds(ITEMS_COLL);

    const resolveId = (rawId, owned) => resolveImportId(rawId, uid, owned);

    const totalSteps = (boxes?.length || 0) + (items?.length || 0);
    let completedSteps = 0;

    // `phase` is a { key, params } pair rather than a sentence: this layer has no
    // access to the active language, so the UI translates it when it renders.
    const reportProgress = (phase) => {
      completedSteps++;
      if (onProgress) {
        onProgress({
          progress: totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 100,
          phase,
          current: completedSteps,
          total: totalSteps
        });
      }
    };

    // Import boxes under a deterministic ID (see resolveId) to prevent
    // duplication. Re-create their image docs from the (hydrated) backup,
    // replacing any that already exist so re-importing stays idempotent.
    if (boxes && Array.isArray(boxes)) {
      for (const box of boxes) {
        const newBoxId = resolveId(box.id, ownedBoxIds);
        boxIdMap[box.id] = newBoxId;
        await deleteImagesByOwner(newBoxId, uid);
        const refs = await rebuildImages(box, 'box', newBoxId, uid);
        const { image: _legacy, ...rest } = box;
        await setDoc(doc(db, BOXES_COLL, newBoxId), {
          ...rest,
          id: newBoxId,
          userId: uid,
          images: refs,
          image: refs[0]?.thumb || null,
        });
        reportProgress({ key: 'import.phase.box', params: { name: box.name } });
      }
    }

    // Import items under a deterministic ID (see resolveId).
    if (items && Array.isArray(items)) {
      for (const item of items) {
        const newItemId = resolveId(item.id, ownedItemIds);
        const newBoxId = boxIdMap[item.boxId] || (item.boxId ? resolveId(item.boxId, ownedBoxIds) : '');
        await deleteImagesByOwner(newItemId, uid);
        const refs = await rebuildImages(item, 'item', newItemId, uid);
        const { image: _legacy, ...rest } = item;
        await setDoc(doc(db, ITEMS_COLL, newItemId), {
          ...rest,
          id: newItemId,
          boxId: newBoxId,
          userId: uid,
          // Backups can predate case-insensitive tags, or come from elsewhere.
          tags: normalizeTags(item.tags),
          images: refs,
          image: refs[0]?.thumb || null,
        });
        reportProgress({ key: 'import.phase.item', params: { name: item.name } });
      }
    }
  },

  // One-tap migration: convert any entities still holding legacy inline images
  // into the split thumb/full layout. Idempotent — already-optimised entities
  // are skipped. Returns the number of entities converted.
  optimizeImages: async (onProgress) => {
    const uid = getUserId();
    const boxes = await firebaseStorage.getBoxes();
    const items = await firebaseStorage.getAllItems();
    const targets = [
      ...boxes.map((b) => ['box', BOXES_COLL, b]),
      ...items.map((i) => ['item', ITEMS_COLL, i]),
    ];

    const total = targets.length;
    let done = 0;
    let converted = 0;

    for (const [ownerType, coll, entity] of targets) {
      if (isLegacyImages(entity)) {
        await deleteImagesByOwner(entity.id, uid);
        const refs = await rebuildImages(entity, ownerType, entity.id, uid);
        const { image: _legacy, ...rest } = entity;
        await setDoc(doc(db, coll, entity.id), {
          ...rest,
          userId: uid,
          images: refs,
          image: refs[0]?.thumb || null,
        });
        converted++;
      }
      done++;
      if (onProgress) {
        onProgress({
          progress: total > 0 ? Math.round((done / total) * 100) : 100,
          phase: {
            key: ownerType === 'box' ? 'import.phase.optimizingBox' : 'import.phase.optimizingItem',
            params: { name: entity.name || '' },
          },
          current: done,
          total,
        });
      }
    }
    return converted;
  }
};

export default firebaseStorage;
