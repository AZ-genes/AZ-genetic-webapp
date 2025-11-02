import {
  Client,
  TopicMessageSubmitTransaction,
  ContractExecuteTransaction,
  ContractId,
  AccountId,
  PrivateKey,
  ContractFunctionParameters,
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  TokenMintTransaction,
  TokenNftInfoQuery,
  Hbar,
  TransferTransaction,
  TokenId,
  NftId
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

  /**
   * Creates an NFT collection for certificates
   */
  async createNFTCertificateCollection(
    name: string,
    symbol: string,
    treasuryAccountId: AccountId,
    metadata: string,
    supplyKey?: PrivateKey
  ): Promise<TokenId> {
    const transaction = new TokenCreateTransaction()
      .setTokenName(name)
      .setTokenSymbol(symbol)
      .setTokenType(TokenType.NonFungibleUnique)
      .setInitialSupply(0)
      .setTreasuryAccountId(treasuryAccountId)
      .setSupplyType(TokenSupplyType.Infinite)
      .setTokenMemo(metadata);
    
    // Set supply key if provided
    if (supplyKey) {
      transaction.setSupplyKey(supplyKey.publicKey);
    }
    
    const frozenTransaction = await transaction.freezeWith(this.client);
    const signedTransaction = await frozenTransaction.sign(this.operatorKey);
    
    // If supply key is provided, sign with it too
    if (supplyKey) {
      await signedTransaction.sign(supplyKey);
    }
    
    const response = await signedTransaction.execute(this.client);
    const receipt = await response.getReceipt(this.client);
    
    return receipt.tokenId!;
  }

  /**
   * Mints an NFT certificate for a specific file/data
   */
  async mintNFTCertificate(
    tokenId: TokenId,
    metadata: Uint8Array,
    serialNumber?: number
  ): Promise<string> {
    const transaction = await new TokenMintTransaction()
      .setTokenId(tokenId)
      .addMetadata(metadata)
      .freezeWith(this.client);

    const signedTransaction = await transaction.sign(this.operatorKey);
    const response = await signedTransaction.execute(this.client);
    const receipt = await response.getReceipt(this.client);
    
    // Extract serial number from receipt
    if (receipt && 'serials' in receipt && Array.isArray(receipt.serials) && receipt.serials.length > 0) {
      return receipt.serials[0].toString();
    }
    
    throw new Error("Failed to retrieve serial number from mint transaction");
  }

  /**
   * Gets NFT info by serial number
   */
  async getNFTCertificateInfo(
    tokenId: TokenId,
    serialNumber: number
  ): Promise<any> {
    const nftId = new NftId(tokenId, serialNumber);
    const query = new TokenNftInfoQuery()
      .setNftId(nftId);

    const nftInfo = await query.execute(this.client);
    return nftInfo;
  }

  /**
   * Transfers an NFT certificate to another account
   */
  async transferNFTCertificate(
    tokenId: TokenId,
    serialNumber: number,
    fromAccountId: AccountId,
    toAccountId: AccountId
  ): Promise<string> {
    const nftId = new NftId(tokenId, serialNumber);
    const transaction = await new TransferTransaction()
      .addNftTransfer(nftId, fromAccountId, toAccountId)
      .freezeWith(this.client);

    const signedTransaction = await transaction.sign(this.operatorKey);
    const response = await signedTransaction.execute(this.client);
    const receipt = await response.getReceipt(this.client);
    
    return response.transactionId.toString();
  }
}