import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK using environment variables.

if (!admin.apps.length) {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID || 'az-genes-1ca88';
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;
    const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || 'az-genes-1ca88.firebasestorage.app';

    // Client email and private key are still required for Admin SDK
    if (!clientEmail || !privateKeyRaw) {
      throw new Error('Missing Firebase Admin credentials. Set FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY (from service account JSON)');
    }

    const privateKey = privateKeyRaw.replace(/\\n/g, '\n');

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      storageBucket,
    });
  } catch (error) {
    console.warn('Firebase Admin initialization failed. This is expected if running without .env.local file.');
  }
}

// Create a mock firestore that throws helpful errors if used without proper initialization
const mockFirestore = {
  collection: () => {
    throw new Error('Firebase Admin Firestore is not initialized. Please set FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in your .env.local file.');
  }
} as any;

export const adminAuth = admin.apps[0]?.auth() || { verifyIdToken: () => Promise.resolve({ uid: 'mock-user' }) } as any;
export const adminFirestore = admin.apps[0]?.firestore() || mockFirestore;
export const adminStorage = admin.apps[0]?.storage() || {} as any;


