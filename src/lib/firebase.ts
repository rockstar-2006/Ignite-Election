import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  setPersistence, 
  browserLocalPersistence,
  browserPopupRedirectResolver,
  indexedDBLocalPersistence
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'ignite-ai-7d7de'}.firebaseapp.com`,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'ignite-ai-7d7de',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'ignite-ai-7d7de'}.firebasestorage.app`,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const isConfigured = !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const app = getApps().length > 0 
  ? getApp() 
  : (isConfigured ? initializeApp(firebaseConfig) : null);

const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;
const storage = app ? getStorage(app) : null;

// Configure Firebase auth persistence
if (auth) {
  // Use indexedDBLocalPersistence for better performance in modern browsers
  setPersistence(auth, indexedDBLocalPersistence).catch(err => {
    console.warn("Failed to set Firebase persistence:", err);
  });
}

export { app, auth, db, storage, isConfigured, browserPopupRedirectResolver };

