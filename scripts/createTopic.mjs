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

async function createNewTopic() {
  // Grab your operator ID and key from .env.local
  const operatorId = process.env.HEDERA_OPERATOR_ID;
  const operatorKey = process.env.HEDERA_OPERATOR_KEY;

  if (!operatorId || !operatorKey) {
    console.error("Error: HEDERA_OPERATOR_ID and HEDERA_OPERATOR_KEY must be set in your .env.local file");
    return;
  }

  // Create your testnet client
  const client = Client.forTestnet();
  
  try {
    client.setOperator(AccountId.fromString(operatorId), PrivateKey.fromString(operatorKey));
    console.log("Client created and operator set.");
    console.log("Using Operator ID:", operatorId);
  } catch (err) {
    console.error("Error setting up client. Check your .env.local file for correct Hedera credentials.", err);
    return;
  }

  console.log("\nCreating a new topic...");

  try {
    //Create the transaction
    const transaction = new TopicCreateTransaction();

    //Sign with the client operator private key and submit the transaction to a Hedera network
    console.log("Submitting transaction to the network...");
    const txResponse = await transaction.execute(client);

    //Request the receipt of the transaction
    console.log("Waiting for transaction receipt...");
    const receipt = await txResponse.getReceipt(client);

    //Get the topic ID
    const newTopicId = receipt.topicId;

    console.log("\n✅ Success!");
    console.log("Your new HEDERA_TOPIC_ID is: " + newTopicId);
    console.log("Add this to your .env.local and Vercel environment variables.");

  } catch (err) {
    console.error("\n❌ Error creating topic:");
    // This will print the full error, e.g., "INSUFFICIENT_ACCOUNT_BALANCE"
    console.error(err);
  } finally {
    // This is crucial: always close the client to allow the script to exit.
    console.log("\nCleaning up and closing client connection...");
    client.close();
    console.log("Client closed. Script will now exit.");
  }
}

// Run the function
createNewTopic();