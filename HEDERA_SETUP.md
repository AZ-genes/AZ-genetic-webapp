# Hedera Testnet Setup Guide

## Getting Your Hedera Credentials

### Step 1: Create a Developer Portal Account
1. Go to [https://portal.hedera.com/register/](https://portal.hedera.com/register/)
2. Sign up for a free account
3. Confirm your email address

### Step 2: Get Testnet Account Credentials
1. Log in to [https://portal.hedera.com/login/](https://portal.hedera.com/login/)
2. **Select "Testnet"** from the network dropdown (top right)
3. Click the **"Create Account"** button
4. Your credentials will be displayed:
   - **Account ID** (e.g., `0.0.1234567`) - This is your HEDERA_OPERATOR_ID
   - **Private Key** (long hex string) - This is your HEDERA_OPERATOR_KEY

### Step 3: Update Your .env.local File

Once you have your credentials, update your `.env.local` file:

```bash
HEDERA_OPERATOR_ID=0.0.XXXXXXXX
HEDERA_OPERATOR_KEY=YOUR_FULL_PRIVATE_KEY_HERE
HEDERA_NETWORK=testnet
HEDERA_TOPIC_ID=   # Leave empty - we'll create this next
HEDERA_CONTRACT_ID= # Leave empty for now
MIRROR_NODE_BASE_URL=https://testnet.mirrornode.hedera.com
```

**Important Notes:**
- The private key should be a long hex string (usually 96+ characters)
- Copy the ENTIRE private key - do not truncate it
- Keep these credentials secure - they control your testnet account
- The portal gives you free testnet HBAR for development

### Step 4: Create a Topic

After updating your `.env.local` file, run:

```bash
npm run create-topic
```

This will:
1. Create a new Hedera Consensus Service (HCS) topic
2. Display the topic ID
3. You can then add it to your `.env.local` file

### What's the Topic For?

The Hedera topic is used to:
- Submit file hashes to the blockchain (Proof-of-Integrity)
- Create an immutable audit log of your genetic data
- Verify data hasn't been tampered with

## Security Reminders

- ⚠️ **Never commit your `.env.local` file to git**
- 🔒 **Testnet credentials are free - mainnet keys control real money**
- 📝 **Always test on testnet before mainnet**
- 🗑️ **Don't share your private keys publicly**

## Troubleshooting

**Error: "invalid private key length"**
- Make sure you copied the ENTIRE private key from the portal
- Private key should be a hex string (characters 0-9, a-f)
- Remove any spaces or line breaks

**Error: "insufficient account balance"**
- Go back to the portal and ensure your testnet account has HBAR
- New accounts get free testnet HBAR automatically
- You can request more HBAR from the portal's faucet

**Can't create topic**
- Verify your HEDERA_OPERATOR_ID and HEDERA_OPERATOR_KEY are correct
- Ensure HEDERA_NETWORK=testnet
- Check your internet connection

## Additional Resources

- [Hedera Portal](https://portal.hedera.com)
- [Hedera Getting Started Guide](https://docs.hedera.com/hedera/getting-started-hedera-native-developers/create-an-account)
- [Hedera Documentation](https://docs.hedera.com/)

