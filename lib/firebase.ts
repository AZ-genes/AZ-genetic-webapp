import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Firebase client configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBNYfeKLLyZ4SKpCCkYkftbEFBShMgcBCI",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "az-genes-1ca88.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "az-genes-1ca88",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "az-genes-1ca88.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "682920435841",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:682920435841:web:69e41dea36da2e2aa92d80",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-S347C6MQH6"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
