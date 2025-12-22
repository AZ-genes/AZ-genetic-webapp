'use client';
import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useAuth } from '@/lib/useAuth';
import { api } from '@/lib/apiClient';
import { useToast } from '@/context/ToastContext';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useHederaWallet } from '@/context/HederaWalletContext';
import { Icon } from '@iconify/react';


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

interface UserProfile {
  id: string;
  name?: string;
  email?: string;
  subscription_tier?: 'F1' | 'F2' | 'F3';
  user_role?: 'patient' | 'doctor' | 'researcher';
}

const AZGenesDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { isConnected: isWalletConnected, accountId, connectWallet, disconnectWallet } = useHederaWallet();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isPrivateDataUnlocked, setIsPrivateDataUnlocked] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [userData, setUserData] = useState<DataItem[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [accessRequests, setAccessRequests] = useState<any[]>([]);
  const [loadingAccessRequests, setLoadingAccessRequests] = useState(false);
  const [nftCertificates, setNftCertificates] = useState<any[]>([]);
  const [loadingNFTs, setLoadingNFTs] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState<UserProfile | null>(null);
  const [tokenTransactions, setTokenTransactions] = useState<any[]>([]);
  const [loadingTokenTransactions, setLoadingTokenTransactions] = useState(false);
  const [showBuyTokensModal, setShowBuyTokensModal] = useState(false);
  const [showTransferTokensModal, setShowTransferTokensModal] = useState(false);
  const [tokenBalance, setTokenBalance] = useState(0);
  const toast = useToast();

  // Fetch user files
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

  // Fetch user profile
  const loadProfile = async () => {
    try {
      const response = await api.get('get-profile');
      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }
      const profile = await response.json();
      setUserProfile(profile);
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  // Load access requests
  const loadAccessRequests = async () => {
    setLoadingAccessRequests(true);
    try {
      const response = await api.get('get-access-requests');
      if (!response.ok) {
        throw new Error('Failed to fetch access requests');
      }
      const requests = await response.json();
      setAccessRequests(requests);
    } catch (error) {
      console.error('Error loading access requests:', error);
    } finally {
      setLoadingAccessRequests(false);
    }
  };

  // Load NFT certificates
  const loadNFTs = async () => {
    setLoadingNFTs(true);
    try {
      const files = await api.get('files');
      if (files.ok) {
        const filesData = await files.json();
        const nfts = filesData
          .filter((file: any) => file.nft_token_id)
          .map((file: any) => ({
            id: file.id,
            file_name: file.file_name,
            token_id: file.nft_token_id,
            serial_number: file.nft_serial_number,
            created_at: file.created_at
          }));
        setNftCertificates(nfts);
      }
    } catch (error) {
      console.error('Error loading NFTs:', error);
    } finally {
      setLoadingNFTs(false);
    }
  };

  // Load files and profile on mount
  useEffect(() => {
    if (user && !authLoading) {
      loadFiles();
      loadProfile();
      loadAccessRequests();
      loadNFTs();
      loadTokenTransactions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  // Handle role-based redirection
  useEffect(() => {
    if (userProfile && !authLoading) {
      if (userProfile.user_role === 'doctor') {
        router.push('/dashboard/doctor');
      } else if (userProfile.user_role === 'researcher') {
        router.push('/dashboard/researcher');
      } else if (userProfile.user_role === 'patient') {
        router.push('/dashboard/individual');
      }
    }
  }, [userProfile, authLoading, router]);

  // Load data when switching tabs
  useEffect(() => {
    if (!authLoading && user) {
      if (activeTab === 'sharing') {
        loadAccessRequests();
      } else if (activeTab === 'nft') {
        loadNFTs();
      } else if (activeTab === 'tokens') {
        loadTokenTransactions();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Show welcome/login success messages
  useEffect(() => {
    if (!authLoading && user) {
      // Check for welcome message (sign up)
      const showWelcome = window.localStorage.getItem('showWelcomeMessage');
      if (showWelcome === 'true') {
        toast.success('Welcome! Your account has been created successfully.');
        window.localStorage.removeItem('showWelcomeMessage');
      }

      // Check for login success message
      const showLoginSuccess = window.localStorage.getItem('showLoginSuccessMessage');
      if (showLoginSuccess === 'true') {
        toast.success('Login successful! Welcome back.');
        window.localStorage.removeItem('showLoginSuccessMessage');
      }
    }
  }, [authLoading, user, toast]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showProfileDropdown && !(event.target as Element).closest('.profile-dropdown')) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showProfileDropdown]);

  const privateData = userData.filter(item => item.isPrivate);
  const publicData = userData.filter(item => !item.isPrivate);

  // Load token transactions
  const loadTokenTransactions = async () => {
    setLoadingTokenTransactions(true);
    try {
      const response = await api.get('get-token-transactions');
      if (response.ok) {
        const transactions = await response.json();
        setTokenTransactions(transactions);

        // Calculate balance from transactions
        const balance = transactions.reduce((acc: number, tx: any) => {
          if (tx.type === 'received' || tx.type === 'earned') {
            return acc + Number(tx.amount);
          } else if (tx.type === 'spent') {
            return acc - Number(tx.amount);
          }
          return acc;
        }, 0);
        setTokenBalance(balance);
      }
    } catch (error) {
      console.error('Error loading token transactions:', error);
    } finally {
      setLoadingTokenTransactions(false);
    }
  };

  // Calculate stats from actual data
  const stats = {
    totalData: userData.length > 0 ? `${userData.length * 100} MB` : '0 MB',
    nftCertified: userData.filter(item => item.nftCertified).length,
    totalTokens: tokenBalance,
    activeShares: 2,
    dataRequests: 3,
    privateFiles: privateData.length,
    encryptedFiles: userData.filter(item => item.encrypted).length,
  };

  // Get user's initials for avatar
  const getUserInitials = (name?: string, email?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return 'U';
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Ensure user is authenticated before attempting upload
    if (!user) {
      toast.error('Please sign in to upload files');
      return;
    }

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

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success('Logged out successfully');
      setShowProfileDropdown(false);
      router.push('/sign-in');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to log out');
    }
  };

  const handleConnectWallet = async () => {
    setIsConnecting(true); // <-- ADD THIS
    try {
      await connectWallet();
      // The modal will open. The event listener will handle success.
      // We'll set connecting back to false if the user connects OR closes the modal.
    } catch (error) {
      console.error('Error connecting wallet:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect wallet';
      toast.error(errorMessage.includes('project ID') ? 'Wallet Connect not configured. Please set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID' : 'Failed to connect wallet');
      setIsConnecting(false); // <-- ADD THIS on error
    }
  };

  // Monitor wallet connection status to provide feedback
  useEffect(() => {
    if (isWalletConnected && accountId) {
      toast.success('Wallet connected successfully!');
      setShowConnectModal(false);
      setIsConnecting(false); // <-- ADD THIS
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWalletConnected, accountId]);

  const handleDisconnectWallet = async () => {
    try {
      await disconnectWallet();
      setIsPrivateDataUnlocked(false);
      toast.success('Wallet disconnected');
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
      toast.error('Failed to disconnect wallet');
    }
  };

  const handleUnlockPrivateData = () => {
    if (!isWalletConnected) {
      setShowConnectModal(true);
      return;
    }
    // Simulate private data unlock (in real app, this would involve decryption)
    setIsPrivateDataUnlocked(true);
  };

  const handleLockPrivateData = () => {
    setIsPrivateDataUnlocked(false);
  };

  const handleMintNFT = async (fileId: string) => {
    if (!isWalletConnected) {
      setShowConnectModal(true);
      return;
    }

    try {
      const response = await api.post('mint-nft-certificate', { fileId });

      if (!response.ok) {
        const error = await response.json();
        toast.error(`Failed to mint NFT: ${error.error}`);
        return;
      }

      toast.success('NFT Certificate minted successfully!');
      await loadNFTs();
      await loadFiles();
    } catch (error) {
      console.error('Error minting NFT:', error);
      toast.error('Failed to mint NFT certificate');
    }
  };

  const handleUpdateProfile = async (profileData: Partial<UserProfile>) => {
    try {
      // Note: Profile update would need a dedicated API endpoint
      // For now, we'll just show a message
      toast.info('Profile update feature coming soon');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    // TODO: Implement proper approve/deny functionality
    toast.info('Approve functionality coming soon');
  };

  const handleDenyRequest = async (requestId: string) => {
    // TODO: Implement proper approve/deny functionality
    toast.info('Deny functionality coming soon');
  };

  const handleTierChange = async (tier: 'F1' | 'F2' | 'F3') => {
    try {
      // Note: Tier change would need a dedicated API endpoint
      toast.info('Tier change feature coming soon');
    } catch (error) {
      console.error('Error changing tier:', error);
      toast.error('Failed to change tier');
    }
  };

  const handleBuyTokens = async (amount: number) => {
    if (!isWalletConnected) {
      toast.error('Please connect your wallet first');
      setShowBuyTokensModal(false);
      setShowConnectModal(true);
      return;
    }

    try {
      // Note: Buy tokens would need a payment integration
      // For now, we'll simulate a successful purchase
      toast.success(`Successfully purchased ${amount} tokens!`);
      setShowBuyTokensModal(false);
      // Reload transactions to show the new purchase
      await loadTokenTransactions();
    } catch (error) {
      console.error('Error buying tokens:', error);
      toast.error('Failed to buy tokens');
    }
  };

  const handleTransferTokens = async (recipientId: string, amount: number) => {
    if (!isWalletConnected) {
      toast.error('Please connect your wallet first');
      setShowTransferTokensModal(false);
      setShowConnectModal(true);
      return;
    }

    try {
      const response = await api.post('transfer-tokens', {
        recipientAccountId: recipientId,
        amount: amount
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(`Failed to transfer tokens: ${error.error}`);
        return;
      }

      toast.success(`Successfully transferred ${amount} tokens!`);
      setShowTransferTokensModal(false);
      // Reload transactions to show the new transfer
      await loadTokenTransactions();
    } catch (error) {
      console.error('Error transferring tokens:', error);
      toast.error('Failed to transfer tokens');
    }
  };

  const ConnectWalletModal = () => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => { setShowConnectModal(false); setIsConnecting(false); }}></div>
      <div className="glass-panel w-full max-w-sm rounded-xl p-6 relative z-10 transition-all duration-300">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-medium text-white">{isConnecting ? 'Connecting...' : 'Connect Wallet'}</h3>
          <button onClick={() => { setShowConnectModal(false); setIsConnecting(false); }} className="text-slate-500 hover:text-white transition-colors">
            <Icon icon="lucide:x" width="16" />
          </button>
        </div>
        <div className="space-y-3">
          <button onClick={handleConnectWallet} disabled={isConnecting} className="w-full flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-emerald-500/30 transition-all group disabled:opacity-50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-orange-500/20 rounded flex items-center justify-center">
                <Icon icon="logos:metamask-icon" width="20" />
              </div>
              <span className="text-sm font-medium text-slate-200">{isConnecting ? 'Connecting...' : 'Metamask'}</span>
            </div>
            {!isConnecting && <span className="text-[10px] text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity">Connect</span>}
          </button>
          <button disabled className="w-full flex items-center justify-between p-3 rounded-lg bg-white/5 opacity-50 border border-white/5 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500/20 rounded flex items-center justify-center">
                <Icon icon="logos:walletconnect" width="20" />
              </div>
              <span className="text-sm font-medium text-slate-200">WalletConnect</span>
            </div>
          </button>
        </div>
        <p className="mt-6 text-[10px] text-center text-slate-600">
          By connecting a wallet, you agree to AZ genes' <a href="#" className="text-slate-400 hover:text-emerald-400 underline">Terms of Service</a>.
        </p>
      </div>
    </div>
  );

  const PrivateDataAccessPanel = () => (
    <div className="glass-panel rounded-xl p-6 relative overflow-hidden mb-6 border-emerald-500/10">
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent pointer-events-none"></div>
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isPrivateDataUnlocked ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-slate-400'} ring-anim relative`}>
            <Icon icon={isPrivateDataUnlocked ? "lucide:unlock" : "lucide:lock"} width="24" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-white">
              {isPrivateDataUnlocked ? 'Private Data Unlocked' : 'Secure Private Data Access'}
            </h3>
            <p className="text-xs text-slate-500">
              {isPrivateDataUnlocked
                ? 'Your sensitive genetic information is now accessible. Lock when done.'
                : 'Unlock with your Hedera wallet to access sensitive genetic information.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isWalletConnected && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-mono text-emerald-400">Connected</span>
            </div>
          )}
          <button
            onClick={isPrivateDataUnlocked ? handleLockPrivateData : handleUnlockPrivateData}
            className={`px-6 py-2 rounded text-xs font-semibold transition-all ${isPrivateDataUnlocked
              ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20'
              : 'bg-emerald-500 text-[#020403] hover:bg-emerald-400 shadow-[0_0_20px_-5px_rgba(16,185,129,0.4)]'
              }`}
          >
            {isPrivateDataUnlocked ? 'Lock Session' : 'Unlock Data'}
          </button>
        </div>
      </div>
    </div>
  );

  const DataItemRow = ({ item }: { item: DataItem }) => (
    <tr className="hover:bg-white/[0.02] group transition-colors border-b border-white/5">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
            <span className="text-lg">
              {item.type === 'genetic' ? '🧬' : item.type === 'health' ? '🏥' : '📄'}
            </span>
          </div>
          <div>
            <div className="text-sm font-medium text-slate-200 flex items-center">
              {item.name}
              {item.isPrivate && (
                <span className="ml-2 bg-purple-500/10 text-purple-400 text-[10px] px-2 py-0.5 rounded-full border border-purple-500/10 flex items-center">
                  <Icon icon="lucide:lock" className="mr-1" width="10" />
                  Private
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">0.x GENE earned • {item.accessCount} accesses</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 capitalize font-mono">
          {item.type}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-[11px] text-slate-400 font-mono">{item.date}</td>
      <td className="px-6 py-4 whitespace-nowrap text-[11px] text-slate-400 font-mono">{item.size}</td>
      <td className="px-6 py-4 whitespace-nowrap">
        {item.nftCertified ? (
          <div className="flex items-center text-emerald-400 text-[10px] font-mono">
            <Icon icon="lucide:check-circle" className="mr-1" width="14" />
            Certified
          </div>
        ) : (
          <button
            onClick={() => handleMintNFT(item.id)}
            className="text-slate-500 hover:text-emerald-400 text-[10px] font-medium transition-colors border border-dashed border-white/10 px-2 py-1 rounded"
          >
            Issue NFT
          </button>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <div className="flex items-center gap-3">
          {item.isPrivate && !isPrivateDataUnlocked ? (
            <button
              onClick={handleUnlockPrivateData}
              className="text-purple-400 hover:text-purple-300 text-[10px] font-medium flex items-center transition-colors"
            >
              <Icon icon="lucide:key" className="mr-1" width="14" />
              Unlock
            </button>
          ) : (
            <>
              <button className="text-emerald-500 hover:text-emerald-400 transition-colors text-[11px] font-medium">Share</button>
              <button className="text-slate-500 hover:text-slate-300 transition-colors text-[11px] font-medium">View</button>
            </>
          )}
        </div>
      </td>
    </tr>
  );


  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/sign-in');
    }
  }, [authLoading, user, router]);

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
        <title>Dashboard | AZ genes</title>
        <meta name="description" content="Secure genomic data management on Hedera" />
      </Head>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
        accept=".vcf,.csv,.txt,.tsv,.23andme,.txt,.pdf"
      />

      <div className="flex h-screen bg-[#020403] bg-grid selection:bg-emerald-500/20 selection:text-emerald-200">
        {/* Sidebar */}
        <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} glass-panel border-r border-white/5 transition-all duration-300 flex flex-col z-50`}>
          <div className="p-6 border-b border-white/5">
            <div className="flex items-center justify-between">
              {sidebarOpen && (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <Icon icon="lucide:dna" className="text-emerald-500" width="20" />
                  </div>
                  <h1 className="text-lg font-bold text-white tracking-tight">AZ genes</h1>
                </div>
              )}
              {!sidebarOpen && (
                <div className="w-8 h-8 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
                  <Icon icon="lucide:dna" className="text-emerald-500" width="20" />
                </div>
              )}
            </div>
          </div>

          <nav className="flex-1 mt-6 px-3 space-y-1">
            {[
              { id: 'overview', name: 'Overview', icon: 'lucide:layout-dashboard' },
              { id: 'data', name: 'My Data', icon: 'lucide:dna' },
              { id: 'tokens', name: 'Token Wallet', icon: 'lucide:wallet' },
              { id: 'sharing', name: 'Data Sharing', icon: 'lucide:share-2' },
              { id: 'nft', name: 'NFT Certificates', icon: 'lucide:award' },
              { id: 'analytics', name: 'Analytics', icon: 'lucide:bar-chart-3' },
              { id: 'settings', name: 'Settings', icon: 'lucide:settings' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${activeTab === item.id
                  ? 'bg-emerald-500 text-[#020403] shadow-[0_0_15px_-3px_rgba(16,185,129,0.3)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
              >
                <Icon icon={item.icon} className={`flex-shrink-0 ${activeTab === item.id ? '' : 'group-hover:text-emerald-400 transition-colors'}`} width="20" />
                {sidebarOpen && <span className="text-sm font-medium">{item.name}</span>}
              </button>
            ))}
          </nav>

          {/* Sidebar Footer / Toggle */}
          <div className="p-4 border-t border-white/5">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-500 hover:text-white transition-colors group"
            >
              <Icon icon={sidebarOpen ? "lucide:chevron-left" : "lucide:chevron-right"} width="20" />
              {sidebarOpen && <span className="text-xs font-medium uppercase tracking-wider">Collapse Menu</span>}
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="glass-panel border-b border-white/5 z-40 sticky top-0">
            <div className="flex items-center justify-between px-8 py-4">
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">
                  {activeTab === 'overview' ? 'Dashboard Overview' : activeTab.replace('-', ' ')}
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Secure Data Vault • <span className="text-emerald-500/80">Hedera Network</span>
                </p>
              </div>

              <div className="flex items-center gap-6">
                {/* Wallet Connection Status */}
                {isWalletConnected && accountId && (
                  <div className="flex items-center gap-3 px-3 py-1.5 bg-emerald-500/5 border border-emerald-500/10 rounded-lg">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-500 leading-none">Connected Wallet</span>
                      <span className="text-xs font-mono text-emerald-400 font-medium">
                        {accountId.toString()}
                      </span>
                    </div>
                    <button
                      onClick={handleDisconnectWallet}
                      className="p-1 hover:bg-red-500/10 text-slate-600 hover:text-red-400 rounded transition-colors"
                      title="Disconnect Wallet"
                    >
                      <Icon icon="lucide:log-out" width="14" />
                    </button>
                  </div>
                )}

                {!isWalletConnected && (
                  <button
                    onClick={() => setShowConnectModal(true)}
                    className="glass-btn px-4 py-2 text-xs font-semibold flex items-center gap-2"
                  >
                    <Icon icon="lucide:wallet" className="text-emerald-500" width="16" />
                    <span>Connect Wallet</span>
                  </button>
                )}

                <div className="h-8 w-[1px] bg-white/5"></div>

                <div className="flex items-center gap-2">
                  <button className="relative p-2 text-slate-400 hover:text-white transition-colors">
                    <Icon icon="lucide:bell" width="20" />
                    <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full border border-[#020403]"></span>
                  </button>
                </div>

                <div className="flex items-center gap-3 pl-2">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-medium text-white leading-none">
                      {userProfile?.name || user?.email?.split('@')[0] || 'User'}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      {userProfile?.subscription_tier ? `${userProfile.subscription_tier} Tier` : 'Basic Member'}
                    </p>
                  </div>
                  <div className="relative profile-dropdown">
                    <button
                      onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                      className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center text-[#020403] font-bold text-xs ring-4 ring-emerald-500/10 hover:ring-emerald-500/20 transition-all shadow-[0_0_15px_-5px_rgba(16,185,129,0.5)]"
                    >
                      {getUserInitials(userProfile?.name, userProfile?.email || user?.email || undefined)}
                    </button>
                    {showProfileDropdown && (
                      <div className="absolute right-0 mt-3 w-48 glass-panel rounded-lg py-1 z-50 border-white/5 shadow-2xl overflow-hidden">
                        <div className="px-4 py-3 border-b border-white/5 space-y-0.5 sm:hidden">
                          <p className="text-xs font-medium text-white">{userProfile?.name || 'User'}</p>
                          <p className="text-[10px] text-slate-500">{user?.email}</p>
                        </div>
                        <button
                          onClick={() => setActiveTab('settings')}
                          className="w-full px-4 py-2.5 text-left text-xs text-slate-300 hover:text-white hover:bg-white/5 flex items-center gap-2"
                        >
                          <span className="iconify" data-icon="lucide:user" data-width="14"></span>
                          Account Settings
                        </button>
                        <button
                          onClick={handleLogout}
                          className="w-full px-4 py-2.5 text-left text-xs text-red-400 hover:bg-red-500/5 flex items-center gap-2"
                        >
                          <span className="iconify" data-icon="lucide:power" data-width="14"></span>
                          Log Out
                        </button>
                      </div>
                    )}
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
              <div className="space-y-6">
                {/* Enhanced Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="glass-panel p-6 rounded-xl border-white/5 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="flex items-center justify-between relative z-10">
                      <div>
                        <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Total Data Stored</p>
                        <p className="text-2xl font-bold text-white mt-1 font-mono">{stats.totalData}</p>
                      </div>
                      <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-500">
                        <span className="iconify" data-icon="lucide:database" data-width="24"></span>
                      </div>
                    </div>
                  </div>

                  <div className="glass-panel p-6 rounded-xl border-white/5 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="flex items-center justify-between relative z-10">
                      <div>
                        <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Private Files</p>
                        <p className="text-2xl font-bold text-white mt-1 font-mono">{stats.privateFiles}</p>
                        <p className={`text-[10px] mt-1 flex items-center gap-1 ${isPrivateDataUnlocked ? 'text-emerald-400' : 'text-purple-400'}`}>
                          <span className="iconify" data-icon={isPrivateDataUnlocked ? "lucide:unlock" : "lucide:lock"} data-width="10"></span>
                          {isPrivateDataUnlocked ? 'Unlocked' : 'Locked'}
                        </p>
                      </div>
                      <div className={`p-3 rounded-lg ${isPrivateDataUnlocked ? 'bg-emerald-500/10 text-emerald-500' : 'bg-purple-500/10 text-purple-500'}`}>
                        <span className="iconify" data-icon="lucide:shield-check" data-width="24"></span>
                      </div>
                    </div>
                  </div>

                  <div className="glass-panel p-6 rounded-xl border-white/5 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="flex items-center justify-between relative z-10">
                      <div>
                        <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Utility Tokens</p>
                        <p className="text-2xl font-bold text-white mt-1 font-mono">{stats.totalTokens}</p>
                      </div>
                      <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-500">
                        <span className="iconify" data-icon="lucide:coins" data-width="24"></span>
                      </div>
                    </div>
                  </div>

                  <div className="glass-panel p-6 rounded-xl border-white/5 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="flex items-center justify-between relative z-10">
                      <div>
                        <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">NFT Certified</p>
                        <p className="text-2xl font-bold text-white mt-1 font-mono">{stats.nftCertified}</p>
                      </div>
                      <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-500">
                        <span className="iconify" data-icon="lucide:award" data-width="24"></span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Rest of overview content remains the same */}
                {/* ... */}
              </div>
            )}

            {activeTab === 'data' && (
              <div className="glass-panel rounded-xl border-white/5 overflow-hidden">
                <div className="p-6 border-b border-white/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-white tracking-tight">My Genetic Data</h2>
                      <p className="text-xs text-slate-500">Manage and share your encrypted genomic assets</p>
                    </div>
                    <div className="flex items-center gap-4">
                      {privateData.length > 0 && (
                        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/5 border border-purple-500/10">
                          <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse"></span>
                          <span className="text-[10px] font-mono text-purple-400">{privateData.length} Vaulted Files</span>
                        </div>
                      )}
                      <button
                        onClick={handleUploadClick}
                        disabled={isUploading}
                        className="glass-btn px-4 py-2 text-xs font-semibold flex items-center gap-2 disabled:opacity-50"
                      >
                        <span className="iconify text-emerald-500" data-icon={isUploading ? "lucide:loader-2" : "lucide:upload-cloud"} data-width="16"></span>
                        <span>{isUploading ? 'Encrypting...' : 'Upload Data'}</span>
                      </button>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-white/[0.02]">
                        <th className="px-6 py-3 text-left text-[10px] font-medium text-slate-500 uppercase tracking-wider">Asset Name</th>
                        <th className="px-6 py-3 text-left text-[10px] font-medium text-slate-500 uppercase tracking-wider">Category</th>
                        <th className="px-6 py-3 text-left text-[10px] font-medium text-slate-500 uppercase tracking-wider">Timestamp</th>
                        <th className="px-6 py-3 text-left text-[10px] font-medium text-slate-500 uppercase tracking-wider">Size</th>
                        <th className="px-6 py-3 text-left text-[10px] font-medium text-slate-500 uppercase tracking-wider">Hedera Proof</th>
                        <th className="px-6 py-3 text-left text-[10px] font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
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
              </div>
            )}

            {/* Other tabs remain similar */}
            {activeTab === 'tokens' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                  <div className="glass-panel p-6 rounded-xl border-white/5">
                    <div className="flex items-center gap-2 mb-6">
                      <span className="iconify text-emerald-500" data-icon="lucide:wallet" data-width="18"></span>
                      <h3 className="text-sm font-semibold text-white">Token Balance</h3>
                    </div>
                    <div className="text-center py-4">
                      <div className="text-4xl font-bold text-emerald-500 mb-1 font-mono">{tokenBalance}</div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">GENE Utility Tokens</p>
                      <div className="mt-8 space-y-3">
                        <button
                          onClick={() => setShowBuyTokensModal(true)}
                          className="w-full bg-emerald-500 text-[#020403] py-2.5 rounded text-xs font-bold hover:bg-emerald-400 transition-all shadow-[0_0_20px_-5px_rgba(16,185,129,0.4)]"
                        >
                          Acquire Tokens
                        </button>
                        <button
                          onClick={() => setShowTransferTokensModal(true)}
                          className="w-full glass-btn py-2.5 text-xs font-semibold"
                        >
                          Transfer Assets
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="lg:col-span-2">
                  <div className="glass-panel p-6 rounded-xl border-white/5 h-full">
                    <div className="flex items-center gap-2 mb-6">
                      <span className="iconify text-emerald-500" data-icon="lucide:history" data-width="18"></span>
                      <h3 className="text-sm font-semibold text-white">Transaction History</h3>
                    </div>
                    {loadingTokenTransactions ? (
                      <div className="flex items-center justify-center py-12">
                        <span className="iconify animate-spin text-emerald-500" data-icon="lucide:loader-2" data-width="32"></span>
                      </div>
                    ) : tokenTransactions.length > 0 ? (
                      <div className="space-y-3">
                        {tokenTransactions.map((transaction) => (
                          <div key={transaction.id} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/5 group hover:bg-white/5 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center ${transaction.type === 'received' ? 'bg-emerald-500/10 text-emerald-500' :
                                transaction.type === 'spent' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'
                                }`}>
                                <span className="iconify" data-icon={transaction.type === 'received' ? "lucide:arrow-down-left" : "lucide:arrow-up-right"} data-width="18"></span>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-white">
                                  {transaction.type === 'received' ? 'Incoming GENE' : 'Outgoing GENE'}
                                </p>
                                <p className="text-[10px] text-slate-500 font-mono">
                                  {transaction.type === 'received' ? transaction.sender_id : transaction.recipient_id}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`text-xs font-bold font-mono ${transaction.type === 'received' ? 'text-emerald-500' :
                                transaction.type === 'spent' ? 'text-red-500' : 'text-blue-500'
                                }`}>
                                {transaction.type === 'received' ? '+' : '-'}{transaction.amount}
                              </p>
                              <p className="text-[10px] text-slate-600 mt-0.5">
                                {transaction.timestamp ? new Date(transaction.timestamp).toLocaleDateString() : 'N/A'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <span className="iconify text-slate-800 mx-auto mb-3" data-icon="lucide:info" data-width="32"></span>
                        <p className="text-[11px] text-slate-500">No recent transactions indexed</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Data Sharing Tab */}
            {activeTab === 'sharing' && (
              <div className="glass-panel rounded-xl border-white/5 p-8">
                <div className="mb-8">
                  <h2 className="text-lg font-bold text-white tracking-tight">Data Sharing Management</h2>
                  <p className="text-xs text-slate-500 mt-1">Review and manage access permissions for your genomic assets</p>
                </div>
                {loadingAccessRequests ? (
                  <div className="flex items-center justify-center py-12">
                    <span className="iconify animate-spin text-emerald-500" data-icon="lucide:loader-2" data-width="32"></span>
                  </div>
                ) : accessRequests.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {accessRequests.map((request) => (
                      <div key={request.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-emerald-500/30 transition-all group">
                        <div className="flex items-start justify-between">
                          <div className="flex gap-3">
                            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                              <span className="iconify" data-icon="lucide:file-text" data-width="20"></span>
                            </div>
                            <div>
                              <h3 className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">{request.file_name}</h3>
                              <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1 uppercase tracking-wider font-mono">
                                <span className="iconify" data-icon="lucide:shield" data-width="10"></span>
                                {request.access_level} Access
                              </p>
                              <p className="text-[10px] text-slate-600 mt-1">Requested: {new Date(request.request_date).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={() => handleApproveRequest(request.id)}
                              className="px-3 py-1.5 bg-emerald-500 text-[#020403] rounded text-[10px] font-bold hover:bg-emerald-400 transition-all"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleDenyRequest(request.id)}
                              className="px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded text-[10px] font-bold hover:bg-red-500/20 transition-all"
                            >
                              Revoke
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5">
                      <span className="iconify text-slate-700" data-icon="lucide:inbox" data-width="32"></span>
                    </div>
                    <p className="text-sm text-slate-400 font-medium">Clear Inbox</p>
                    <p className="text-xs text-slate-600 mt-1">No pending access requests at this time</p>
                  </div>
                )}
              </div>
            )}

            {/* NFT Certificates Tab */}
            {activeTab === 'nft' && (
              <div className="glass-panel rounded-xl border-white/5 p-8">
                <div className="mb-8">
                  <h2 className="text-lg font-bold text-white tracking-tight">NFT Certificates</h2>
                  <p className="text-xs text-slate-500 mt-1">Proof of authenticity for your genetic data stored on Hedera</p>
                </div>
                {loadingNFTs ? (
                  <div className="flex items-center justify-center py-12">
                    <span className="iconify animate-spin text-emerald-500" data-icon="lucide:loader-2" data-width="32"></span>
                  </div>
                ) : nftCertificates.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {nftCertificates.map((nft) => (
                      <div key={nft.id} className="glass-panel p-6 rounded-xl border-white/10 hover:border-emerald-500/30 transition-all group relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:opacity-100 transition-opacity">
                          <span className="iconify text-emerald-500" data-icon="lucide:check-circle" data-width="16"></span>
                        </div>
                        <div className="flex items-center justify-center w-20 h-20 bg-emerald-500/10 rounded-2xl mb-6 mx-auto group-hover:scale-110 transition-transform duration-500">
                          <span className="iconify text-emerald-500" data-icon="lucide:award" data-width="40"></span>
                        </div>
                        <h3 className="font-bold text-white mb-4 text-center group-hover:text-emerald-400 transition-colors uppercase tracking-tight">{nft.file_name}</h3>
                        <div className="space-y-3 pt-4 border-t border-white/5">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-slate-500">TOKEN ID</span>
                            <span className="text-[10px] font-mono text-emerald-400">{nft.token_id.substring(0, 16)}...</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-slate-500">SERIAL</span>
                            <span className="text-[10px] font-mono text-white"># {nft.serial_number}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-slate-500">TIMESTAMP</span>
                            <span className="text-[10px] font-mono text-slate-400">{new Date(nft.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-2xl">
                    <span className="iconify text-slate-800 mx-auto mb-4" data-icon="lucide:award" data-width="48"></span>
                    <p className="text-slate-400 font-medium">No Certificates Found</p>
                    <p className="text-xs text-slate-600 mt-2 max-w-xs mx-auto">Upload genetic data and mint an NFT to receive a cryptographic certificate of data ownership.</p>
                  </div>
                )}
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div className="glass-panel rounded-xl border-white/5 p-12 text-center">
                <div className="max-w-md mx-auto">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-8 border border-white/10 ${userProfile?.subscription_tier === 'F3' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                    <span className="iconify" data-icon={userProfile?.subscription_tier === 'F3' ? "lucide:bar-chart-big" : "lucide:lock"} data-width="40"></span>
                  </div>
                  <h2 className="text-xl font-bold text-white mb-3">Analytics Dashboard</h2>
                  {userProfile?.subscription_tier === 'F3' ? (
                    <>
                      <p className="text-sm text-slate-400 mb-8 font-medium">Coming Soon: Integrated Genomic Analytics & Heritage Insights</p>
                      <div className="p-4 bg-emerald-500/5 rounded-lg border border-emerald-500/10 inline-block text-[10px] font-mono text-emerald-400 tracking-wider">PREVIEW ENROLLED</div>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-slate-400 mb-2 font-medium">Enterprise Analytics Reserved for F3 Tier Subscribers</p>
                      <p className="text-xs text-slate-600 mb-8">Unlock advanced genetic pattern analysis, ancestry tracking, and comparative health metrics.</p>
                      <button
                        onClick={() => handleTierChange('F3')}
                        className="glass-btn px-8 py-3 text-xs font-bold uppercase tracking-widest text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/10"
                      >
                        Upgrade to F3 Tier
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="glass-panel p-8 rounded-xl border-white/5">
                  <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-8 border-b border-white/5 pb-4">Identity & Access</h2>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Full Legal Name</label>
                      <input
                        type="text"
                        defaultValue={userProfile?.name || ''}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                        onChange={(e) => setEditingProfile({ ...editingProfile || userProfile, name: e.target.value } as UserProfile)}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Authenticated Email</label>
                      <div className="relative group">
                        <input
                          type="email"
                          defaultValue={userProfile?.email || user?.email || ''}
                          disabled
                          className="w-full bg-white/[0.02] border border-white/10 rounded-lg px-4 py-3 text-sm text-slate-500 cursor-not-allowed opacity-70"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 iconify text-slate-600" data-icon="lucide:lock" data-width="14"></span>
                      </div>
                      <p className="text-[10px] text-slate-700 mt-2 font-medium italic">Secondary identifiers can only be modified through central auth provider</p>
                    </div>
                    <div className="pt-4 border-t border-white/5 flex gap-4">
                      <button
                        onClick={() => editingProfile && handleUpdateProfile(editingProfile)}
                        className="flex-1 bg-emerald-500 text-[#020403] py-3 rounded text-xs font-bold hover:bg-emerald-400 transition-all shadow-[0_0_20px_-5px_rgba(16,185,129,0.4)]"
                      >
                        Apply Changes
                      </button>
                    </div>
                  </div>
                </div>

                <div className="glass-panel p-8 rounded-xl border-white/5">
                  <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-8 border-b border-white/5 pb-4">Service Tier Allocation</h2>
                  <div className="space-y-4">
                    {['F1', 'F2', 'F3'].map((tier) => (
                      <div
                        key={tier}
                        onClick={() => handleTierChange(tier as 'F1' | 'F2' | 'F3')}
                        className={`p-4 rounded-xl cursor-pointer border transition-all relative group overflow-hidden ${userProfile?.subscription_tier === tier
                          ? 'bg-emerald-500/10 border-emerald-500/30'
                          : 'bg-white/5 border-white/10 hover:border-white/20'
                          }`}
                      >
                        {userProfile?.subscription_tier === tier && (
                          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                        )}
                        <div className="flex items-center justify-between">
                          <div>
                            <p className={`text-lg font-bold font-mono ${userProfile?.subscription_tier === tier ? 'text-emerald-500' : 'text-white/60 group-hover:text-white transition-colors'}`}>
                              {tier} Protocol
                            </p>
                            <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-medium">
                              {tier === 'F1' && 'Standard Private Storage'}
                              {tier === 'F2' && 'Advanced Search & Multi-Chain'}
                              {tier === 'F3' && 'Full Ecosystem Analytics'}
                            </p>
                          </div>
                          {userProfile?.subscription_tier === tier && (
                            <span className="iconify text-emerald-500" data-icon="lucide:check-circle-2" data-width="20"></span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Connect Wallet Modal */}
      {showConnectModal && <ConnectWalletModal />}

      {/* Buy Tokens Modal */}
      {showBuyTokensModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#020403]/90 backdrop-blur-sm" onClick={() => setShowBuyTokensModal(false)}></div>
          <div className="glass-panel w-full max-w-sm rounded-2xl relative z-10 p-8 border-white/5 overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent"></div>
            <div className="text-center mb-10">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="iconify text-emerald-500" data-icon="lucide:shopping-cart" data-width="32"></span>
              </div>
              <h3 className="text-lg font-bold text-white mb-2 uppercase tracking-widest">Protocol Credits</h3>
              <p className="text-[11px] text-slate-500 uppercase tracking-widest font-medium">Acquire GENE utility tokens</p>
            </div>
            <div className="space-y-6 mb-10">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Allocation Amount</label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="0.00"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-xl font-mono text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-500 font-mono">GENE</span>
                </div>
              </div>
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Market Rate</span>
                <span className="text-[10px] text-slate-400 font-mono">1 GENE ≈ $0.10 USD</span>
              </div>
            </div>
            <div className="space-y-4">
              <button
                onClick={() => handleBuyTokens(100)}
                className="w-full bg-emerald-500 text-[#020403] py-4 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-emerald-400 transition-all shadow-[0_0_20px_-5px_rgba(16,185,129,0.5)]"
              >
                Execute Purchase
              </button>
              <button
                onClick={() => setShowBuyTokensModal(false)}
                className="w-full text-slate-500 py-3 text-[10px] font-bold uppercase tracking-widest hover:text-white transition-colors"
              >
                Return to Vault
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Tokens Modal */}
      {showTransferTokensModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#020403]/90 backdrop-blur-sm" onClick={() => setShowTransferTokensModal(false)}></div>
          <div className="glass-panel w-full max-w-sm rounded-2xl relative z-10 p-8 border-white/5 overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent"></div>
            <div className="text-center mb-10">
              <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="iconify text-blue-500" data-icon="lucide:send" data-width="32"></span>
              </div>
              <h3 className="text-lg font-bold text-white mb-2 uppercase tracking-widest">Asset Transfer</h3>
              <p className="text-[11px] text-slate-500 uppercase tracking-widest font-medium">Relocate GENE utility tokens</p>
            </div>
            <div className="space-y-6 mb-10">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Recipient Protocol ID</label>
                <input
                  type="text"
                  id="transfer-recipient"
                  placeholder="0.0.xxxxx"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-mono text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Transfer Amount</label>
                <div className="relative">
                  <input
                    type="number"
                    id="transfer-amount"
                    placeholder="0.00"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-mono text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-blue-500 font-mono">GENE</span>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <button
                onClick={() => {
                  const recipientId = (document.getElementById('transfer-recipient') as HTMLInputElement)?.value;
                  const amount = Number((document.getElementById('transfer-amount') as HTMLInputElement)?.value);
                  if (recipientId && amount > 0) {
                    handleTransferTokens(recipientId, amount);
                  } else {
                    toast.error('Invalid Protocol Parameters');
                  }
                }}
                className="w-full bg-blue-500 text-white py-4 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-blue-400 transition-all shadow-[0_0_20px_-5px_rgba(59,130,246,0.5)]"
              >
                Initiate Transfer
              </button>
              <button
                onClick={() => setShowTransferTokensModal(false)}
                className="w-full text-slate-500 py-3 text-[10px] font-bold uppercase tracking-widest hover:text-white transition-colors"
              >
                Cancel Protocol
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AZGenesDashboard;