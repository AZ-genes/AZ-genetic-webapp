import {
    Transaction,
    TransactionResponse,
    TokenMintTransaction,
    TokenId,
    TransferTransaction,
    TopicMessageSubmitTransaction,
    AccountId,
    Hbar,
    TransactionReceipt,
} from '@hashgraph/sdk';
import { DAppConnector } from '@hashgraph/hedera-wallet-connect';

export class WalletTransactionService {
    /**
     * Signs and executes a transaction using the connected wallet
     */
    async signAndExecute(
        dAppConnector: DAppConnector,
        transaction: Transaction
    ): Promise<{ response: TransactionResponse; receipt: TransactionReceipt }> {
        if (!dAppConnector || !dAppConnector.signers || dAppConnector.signers.length === 0) {
            throw new Error('Wallet not connected. Please connect your wallet first.');
        }

        const signer = dAppConnector.signers[0];

        try {
            // Sign the transaction with the wallet
            const signedTransaction = await transaction.freezeWithSigner(signer);

            // Execute the signed transaction
            const response = await signedTransaction.executeWithSigner(signer);

            // Wait for receipt
            const receipt = await response.getReceiptWithSigner(signer);

            return { response, receipt };
        } catch (error) {
            if (error instanceof Error) {
                if (error.message.includes('User rejected')) {
                    throw new Error('Transaction rejected by user');
                }
                if (error.message.includes('Insufficient')) {
                    throw new Error('Insufficient balance to complete transaction');
                }
            }
            throw error;
        }
    }

    /**
     * Mints an NFT certificate with wallet signature
     */
    async executeNFTMint(
        dAppConnector: DAppConnector,
        tokenId: TokenId,
        metadata: Uint8Array
    ): Promise<{ transactionId: string; serialNumber: string }> {
        const transaction = new TokenMintTransaction()
            .setTokenId(tokenId)
            .addMetadata(metadata);

        const { response, receipt } = await this.signAndExecute(dAppConnector, transaction);

        // Extract serial number from receipt
        if (receipt && 'serials' in receipt && Array.isArray(receipt.serials) && receipt.serials.length > 0) {
            return {
                transactionId: response.transactionId.toString(),
                serialNumber: receipt.serials[0].toString(),
            };
        }

        throw new Error('Failed to retrieve serial number from mint transaction');
    }

    /**
     * Transfers HBAR with wallet signature
     */
    async executeHbarTransfer(
        dAppConnector: DAppConnector,
        toAccountId: AccountId,
        amount: Hbar
    ): Promise<string> {
        if (!dAppConnector.signers || dAppConnector.signers.length === 0) {
            throw new Error('Wallet not connected');
        }

        const fromAccountId = dAppConnector.signers[0].getAccountId();

        const transaction = new TransferTransaction()
            .addHbarTransfer(fromAccountId, amount.negated())
            .addHbarTransfer(toAccountId, amount);

        const { response } = await this.signAndExecute(dAppConnector, transaction);
        return response.transactionId.toString();
    }

    /**
     * Submits a message to HCS topic with wallet signature
     */
    async executeTopicMessage(
        dAppConnector: DAppConnector,
        topicId: string,
        message: string
    ): Promise<string> {
        const transaction = new TopicMessageSubmitTransaction()
            .setTopicId(topicId)
            .setMessage(message);

        const { response } = await this.signAndExecute(dAppConnector, transaction);
        return response.transactionId.toString();
    }

    /**
     * Gets the Hashscan explorer URL for a transaction
     */
    getExplorerUrl(transactionId: string, network: string = 'testnet'): string {
        return `https://hashscan.io/${network}/transaction/${transactionId}`;
    }
}

// Export a singleton instance
export const walletTransactionService = new WalletTransactionService();
