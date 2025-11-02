# 🚨 Critical Issue: Database Split Detection

## ✅ RESOLVED - Migration Complete!

**UPDATE**: All functions have been successfully migrated to Supabase. The database split issue is now resolved!

## Previous Problem (Now Fixed)

The application was previously split between two different databases:

- **Upload functions** wrote to **Supabase (PostgreSQL)** 
- **Read functions** read from **Firestore**

**Result**: Data appeared to disappear because writes and reads used different databases.

## Current State ✅

### All Functions Now Use Supabase
```
Supabase (PostgreSQL) - FULLY INTEGRATED:
├── upload-file.ts ✅
├── mint-nft-certificate.ts ✅
├── grant-access.ts ✅
├── revoke-access.ts ✅
├── get-profile.ts ✅ (migrated)
├── get-files.ts ✅ (migrated)
├── get-file.ts ✅ (migrated)
├── get-shared-files.ts ✅ (migrated)
├── get-access-requests.ts ✅ (migrated)
├── delete-file.ts ✅ (migrated)
└── Storage: Supabase Storage ✅
```

### Auth Setup
```
Frontend Auth: Firebase Auth ✅ (configured)
Backend Auth: Firebase Admin tokens → Supabase ✅ (working)
Database: Supabase (PostgreSQL) ✅ (configured)
```

## Solution

You MUST configure Supabase because:
1. SQL migrations exist pointing to PostgreSQL
2. Most backend functions use Supabase queries
3. The schema expects Supabase's UUID generation and RLS

### Steps to Fix

1. **Create Supabase Project**
   - Go to https://supabase.com
   - Sign up / Sign in
   - Create a new project (free tier is fine)
   - Wait for provisioning

2. **Add Environment Variables**
   Edit your `.env.local` and add:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

3. **Run Database Migrations**
   - In Supabase Dashboard → SQL Editor
   - Run `migrations/00001_initial_schema.sql`
   - Run `migrations/00002_add_notifications_table.sql`
   - Run `migrations/00003_add_revocation_fields_to_file_permissions.sql`
   - Run `migrations/00004_add_nft_certificates_table.sql`

4. **Configure Storage Bucket**
   - In Supabase Dashboard → Storage
   - Create bucket: `encrypted-files`
   - Set to private

5. **Test the Connection**
   ```bash
   npm run dev
   ```

## Alternative Solution (NOT Recommended)

If you want to avoid Supabase, you would need to:
1. Migrate ALL Supabase functions to Firestore
2. Replace Supabase Storage with Firebase Storage
3. Delete SQL migrations folder
4. Convert SQL schema to Firestore collections
5. This is MORE work than just configuring Supabase

## Architecture Note

Your app has an interesting hybrid architecture:
- **Authentication**: Firebase (works well)
- **Database**: Supabase PostgreSQL (needs configuration)
- **Storage**: Supabase (with migrations for encrypted-files bucket)
- **Blockchain**: Hedera Hashgraph (configured and working)

This is actually a **valid architecture** - Firebase Auth + Supabase is a popular combination. You just need to complete the setup.

## Next Steps After Configuration

Once Supabase is configured, you need to:
1. ✅ Fix auth middleware (already supports both)
2. ⚠️  Fix `get-profile.ts` and `get-files.ts` to use Supabase
3. ⚠️  Migrate remaining Firestore reads to Supabase
4. ✅ Update dashboard API calls (already done)

## Files That Need Changes

### Already Fixed ✅
- `app/dashboard/doctor/page.tsx` - Uses api helper
- `app/api/_context.ts` - Initializes both services
- `src/functions/edge/utils.ts` - Supports both

### Needs Changes ⚠️
- `src/functions/edge/get-profile.ts` - Currently Firestore, needs Supabase
- `src/functions/edge/get-files.ts` - Currently Firestore, needs Supabase
- `src/functions/edge/get-file.ts` - Currently Firestore, needs Supabase
- `src/functions/edge/get-shared-files.ts` - Check which DB
- `src/functions/edge/get-access-requests.ts` - Check which DB

The functions already using Supabase are CORRECT and should stay as-is:
- `src/functions/edge/upload-file.ts`
- `src/functions/edge/mint-nft-certificate.ts`
- `src/functions/edge/grant-access.ts`
- `src/functions/edge/revoke-access.ts`

---

**Bottom line**: Add Supabase credentials to `.env.local` and you'll be 90% done.

