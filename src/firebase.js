import { initializeApp } from "firebase/app";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyD7bXqDQwnvWJyfmnJIe7gjvAyYWgRVLZg",
  authDomain: "storageboxorganizer-42466.firebaseapp.com",
  projectId: "storageboxorganizer-42466",
  storageBucket: "storageboxorganizer-42466.firebasestorage.app",
  messagingSenderId: "391832581160",
  appId: "1:391832581160:web:7f59662fe2c815c2aa711d",
  measurementId: "G-HHX53GL2RR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services.
// Firestore uses an IndexedDB-backed persistent cache so metadata and
// (separately stored) image documents survive reloads and work offline,
// cutting repeat reads against the free Spark quota.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});
export const storage = getStorage(app);
export const auth = getAuth(app);

export default app;
