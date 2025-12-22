"use client";
import { useState, useCallback } from 'react';
import { useHederaWallet } from '@/context/HederaWalletContext';
import { walletTransactionService } from '@/src/services/hedera/walletTransactions';
import { TokenId, AccountId, Hbar } from '@hashgraph/sdk';
import { useToast } from '@/context/ToastContext';

export interface TransactionState {
    isLoading: boolean;
    error: string | null;
    txId: string | null;
}

export function useWalletTransaction() {
    const { dAppConnector, isConnected } = useHederaWallet();
    const toast = useToast();
    const [state, setState] = useState<TransactionState>({
        isLoading: false,
        error: null,
        txId: null,
    });

    const resetState = useCallback(() => {
        setState({ isLoading: false, error: null, txId: null });
    }, []);

    /**
     * Mints an NFT certificate with wallet signature
     */
    const mintNFT = useCallback(
        async (tokenId: string, metadata: Uint8Array): Promise<{ transactionId: string; serialNumber: string } | null> => {
            if (!isConnected || !dAppConnector) {
                toast.error('Please connect your wallet first');
                return null;
            }

            setState({ isLoading: true, error: null, txId: null });

            try {
                const result = await walletTransactionService.executeNFTMint(
                    dAppConnector,
                    TokenId.fromString(tokenId),
                    metadata
                );

                setState({
                    isLoading: false,
                    error: null,
                    txId: result.transactionId,
                });

                toast.success('NFT minted successfully!');
                return result;
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Failed to mint NFT';
                setState({
                    isLoading: false,
                    error: errorMessage,
                    txId: null,
                });
                toast.error(errorMessage);
                return null;
            }
        },
        [isConnected, dAppConnector, toast]
    );

    /**
     * Transfers HBAR with wallet signature
     */
    const transferHbar = useCallback(
        async (toAccountId: string, amount: number): Promise<string | null> => {
            if (!isConnected || !dAppConnector) {
                toast.error('Please connect your wallet first');
                return null;
            }

            setState({ isLoading: true, error: null, txId: null });

            try {
                const txId = await walletTransactionService.executeHbarTransfer(
                    dAppConnector,
                    AccountId.fromString(toAccountId),
                    new Hbar(amount)
                );

                setState({
                    isLoading: false,
                    error: null,
                    txId,
                });

                toast.success(`Transferred ${amount} HBAR successfully!`);
                return txId;
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Failed to transfer HBAR';
                setState({
                    isLoading: false,
                    error: errorMessage,
                    txId: null,
                });
                toast.error(errorMessage);
                return null;
            }
        },
        [isConnected, dAppConnector, toast]
    );

    /**
     * Submits a hash to HCS topic with wallet signature
     */
    const submitHash = useCallback(
        async (topicId: string, hash: string): Promise<string | null> => {
            if (!isConnected || !dAppConnector) {
                toast.error('Please connect your wallet first');
                return null;
            }

            setState({ isLoading: true, error: null, txId: null });

            try {
                const txId = await walletTransactionService.executeTopicMessage(
                    dAppConnector,
                    topicId,
                    hash
                );

                setState({
                    isLoading: false,
                    error: null,
                    txId,
                });

                toast.success('Hash submitted to consensus!');
                return txId;
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Failed to submit hash';
                setState({
                    isLoading: false,
                    error: errorMessage,
                    txId: null,
                });
                toast.error(errorMessage);
                return null;
            }
        },
        [isConnected, dAppConnector, toast]
    );

    /**
     * Gets the Hashscan explorer URL
     */
    const getExplorerUrl = useCallback((transactionId: string, network: string = 'testnet') => {
        return walletTransactionService.getExplorerUrl(transactionId, network);
    }, []);

    return {
        // Transaction functions
        mintNFT,
        transferHbar,
        submitHash,
        getExplorerUrl,

        // State
        isLoading: state.isLoading,
        error: state.error,
        txId: state.txId,
        resetState,
    };
}
