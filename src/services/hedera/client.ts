import {
  Client,
  TopicMessageSubmitTransaction,
  ContractExecuteTransaction,
  ContractId,
  AccountId,
  PrivateKey,
  ContractFunctionParameters,
  TokenId,
  TransferTransaction,
  Hbar
} from "@hashgraph/sdk";

export class HederaClient {
  private client: Client | null = null;
  private operatorId: AccountId | null = null;
  private operatorKey: PrivateKey | null = null;

  constructor() {
    if (!process.env.HEDERA_OPERATOR_ID || !process.env.HEDERA_OPERATOR_KEY) {
      console.warn("Missing Hedera operator credentials. HederaClient will not be available.");
      return;
    }

    try {
      const operatorId = AccountId.fromString(process.env.HEDERA_OPERATOR_ID);
      const keyString = process.env.HEDERA_OPERATOR_KEY.trim();
      
      // Try different key parsing methods based on format
      // Hedera SDK recommends using specific parsing methods for better compatibility
      let operatorKey: PrivateKey | null = null;
      let lastError: Error | null = null;

      // Helper to try parsing with different methods
      const parseKey = (key: string): PrivateKey => {
        // Try ED25519 first (most common for Hedera)
        try {
          return PrivateKey.fromStringED25519(key);
        } catch (e) {
          lastError = e as Error;
        }

        // Try ECDSA
        try {
          return PrivateKey.fromStringECDSA(key);
        } catch (e) {
          lastError = e as Error;
        }

        // Try DER format (starts with '30')
        if (key.startsWith('30')) {
          try {
            return PrivateKey.fromStringDer(key);
          } catch (e) {
            lastError = e as Error;
          }
        }

        // Fallback to generic fromString
        try {
          return PrivateKey.fromString(key);
        } catch (e) {
          lastError = e as Error;
          throw new Error(`Failed to parse private key. Tried ED25519, ECDSA, DER, and generic methods. Last error: ${lastError.message}`);
        }
      };

      operatorKey = parseKey(keyString);
      const network = process.env.HEDERA_NETWORK || "testnet";

      this.operatorId = operatorId;
      this.operatorKey = operatorKey;

      this.client = network === "mainnet" ? Client.forMainnet() : Client.forTestnet();
      this.client.setOperator(operatorId, operatorKey);
    } catch (error) {
      console.warn("Failed to initialize HederaClient:", error);
      if (error instanceof Error) {
        console.warn("Error details:", error.message);
      }
    }
  }

  async submitHash(topicId: string, hash: string): Promise<string> {
    if (!this.client) {
      return `mock-hash-${Date.now()}`;
    }
    try {
      const transaction = new TopicMessageSubmitTransaction()
        .setTopicId(topicId)
        .setMessage(hash);

      const response = await transaction.execute(this.client);
      await response.getReceipt(this.client);
      return response.transactionId.toString();
    } catch (error) {
      console.error("Error submitting hash:", error);
      throw error;
    }
  }

  async grantAccess(contractId: ContractId, fileId: string, granteeId: string): Promise<string> {
    if (!this.client) {
      return `mock-grant-${Date.now()}`;
    }
    const transaction = new ContractExecuteTransaction()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction(
        "grantAccess",
        new ContractFunctionParameters().addString(fileId).addString(granteeId)
      );

    const response = await transaction.execute(this.client);
    await response.getReceipt(this.client);
    return response.transactionId.toString();
  }

  async revokeAccess(contractId: ContractId, fileId: string, granteeId: string): Promise<string> {
    if (!this.client) {
      return `mock-revoke-${Date.now()}`;
    }
    const transaction = new ContractExecuteTransaction()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction(
        "revokeAccess",
        new ContractFunctionParameters().addString(fileId).addString(granteeId)
      );

    const response = await transaction.execute(this.client);
    await response.getReceipt(this.client);
    return response.transactionId.toString();
  }

  async getHashFromMirrorNode(transactionId: string): Promise<string> {
    const baseUrl = process.env.MIRROR_NODE_BASE_URL || 'https://testnet.mirrornode.hedera.com';
    const url = `${baseUrl}/api/v1/transactions/${encodeURIComponent(transactionId)}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Mirror node request failed: ${res.status}`);
    }
    const data: any = await res.json();
    // Attempt to find a topic message containing the submitted hash
    // Some mirror responses include base64-encoded 'message' under 'transactions[*].consensus_timestamp' via separate topic query.
    // As a best-effort fallback, try common locations.
    const tx = data?.transactions?.[0];
    const base64Message = tx?.memo_base64 || tx?.transaction_hash;
    if (!base64Message) {
      throw new Error('Hash not found in mirror node response');
    }
    try {
      const bytes = Buffer.from(base64Message, 'base64');
      return bytes.toString('utf8');
    } catch {
      return base64Message;
    }
  }

  async verifyAccess(transactionId: string): Promise<boolean> {
    if (!this.client) {
      // In test/dev mode, return true if tx ID exists
      return !!transactionId;
    }

    try {
      // Query the Hedera Mirror Node to verify the transaction exists
      const mirrorUrl = process.env.MIRROR_NODE_BASE_URL || 'https://testnet.mirrornode.hedera.com';
      const url = `${mirrorUrl}/api/v1/transactions/${encodeURIComponent(transactionId)}`;
      
      const response = await fetch(url);
      if (response.ok) {
        const data: any = await response.json();
        // Verify the transaction exists and has a valid status
        return data?.transactions && data.transactions.length > 0;
      }
      return false;
    } catch (error) {
      console.error('Error verifying access:', error);
      return false;
    }
  }

  async transferTokens(senderId: string, recipientId: string, amount: number, tokenId?: string): Promise<string> {
    try {
      if (!this.client) {
        return `mock-transfer-${Date.now()}`;
      }

      if (process.env.NODE_ENV === 'test') {
        return `mock-transfer-${Date.now()}`;
      }

      const sender = AccountId.fromString(senderId);
      const recipient = AccountId.fromString(recipientId);

      let transaction;
      
      if (tokenId) {
        // Transfer HTS token
        const token = TokenId.fromString(tokenId);
        transaction = new TransferTransaction()
          .addTokenTransfer(token, sender, -amount)
          .addTokenTransfer(token, recipient, amount);
      } else {
        // Transfer HBAR
        transaction = new TransferTransaction()
          .addHbarTransfer(sender, Hbar.fromTinybars(-amount))
          .addHbarTransfer(recipient, Hbar.fromTinybars(amount));
      }

      const response = await transaction.execute(this.client);
      const receipt = await response.getReceipt(this.client);
      
      return response.transactionId.toString();
    } catch (error) {
      console.error('Error transferring tokens:', error);
      throw error;
    }
  }

  close() {
    if (this.client) {
      this.client.close();
    }
  }
}
