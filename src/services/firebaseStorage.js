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
      return snapshot.docs.map(doc => doc.data());
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
      return docSnap.exists() ? docSnap.data() : null;
    } catch (e) {
      console.error("Error fetching box:", e);
      return null;
    }
  },

  addBox: async (box) => {
    const uid = getUserId();
    const imageData = await processImage(box.image);

    const newBox = {
      ...box,
      image: imageData,
      userId: uid
    };

    await setDoc(doc(db, BOXES_COLL, box.id), newBox);
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
    const q = query(collection(db, ITEMS_COLL), where("boxId", "==", id));
    const snapshot = await getDocs(q);
    const deletePromises = snapshot.docs.map((d) => {
      return deleteDoc(doc(db, ITEMS_COLL, d.data().id));
    });
    await Promise.all(deletePromises);
  },

  getItems: async (boxId) => {
    try {
      const q = query(
        collection(db, ITEMS_COLL),
        where("boxId", "==", boxId),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data());
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
      return snapshot.docs.map(doc => doc.data());
    } catch (e) {
      console.error("Error fetching all items:", e);
      return [];
    }
  },

  addItem: async (item) => {
    const uid = getUserId();
    const imageData = await processImage(item.image);

    const newItem = {
      ...item,
      image: imageData,
      userId: uid
    };

    await setDoc(doc(db, ITEMS_COLL, item.id), newItem);
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
      id: id // Ensure ID doesn't change
    };

    await setDoc(itemRef, updatedItem);
    return updatedItem;
  },

  deleteItem: async (id) => {
    const itemRef = doc(db, ITEMS_COLL, id);
    await deleteDoc(itemRef);
  },

  seed: async () => {
    // No automatic seeding for cloud storage to avoid clutter
  }
};

export default firebaseStorage;
