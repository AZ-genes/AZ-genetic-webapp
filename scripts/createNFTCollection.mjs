import {
  Client,
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  PrivateKey,
  AccountId
} from "@hashgraph/sdk";
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function createNFTCertificateCollection() {
  const operatorId = process.env.HEDERA_OPERATOR_ID;
  const operatorKey = process.env.HEDERA_OPERATOR_KEY;

  if (!operatorId || !operatorKey) {
    console.error("Error: HEDERA_OPERATOR_ID and HEDERA_OPERATOR_KEY must be set in your .env.local file");
    return;
  }

  const client = Client.forTestnet();
  
  try {
    client.setOperator(AccountId.fromString(operatorId), PrivateKey.fromString(operatorKey));
    console.log("Client created and operator set.");
    console.log("Using Operator ID:", operatorId);
  } catch (err) {
    console.error("Error setting up client. Check your .env.local file for correct Hedera credentials.", err);
    return;
  }

  console.log("\nCreating NFT Certificate Collection...");

  try {
    const operatorPrivateKey = PrivateKey.fromString(operatorKey);
    const treasuryAccountId = AccountId.fromString(operatorId);
    
    // Use the treasury account's key as the supply key for simplicity
    const transaction = await new TokenCreateTransaction()
      .setTokenName("AZ-Genes Certificates")
      .setTokenSymbol("AZGENES")
      .setTokenType(TokenType.NonFungibleUnique)
      .setInitialSupply(0)
      .setTreasuryAccountId(treasuryAccountId)
      .setSupplyType(TokenSupplyType.Infinite)
      .setSupplyKey(operatorPrivateKey.publicKey)
      .setTokenMemo("NFT certificates for genetic data files")
      .freezeWith(client);

    console.log("Submitting transaction to the network...");
    const txResponse = await transaction.execute(client);

    console.log("Waiting for transaction receipt...");
    const receipt = await txResponse.getReceipt(client);

    const newTokenId = receipt.tokenId;

    console.log("\n✅ Success!");
    console.log("Your NFT Collection Token ID is:", newTokenId.toString());
    console.log("\nAdd this to your .env.local file:");
    console.log(`HEDERA_NFT_COLLECTION_TOKEN_ID=${newTokenId.toString()}`);

  } catch (err) {
    console.error("\n❌ Error creating NFT collection:");
    console.error(err);
  } finally {
    console.log("\nCleaning up and closing client connection...");
    client.close();
    console.log("Client closed. Script will now exit.");
  }
}

createNFTCertificateCollection();

