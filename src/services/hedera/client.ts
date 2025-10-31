import {
  Client,
  TopicMessageSubmitTransaction,
  ContractExecuteTransaction,
  ContractId,
  AccountId,
  PrivateKey,
  ContractFunctionParameters
} from "@hashgraph/sdk";

export class HederaClient {
  private client: Client;
  private operatorId: AccountId;
  private operatorKey: PrivateKey;

  constructor() {
    if (!process.env.HEDERA_OPERATOR_ID || !process.env.HEDERA_OPERATOR_KEY) {
      throw new Error("Missing Hedera operator credentials in environment variables.");
    }

    const operatorId = AccountId.fromString(process.env.HEDERA_OPERATOR_ID);
    const operatorKey = PrivateKey.fromString(process.env.HEDERA_OPERATOR_KEY);
    const network = process.env.HEDERA_NETWORK || "testnet";

    this.operatorId = operatorId;
    this.operatorKey = operatorKey;

    this.client = network === "mainnet" ? Client.forMainnet() : Client.forTestnet();
    this.client.setOperator(operatorId, operatorKey);
  }

  async submitHash(topicId: string, hash: string): Promise<string> {
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
    // Placeholder for contract query logic
    return true;
  }

  close() {
    this.client.close();
  }
}
