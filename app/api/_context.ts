/**
 * Shared context initialization for API routes
 * This module initializes Firebase Admin and Supabase clients
 */

import * as admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';

// Initialize Firebase Admin if not already initialized
let firestore: admin.firestore.Firestore | undefined;
let storage: admin.storage.Storage | undefined;

if (!admin.apps.length) {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID || 'az-genes-1ca88';
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;
    const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || 'az-genes-1ca88.firebasestorage.app';

    if (clientEmail && privateKeyRaw) {
      const privateKey = privateKeyRaw.replace(/\\n/g, '\n');
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        storageBucket,
      });
      firestore = admin.firestore();
      storage = admin.storage();
    }
  } catch (error) {
    console.error('Firebase Admin initialization failed:', error);
  }
} else {
  firestore = admin.firestore();
  storage = admin.storage();
}

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export { firestore, storage, supabase };

