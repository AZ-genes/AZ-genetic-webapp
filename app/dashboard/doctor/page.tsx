'use client';
import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useHederaWallet } from '@/context/HederaWalletContext';
import { useToast } from '@/context/ToastContext';
import { api } from '@/lib/apiClient';
import { useAuth } from '@/lib/useAuth';
import { useRouter } from 'next/navigation';
import Spinner from '@/components/ui/Spinner';
import { TableSkeleton } from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import { Icon } from '@iconify/react';
import { useWalletTransaction } from '@/hooks/useWalletTransaction';
import { TransactionStatusModal, TransactionStatus } from '@/components/TransactionStatusModal';


// Types
interface DataItem {
  id: string;
  name: string;
  type: 'genetic' | 'health' | 'professional';
  date: string;
  size: string;
  accessCount: number;
  nftCertified: boolean;
  isPrivate: boolean;
  encrypted: boolean;
}

interface TokenTransaction {
  id: string;
  type: 'earned' | 'spent' | 'received';
  amount: number;
  description: string;
  date: string;
  fromTo: string;
}

interface AccessRequest {
  id: string;
  requester: string;
  dataType: string;
  requestDate: string;
  status: 'pending' | 'approved' | 'rejected';
  purpose: string;
}

const AZGenesDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isPrivateDataUnlocked, setIsPrivateDataUnlocked] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [nftCertificates, setNftCertificates] = useState<any[]>([]);
  const [loadingNFTs, setLoadingNFTs] = useState(false);
  const [mintingFileId, setMintingFileId] = useState<string | null>(null);
  const [userData, setUserData] = useState<DataItem[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Transaction modal state
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [txStatus, setTxStatus] = useState<TransactionStatus>('preparing');
  const [txError, setTxError] = useState<string>('');
  const [txId, setTxId] = useState<string>('');

  // Use wallet transaction hook
  const walletTx = useWalletTransaction();

  // Use real Hedera wallet context
  const { isConnected: isWalletConnected, connectWallet, disconnectWallet, accountId, network } = useHederaWallet();
  const toast = useToast();

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/sign-in');
    }
  }, [authLoading, user, router]);

  // Fetch profile and check role
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await api.get('get-profile');
        if (response.ok) {
          const profile = await response.json();
          setUserProfile(profile);
          if (profile.user_role !== 'doctor') {
            router.push('/dashboard');
          }
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      }
    };
    if (user && !authLoading) {
      loadProfile();
    }
  }, [user, authLoading, router]);

  const privateData = userData.filter(item => item.isPrivate);
  const publicData = userData.filter(item => !item.isPrivate);

  const tokenTransactions: TokenTransaction[] = [
    { id: '1', type: 'earned', amount: 50, description: 'Data upload bonus', date: '2024-01-15', fromTo: 'System' },
    { id: '2', type: 'spent', amount: 10, description: 'Data access fee', date: '2024-01-12', fromTo: 'Research Institute A' },
    { id: '3', type: 'received', amount: 25, description: 'Data sharing reward', date: '2024-01-10', fromTo: 'Dr. Smith' },
    { id: '4', type: 'spent', amount: 5, description: 'Certificate renewal', date: '2024-01-08', fromTo: 'AZ-Genes Platform' },
  ];

  const accessRequests: AccessRequest[] = [
    { id: '1', requester: 'Genomics Research Corp', dataType: 'Genetic Data', requestDate: '2024-01-14', status: 'pending', purpose: 'Medical Research' },
    { id: '2', requester: 'Dr. Johnson Clinic', dataType: 'Health Records', requestDate: '2024-01-12', status: 'approved', purpose: 'Treatment Planning' },
    { id: '3', requester: 'Family Member - John Doe', dataType: 'Family History', requestDate: '2024-01-10', status: 'approved', purpose: 'Family Health Awareness' },
  ];

  const stats = {
    totalData: '2.35 GB',
    nftCertified: 3,
    totalTokens: 160,
    activeShares: 2,
    dataRequests: 3,
    privateFiles: privateData.length,
    encryptedFiles: userData.filter(item => item.encrypted).length,
  };

  const handleConnectWallet = async () => {
    setIsConnecting(true);
    try {
      await connectWallet();
      setShowConnectModal(false);
      setIsConnecting(false);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      setIsConnecting(false);
    }
  };

  const handleUnlockPrivateData = async () => {
    if (!isWalletConnected) {
      setShowConnectModal(true);
      return;
    }
    // In a real implementation, this would verify wallet ownership and decrypt data
    // For now, we're just toggling the UI state
    setIsPrivateDataUnlocked(true);
  };

  const handleDisconnectWallet = async () => {
    try {
      await disconnectWallet();
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
    }
  };

  const handleLockPrivateData = () => {
    setIsPrivateDataUnlocked(false);
  };

  const loadFiles = async () => {
    setLoadingFiles(true);
    try {
      const response = await api.get('files');
      if (!response.ok) {
        throw new Error('Failed to fetch files');
      }
      const files = await response.json();

      // Transform files to match DataItem interface
      const transformedFiles: DataItem[] = files.map((file: any) => ({
        id: file.id,
        name: file.file_name,
        type: file.file_type === 'chemical/x-vcf' ? 'genetic' :
          file.file_type === 'text/csv' ? 'health' :
            file.file_type === 'application/pdf' ? 'professional' :
              'health',
        date: new Date(file.created_at).toLocaleDateString(),
        size: '100 MB', // TODO: Get actual size
        accessCount: 0, // TODO: Get actual access count
        nftCertified: !!file.nft_token_id,
        isPrivate: !!file.encryption_key,
        encrypted: !!file.encryption_key,
      }));

      setUserData(transformedFiles);
    } catch (error) {
      console.error('Error loading files:', error);
    } finally {
      setLoadingFiles(false);
    }
  };

  // Load files on mount
  useEffect(() => {
    loadFiles();
  }, []);

  // Auto-collapse sidebar on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024 && sidebarOpen) {
        setSidebarOpen(false);
      }
    };

    handleResize(); // Run on mount
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarOpen]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('upload-file', formData);

      if (!response.ok) {
        const error = await response.json();
        toast.error(`Failed to upload file: ${error.error}`);
        return;
      }

      // Reload files
      await loadFiles();
      toast.success('File uploaded successfully!');
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file');
    } finally {
      setIsUploading(false);
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleMintNFT = async (fileId: string) => {
    if (!isWalletConnected) {
      setShowConnectModal(true);
      return;
    }

    setMintingFileId(fileId);
    setTxModalOpen(true);
    setTxStatus('preparing');
    setTxError('');
    setTxId('');

    try {
      // Get the NFT token ID from environment or configuration
      // For now, we'll assume it's configured
      const NFT_TOKEN_ID = process.env.NEXT_PUBLIC_NFT_TOKEN_ID || '0.0.123456';

      // Create metadata for the NFT (file ID + timestamp)
      const metadata = new TextEncoder().encode(
        JSON.stringify({
          fileId,
          timestamp: Date.now(),
          type: 'genetic_data_certificate',
        })
      );

      // Update status to signing
      setTxStatus('signing');

      // Mint NFT with wallet signature
      const result = await walletTx.mintNFT(NFT_TOKEN_ID, metadata);

      if (!result) {
        throw new Error('Transaction failed or was rejected');
      }

      // Update status to confirmed
      setTxStatus('confirmed');
      setTxId(result.transactionId);

      // Update local data
      const updatedData = userData.map(item =>
        item.id === fileId
          ? { ...item, nftCertified: true }
          : item
      );
      setUserData(updatedData);

      // Reload files from server
      await loadFiles();
    } catch (error) {
      console.error('Error minting NFT:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to mint NFT certificate';
      setTxStatus('failed');
      setTxError(errorMessage);
    } finally {
      setMintingFileId(null);
    }
  };

  const loadNFTs = async () => {
    setLoadingNFTs(true);
    try {
      // Load NFTs from user data (files with NFT certification)
      const nftData = userData
        .filter(item => item.nftCertified)
        .map((item, index) => ({
          id: item.id,
          name: item.name,
          type: item.type,
          date: item.date,
          tokenId: '0.0.7180736', // Real collection token ID
          serialNumber: (index + 1).toString() // Serial number
        }));
      setNftCertificates(nftData);
    } catch (error) {
      console.error('Error loading NFTs:', error);
    } finally {
      setLoadingNFTs(false);
    }
  };

  // Load NFTs when tab is clicked
  useEffect(() => {
    if (activeTab === 'nft') {
      loadNFTs();
    }
  }, [activeTab]);

  const ConnectWalletModal = () => (
    <div className="fixed inset-0 bg-[#020403]/80 backdrop-blur-md flex items-center justify-center z-[100] px-4">
      <div className="glass-panel border-white/10 p-8 max-w-md w-full relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-50"></div>

        <div className="text-center relative z-10">
          <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-500">
            {isConnecting ? (
              <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Icon icon="lucide:wallet" className="text-emerald-500" width="40" />
            )}
          </div>

          <h3 className="text-xl font-bold text-white mb-2 uppercase tracking-tight">
            {isConnecting ? 'Establishing Link...' : 'Synchronize Node'}
          </h3>
          <p className="text-slate-400 text-sm mb-8 leading-relaxed">
            {isConnecting
              ? 'Awaiting protocol approval from your Hedera wallet. Please verify the authentication request.'
              : 'Initialize your biometric hash via Hedera wallet to access encrypted clinical assets and protocol-level data.'}
          </p>

          {accountId && (
            <div className="mb-8 p-3 bg-white/[0.02] border border-white/5 rounded-lg">
              <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] mb-1 font-bold">Node Identity</p>
              <p className="text-xs text-emerald-400 font-mono tracking-wider">
                {accountId.toString()}
              </p>
            </div>
          )}

          <div className="space-y-4">
            <button
              onClick={handleConnectWallet}
              disabled={isConnecting}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-[#020403] py-4 rounded-xl font-bold uppercase tracking-[0.2em] transition-all disabled:opacity-50 ring-anim"
            >
              {isConnecting ? 'Awaiting Signal...' : 'Connect Protocol'}
            </button>
            <button
              onClick={() => {
                setShowConnectModal(false);
                setIsConnecting(false);
              }}
              disabled={isConnecting}
              className="w-full border border-white/10 text-slate-400 py-4 rounded-xl font-bold uppercase tracking-[0.2em] hover:bg-white/5 transition-all text-sm"
            >
              Abort
            </button>
          </div>

          <p className="text-[10px] text-slate-600 mt-8 uppercase tracking-widest font-medium">
            Protocol Security Layer v4.0.2 • Hedera Mainnet
          </p>
        </div>
      </div>
    </div>
  );

  const PrivateDataAccessPanel = () => (
    <div className="glass-panel border-white/10 p-6 rounded-2xl mb-8 relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
        <div className="flex items-center gap-6 text-center md:text-left">
          <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-500 flex-shrink-0 animate-pulse">
            <Icon icon="lucide:shield-check" width="28" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white uppercase tracking-tight">
              {isPrivateDataUnlocked ? 'Clinical Decryption Active' : 'Restricted Clinical Assets'}
            </h3>
            <p className="text-slate-400 text-xs mt-1 max-w-md leading-relaxed">
              {isPrivateDataUnlocked
                ? 'End-to-end encryption is currently active for all patient records. Node session is traceable.'
                : 'Zero-knowledge proof required via Hedera wallet to decrypt restricted patient sequences and medical history.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {isWalletConnected && (
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/5 border border-emerald-500/10">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Signal Locked</span>
            </div>
          )}

          {!isPrivateDataUnlocked ? (
            <button
              onClick={handleUnlockPrivateData}
              className="bg-emerald-500 hover:bg-emerald-400 text-[#020403] px-8 py-3.5 rounded-xl font-bold uppercase tracking-widest text-xs transition-all flex items-center gap-3 ring-anim"
            >
              <Icon icon="lucide:lock" width="18" />
              <span>Decrypt Node</span>
            </button>
          ) : (
            <button
              onClick={handleLockPrivateData}
              className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 px-8 py-3.5 rounded-xl font-bold uppercase tracking-widest text-xs transition-all flex items-center gap-3"
            >
              <Icon icon="lucide:log-out" width="18" />
              <span>Terminate Session</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const DataItemRow = ({ item }: { item: DataItem }) => (
    <tr key={item.id} className="group hover:bg-white/[0.02] transition-colors border-b border-white/[0.03]">
      <td className="px-6 py-5 whitespace-nowrap">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-slate-400 group-hover:border-emerald-500/30 group-hover:text-emerald-500 transition-all">
            <Icon icon={item.type === 'genetic' ? 'lucide:dna' : item.type === 'health' ? 'lucide:activity' : 'lucide:file-text'} width="20" />
          </div>
          <div>
            <div className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors flex items-center gap-2 uppercase tracking-tight">
              {item.name}
              {item.isPrivate && (
                <span className="bg-purple-500/10 text-purple-400 text-[10px] px-2 py-0.5 rounded border border-purple-500/20 font-bold uppercase tracking-widest flex items-center gap-1">
                  <Icon icon="lucide:lock" width="10" />
                  Restricted
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-mono mt-1 font-bold">{item.accessCount} Audit Logs</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-5 whitespace-nowrap">
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-[0.15em] bg-blue-500/10 text-blue-400 border border-blue-500/20 group-hover:bg-blue-500/20 transition-colors">
          {item.type}
        </span>
      </td>
      <td className="px-6 py-5 whitespace-nowrap text-[11px] text-slate-500 font-mono tracking-wider uppercase font-bold">{item.date}</td>
      <td className="px-6 py-5 whitespace-nowrap text-[11px] text-slate-500 font-mono tracking-wider uppercase font-bold">{item.size}</td>
      <td className="px-6 py-5 whitespace-nowrap">
        {item.nftCertified ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-[0.1em] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
            <Icon icon="lucide:award" width="12" />
            Certified
          </span>
        ) : (
          <button
            onClick={() => handleMintNFT(item.id)}
            disabled={mintingFileId === item.id}
            className="text-emerald-500/60 hover:text-emerald-500 text-[10px] font-bold uppercase tracking-[0.2em] transition-all disabled:opacity-50 flex items-center gap-2 group-hover:translate-x-1"
          >
            {mintingFileId === item.id ? <Spinner size="sm" /> : <Icon icon="lucide:plus-circle" width="14" />}
            {mintingFileId === item.id ? 'Minting' : 'Mint Proof'}
          </button>
        )}
      </td>
      <td className="px-6 py-5 whitespace-nowrap text-right">
        {item.isPrivate && !isPrivateDataUnlocked ? (
          <button
            onClick={handleUnlockPrivateData}
            className="text-purple-400 hover:text-purple-300 text-[10px] font-bold uppercase tracking-[0.15em] flex items-center gap-2 ml-auto"
          >
            <Icon icon="lucide:key" width="14" />
            Decrypt Node
          </button>
        ) : (
          <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <button className="h-8 px-4 rounded bg-white/5 border border-white/10 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-500 hover:text-[#020403] hover:border-emerald-500 transition-all">
              Initialize Share
            </button>
            <button className="h-8 px-4 rounded border border-white/5 text-slate-500 text-[10px] font-bold uppercase tracking-widest hover:text-white transition-all">
              Audit
            </button>
          </div>
        )}
      </td>
    </tr>
  );

  // Show loading spinner while auth is loading
  if (authLoading) {
    return (
      <>
        <Head>
          <title>Dashboard - AZ-Genes</title>
          <meta name="description" content="AZ-Genes Dashboard - Manage your genetic data and tokens" />
        </Head>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </>
    );
  }

  // Don't render anything if user is not authenticated (will redirect)
  if (!user) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Dashboard - AZ-Genes</title>
        <meta name="description" content="AZ-Genes Dashboard - Manage your genetic data and tokens" />
      </Head>

      <div className="flex h-screen bg-[#020403] text-slate-300 font-sans selection:bg-emerald-500/30">
        {/* Sidebar */}
        <div className={`${sidebarOpen ? 'w-72' : 'w-24'} glass-panel border-r border-white/5 transition-all duration-500 flex flex-col relative z-30`}>
          <div className="p-8 mb-4">
            <div className="flex items-center justify-between">
              {sidebarOpen && (
                <div className="flex items-center gap-3 group cursor-pointer">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.4)] group-hover:scale-110 transition-transform">
                    <Icon icon="lucide:dna" className="text-[#020403]" width="24" />
                  </div>
                  <span className="text-xl font-bold text-white tracking-tighter">AZ-GENES</span>
                </div>
              )}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg hover:bg-white/5 text-slate-500 hover:text-emerald-500 transition-colors"
              >
                <Icon icon={sidebarOpen ? "lucide:chevron-left" : "lucide:menu"} width="20" />
              </button>
            </div>
          </div>

          <nav className="flex-1 px-4 space-y-2">
            {[
              { id: 'overview', name: 'Node Overview', icon: 'lucide:layout-dashboard' },
              { id: 'data', name: 'Clinical Assets', icon: 'lucide:database' },
              { id: 'tokens', name: 'Fiscal Layer', icon: 'lucide:coins' },
              { id: 'sharing', name: 'Protocol Share', icon: 'lucide:share-2' },
              { id: 'nft', name: 'Proof Certificates', icon: 'lucide:award' },
              { id: 'analytics', name: 'Sequence Forge', icon: 'lucide:bar-chart-3' },
              { id: 'subscriptions', name: 'Protocol Tier', icon: 'lucide:star' },
              { id: 'settings', name: 'Node Config', icon: 'lucide:settings' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl transition-all duration-300 group ${activeTab === item.id
                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.05)]'
                  : 'text-slate-500 hover:text-white hover:bg-white/5'
                  }`}
              >
                <Icon icon={item.icon} className={`transition-transform duration-300 ${activeTab === item.id ? 'scale-110' : 'group-hover:scale-110'}`} width="20" />
                {sidebarOpen && <span className="text-xs font-bold uppercase tracking-[0.2em]">{item.name}</span>}
              </button>
            ))}
          </nav>

          {/* Wallet Connection Status */}
          {sidebarOpen && (
            <div className="p-6 mt-auto">
              <div className={`p-4 rounded-2xl glass-panel border border-white/5 overflow-hidden relative group/wallet ${isWalletConnected ? 'bg-emerald-500/[0.02]' : 'bg-red-500/[0.02]'
                }`}>
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${isWalletConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        {isWalletConnected ? 'Node Active' : 'Node Offline'}
                      </span>
                    </div>
                    <button
                      onClick={isWalletConnected ? handleDisconnectWallet : () => setShowConnectModal(true)}
                      className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded border transition-all ${isWalletConnected
                        ? 'border-emerald-500/20 text-emerald-500 hover:bg-emerald-500 hover:text-[#020403]'
                        : 'border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white'
                        }`}
                    >
                      {isWalletConnected ? 'Disconnect' : 'Connect'}
                    </button>
                  </div>
                  {isWalletConnected && accountId && (
                    <div className="text-[10px] font-mono text-slate-600 truncate border-t border-white/5 pt-3">
                      {accountId.toString()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none"></div>

          {/* Header */}
          <header className="glass-panel border-b border-white/5 z-20 sticky top-0">
            <div className="flex items-center justify-between px-10 py-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-[0.3em]">Protocol Phase: Clinical v2.4</span>
                </div>
                <h1 className="text-2xl font-bold text-white tracking-tighter uppercase">
                  {activeTab === 'overview' ? 'Node Overview' : activeTab.replace('-', ' ')}
                </h1>
              </div>

              <div className="flex items-center gap-8">
                <div className="hidden xl:flex items-center gap-6 pr-8 border-r border-white/10">
                  <div className="text-right">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-0.5">Network Load</p>
                    <div className="flex items-center gap-2 justify-end">
                      <div className="w-24 h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="w-2/3 h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                      </div>
                      <span className="text-[10px] text-emerald-500 font-mono">68%</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <button className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all hover:bg-white/10 relative group">
                    <Icon icon="lucide:bell" className="text-glow" width="20" />
                    <span className="absolute top-0 right-0 w-2 h-2 bg-emerald-500 rounded-full border-2 border-[#020403] animate-pulse"></span>

                    <div className="absolute top-12 right-0 w-64 glass-panel border-white/10 p-4 opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 transition-all text-left">
                      <p className="text-[10px] font-bold text-white uppercase tracking-widest mb-2 border-b border-white/5 pb-2">Central Pulse</p>
                      <div className="space-y-3">
                        <div className="flex gap-3">
                          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1 shrink-0"></div>
                          <p className="text-[10px] text-slate-400">Sequence audit complete for Node #718</p>
                        </div>
                      </div>
                    </div>
                  </button>

                  <div className="flex items-center gap-4 pl-4 border-l border-white/10">
                    <div className="text-right">
                      <p className="text-xs font-bold text-white tracking-tight uppercase">Dr. Sarah Chen</p>
                      <p className="text-[10px] text-emerald-500/60 font-bold uppercase tracking-widest">Protocol Architect</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 p-[1px] group cursor-pointer">
                      <div className="w-full h-full rounded-[11px] bg-[#020403] flex items-center justify-center overflow-hidden">
                        <span className="text-white font-bold font-mono">SC</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Dashboard Content */}
          <main className="flex-1 overflow-y-auto p-6">
            {/* Private Data Access Panel */}
            {(activeTab === 'data' || activeTab === 'overview') && privateData.length > 0 && (
              <PrivateDataAccessPanel />
            )}

            {activeTab === 'overview' && (
              <div className="space-y-10">
                {/* Protocol Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { label: 'Clinical Assets', value: stats.totalData, icon: 'lucide:database', color: 'blue' },
                    { label: 'Restricted Files', value: stats.privateFiles, icon: 'lucide:lock', color: 'purple', sub: isPrivateDataUnlocked ? 'Unlocked' : 'Locked' },
                    { label: 'Fiscal Assets', value: stats.totalTokens, icon: 'lucide:coins', color: 'emerald' },
                    { label: 'Proof Records', value: stats.nftCertified, icon: 'lucide:award', color: 'indigo' },
                  ].map((stat, i) => (
                    <div key={i} className="glass-panel border-white/5 p-6 rounded-2xl relative overflow-hidden group hover:scale-[1.02] transition-all duration-500 cursor-default">
                      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent"></div>
                      <div className="flex items-center justify-between relative z-10">
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{stat.label}</p>
                          <p className="text-2xl font-bold text-white tracking-tight">{stat.value}</p>
                          {stat.sub && <p className="text-[10px] text-emerald-500/60 font-medium uppercase tracking-widest mt-1">{stat.sub}</p>}
                        </div>
                        <div className={`w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 group-hover:text-emerald-500 group-hover:border-emerald-500/30 transition-all duration-500`}>
                          <Icon icon={stat.icon} className="text-glow" width="24" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Additional Overview Content (Previously empty/collapsed) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-8">
                    <div className="glass-panel border-white/5 rounded-2xl overflow-hidden">
                      <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                        <h3 className="text-sm font-bold text-white uppercase tracking-[0.2em]">Recent Node Activity</h3>
                        <button className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest hover:text-emerald-400 transition-colors">Audit All</button>
                      </div>
                      <div className="p-0">
                        <table className="w-full">
                          <tbody className="divide-y divide-white/[0.03]">
                            {userData.slice(0, 4).map(item => (
                              <DataItemRow key={item.id} item={item} />
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="glass-panel border-white/5 rounded-2xl p-6 bg-emerald-500/5 border-emerald-500/10">
                      <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4">Node Operations</h3>
                      <div className="space-y-3">
                        <button onClick={handleUploadClick} className="w-full h-11 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#020403] text-[10px] font-bold uppercase tracking-widest transition-all ring-anim flex items-center justify-center gap-2">
                          <Icon icon="lucide:upload-cloud" width="14" />
                          Ingest Asset
                        </button>
                        <button className="w-full h-11 rounded-xl bg-white/5 border border-white/10 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                          <Icon icon="lucide:plus" width="14" />
                          New Transaction
                        </button>
                      </div>
                    </div>

                    <div className="glass-panel border-white/5 rounded-2xl p-6">
                      <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4">Central Pulse</h3>
                      <div className="space-y-4">
                        {[1, 2].map(i => (
                          <div key={i} className="flex gap-4 group cursor-pointer">
                            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 group-hover:text-emerald-500 transition-colors">
                              <Icon icon="lucide:activity" width="14" />
                            </div>
                            <div>
                              <p className="text-[11px] text-white font-bold leading-tight uppercase">Protocol Update Synced</p>
                              <p className="text-[9px] text-slate-500 font-mono tracking-tighter mt-1 uppercase font-bold">Node #FZ-992 • 2H AGO</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'data' && (
              <div className="glass-panel border-white/5 rounded-2xl overflow-hidden">
                <div className="p-8 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/[0.01]">
                  <div>
                    <h2 className="text-xl font-bold text-white uppercase tracking-tight">Clinical Asset Management</h2>
                    <p className="text-slate-500 text-xs mt-1 uppercase tracking-widest font-bold">Node Identity: {accountId ? accountId.toString() : 'Local Node'}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    {privateData.length > 0 && (
                      <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
                        <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse"></div>
                        <span className="text-[10px] text-purple-400 font-bold uppercase tracking-widest">{privateData.length} Restricted Items</span>
                      </div>
                    )}
                    <button
                      onClick={handleUploadClick}
                      disabled={isUploading}
                      className="h-10 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#020403] text-[10px] font-bold uppercase tracking-widest transition-all disabled:opacity-50 flex items-center gap-2 ring-anim"
                    >
                      {isUploading ? <Spinner size="sm" /> : <Icon icon="lucide:upload-cloud" width="14" />}
                      {isUploading ? 'Ingesting' : 'Ingest Asset'}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileUpload}
                      style={{ display: 'none' }}
                      accept=".vcf,.csv,.txt,.pdf"
                    />
                  </div>
                </div>

                {loadingFiles ? (
                  <div className="p-8">
                    <TableSkeleton rows={8} />
                  </div>
                ) : userData.length === 0 ? (
                  <div className="p-16 text-center">
                    <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-slate-600 mx-auto mb-6">
                      <Icon icon="lucide:folder-open" width="40" />
                    </div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-[0.2em] mb-2">Protocol Storage Empty</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mb-8 leading-relaxed">
                      Initialize the first asset ingest to begin NFT proof generation and clinical data replication across the network.
                    </p>
                    <button
                      onClick={handleUploadClick}
                      className="h-9 px-8 rounded border border-emerald-500/20 text-emerald-500 text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-500 hover:text-[#020403] transition-all"
                    >
                      Ingest First Asset
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-white/[0.02] border-b border-white/5">
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Asset Identity</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Classification</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Timestamp</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Capacity</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Proof Status</th>
                          <th className="px-6 py-4 text-right text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Node Operations</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.03]">
                        {/* Public Data */}
                        {publicData.map((item) => (
                          <DataItemRow key={item.id} item={item} />
                        ))}
                        {/* Private Data */}
                        {privateData.map((item) => (
                          <DataItemRow key={item.id} item={item} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Fiscal Layer Tab */}
            {activeTab === 'tokens' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                  <div className="glass-panel border-white/5 rounded-2xl p-8 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent"></div>
                    <div className="relative z-10 text-center">
                      <h3 className="text-sm font-bold text-white uppercase tracking-[0.2em] mb-8">Node Fiscal Balance</h3>
                      <div className="w-24 h-24 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 duration-500 shadow-[0_0_30px_rgba(16,185,129,0.1)] transition-transform">
                        <Icon icon="lucide:coins" className="text-emerald-500" width="40" />
                      </div>
                      <div className="text-5xl font-bold text-white mb-2 font-mono tracking-tighter">160</div>
                      <p className="text-[10px] text-emerald-500/60 font-bold uppercase tracking-[0.3em]">AZ-GENE TOKENS</p>
                      <div className="mt-10 space-y-3">
                        <button className="w-full h-11 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#020403] text-[10px] font-bold uppercase tracking-widest transition-all ring-anim">
                          Request Liquidity
                        </button>
                        <button className="w-full h-11 rounded-xl bg-white/5 border border-white/10 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all">
                          Terminal Transfer
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="lg:col-span-2">
                  <div className="glass-panel border-white/5 rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-white/5 bg-white/[0.01]">
                      <h3 className="text-sm font-bold text-white uppercase tracking-[0.2em]">Consensus Audit Log</h3>
                    </div>
                    <div className="p-0">
                      {tokenTransactions.map((transaction) => (
                        <div key={transaction.id} className="flex items-center justify-between p-6 border-b border-white/[0.03] hover:bg-white/[0.01] transition-colors group">
                          <div className="flex items-center gap-6">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all ${transaction.type === 'earned' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                              transaction.type === 'spent' ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                              }`}>
                              <Icon icon={transaction.type === 'earned' ? 'lucide:trending-up' : transaction.type === 'spent' ? 'lucide:trending-down' : 'lucide:repeat'} width="20" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-white uppercase tracking-tight group-hover:text-emerald-400 transition-colors">{transaction.description}</p>
                              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">Source: {transaction.fromTo}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-bold font-mono ${transaction.type === 'earned' ? 'text-emerald-500' :
                              transaction.type === 'spent' ? 'text-red-500' : 'text-blue-400'
                              }`}>
                              {transaction.type === 'earned' ? '+' : transaction.type === 'spent' ? '-' : ''}
                              {transaction.amount} AZG
                            </p>
                            <p className="text-[10px] text-slate-600 font-mono mt-1 font-bold">{transaction.date}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Protocol Share Tab */}
            {activeTab === 'sharing' && (
              <div className="glass-panel border-white/5 rounded-2xl p-12 text-center bg-white/[0.01]">
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-600 mx-auto mb-6">
                  <Icon icon="lucide:share-2" width="32" />
                </div>
                <h3 className="text-sm font-bold text-white uppercase tracking-[0.2em] mb-2">Multi-Node Correlation Layer</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mb-8 leading-relaxed">
                  The consensus layer for secondary clinical asset sharing is currently being synchronized. Collaborative node audits will be enabled in the next protocol phase.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg mx-auto">
                  <div className="glass-panel border-white/5 p-4 rounded-xl text-left bg-white/[0.02]">
                    <p className="text-[9px] text-emerald-500 font-bold uppercase tracking-widest mb-1">Active Peers</p>
                    <p className="text-lg font-bold text-white font-mono">1,402</p>
                  </div>
                  <div className="glass-panel border-white/5 p-4 rounded-xl text-left bg-white/[0.02]">
                    <p className="text-[9px] text-blue-400 font-bold uppercase tracking-widest mb-1">Shared Consensus</p>
                    <p className="text-lg font-bold text-white font-mono">0.00%</p>
                  </div>
                </div>
              </div>
            )}

            {/* Proof Certificates Tab */}
            {activeTab === 'nft' && (
              <div className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <h2 className="text-xl font-bold text-white uppercase tracking-tight">Clinical Proof Certificates</h2>
                    <p className="text-slate-500 text-xs mt-1 uppercase tracking-widest font-bold font-mono">Mainnet Protocol v1.0.4</p>
                  </div>
                  {!isWalletConnected && (
                    <button
                      onClick={() => setShowConnectModal(true)}
                      className="px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-500 hover:text-[#020403] transition-all flex items-center gap-2"
                    >
                      <Icon icon="lucide:wallet" width="14" />
                      Connect Wallet to Mint
                    </button>
                  )}
                </div>

                {loadingNFTs ? (
                  <div className="flex justify-center py-20">
                    <div className="w-12 h-12 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : nftCertificates.length === 0 ? (
                  <div className="glass-panel border-white/5 rounded-2xl p-16 text-center">
                    <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-slate-600 mx-auto mb-6">
                      <Icon icon="lucide:award" width="40" />
                    </div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-[0.2em] mb-2">No Proof Certificates</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mb-8 leading-relaxed">
                      You haven't generated any NFT proof certificates for your clinical assets yet. These certificates provide immutable proof of authorship and data integrity.
                    </p>
                    <button
                      onClick={() => setActiveTab('data')}
                      className="h-10 px-8 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#020403] text-[10px] font-bold uppercase tracking-widest transition-all ring-anim"
                    >
                      Initialize Proof Mint
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {nftCertificates.map((nft) => (
                      <div key={nft.id} className="glass-panel border-white/5 rounded-2xl p-8 hover:scale-[1.02] transition-all duration-500 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent"></div>
                        <div className="flex items-center justify-between mb-8 relative z-10">
                          <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center text-[#020403] shadow-[0_0_20px_rgba(16,185,129,0.3)] group-hover:scale-110 transition-transform duration-500">
                            <Icon icon="lucide:dna" width="28" />
                          </div>
                          <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[9px] font-bold uppercase tracking-widest shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                            Verified
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-tight mb-6 line-clamp-1">{nft.name}</h3>
                        <div className="space-y-3 relative z-10 mb-8 pt-6 border-t border-white/5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Type</span>
                            <span className="text-[10px] text-white font-mono uppercase font-bold">{nft.type}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Mint Date</span>
                            <span className="text-[10px] text-white font-mono uppercase font-bold">{nft.date}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Serial</span>
                            <span className="text-[10px] text-emerald-500 font-mono uppercase font-bold truncate max-w-[120px]">{nft.tokenId}:{nft.serialNumber}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`${nft.tokenId}:${nft.serialNumber}`);
                            toast.success('Certificate identity copied to telemetry buffer');
                          }}
                          className="w-full h-10 rounded-xl bg-white/5 border border-white/10 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2 group-hover:border-emerald-500/30 group-hover:text-emerald-500"
                        >
                          <Icon icon="lucide:copy" width="12" />
                          Copy Proof Identity
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Show files that can be certified */}
                {userData.filter(item => !item.nftCertified).length > 0 && (
                  <div className="mt-16 pt-16 border-t border-white/5">
                    <h3 className="text-sm font-bold text-white uppercase tracking-[0.2em] mb-8">Assets Awaiting Proof</h3>
                    <div className="space-y-4">
                      {userData.filter(item => !item.nftCertified).map((item) => (
                        <div key={item.id} className="glass-panel border-white/5 p-6 rounded-2xl flex items-center justify-between group hover:bg-white/[0.02] transition-colors">
                          <div className="flex items-center gap-6">
                            <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 group-hover:text-emerald-500 transition-colors">
                              <Icon icon={item.type === 'genetic' ? 'lucide:dna' : item.type === 'health' ? 'lucide:activity' : 'lucide:file-text'} width="20" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-white uppercase tracking-tight">{item.name}</p>
                              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1 font-mono">{item.type} • {item.date}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleMintNFT(item.id)}
                            disabled={mintingFileId === item.id}
                            className="h-9 px-6 rounded-xl bg-white/5 border border-white/10 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-500 hover:text-[#020403] hover:border-emerald-500 transition-all disabled:opacity-50"
                          >
                            {mintingFileId === item.id ? 'Synchronizing...' : 'Initialize Mint'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Placeholder for Analytics and Settings */}
            {(activeTab === 'analytics' || activeTab === 'settings') && (
              <div className="glass-panel border-white/5 rounded-2xl p-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-600 mx-auto mb-6">
                  <Icon icon="lucide:terminal" width="32" />
                </div>
                <h3 className="text-sm font-bold text-white uppercase tracking-[0.2em] mb-2">Node Environment Restricted</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mb-8 leading-relaxed">
                  The requested protocol layer is currently undergoing consensus verification. High-level telemetry and node configuration will be restricted until the next epoch.
                </p>
                <button className="h-10 px-8 rounded border border-white/10 text-slate-400 text-[10px] font-bold uppercase tracking-widest hover:bg-white/5 transition-all">
                  Await Signal
                </button>
              </div>
            )}

            {/* Subscriptions Tab */}
            {activeTab === 'subscriptions' && (
              <div className="space-y-12">
                <div className="text-center max-w-2xl mx-auto mb-16">
                  <h2 className="text-2xl font-bold text-white tracking-tighter uppercase mb-4">Clinical Protocol Tiers</h2>
                  <p className="text-xs text-slate-500 leading-relaxed uppercase tracking-widest">
                    Expand your clinical capacity with professional tiers. Unlock advanced sequencing clusters and high-bandwidth patient management.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {[
                    { tier: 'F1', name: 'Clinical Basic', price: 'Free', features: ['100MB Cloud Storage', 'Standard Patient View', 'Manual Data Request', 'Basic NFT Proofs'], color: 'slate' },
                    { tier: 'F2', name: 'Advanced Practice', price: '300 GENE/mo', features: ['10GB Secure Storage', 'Batch Data Processing', 'Automated NFT Minting', '3x Reward Multiplier', 'Consensus v2.2'], color: 'emerald', popular: true },
                    { tier: 'F3', name: 'Surgical Network', price: '800 GENE/mo', features: ['Unlimited Storage', 'Sequence Forge Access', 'Inter-Hospital Indexing', 'Full API Access', 'Priority Consensus'], color: 'purple' },
                  ].map((sub) => (
                    <div key={sub.tier} className={`glass-panel border-white/5 rounded-3xl p-10 flex flex-col relative overflow-hidden group hover:scale-[1.02] transition-all duration-500 ${sub.popular ? 'bg-emerald-500/[0.03] ring-1 ring-emerald-500/30' : 'bg-white/[0.01]'}`}>
                      {sub.popular && (
                        <div className="absolute top-0 right-0 py-2 px-8 bg-emerald-500 text-[#020403] text-[9px] font-bold uppercase tracking-[0.2em] transform rotate-45 translate-x-[25px] translate-y-[10px]">
                          Popular
                        </div>
                      )}
                      <div className="mb-10">
                        <p className={`text-[10px] font-bold uppercase tracking-[0.3em] mb-4 ${sub.color === 'emerald' ? 'text-emerald-500' : sub.color === 'purple' ? 'text-purple-400' : 'text-slate-500'}`}>{sub.tier} Protocol</p>
                        <h3 className="text-xl font-bold text-white uppercase tracking-tighter mb-2">{sub.name}</h3>
                        <div className="flex items-baseline gap-2 mt-4">
                          <span className="text-3xl font-bold text-white font-mono">{sub.price.split(' ')[0]}</span>
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{sub.price.includes('GENE') ? 'GENE / MO' : ''}</span>
                        </div>
                      </div>
                      <div className="flex-1 space-y-4 mb-10">
                        {sub.features.map(f => (
                          <div key={f} className="flex items-center gap-3">
                            <Icon icon="lucide:check" className="text-emerald-500" width="14" />
                            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">{f}</span>
                          </div>
                        ))}
                      </div>
                      <button className={`w-full py-4 rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all ${sub.tier === 'F1' ? 'bg-white/5 text-slate-500 cursor-default border border-white/10' : 'bg-emerald-500 text-[#020403] hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]'}`}>
                        {sub.tier === 'F1' ? 'Active Protocol' : 'Scale Practice'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Connect Wallet Modal */}
      {showConnectModal && <ConnectWalletModal />}

      {/* Transaction Status Modal */}
      <TransactionStatusModal
        isOpen={txModalOpen}
        status={txStatus}
        transactionId={txId}
        error={txError}
        network={network?.toString().toLowerCase()}
        onClose={() => {
          setTxModalOpen(false);
          walletTx.resetState();
        }}
      />
    </>
  );
};

export default AZGenesDashboard;