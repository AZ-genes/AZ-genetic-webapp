import {
  Client,
  TopicCreateTransaction,
  PrivateKey,
  AccountId
} from "@hashgraph/sdk";
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load environment variables from your .env.local file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function main() {
  // Grab your operator ID and key from .env.local
  const operatorId = process.env.HEDERA_OPERATOR_ID;
  const operatorKey = process.env.HEDERA_OPERATOR_KEY;

  if (!operatorId || !operatorKey) {
    throw new Error("HEDERA_OPERATOR_ID and HEDERA_OPERATOR_KEY must be set in your .env.local file");
  }

  // Create your testnet client
  const client = Client.forTestnet();
  client.setOperator(AccountId.fromString(operatorId), PrivateKey.fromString(operatorKey));

  console.log("Creating a new topic...");

  //Create the transaction
  const transaction = new TopicCreateTransaction();

  //Sign with the client operator private key and submit the transaction to a Hedera network
  const txResponse = await transaction.execute(client);

  //Request the receipt of the transaction
  const receipt = await txResponse.getReceipt(client);

  //Get the topic ID
  const newTopicId = receipt.topicId;

  console.log("\n✅ Success!");
  console.log("Your new HEDERA_TOPIC_ID is: " + newTopicId);

  client.close();
}

main().catch((err) => {
  console.error("Error creating topic:", err);
  process.exit(1);
});
