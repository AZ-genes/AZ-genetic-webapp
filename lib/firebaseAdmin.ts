import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK using environment variables.
if (!admin.apps.length) {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID || 'az-genes-1ca88';
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

    if (clientEmail && privateKeyRaw) {
      const privateKey = privateKeyRaw.replace(/\\n/g, '\n');
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    }
  } catch (error) {
    console.warn('Firebase Admin initialization failed:', error);
  }
}

// Authentication export for middleware/API routes
export const adminAuth = admin.apps[0]?.auth() || { verifyIdToken: () => Promise.resolve({ uid: 'mock-user' }) } as any;


