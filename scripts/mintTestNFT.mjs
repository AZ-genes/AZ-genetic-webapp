#!/usr/bin/env node

/**
 * Mint a test NFT certificate for genetic data
 * This script demonstrates the full flow of creating an NFT certificate
 */

import {
  Client,
  TokenMintTransaction,
  TokenId,
  PrivateKey,
  AccountId
} from "@hashgraph/sdk";
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function mintTestNFT() {
  const operatorId = process.env.HEDERA_OPERATOR_ID;
  const operatorKey = process.env.HEDERA_OPERATOR_KEY;
  const tokenId = process.env.HEDERA_NFT_COLLECTION_TOKEN_ID;

  if (!operatorId || !operatorKey) {
    console.error("Error: HEDERA_OPERATOR_ID and HEDERA_OPERATOR_KEY must be set in your .env.local file");
    return;
  }

  if (!tokenId) {
    console.error("Error: HEDERA_NFT_COLLECTION_TOKEN_ID must be set in your .env.local file");
    console.error("Run 'npm run create-nft-collection' first to create an NFT collection");
    return;
  }

  const client = Client.forTestnet();
  
  try {
    client.setOperator(AccountId.fromString(operatorId), PrivateKey.fromString(operatorKey));
    console.log("✅ Client created and operator set.");
    console.log("📋 Using Operator ID:", operatorId);
    console.log("🎫 Using Token ID:", tokenId);
  } catch (err) {
    console.error("❌ Error setting up client. Check your .env.local file for correct Hedera credentials.", err);
    return;
  }

  // Create minimal metadata (Hedera has a ~100 byte limit for on-chain metadata)
  const metadata = {
    name: "Genetic Data Cert",
    description: "VCF Certificate",
    creator: "AZ-Genes"
  };

  const metadataBytes = new TextEncoder().encode(JSON.stringify(metadata));
  
  // Check metadata size
  console.log(`\n📏 Metadata size: ${metadataBytes.length} bytes`);
  if (metadataBytes.length > 100) {
    console.log("⚠️  Warning: Metadata exceeds recommended 100 byte limit for Hedera NFTs");
  }

  console.log("\n📝 NFT Metadata:", JSON.stringify(metadata, null, 2));
  console.log("\n⏳ Minting NFT certificate...");

  try {
    const transaction = await new TokenMintTransaction()
      .setTokenId(TokenId.fromString(tokenId))
      .addMetadata(metadataBytes)
      .freezeWith(client);

    const signedTransaction = await transaction.sign(PrivateKey.fromString(operatorKey));
    const txResponse = await signedTransaction.execute(client);
    const receipt = await txResponse.getReceipt(client);

    console.log("\n✅ NFT Certificate minted successfully!");
    console.log("📄 Transaction ID:", txResponse.transactionId.toString());
    console.log("🔗 View on explorer:", `https://hashscan.io/testnet/transaction/${txResponse.transactionId.toString()}`);
    
    // Try to get serial number from various sources
    let serialNumber = "Unknown";
    if (receipt && 'serials' in receipt) {
      console.log("📊 Receipt serials:", receipt.serials);
      if (Array.isArray(receipt.serials) && receipt.serials.length > 0) {
        serialNumber = receipt.serials[0].toString();
      }
    }
    
    console.log("\n🎫 Serial Number:", serialNumber);
    console.log("💡 You can query your NFTs using TokenNftInfoQuery");

  } catch (err) {
    console.error("\n❌ Error minting NFT:");
    console.error(err);
    
    if (err.toString().includes('INVALID_ACCOUNT_ID')) {
      console.log("\n💡 Make sure your HEDERA_OPERATOR_ID is correct");
    } else if (err.toString().includes('INSUFFICIENT_ACCOUNT_BALANCE')) {
      console.log("\n💡 Your account needs more HBAR. Go to https://portal.hedera.com and request testnet HBAR");
    } else if (err.toString().includes('INVALID_TOKEN_ID')) {
      console.log("\n💡 Make sure HEDERA_NFT_COLLECTION_TOKEN_ID is correct");
      console.log("💡 Run 'npm run create-nft-collection' to create a new collection");
    }
  } finally {
    console.log("\n🔌 Cleaning up and closing client connection...");
    client.close();
    console.log("✅ Client closed. Script complete.");
  }
}

mintTestNFT();

