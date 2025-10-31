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
import { WalletConnectModal } from '@walletconnect/modal';

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

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

if (!projectId) {
  throw new Error('You need to provide NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID env variable');
}

const metadata = {
  name: 'AZ-Genes',
  description: 'A Hedera dApp for managing genetic data',
  url: 'https://az-genes.com', // Replace with your dApp's URL
  icons: ['https://avatars.githubusercontent.com/u/31002956'],
};

const web3Modal = new WalletConnectModal({
  projectId,
  chains: Object.values(HederaChainId),
  themeMode: 'dark',
  themeVariables: {
    '--wcm-z-index': '1000',
  },
});

export const HederaWalletProvider = ({ children }: { children: ReactNode }) => {
  const [dAppConnector, setDAppConnector] = useState<DAppConnector | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [accountId, setAccountId] = useState<AccountId | null>(null);
  const [network, setNetwork] = useState<LedgerId | null>(null);
  const [client, setClient] = useState<Client | null>(null);

  useEffect(() => {
    const initConnector = async () => {
      const connector = new DAppConnector(
        metadata,
        LedgerId.TESTNET, // Default ledger, will be updated on connection
        projectId,
        Object.values(HederaJsonRpcMethod),
        [HederaSessionEvent.ChainChanged, HederaSessionEvent.AccountsChanged],
        [HederaChainId.Mainnet, HederaChainId.Testnet, HederaChainId.Previewnet]
      );

      await connector.init({ logger: 'error' });
      setDAppConnector(connector);

      // Check for existing session
      if ((connector as any).activeSession) {
        const { topic, peer } = (connector as any).activeSession;
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
        }
      }
    };

    initConnector();
  }, []); // Empty dependency array ensures this runs once on mount

  const connectWallet = useCallback(async () => {
    if (!dAppConnector) return;
    try {
      await (dAppConnector as any).openModal();
      console.log("dAppConnector.activeSession:", (dAppConnector as any).activeSession);

      if ((dAppConnector as any).activeSession) {
        const { topic, peer } = (dAppConnector as any).activeSession;
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
          console.log("isConnected after successful connection:", true);
          setAccountId(connectedAccountId);
          setNetwork(connectedNetwork);
          setClient((Client as any).forLedgerId(connectedNetwork).setWallet(dAppConnector));
          console.log('Wallet connected:', connectedAccountId.toString(), connectedNetwork.toString());
        }
      } else {
        console.log("No active session after openModal.");
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      setIsConnected(false);
      setAccountId(null);
      setNetwork(null);
      setClient(null);
    }
  }, [dAppConnector]);

  const disconnectWallet = useCallback(async () => {
    if (dAppConnector) {
      await (dAppConnector as any).killSession();
    }
    setIsConnected(false);
    setAccountId(null);
    setNetwork(null);
    setClient(null);
    console.log('Wallet disconnected');
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