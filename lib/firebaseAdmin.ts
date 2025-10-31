import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK using environment variables.
// Required envs:
// - FIREBASE_PROJECT_ID
// - FIREBASE_CLIENT_EMAIL
// - FIREBASE_PRIVATE_KEY (with \n preserved)

if (!admin.apps.length) {
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
}

export const adminAuth = admin.auth();
export const adminFirestore = admin.firestore();
export const adminStorage = admin.storage();


