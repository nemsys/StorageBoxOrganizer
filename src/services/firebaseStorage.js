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
import { resizeImage } from '../utils/imageUtils';

const BOXES_COLL = 'boxes';
const ITEMS_COLL = 'items';

// Helper to process image - resize and convert to base64
async function processImage(file) {
  if (!file) return '';
  if (typeof file === 'string') return file; // Already a data URL or regular URL

  // Resize image to max 800x800 with 0.7 quality to keep size down
  const dataUrl = await resizeImage(file, 800, 800, 0.7);
  return dataUrl;
}

// Get user ID or throw
function getUserId() {
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");
  return user.uid;
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

  uploadImage: async (file, folder) => {
    // Folder is unused in Base64 implementation but kept for API compatibility
    return await processImage(file);
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

  addBox: async (box) => {
    const uid = getUserId();
    const imageData = await processImage(box.image);
    const id = box.id || uuidv4();

    const newBox = {
      ...box,
      id,
      image: imageData,
      userId: uid
    };

    await setDoc(doc(db, BOXES_COLL, id), newBox);
    return newBox;
  },

  updateBox: async (id, updates) => {
    const uid = getUserId();

    // Get existing box
    const boxRef = doc(db, BOXES_COLL, id);
    const boxSnap = await getDoc(boxRef);
    if (!boxSnap.exists()) throw new Error("Box not found");

    const existingBox = boxSnap.data();

    // Process image if it's being updated
    let imageData = existingBox.image;
    if (updates.image !== undefined) {
      imageData = await processImage(updates.image);
    }

    const updatedBox = {
      ...existingBox,
      ...updates,
      image: imageData,
      userId: uid,
      id: id // Ensure ID doesn't change
    };

    await setDoc(boxRef, updatedBox);
    return updatedBox;
  },

  deleteBox: async (id) => {
    // Delete box
    const boxRef = doc(db, BOXES_COLL, id);
    await deleteDoc(boxRef);

    // Delete items in box
    const uid = getUserId();
    const q = query(collection(db, ITEMS_COLL), where("userId", "==", uid), where("boxId", "==", id));
    const snapshot = await getDocs(q);
    const deletePromises = snapshot.docs.map((d) => {
      return deleteDoc(doc(db, ITEMS_COLL, d.id));
    });
    await Promise.all(deletePromises);
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
    const imageData = await processImage(item.image);
    const id = item.id || uuidv4();

    const newItem = {
      ...item,
      id,
      image: imageData,
      userId: uid
    };

    await setDoc(doc(db, ITEMS_COLL, id), newItem);
    return newItem;
  },

  updateItem: async (id, updates) => {
    const uid = getUserId();

    // Get existing item
    const itemRef = doc(db, ITEMS_COLL, id);
    const itemSnap = await getDoc(itemRef);
    if (!itemSnap.exists()) throw new Error("Item not found");

    const existingItem = itemSnap.data();

    // Process image if it's being updated
    let imageData = existingItem.image;
    if (updates.image !== undefined) {
      imageData = await processImage(updates.image);
    }

    const updatedItem = {
      ...existingItem,
      ...updates,
      image: imageData,
      userId: uid,
      id: id, // Ensure ID doesn't change
      modifiedAt: Date.now()
    };

    await setDoc(itemRef, updatedItem);
    return updatedItem;
  },

  deleteItem: async (id) => {
    const itemRef = doc(db, ITEMS_COLL, id);
    await deleteDoc(itemRef);
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

    // Import boxes with fresh IDs to avoid collisions and permission issues
    if (boxes && Array.isArray(boxes)) {
      const boxPromises = boxes.map(async (box) => {
        const newBoxId = uuidv4();
        boxIdMap[box.id] = newBoxId; // Store mapping
        const docRef = doc(db, BOXES_COLL, newBoxId);
        await setDoc(docRef, { ...box, id: newBoxId, userId: uid });
        reportProgress(`Processing box: ${box.name}`);
      });
      await Promise.all(boxPromises);
    }

    // Import items with fresh IDs and updated boxId references
    if (items && Array.isArray(items)) {
      const itemPromises = items.map(async (item) => {
        const newItemId = uuidv4();
        // Use the new box ID if it was part of the import, otherwise keep the old one (fallback)
        const newBoxId = boxIdMap[item.boxId] || item.boxId;
        const docRef = doc(db, ITEMS_COLL, newItemId);
        await setDoc(docRef, { ...item, id: newItemId, boxId: newBoxId, userId: uid });
        reportProgress(`Processing item: ${item.name}`);
      });
      await Promise.all(itemPromises);
    }
  }
};

export default firebaseStorage;
