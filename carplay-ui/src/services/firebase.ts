import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, push, Database } from 'firebase/database';

// Firebase configuration from .env
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "mock-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "mock-domain",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://mock-db.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "mock-project",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "mock-bucket",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "mock-sender",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "mock-appid"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database
const db: Database = getDatabase(app);

// Simple logging wrapper
const logV2X = (msg: string) => console.log(`%c[V2X CLOUD]%c ${msg}`, 'color: #3a9bff; font-weight: bold;', 'color: inherit;');

export { db, ref, onValue, set, push, logV2X };
