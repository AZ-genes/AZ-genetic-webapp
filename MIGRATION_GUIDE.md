# Database Migration Guide - User Role Addition

## Overview
A new `user_role` column has been added to the `user_profiles` table to support role-based access control (Patient, Doctor, Researcher).

## Migration Steps

### 1. Apply Migration on Supabase
Run the following SQL migration in your Supabase SQL editor:

```sql
-- Create enum for user roles
DROP TYPE IF EXISTS user_role CASCADE;
CREATE TYPE user_role AS ENUM ('patient', 'doctor', 'researcher');

-- Add user_role column to user_profiles table
ALTER TABLE user_profiles ADD COLUMN user_role user_role DEFAULT 'patient';

-- Update existing users to have patient role
UPDATE user_profiles SET user_role = 'patient' WHERE user_role IS NULL;

-- Make user_role NOT NULL after updating existing records
ALTER TABLE user_profiles ALTER COLUMN user_role SET NOT NULL;

-- Add index for user_role for better query performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_role ON user_profiles(user_role);
```

### 2. Verify Migration
After running the migration, verify:
```sql
-- Check that all users have a role
SELECT COUNT(*) FROM user_profiles WHERE user_role IS NOT NULL;

-- Check enum values
SELECT unnest(enum_range(NULL::user_role));
```

## New Features

### Sign-Up Process
- Users can now select their role (Patient, Doctor, or Researcher) during sign-up
- The selected role is stored in the `user_profiles` table
- Default role is `patient`

### Authentication Guards
- All dashboard pages now require authentication
- Unauthenticated users are redirected to `/sign-in`
- Wallet connection now uses event-driven approach with `session_connect` listener

### API Changes
- `GET/POST /api/get-profile` now accepts and stores `user_role`
- Existing profiles without a role default to `patient`

## Deployment Checklist

- [ ] Apply migration SQL on Supabase
- [ ] Verify migration success
- [ ] Test sign-up with different roles
- [ ] Verify existing users still work
- [ ] Test wallet connection
- [ ] Verify dashboard authentication guards work
- [ ] Deploy to Vercel (already done via git push)

## Files Changed

1. `migrations/00008_add_user_role.sql` - Database migration
2. `components/auth/sign-up.tsx` - Added role selection dropdown
3. `app/auth/callback/page.tsx` - Store selected role during sign-up
4. `src/functions/edge/get-profile.ts` - Accept and store user_role
5. `app/dashboard/page.tsx` - Added auth guard and upload validation
6. `app/dashboard/doctor/page.tsx` - Added auth guard
7. `app/dashboard/individual/page.tsx` - Added auth guard
8. `context/HederaWalletContext.tsx` - Fixed wallet connection with session_connect

## Testing

1. **New User Sign-Up:**
   - Go to `/sign-up`
   - Fill in name, email, select role
   - Check email and verify magic link
   - Confirm role is stored in profile

2. **Existing User:**
   - Existing users should have `patient` role by default
   - Users can access dashboard normally

3. **Authentication:**
   - Try accessing `/dashboard` without signing in
   - Should redirect to `/sign-in`

4. **Wallet Connection:**
   - Click "Connect Wallet" in dashboard
   - Approve in HashPack wallet
   - Should see connection success in UI

