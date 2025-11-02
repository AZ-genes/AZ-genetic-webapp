#!/usr/bin/env node

/**
 * Query NFT information from Hedera
 */

import {
  Client,
  TokenNftInfoQuery,
  TokenId,
  NftId,
  AccountId,
  PrivateKey
} from "@hashgraph/sdk";
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function queryNFT() {
  const operatorId = process.env.HEDERA_OPERATOR_ID;
  const operatorKey = process.env.HEDERA_OPERATOR_KEY;
  const tokenId = process.env.HEDERA_NFT_COLLECTION_TOKEN_ID;

  if (!tokenId) {
    console.error("Error: HEDERA_NFT_COLLECTION_TOKEN_ID must be set");
    return;
  }

  const client = Client.forTestnet();
  
  try {
    if (operatorId && operatorKey) {
      client.setOperator(AccountId.fromString(operatorId), PrivateKey.fromString(operatorKey));
    }
  } catch (err) {
    console.error("Error setting up client:", err);
    return;
  }

  const tokenIdObj = TokenId.fromString(tokenId);

  console.log("\n🔍 Querying NFT Collection:", tokenId);
  console.log("========================================\n");

  try {
    // Query for serial number 1 (first NFT in the collection)
    const nftId = new NftId(tokenIdObj, 1);
    const query = new TokenNftInfoQuery()
      .setNftId(nftId);

    console.log("⏳ Executing query...");
    const nftInfoArray = await query.execute(client);

    if (!nftInfoArray || nftInfoArray.length === 0) {
      console.log("\n❌ No NFT found with serial number 1");
      return;
    }

    const nftInfo = nftInfoArray[0];
    
    console.log("\n✅ NFT Found!");
    console.log("📋 Details:");
    console.log("   NFT ID:", nftInfo.nftId?.toString() || "N/A");
    console.log("   Account ID:", nftInfo.accountId?.toString() || "N/A");
    console.log("   Creation Time:", nftInfo.creationTime?.toDate().toISOString() || "N/A");
    console.log("   Serial Number:", nftInfo.serialNumber?.toString() || "N/A");
    
    // Decode metadata
    if (nftInfo.metadata) {
      const metadataStr = new TextDecoder().decode(nftInfo.metadata);
      console.log("\n📝 Metadata:", metadataStr);
      try {
        const metadata = JSON.parse(metadataStr);
        console.log("   Parsed:", JSON.stringify(metadata, null, 2));
      } catch (e) {
        console.log("   (Raw bytes - not valid JSON)");
      }
    } else {
      console.log("\n📝 No metadata");
    }

    console.log("\n🔗 View on explorer:");
    console.log(`   https://hashscan.io/testnet/token/${tokenId}/instance/1`);
    
    // Try to query serial number 2 if we just minted a second one
    try {
      const nftId2 = new NftId(tokenIdObj, 2);
      const query2 = new TokenNftInfoQuery().setNftId(nftId2);
      const nftInfoArray2 = await query2.execute(client);
      if (nftInfoArray2 && nftInfoArray2.length > 0) {
        console.log("\n✅ NFT Serial #2 also found!");
        const nftInfo2 = nftInfoArray2[0];
        console.log(`   NFT ID: ${nftInfo2.nftId?.toString() || "N/A"}`);
        console.log(`   Account: ${nftInfo2.accountId?.toString() || "N/A"}`);
      }
    } catch (e) {
      // Ignore - only serial 1 exists
    }

  } catch (err) {
    if (err.toString().includes('NOT_FOUND')) {
      console.log("❌ NFT with serial number 1 not found");
      console.log("💡 Try minting an NFT first using 'npm run mint-test-nft'");
    } else {
      console.error("❌ Error querying NFT:", err);
    }
  } finally {
    client.close();
  }
}

queryNFT();

