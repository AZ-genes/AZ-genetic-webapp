"use client";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';
import {
  DAppConnector,
  HederaChainId,
  HederaJsonRpcMethod,
  HederaSessionEvent,
} from '@hashgraph/hedera-wallet-connect';
import { LedgerId, AccountId, Client } from '@hashgraph/sdk';

interface HederaWalletContextType {
  isConnected: boolean;
  accountId: AccountId | null;
  network: LedgerId | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
  dAppConnector: DAppConnector | null;
  client: Client | null;
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

  // Only initialize on client side to avoid hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Create a reusable session handler
  const handleSessionUpdate = useCallback((connector: DAppConnector, session: any) => {
    if (session) {
      console.log('Wallet session established/updated:', session);
      const { peer } = session;
      const chainId = peer.namespaces.hedera?.chains?.[0] as HederaChainId;
      const accounts = peer.namespaces.hedera?.accounts || [];
      
      if (accounts.length > 0 && chainId) {
        const connectedAccountId = AccountId.fromString(accounts[0].split(':')[2]);
        const connectedNetwork =
          chainId === HederaChainId.Mainnet
            ? LedgerId.MAINNET
            : chainId === HederaChainId.Testnet
            ? LedgerId.TESTNET
            : LedgerId.PREVIEWNET;
        
        setIsConnected(true);
        setAccountId(connectedAccountId);
        setNetwork(connectedNetwork);
        setClient((Client as any).forLedgerId(connectedNetwork).setWallet(connector));
        console.log('✓ Wallet state updated from event listener.');
      }
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

        // Get the walletConnectClient to attach event listeners
        const walletConnectClient = (connector as any).walletConnectClient;
        if (walletConnectClient && typeof walletConnectClient.on === 'function') {
          console.log('Setting up wallet event listeners...');
          
          // Listen for session proposal approval
          walletConnectClient.on('session_proposal', (proposal: any) => {
            console.log('Session proposal received:', proposal);
          });

          // Listen for session approval
          walletConnectClient.on('session_approve', (session: any) => {
            console.log('Session approved:', session);
            handleSessionUpdate(connector, session);
          });

          // Listen for session update
          walletConnectClient.on('session_update', (session: any) => {
            console.log('Session updated:', session);
            handleSessionUpdate(connector, session);
          });

          // Listen for session delete
          walletConnectClient.on('session_delete', (session: any) => {
            console.log('Session deleted:', session);
            setIsConnected(false);
            setAccountId(null);
            setNetwork(null);
            setClient(null);
          });
        } else {
          console.warn('WalletConnect client does not support event listeners');
        }

        // Check for existing session
        if ((connector as any).activeSession) {
          handleSessionUpdate(connector, (connector as any).activeSession);
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
      await (dAppConnector as any).openModal();
      console.log('Modal opened, waiting for user to connect via event listener...');
      // The event listeners will now manage the connection state
    } catch (error) {
      console.error('Failed to open wallet modal:', error);
    }
  }, [dAppConnector]);

  const disconnectWallet = useCallback(async () => {
    if (dAppConnector) {
      try {
        await (dAppConnector as any).killSession();
      } catch (error) {
        console.error('Error killing session:', error);
      }
    }
    setIsConnected(false);
    setAccountId(null);
    setNetwork(null);
    setClient(null);
  }, [dAppConnector]);

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
