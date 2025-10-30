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
    // Initialize from environment variables
    const operatorId = AccountId.fromString(process.env.HEDERA_OPERATOR_ID || '');
    const operatorKey = PrivateKey.fromString(process.env.HEDERA_OPERATOR_KEY || '');
    const network = process.env.HEDERA_NETWORK || 'testnet';

    this.operatorId = operatorId;
    this.operatorKey = operatorKey;
    
    // Create client instance
    this.client = network === 'mainnet' 
      ? Client.forMainnet()
      : Client.forTestnet();
    
    this.client.setOperator(operatorId, operatorKey);
  }

  /**
   * Submits a file hash to Hedera Consensus Service
   */
  async submitHash(topicId: string, hash: string): Promise<string> {
    const transaction = new TopicMessageSubmitTransaction()
      .setTopicId(topicId)
      .setMessage(hash);

    const response = await transaction.execute(this.client);
    await response.getReceipt(this.client); // Wait for consensus
    
    return response.transactionId.toString();
  }

  /**
   * Updates access control list in smart contract
   */
  async grantAccess(
    contractId: ContractId,
    fileId: string,
    granteeId: string
  ): Promise<string> {
    const transaction = new ContractExecuteTransaction()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction(
        "grantAccess",
        new ContractFunctionParameters()
          .addString(fileId)
          .addString(granteeId)
      );

    const response = await transaction.execute(this.client);
    const receipt = await response.getReceipt(this.client);
    
    return response.transactionId.toString();
  }

  /**
   * Queries Mirror Node for transaction details
   */
  async getHashFromMirrorNode(transactionId: string): Promise<string> {
    // Implementation will depend on your Mirror Node setup
    // This is a placeholder for the actual implementation
    throw new Error("Mirror Node query not implemented");
  }

  /**
   * Revokes access in smart contract
   */
  async revokeAccess(
    contractId: ContractId,
    fileId: string,
    granteeId: string
  ): Promise<string> {
    const transaction = new ContractExecuteTransaction()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction(
        "revokeAccess",
        new ContractFunctionParameters()
          .addString(fileId)
          .addString(granteeId)
      );

    const response = await transaction.execute(this.client);
    const receipt = await response.getReceipt(this.client);
    
    return response.transactionId.toString();
  }
}