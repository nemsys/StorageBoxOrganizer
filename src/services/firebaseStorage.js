import { db, storage, auth } from '../firebase';
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
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';

const BOXES_COLL = 'boxes';
const ITEMS_COLL = 'items';

// Helper to upload image
async function uploadImage(file, path) {
  if (!file) return '';
  if (typeof file === 'string') return file; // Already a URL

  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
}

// Helper to delete image from URL
async function deleteImage(url) {
  if (!url || !url.includes('firebasestorage')) return;
  try {
    const storageRef = ref(storage, url);
    await deleteObject(storageRef);
  } catch (error) {
    console.warn('Failed to delete image:', error);
  }
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
    const imagePath = `images/${uid}/boxes/${box.id}`;
    const imageUrl = await uploadImage(box.image, imagePath);

    const newBox = {
      ...box,
      image: imageUrl,
      userId: uid
    };

    await setDoc(doc(db, BOXES_COLL, box.id), newBox);
    return newBox;
  },

  deleteBox: async (id) => {
    // Get box to delete image
    const boxRef = doc(db, BOXES_COLL, id);
    const boxSnap = await getDoc(boxRef);
    if (boxSnap.exists()) {
      const box = boxSnap.data();
      await deleteImage(box.image);
    }

    // Delete box
    await deleteDoc(boxRef);

    // Delete items in box
    const q = query(collection(db, ITEMS_COLL), where("boxId", "==", id));
    const snapshot = await getDocs(q);
    const deletePromises = snapshot.docs.map(async (d) => {
      const item = d.data();
      await deleteImage(item.image);
      return deleteDoc(doc(db, ITEMS_COLL, item.id));
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
    const imagePath = `images/${uid}/items/${item.id}`;
    const imageUrl = await uploadImage(item.image, imagePath);

    const newItem = {
      ...item,
      image: imageUrl,
      userId: uid
    };

    await setDoc(doc(db, ITEMS_COLL, item.id), newItem);
    return newItem;
  },

  deleteItem: async (id) => {
    const itemRef = doc(db, ITEMS_COLL, id);
    const itemSnap = await getDoc(itemRef);
    if (itemSnap.exists()) {
      const item = itemSnap.data();
      await deleteImage(item.image);
    }
    await deleteDoc(itemRef);
  },

  seed: async () => {
    // No automatic seeding for cloud storage to avoid clutter
    // But we could implement if needed
  }
};

export default firebaseStorage;
