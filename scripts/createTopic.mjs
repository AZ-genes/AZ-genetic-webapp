import { Client, PrivateKey, TopicCreateTransaction } from "@hashgraph/sdk";
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env file
dotenv.config({ path: resolve(__dirname, '../.env') });

async function main() {
    // Ensure required environment variables are set
    if (!process.env.HEDERA_OPERATOR_ID || !process.env.HEDERA_OPERATOR_PRIVATE_KEY) {
        console.error("ERROR: Must set HEDERA_OPERATOR_ID and HEDERA_OPERATOR_PRIVATE_KEY in .env file");
        return;
    }

    const operatorId = process.env.HEDERA_OPERATOR_ID;
    const operatorKey = PrivateKey.fromString(process.env.HEDERA_OPERATOR_PRIVATE_KEY);

    // Configure client for testnet
    const client = Client.forTestnet();
    client.setOperator(operatorId, operatorKey);

    try {
        // Create a new topic
        const transaction = await new TopicCreateTransaction().freezeWith(client);
        const txResponse = await transaction.execute(client);
        const receipt = await txResponse.getReceipt(client);
        const topicId = receipt.topicId;

        if (topicId) {
            console.log(`Topic ID: ${topicId.toString()}`);
        } else {
            console.error("Error: Topic ID not found in receipt.");
        }

    } catch (error) {
        console.error("Error creating topic:", error);
    }
}

main();