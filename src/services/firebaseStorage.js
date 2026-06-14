import { v4 as uuidv4 } from 'uuid';
import { db, auth } from '../firebase';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  getDoc
} from 'firebase/firestore';
import { makeDerivatives } from '../utils/imageUtils';
import { imageCache } from '../utils/imageCache';

const BOXES_COLL = 'boxes';
const ITEMS_COLL = 'items';
const IMAGES_COLL = 'images';

// Get user ID or throw
function getUserId() {
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");
  return user.uid;
}

// --- Image collection helpers -------------------------------------------------
// Full-size images live in their own collection (one doc each) so entity docs
// stay tiny (just inline thumbnails) and full bytes are fetched only on demand.

// Persist one full-size image and return the lightweight ref to embed on the
// owning entity: { id, thumb }.
async function saveImageInternal({ thumb, full }, { ownerType, ownerId, uid }) {
  const id = uuidv4();
  await setDoc(doc(db, IMAGES_COLL, id), {
    id,
    userId: uid,
    ownerType: ownerType || '',
    ownerId: ownerId || '',
    full,
    createdAt: Date.now(),
  });
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
  await Promise.all(snap.docs.map((d) => {
    imageCache.del(d.id);
    return deleteDoc(doc(db, IMAGES_COLL, d.id));
  }));
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
      return deleteDoc(doc(db, IMAGES_COLL, id)).catch(() => {});
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
    await setDoc(doc(db, BOXES_COLL, id), newBox);
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
    await setDoc(boxRef, updatedBox);
    return updatedBox;
  },

  deleteBox: async (id) => {
    const uid = getUserId();
    // Cascade: delete the box's own images.
    await deleteImagesByOwner(id, uid);

    // Delete items in the box plus their images.
    const q = query(collection(db, ITEMS_COLL), where("userId", "==", uid), where("boxId", "==", id));
    const snapshot = await getDocs(q);
    await Promise.all(snapshot.docs.map(async (d) => {
      await deleteImagesByOwner(d.id, uid);
      await deleteDoc(doc(db, ITEMS_COLL, d.id));
    }));

    await deleteDoc(doc(db, BOXES_COLL, id));
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
      console.error("Error fetching all items:", e);
      return [];
    }
  },

  addItem: async (item) => {
    const uid = getUserId();
    const id = item.id || uuidv4();
    const newItem = { ...item, id, userId: uid };
    await setDoc(doc(db, ITEMS_COLL, id), newItem);
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
    await setDoc(itemRef, updatedItem);
    return updatedItem;
  },

  deleteItem: async (id) => {
    const uid = getUserId();
    await deleteImagesByOwner(id, uid);
    await deleteDoc(doc(db, ITEMS_COLL, id));
  },

  renameTag: async (oldName, newName) => {
    const uid = getUserId();
    const q = query(
      collection(db, ITEMS_COLL),
      where("userId", "==", uid),
      where("tags", "array-contains", oldName)
    );
    const snapshot = await getDocs(q);
    const updatePromises = snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      const updatedTags = data.tags.map(t => t === oldName ? newName : t);
      return setDoc(doc(db, ITEMS_COLL, docSnap.id), { ...data, tags: updatedTags, modifiedAt: Date.now() });
    });
    await Promise.all(updatePromises);
  },

  deleteTag: async (tagName) => {
    const uid = getUserId();
    const q = query(
      collection(db, ITEMS_COLL),
      where("userId", "==", uid),
      where("tags", "array-contains", tagName)
    );
    const snapshot = await getDocs(q);
    const updatePromises = snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      const updatedTags = data.tags.filter(t => t !== tagName);
      return setDoc(doc(db, ITEMS_COLL, docSnap.id), { ...data, tags: updatedTags, modifiedAt: Date.now() });
    });
    await Promise.all(updatePromises);
  },

  seed: async () => {
    // No automatic seeding for cloud storage to avoid clutter
  },

  importData: async (data, onProgress) => {
    const uid = getUserId();
    const { boxes, items } = data;
    const boxIdMap = {};

    const totalSteps = (boxes?.length || 0) + (items?.length || 0);
    let completedSteps = 0;

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

    // Import boxes with deterministic namespaced IDs to prevent duplication.
    // Re-create their image docs from the (hydrated) backup, replacing any that
    // already exist so re-importing the same file stays idempotent.
    if (boxes && Array.isArray(boxes)) {
      for (const box of boxes) {
        const newBoxId = `${uid}_${box.id}`;
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
        reportProgress(`Processing box: ${box.name}`);
      }
    }

    // Import items with deterministic namespaced IDs.
    if (items && Array.isArray(items)) {
      for (const item of items) {
        const newItemId = `${uid}_${item.id}`;
        const newBoxId = boxIdMap[item.boxId] || (item.boxId ? `${uid}_${item.boxId}` : '');
        await deleteImagesByOwner(newItemId, uid);
        const refs = await rebuildImages(item, 'item', newItemId, uid);
        const { image: _legacy, ...rest } = item;
        await setDoc(doc(db, ITEMS_COLL, newItemId), {
          ...rest,
          id: newItemId,
          boxId: newBoxId,
          userId: uid,
          images: refs,
          image: refs[0]?.thumb || null,
        });
        reportProgress(`Processing item: ${item.name}`);
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
          phase: `Optimizing ${ownerType}: ${entity.name || ''}`,
          current: done,
          total,
        });
      }
    }
    return converted;
  }
};

export default firebaseStorage;
