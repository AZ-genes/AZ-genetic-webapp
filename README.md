# AZ-Genes Genetic Data Platform

A Next.js application for managing genetic data with Firebase/Firestore backend, Hedera blockchain integration, and Flutter mobile compatibility.

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Backend**: Firebase Admin SDK, Firestore, Firebase Storage
- **Authentication**: Firebase Auth (Email Link)
- **Blockchain**: Hedera Hashgraph SDK
- **Testing**: Vitest

## Prerequisites

- Node.js 18.18+ or 20+
- npm or pnpm
- Firebase project with:
  - Authentication enabled (Email Link method)
  - Firestore database
  - Storage bucket
  - Service Account JSON (for Admin SDK)

## Environment Setup

Create a `.env.local` file in the project root:

```bash
# Firebase Admin (Server-side - from Service Account JSON)
FIREBASE_PROJECT_ID=az-genes-1ca88
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@az-genes-1ca88.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...your-key-here...\n-----END PRIVATE KEY-----"
FIREBASE_STORAGE_BUCKET=az-genes-1ca88.firebasestorage.app

# Firebase Client (Web - from Firebase Console)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBNYfeKLLyZ4SKpCCkYkftbEFBShMgcBCI
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=az-genes-1ca88.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=az-genes-1ca88
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=az-genes-1ca88.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=682920435841
NEXT_PUBLIC_FIREBASE_APP_ID=1:682920435841:web:69e41dea36da2e2aa92d80
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-S347C6MQH6

# Hedera Configuration
HEDERA_OPERATOR_ID=0.0.xxxxxx
HEDERA_OPERATOR_KEY=302e0201003005...
HEDERA_NETWORK=testnet
HEDERA_TOPIC_ID=0.0.xxxxxx
HEDERA_CONTRACT_ID=0.0.xxxxxx
MIRROR_NODE_BASE_URL=https://testnet.mirrornode.hedera.com
```

**Note**: The client Firebase config values are already hardcoded in `lib/firebase.ts` as defaults, but can be overridden via env vars.

## Getting Started

### 1. Install Dependencies

```bash
npm install
# or
pnpm install
```

### 2. Set Up Firebase

1. **Enable Authentication**:
   - Go to Firebase Console → Authentication → Sign-in method
   - Enable "Email/Password" and configure Email link sign-in

2. **Create Firestore Database**:
   - Go to Firestore Database → Create database
   - Start in test mode (or set up security rules)

3. **Service Account**:
   - Project Settings → Service Accounts
   - Generate new private key → Download JSON
   - Extract `client_email`, `private_key`, and `project_id` for `.env.local`

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## API Endpoints

All endpoints require Firebase ID token in `Authorization: Bearer <token>` header.

- `GET /api/get-profile` - Get user profile
- `POST /api/upload-file` - Upload genetic data file (multipart/form-data)
- `GET /api/get-file?fileId=<id>` - Download file
- `POST /api/grant-access` - Grant access to F2 users
- `POST /api/revoke-access` - Revoke access
- `DELETE /api/files/[id]` - Delete file
- `GET /api/get-analytics` - Get analytics (F3 users only)

## Project Structure

```
├── app/
│   ├── api/              # Next.js API routes (Node.js runtime)
│   ├── auth/             # Auth callback pages
│   ├── dashboard/         # Dashboard pages
│   └── sign-in/          # Auth pages
├── components/            # React components
├── lib/
│   ├── firebase.ts       # Firebase client config
│   ├── firebaseAdmin.ts  # Firebase Admin SDK
│   ├── storageAdapter.ts # Storage adapter for server
│   ├── apiClient.ts      # API client with auth
│   └── useAuth.ts        # Auth hook
└── src/
    ├── functions/edge/    # Edge function handlers
    └── services/          # Services (Hedera, encryption)
```

## Testing

```bash
# Run tests
npm test

# Test mode automatically uses mock auth
NODE_ENV=test npm test
```

## Firebase Security Rules (for Flutter App)

If your Flutter app accesses Firestore/Storage directly, add these rules:

**Firestore**:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /user_profiles/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /files/{fileId} {
      allow read: if request.auth != null && 
        (resource.data.owner_id == request.auth.uid || 
         exists(/databases/$(database)/documents/file_permissions/$(fileId)));
    }
  }
}
```

**Storage**:
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Deployment

Deploy to Vercel or any Node.js-compatible platform:

```bash
npm run build
npm start
```

Ensure all environment variables are set in your deployment platform.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Hedera SDK Documentation](https://docs.hedera.com/)
