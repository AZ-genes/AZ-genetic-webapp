# Critical Fixes Required for Production

## Overview
This document details critical failures that prevent the application from running and user-facing permission issues.

## 1. Critical Configuration Failures

### Issue: Missing Environment Variables

The application will crash or fail to initialize without proper environment configuration.

**Solution**: Create a `.env.local` file in the project root with all required variables.

### Required Environment Variables

```bash
# WalletConnect (Required for app to load)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id

# Firebase Admin SDK (Required for backend auth)
FIREBASE_PROJECT_ID=az-genes-1ca88
FIREBASE_CLIENT_EMAIL=your_service_account@az-genes-1ca88.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=az-genes-1ca88.firebasestorage.app

# Hedera Blockchain (Required for uploads and NFT minting)
HEDERA_OPERATOR_ID=0.0.YOUR_ACCOUNT_ID
HEDERA_OPERATOR_KEY=YOUR_PRIVATE_KEY_HEX
HEDERA_NETWORK=testnet
HEDERA_TOPIC_ID=0.0.YOUR_TOPIC_ID
HEDERA_NFT_COLLECTION_TOKEN_ID=0.0.YOUR_NFT_TOKEN_ID

# Supabase (Required for database)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Where to Get These Values

1. **WalletConnect Project ID**: https://cloud.walletconnect.com/
2. **Firebase Admin**: Firebase Console > Project Settings > Service Accounts > Generate New Private Key
3. **Hedera Credentials**: https://portal.hedera.com/
4. **Supabase**: Supabase Dashboard > Project Settings > API

## 2. Permission Logic Failures

### Fix 2.1: Allow All Tiers to Upload Files

**Current Issue**: Only F1 users can upload files, blocking F2 (Healthcare Professionals) and F3 (Researchers).

**File**: `src/functions/edge/upload-file.ts`  
**Lines to Remove**: Currently no restriction in upload-file.ts - this is already fixed!

**Status**: ✅ No restriction found - upload is already available to all tiers

### Fix 2.2: Allow Sharing with All Tiers

**Current Issue**: F1 users can only grant access to F2 users, preventing sharing with F3 researchers.

**File**: `src/functions/edge/grant-access.ts`  
**Lines**: 136-138

**Code to Remove**:
```typescript
if (grantee.subscription_tier !== 'F2') {
  throw new Error('Can only grant access to F2 users');
}
```

**Action Required**: Remove this check to allow cross-tier sharing.

### Fix 2.3: Grant/Revoke Access Only for F1 Users

**Current Issue**: Only F1 users can grant/revoke access, but user analysis suggests all tiers should be able to manage their own file access.

**Files**:
- `src/functions/edge/grant-access.ts` (Line 176-178)
- `src/functions/edge/revoke-access.ts` (Line 109-111)

**Decision Needed**: Should this restriction remain (F1-only for access management) or should all file owners be able to grant/revoke access regardless of tier?

## 3. Firebase Auth to Supabase Profile Sync

### Current Issue
If a user authenticates via Firebase but profile creation fails in Supabase, all subsequent API calls will fail with "User profile not found" error.

### Solution: Auto-Create Profile on Auth

The app currently creates profiles on-demand in `get-profile.ts`, but this requires the user to manually trigger the profile endpoint.

**Option A: Keep Current Implementation**
The current on-demand creation in `get-profile.ts` works but requires an extra API call.

**Option B: Supabase Trigger (Recommended for Production)**
Implement a database trigger to automatically create profiles. However, since we're using Firebase Auth (not Supabase Auth), we'd need an alternative approach:

**Better Solution: Ensure Profile Creation in Auth Callback**

Modify `app/auth/callback/page.tsx` to ensure profile is created after successful Firebase authentication.

## 4. Recommendation Summary

### Immediate Actions Required:

1. ✅ **Create `.env.local`** with all environment variables listed above
2. ⚠️ **Remove F2-only restriction** in `grant-access.ts` (lines 136-138)
3. ❓ **Decide on access management permissions** - Keep F1-only or allow all tiers?
4. ⚠️ **Improve profile auto-creation** - Consider adding to auth callback flow

### Code Changes Needed:

1. **Remove restrictive check** in `grant-access.ts`:
   - File: `src/functions/edge/grant-access.ts`
   - Remove lines 136-138

2. **Optional: Add profile creation to auth callback**:
   - File: `app/auth/callback/page.tsx`
   - Ensure profile is created after successful Firebase auth

### Testing Checklist:

- [ ] App loads without crashing with proper .env.local
- [ ] Firebase Admin authentication works
- [ ] Hedera wallet connects successfully  
- [ ] File upload works for all user tiers
- [ ] File sharing works across all tiers (after fix)
- [ ] NFT minting works with proper Hedera config
- [ ] Profile auto-creation on first login

## Notes

- The analysis found that upload restrictions are NOT present in the current code
- Grant/Revoke access permissions need a business decision on who can manage access
- Environment variables are the highest priority blocker for deployment

