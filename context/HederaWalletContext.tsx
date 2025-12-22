"use client";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useRef,
} from 'react';
import {
  DAppConnector,
  HederaChainId,
  HederaJsonRpcMethod,
  HederaSessionEvent,
} from '@hashgraph/hedera-wallet-connect';
import { LedgerId, AccountId, Client, Transaction, TransactionResponse, TransactionReceipt } from '@hashgraph/sdk';
import { walletTransactionService } from '@/src/services/hedera/walletTransactions';

interface HederaWalletContextType {
  isConnected: boolean;
  accountId: AccountId | null;
  network: LedgerId | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
  dAppConnector: DAppConnector | null;
  client: Client | null;
  signTransaction: <T extends Transaction>(transaction: T) => Promise<T>;
  executeTransaction: (transaction: Transaction) => Promise<{ response: TransactionResponse; receipt: TransactionReceipt }>;
}

const HederaWalletContext = createContext<HederaWalletContextType | undefined>(
  undefined
);

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '';

const getMetadataUrl = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'https://az-genes.com';
};

const metadata = {
  name: 'AZ-Genes',
  description: 'A Hedera dApp for managing genetic data',
  url: getMetadataUrl(),
  icons: ['https://avatars.githubusercontent.com/u/31002956'],
};

export const HederaWalletProvider = ({ children }: { children: ReactNode }) => {
  const [dAppConnector, setDAppConnector] = useState<DAppConnector | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [accountId, setAccountId] = useState<AccountId | null>(null);
  const [network, setNetwork] = useState<LedgerId | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Only initialize on client side to avoid hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Create a reusable session handler that reads from signers
  const handleSessionUpdate = useCallback((connector: DAppConnector) => {
    // Use signers array which is the official way to detect connections
    if (connector.signers && connector.signers.length > 0) {
      const signer = connector.signers[0];
      const connectedAccountId = signer.getAccountId();
      const connectedNetwork = signer.getLedgerId();

      console.log('Wallet connected:', connectedAccountId.toString());
      setIsConnected(true);
      setAccountId(connectedAccountId);
      setNetwork(connectedNetwork);
      setClient((Client as any).forLedgerId(connectedNetwork).setWallet(connector));
      console.log('✓ Wallet state updated from signers.');
    } else {
      console.log('handleSessionUpdate called, but no signers found.');
    }
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    const initConnector = async () => {
      if (!projectId) {
        console.warn('WalletConnect project ID not configured. Wallet functionality will be limited.');
        return;
      }

      try {
        const connector = new DAppConnector(
          metadata,
          LedgerId.TESTNET,
          projectId,
          Object.values(HederaJsonRpcMethod),
          [HederaSessionEvent.ChainChanged, HederaSessionEvent.AccountsChanged],
          [HederaChainId.Mainnet, HederaChainId.Testnet, HederaChainId.Previewnet]
        );

        await connector.init({ logger: 'error' });
        setDAppConnector(connector);

        // Check for existing session on page load
        if (connector.signers && connector.signers.length > 0) {
          console.log('Found existing session on init');
          handleSessionUpdate(connector);
        }
      } catch (error) {
        console.error('Failed to initialize wallet connector:', error);
      }
    };

    initConnector();
  }, [isMounted, handleSessionUpdate]);

  const connectWallet = useCallback(async () => {
    if (!dAppConnector) {
      console.error('Wallet connector not initialized');
      return;
    }

    try {
      console.log('Opening wallet connection modal...');
      const session = await dAppConnector.openModal();
      console.log('Modal opened, session returned:', session);

      // Check immediately if signers are already available
      if (dAppConnector.signers && dAppConnector.signers.length > 0) {
        console.log('Signers immediately available after openModal');
        handleSessionUpdate(dAppConnector);
      } else {
        // Poll for signers to appear after modal approval (fallback)
        console.log('No signers yet, polling for connection...');
        const maxPolls = 30; // Reduced from 60 for faster timeout
        let pollCount = 0;
        pollingIntervalRef.current = setInterval(() => {
          pollCount++;
          if (dAppConnector.signers && dAppConnector.signers.length > 0) {
            clearInterval(pollingIntervalRef.current!);
            pollingIntervalRef.current = null;
            console.log('Signers detected!');
            handleSessionUpdate(dAppConnector);
          } else if (pollCount >= maxPolls) {
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
            }
            pollingIntervalRef.current = null;
            console.log('Timeout waiting for wallet connection');
          }
        }, 500);
      }
    } catch (error) {
      console.error('Failed to open wallet modal:', error);
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }
  }, [dAppConnector, handleSessionUpdate]);

  const disconnectWallet = useCallback(async () => {
    // Clear polling if active
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    if (dAppConnector) {
      try {
        await dAppConnector.disconnectAll();
      } catch (error) {
        console.error('Error disconnecting wallet:', error);
      }
    }
    setIsConnected(false);
    setAccountId(null);
    setNetwork(null);
    setClient(null);
  }, [dAppConnector]);

  /**
   * Signs a transaction with the connected wallet
   */
  const signTransaction = useCallback(async <T extends Transaction>(transaction: T): Promise<T> => {
    if (!dAppConnector || !dAppConnector.signers || dAppConnector.signers.length === 0) {
      throw new Error('Wallet not connected. Please connect your wallet first.');
    }

    const signer = dAppConnector.signers[0];
    const signedTx = await transaction.freezeWithSigner(signer);
    return signedTx as T;
  }, [dAppConnector]);

  /**
   * Executes a transaction using the wallet transaction service
   */
  const executeTransaction = useCallback(async (transaction: Transaction) => {
    if (!dAppConnector) {
      throw new Error('Wallet not connected');
    }
    return walletTransactionService.signAndExecute(dAppConnector, transaction);
  }, [dAppConnector]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  return (
    <HederaWalletContext.Provider
      value={{
        isConnected,
        accountId,
        network,
        connectWallet,
        disconnectWallet,
        dAppConnector,
        client,
        signTransaction,
        executeTransaction,
      }}
    >
      {children}
    </HederaWalletContext.Provider>
  );
};

export const useHederaWallet = () => {
  const context = useContext(HederaWalletContext);
  if (context === undefined) {
    throw new Error('useHederaWallet must be used within a HederaWalletProvider');
  }
  return context;
};
