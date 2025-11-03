# Vercel Deployment Guide for AZ Genes

## Prerequisites
- Vercel account
- GitHub repository with code pushed
- Supabase project configured
- Firebase project configured
- Hedera testnet account configured

## Environment Variables Required in Vercel

Add the following environment variables in your Vercel project settings:

### Firebase Configuration
```
FIREBASE_CLIENT_EMAIL=your-firebase-client-email@project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=your-firebase-private-key
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_STORAGE_BUCKET=your-firebase-storage-bucket.appspot.com
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_APP_ID=your-firebase-app-id
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-firebase-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-firebase-storage-bucket.appspot.com
```

### Supabase Configuration
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Hedera Configuration
```
HEDERA_CONTRACT_ID=0.0.xxxxxx
HEDERA_NETWORK=testnet
HEDERA_NFT_COLLECTION_TOKEN_ID=0.0.xxxxxx
HEDERA_OPERATOR_ID=0.0.xxxxxx
HEDERA_OPERATOR_KEY=your-hedera-operator-private-key
HEDERA_TOPIC_ID=0.0.xxxxxx
MIRROR_NODE_BASE_URL=https://testnet.mirrornode.hedera.com
```

### WalletConnect (Optional - Currently Stubbed)
```
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-walletconnect-project-id
```

### PostHog (Optional - Analytics)
```
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
NEXT_PUBLIC_POSTHOG_KEY=your-posthog-key
```

## Deployment Steps

### 1. Push to GitHub
```bash
git push origin main
```

### 2. Deploy to Vercel

#### Option A: Via Vercel Dashboard
1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure the project:
   - Framework Preset: Next.js
   - Root Directory: ./
   - Build Command: `pnpm build`
   - Output Directory: .next
   - Install Command: `pnpm install`
5. Add all environment variables listed above
6. Click "Deploy"

#### Option B: Via Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Deploy to production
vercel --prod
```

### 3. Configure Firebase OAuth Redirect Domain

After deployment, you need to allowlist your Vercel domain in Firebase:

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project (az-genes-1ca88)
3. Navigate to **Authentication** > **Settings** > **Authorized domains**
4. Click **Add domain**
5. Add your Vercel deployment domain (e.g., `your-project.vercel.app`)
6. Add any custom domains you plan to use

**Example domains to add:**
- `your-project.vercel.app` (default Vercel preview/production URL)
- `yourproject.vercel.app` (if using vercel.app without dashes)
- Any custom domain you configure in Vercel

This is required for Firebase Auth to work properly with magic link authentication.

### 4. Run Database Migrations

After deployment, you need to run the SQL migrations on your Supabase project:

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run the following migrations in order:
   - `migrations/00001_updated_schema.sql`
   - `migrations/00002_add_notifications_table.sql`
   - `migrations/00003_add_revocation_fields_to_file_permissions.sql`
   - `migrations/00004_add_nft_certificates_table.sql`
   - `migrations/00005_add_token_transactions.sql`
   - `migrations/00006_add_user_profile_name_email.sql`
   - `migrations/00007_add_pending_status_to_file_permissions.sql`

### 5. Configure Domain (Optional)

1. Go to your Vercel project settings
2. Click on "Domains"
3. Add your custom domain
4. Follow the DNS configuration instructions

## Post-Deployment Checklist

- [ ] Test user authentication (sign up / sign in)
- [ ] Test file upload functionality
- [ ] Test NFT certificate minting
- [ ] Test token transactions
- [ ] Test data sharing features
- [ ] Test analytics dashboard (F3 tier)
- [ ] Verify environment variables are correctly set
- [ ] Check Vercel function logs for any errors
- [ ] Test on mobile devices
- [ ] Verify Supabase database migrations are applied

## Troubleshooting

### Build Fails
- Check that all environment variables are set correctly
- Verify `pnpm-lock.yaml` is committed
- Check build logs for specific errors

### Runtime Errors
- Check Vercel function logs in dashboard
- Verify Supabase connection
- Verify Firebase configuration
- Check Hedera network connectivity

### Authentication Issues
- Verify Firebase configuration
- Check Firebase Authorized domains are configured correctly
- Add your Vercel domain to Firebase Authorized domains
- Check Supabase auth configuration
- Verify CORS settings

### Database Errors
- Ensure all migrations are run
- Check Supabase RLS policies
- Verify table permissions

## Additional Notes

- The Hedera wallet connection is currently stubbed out and will need proper implementation
- All API routes use edge functions for optimal performance
- The app uses Supabase for database and Firebase for authentication
- Hedera testnet is configured for NFT and token transactions
- Monitor Vercel analytics for usage patterns

## Support

For issues, check:
1. Vercel deployment logs
2. Supabase dashboard logs
3. Firebase console logs
4. GitHub issues page

