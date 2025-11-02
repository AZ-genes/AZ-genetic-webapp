# NFT Certificates Setup Guide

## Overview

This document explains how to set up and use NFT certificates for genetic data in AZ-Genes using the Hedera network.

## Architecture

The NFT certificate system consists of:
1. **Backend Services**: HederaClient with NFT minting capabilities
2. **Database**: PostgreSQL table for storing NFT metadata
3. **API Endpoints**: REST API for minting and querying NFTs
4. **Frontend UI**: Dashboard interface for viewing and managing NFT certificates

## Setup Instructions

### 1. Create NFT Collection on Hedera

First, you need to create an NFT collection (token) on the Hedera network. You can do this programmatically or manually via the Hedera portal.

**Programmatic Creation:**

```typescript
const hederaClient = new HederaClient();
const operatorId = AccountId.fromString(process.env.HEDERA_OPERATOR_ID);

const tokenId = await hederaClient.createNFTCertificateCollection(
  'AZ-Genes Certificates',
  'AZGENES',
  operatorId,
  'NFT certificates for genetic data files'
);

console.log('NFT Collection Token ID:', tokenId.toString());
```

**Manual Creation:**

1. Go to [Hedera Portal](https://portal.hedera.com)
2. Navigate to Tokens section
3. Create a new NFT collection
4. Copy the Token ID

### 2. Configure Environment Variable

Add the NFT collection token ID to your `.env.local` file:

```bash
HEDERA_NFT_COLLECTION_TOKEN_ID=0.0.1234567
```

### 3. Run Database Migration

Execute the migration to create the NFT certificates table:

```bash
# Apply the migration to your Supabase database
psql -h your-db-host -U your-user -d your-database -f migrations/00004_add_nft_certificates_table.sql
```

Or if using Supabase:

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy and paste the migration file content
4. Execute the query

### 4. Deploy and Test

1. Deploy your application
2. Connect your Hedera wallet
3. Upload a genetic data file
4. Click "Get Certified" on your data file
5. View the NFT certificate in the "NFT Certificates" tab

## Features

### Creating NFT Certificates

NFT certificates are created with the following structure:

```typescript
{
  name: "File Name Certificate",
  description: "NFT Certificate for File Name",
  creator: "AZ-Genes",
  image: "",
  type: "Certificate",
  version: "1.0",
  attributes: [
    { trait_type: "File Name", value: "..." },
    { trait_type: "File Type", value: "..." },
    { trait_type: "Upload Date", value: "..." }
  ]
}
```

This follows the HIP-412 standard for Hedera NFTs.

### Viewing NFT Certificates

Users can:
- View all their NFT certificates in a grid layout
- See certificate details (type, date, serial number)
- Copy Token IDs for sharing
- Mint new certificates for uncertified files

### Minting Flow

1. User clicks "Get Certified" on a data file
2. Wallet must be connected (prompts if not)
3. Backend creates NFT with metadata
4. NFT is minted on Hedera network
5. Certificate is stored in database
6. UI updates to show certified status

## API Endpoints

### Mint NFT Certificate

**Endpoint:** `POST /api/mint-nft-certificate`

**Request Body:**
```json
{
  "fileId": "uuid-of-file",
  "metadata": {
    "name": "Custom Certificate Name",
    "description": "Custom description",
    "attributes": [
      { "trait_type": "Custom Field", "value": "Value" }
    ]
  }
}
```

**Response:**
```json
{
  "nft": {
    "id": "uuid",
    "file_id": "uuid",
    "owner_id": "uuid",
    "token_id": "0.0.1234567",
    "serial_number": "1",
    "hedera_transaction_id": "...",
    "metadata": {...}
  },
  "tokenId": "0.0.1234567",
  "serialNumber": "1"
}
```

## Database Schema

### nft_certificates Table

```sql
CREATE TABLE nft_certificates (
    id UUID PRIMARY KEY,
    file_id UUID REFERENCES files(id),
    owner_id UUID REFERENCES user_profiles(id),
    token_id TEXT NOT NULL,
    serial_number TEXT NOT NULL,
    hedera_transaction_id TEXT NOT NULL,
    metadata JSONB,
    ipfs_hash TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    UNIQUE(token_id, serial_number)
);
```

### files Table Updates

Added columns:
- `nft_token_id TEXT` - Reference to the NFT token ID
- `nft_serial_number TEXT` - Reference to the NFT serial number

## Security Considerations

1. **Wallet Connection**: Only authenticated users with connected wallets can mint NFTs
2. **Ownership Verification**: Users can only mint NFTs for files they own
3. **Rate Limiting**: Consider implementing rate limits for NFT minting
4. **Cost Management**: Each NFT mint costs HBAR on Hedera, monitor costs

## Future Enhancements

Potential improvements:

1. **IPFS Integration**: Store larger metadata on IPFS
2. **Image Generation**: Auto-generate certificate images
3. **Transfer Functionality**: Allow NFT transfer between accounts
4. **Marketplace**: Enable trading of NFT certificates
5. **Verification System**: Third-party verification of certificates
6. **Batch Minting**: Mint multiple NFTs at once

## Troubleshooting

### Error: "NFT collection not configured"

**Solution**: Set `HEDERA_NFT_COLLECTION_TOKEN_ID` in your environment variables.

### Error: "This file already has an NFT certificate"

**Solution**: Each file can only have one NFT certificate. Check the file's NFT status in the database.

### Error: "Insufficient account balance"

**Solution**: Ensure your Hedera operator account has enough HBAR to pay for transaction fees.

### NFTs not appearing in dashboard

**Solution**: 
1. Check database for NFT records
2. Verify wallet is connected
3. Check browser console for errors
4. Ensure API endpoint is accessible

## References

- [Hedera NFT Documentation](https://docs.hedera.com/hedera/sdks-and-apis/sdks/readme-1)
- [HIP-412 NFT Standard](https://hips.hedera.com/hip/hip-412)
- [Hedera Token Service](https://docs.hedera.com/hedera/sdks-and-apis/sdks/token-service)
- [Hedera Portal](https://portal.hedera.com)

