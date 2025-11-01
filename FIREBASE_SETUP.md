# Firebase Admin SDK Setup Guide

## Why You Need Admin SDK Credentials

Your app needs **two types** of Firebase credentials:

1. **Client SDK** (✅ You already have this) - Used in the browser/frontend
   - Already configured in `lib/firebase.ts`
   - The config you showed is for this

2. **Admin SDK** (❌ You need this) - Used on the server/backend
   - Required for API routes (token transfers, file uploads, etc.)
   - Needs service account credentials

## How to Get Admin SDK Credentials

### Step 1: Go to Firebase Console
1. Visit [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. Select your project: **az-genes-1ca88**

### Step 2: Navigate to Service Accounts
1. Click the **gear icon** (⚙️) next to "Project Overview"
2. Select **"Project Settings"**
3. Click the **"Service Accounts"** tab

### Step 3: Generate Service Account Key
1. Click **"Generate new private key"** button
2. Click **"Generate key"** in the confirmation dialog
3. A JSON file will be downloaded (e.g., `az-genes-1ca88-firebase-adminsdk-xxxxx-xxxxx.json`)

### Step 4: Extract Credentials from JSON

Open the downloaded JSON file. It will look like this:

```json
{
  "type": "service_account",
  "project_id": "az-genes-1ca88",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@az-genes-1ca88.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "..."
}
```

### Step 5: Add to .env.local

Create a `.env.local` file in your project root and add:

```bash
# From the JSON file:
FIREBASE_PROJECT_ID=az-genes-1ca88
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@az-genes-1ca88.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=az-genes-1ca88.firebasestorage.app
```

**Important Notes:**
- Keep the `\n` characters in the private key - they represent newlines
- The private key must be wrapped in quotes (single or double)
- Keep the entire key including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`

### Step 6: Update .env.local with Your Values

Copy the values from your JSON file:

1. **FIREBASE_PROJECT_ID**: Use `project_id` from JSON (should be `az-genes-1ca88`)
2. **FIREBASE_CLIENT_EMAIL**: Use `client_email` from JSON
3. **FIREBASE_PRIVATE_KEY**: Use the entire `private_key` value from JSON (including BEGIN/END lines)
4. **FIREBASE_STORAGE_BUCKET**: Use `az-genes-1ca88.firebasestorage.app` (already known)

## Example .env.local File

```bash
# Firebase Admin SDK (Required)
FIREBASE_PROJECT_ID=az-genes-1ca88
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-abc123@az-genes-1ca88.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=az-genes-1ca88.firebasestorage.app

# WalletConnect (if you have it)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-project-id-here
```

## After Setup

1. Restart your dev server: `npm run dev`
2. Try the token transfer again - it should work!

## Security Note

⚠️ **NEVER commit `.env.local` to git!** It's already in `.gitignore` for your protection.

