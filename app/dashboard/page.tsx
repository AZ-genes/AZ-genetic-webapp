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
}

const AZGenesDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { isConnected: isWalletConnected, accountId, connectWallet, disconnectWallet } = useHederaWallet();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isPrivateDataUnlocked, setIsPrivateDataUnlocked] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
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
    try {
      await connectWallet();
      // Note: The wallet connection state will update via the context
      // We'll show a success message when the connection is established
      // The modal will close automatically if connection is successful
    } catch (error) {
      console.error('Error connecting wallet:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect wallet';
      toast.error(errorMessage.includes('project ID') ? 'Wallet Connect not configured. Please set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID' : 'Failed to connect wallet');
    }
  };
  
  // Monitor wallet connection status to provide feedback
  useEffect(() => {
    if (isWalletConnected && accountId) {
      toast.success('Wallet connected successfully!');
    setShowConnectModal(false);
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Connect Your Wallet</h3>
          <p className="text-gray-600 mb-6">
            Connect your Hedera wallet to access private genetic data and manage your NFT certificates.
          </p>
          <div className="space-y-3">
            <button
              onClick={handleConnectWallet}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
            >
              Connect Hedera Wallet
            </button>
            <button
              onClick={() => setShowConnectModal(false)}
              className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-4">
            By connecting, you agree to our terms of service and privacy policy
          </p>
        </div>
      </div>
    </div>
  );

  const PrivateDataAccessPanel = () => (
    <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-xl p-6 text-white mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold">
              {isPrivateDataUnlocked ? 'Private Data Access Granted' : 'Secure Private Data Access'}
            </h3>
            <p className="text-purple-100">
              {isPrivateDataUnlocked 
                ? 'Your private genetic data is now accessible. Remember to lock when done.' 
                : 'Connect your wallet and unlock to view sensitive genetic information.'}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {isWalletConnected && (
            <div className="flex items-center space-x-2 bg-white bg-opacity-20 px-3 py-2 rounded-lg">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-sm">Wallet Connected</span>
            </div>
          )}
          {!isPrivateDataUnlocked ? (
            <button
              onClick={handleUnlockPrivateData}
              className="bg-white text-purple-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Unlock Private Data</span>
            </button>
          ) : (
            <button
              onClick={handleLockPrivateData}
              className="bg-red-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-600 transition-colors flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Lock Private Data</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const DataItemRow = ({ item }: { item: DataItem }) => (
    <tr key={item.id} className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <span className="text-lg mr-3">
            {item.type === 'genetic' ? '🧬' : item.type === 'health' ? '🏥' : '📄'}
          </span>
          <div>
            <div className="text-sm font-medium text-gray-900 flex items-center">
              {item.name}
              {item.isPrivate && (
                <span className="ml-2 bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Private
                </span>
              )}
            </div>
            <div className="text-sm text-gray-500">{item.accessCount} accesses</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
          {item.type}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.date}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.size}</td>
      <td className="px-6 py-4 whitespace-nowrap">
        {item.nftCertified ? (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Certified
          </span>
        ) : (
          <button 
            onClick={() => handleMintNFT(item.id)}
            className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
          >
            Get Certified
          </button>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
        {item.isPrivate && !isPrivateDataUnlocked ? (
          <button
            onClick={handleUnlockPrivateData}
            className="text-purple-600 hover:text-purple-700 font-medium flex items-center"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Unlock to View
          </button>
        ) : (
          <>
            <button className="text-indigo-600 hover:text-indigo-900 mr-3">Share</button>
            <button className="text-gray-600 hover:text-gray-900">View</button>
          </>
        )}
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
        <title>Dashboard - AZ-Genes</title>
        <meta name="description" content="AZ-Genes Dashboard - Manage your genetic data and tokens" />
      </Head>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
        accept=".vcf,.csv,.txt,.tsv,.23andme,.txt,.pdf"
      />

      <div className="flex h-screen bg-gray-100">
        {/* Sidebar */}
        <div className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white shadow-lg transition-all duration-300`}>
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              {sidebarOpen && (
                <h1 className="text-xl font-bold text-indigo-600">AZ-Genes</h1>
              )}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>

          <nav className="mt-6">
            {[
              { id: 'overview', name: 'Overview', icon: '📊' },
              { id: 'data', name: 'My Data', icon: '🧬' },
              { id: 'tokens', name: 'Token Wallet', icon: '🪙' },
              { id: 'sharing', name: 'Data Sharing', icon: '🔗' },
              { id: 'nft', name: 'NFT Certificates', icon: '🎫' },
              { id: 'analytics', name: 'Analytics', icon: '📈' },
              { id: 'settings', name: 'Settings', icon: '⚙️' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center px-4 py-3 text-left transition-colors duration-200 ${
                  activeTab === item.id
                    ? 'bg-indigo-50 text-indigo-600 border-r-2 border-indigo-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span className="text-lg mr-3">{item.icon}</span>
                {sidebarOpen && <span className="font-medium">{item.name}</span>}
              </button>
            ))}
          </nav>

          {/* Wallet Connection Status */}
          {sidebarOpen && (
            <div className="absolute bottom-4 left-4 right-4">
              <div className={`p-4 rounded-lg ${
                isWalletConnected ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      isWalletConnected ? 'bg-green-500' : 'bg-yellow-500'
                    }`}></div>
                    <span className={`text-sm font-medium ${
                      isWalletConnected ? 'text-green-800' : 'text-yellow-800'
                    }`}>
                      {isWalletConnected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                  <button
                    onClick={isWalletConnected ? handleDisconnectWallet : () => setShowConnectModal(true)}
                    className={`text-xs ${
                      isWalletConnected ? 'text-green-600 hover:text-green-700' : 'text-yellow-600 hover:text-yellow-700'
                    }`}
                  >
                    {isWalletConnected ? 'Disconnect' : 'Connect'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="bg-white shadow-sm z-10">
            <div className="flex items-center justify-between px-6 py-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 capitalize">
                  {activeTab === 'overview' ? 'Dashboard Overview' : activeTab.replace('-', ' ')}
                </h1>
                <p className="text-gray-600">
                  Welcome back{userProfile?.name ? `, ${userProfile.name}` : ''}
                </p>
              </div>
              
              <div className="flex items-center space-x-4">
                {/* Wallet Connection Status */}
                {isWalletConnected && accountId && (
                  <div className="flex items-center space-x-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-green-800">
                      {accountId.toString()}
                    </span>
                    <button
                      onClick={handleDisconnectWallet}
                      className="text-green-600 hover:text-green-700 ml-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
                
                {!isWalletConnected && (
                  <button
                    onClick={() => setShowConnectModal(true)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-colors flex items-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span>Connect Wallet</span>
                  </button>
                )}
                
                <div className="relative">
                  <button className="p-2 bg-indigo-50 rounded-lg hover:bg-indigo-100">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      3
                    </span>
                  </button>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {userProfile?.name || user?.email || 'User'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {userProfile?.subscription_tier || 'Member'}
                    </p>
                  </div>
                  <div className="relative profile-dropdown">
                    <button
                      onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                      className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-semibold hover:bg-indigo-700 transition-colors"
                    >
                      {getUserInitials(userProfile?.name, userProfile?.email || user?.email || undefined)}
                    </button>
                    {showProfileDropdown && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                        <button
                          onClick={handleLogout}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          <span>Log Out</span>
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
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Data Stored</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.totalData}</p>
                      </div>
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <span className="text-2xl">🧬</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Private Files</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.privateFiles}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {isPrivateDataUnlocked ? 'Unlocked' : 'Locked'}
                        </p>
                      </div>
                      <div className="p-3 bg-purple-50 rounded-lg">
                        <span className="text-2xl">🔒</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Utility Tokens</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.totalTokens}</p>
                      </div>
                      <div className="p-3 bg-yellow-50 rounded-lg">
                        <span className="text-2xl">🪙</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">NFT Certified</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.nftCertified}</p>
                      </div>
                      <div className="p-3 bg-green-50 rounded-lg">
                        <span className="text-2xl">🎫</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Rest of overview content remains the same */}
                {/* ... */}
              </div>
            )}

            {activeTab === 'data' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900">My Genetic Data</h2>
                    <div className="flex items-center space-x-3">
                      {privateData.length > 0 && (
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                          <span>{privateData.length} private files</span>
                        </div>
                      )}
                      <button 
                        onClick={handleUploadClick}
                        disabled={isUploading}
                        className={`bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors ${
                          isUploading ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        {isUploading ? 'Uploading...' : 'Upload New Data'}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NFT Certified</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
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
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Token Balance</h3>
                    <div className="text-center py-8">
                      <div className="text-4xl font-bold text-indigo-600 mb-2">{tokenBalance}</div>
                      <p className="text-gray-600">Utility Tokens</p>
                      <div className="mt-6 space-y-3">
                        <button 
                          onClick={() => setShowBuyTokensModal(true)}
                          className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                          Buy Tokens
                        </button>
                        <button 
                          onClick={() => setShowTransferTokensModal(true)}
                          className="w-full border border-indigo-600 text-indigo-600 py-2 rounded-lg hover:bg-indigo-50 transition-colors"
                        >
                          Transfer Tokens
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="lg:col-span-2">
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Transaction History</h3>
                    {loadingTokenTransactions ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                      </div>
                    ) : tokenTransactions.length > 0 ? (
                    <div className="space-y-4">
                      {tokenTransactions.map((transaction) => (
                        <div key={transaction.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                          <div className="flex items-center space-x-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                transaction.type === 'received' ? 'bg-green-100' :
                              transaction.type === 'spent' ? 'bg-red-100' : 'bg-blue-100'
                            }`}>
                              <span className={`text-lg ${
                                  transaction.type === 'received' ? 'text-green-600' :
                                transaction.type === 'spent' ? 'text-red-600' : 'text-blue-600'
                              }`}>
                                  {transaction.type === 'received' ? '↑' : transaction.type === 'spent' ? '↓' : '↔'}
                              </span>
                            </div>
                            <div>
                                <p className="font-medium text-gray-900">
                                  {transaction.type === 'received' ? 'Tokens Received' : 'Tokens Transferred'}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {transaction.type === 'received' ? transaction.sender_id : transaction.recipient_id}
                                </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold ${
                                transaction.type === 'received' ? 'text-green-600' :
                              transaction.type === 'spent' ? 'text-red-600' : 'text-blue-600'
                            }`}>
                                {transaction.type === 'received' ? '+' : '-'}
                              {transaction.amount} tokens
                            </p>
                              <p className="text-sm text-gray-600">
                                {transaction.timestamp ? new Date(transaction.timestamp).toLocaleDateString() : 'N/A'}
                              </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    ) : (
                      <p className="text-gray-600 text-center py-12">No transactions yet</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Data Sharing Tab */}
            {activeTab === 'sharing' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Data Sharing Management</h2>
                {loadingAccessRequests ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                  </div>
                ) : accessRequests.length > 0 ? (
                  <div className="space-y-4">
                    {accessRequests.map((request) => (
                      <div key={request.id} className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition-colors">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-gray-900">{request.file_name}</h3>
                            <p className="text-sm text-gray-600">
                              Access Level: <span className="font-medium capitalize">{request.access_level}</span>
                            </p>
                            <p className="text-sm text-gray-600">
                              Requested: {new Date(request.request_date).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center space-x-3">
                            <button 
                              onClick={() => handleApproveRequest(request.id)}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                              Approve
                            </button>
                            <button 
                              onClick={() => handleDenyRequest(request.id)}
                              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                              Deny
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 text-center py-12">No pending access requests</p>
                )}
              </div>
            )}

            {/* NFT Certificates Tab */}
            {activeTab === 'nft' && (
              <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">NFT Certificates</h2>
                  {loadingNFTs ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                    </div>
                  ) : nftCertificates.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {nftCertificates.map((nft) => (
                        <div key={nft.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                          <div className="flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-lg mb-4 mx-auto">
                            <span className="text-3xl">🎫</span>
                          </div>
                          <h3 className="font-semibold text-gray-900 mb-2 text-center">{nft.file_name}</h3>
                          <div className="space-y-2 text-sm text-gray-600">
                            <p>Token ID: {nft.token_id.substring(0, 20)}...</p>
                            <p>Serial: {nft.serial_number}</p>
                            <p>Created: {new Date(nft.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-600 text-center py-12">No NFT certificates yet. Mint one from your files!</p>
                  )}
                </div>
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Analytics Dashboard</h2>
                  {userProfile?.subscription_tier === 'F3' ? (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">📊</div>
                      <p className="text-gray-600 mb-4">Analytics dashboard is available for F3 tier users.</p>
                      <p className="text-sm text-gray-500">Contact us to upgrade to F3 tier for advanced analytics features.</p>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">🔒</div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">Upgrade Required</h3>
                      <p className="text-gray-600 mb-6">Analytics dashboard is only available for F3 tier subscribers.</p>
                      <button 
                        onClick={() => handleTierChange('F3')}
                        className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                      >
                        Upgrade to F3
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Settings</h2>
                  <div className="space-y-6">
                    {/* Profile Settings */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                          <input
                            type="text"
                            defaultValue={userProfile?.name || ''}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            onChange={(e) => setEditingProfile({ ...editingProfile || userProfile, name: e.target.value } as UserProfile)}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                          <input
                            type="email"
                            defaultValue={userProfile?.email || user?.email || ''}
                            disabled
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                          />
                          <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                        </div>
                      </div>
                    </div>

                    {/* Subscription Tier */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Subscription Tier</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {['F1', 'F2', 'F3'].map((tier) => (
                          <div
                            key={tier}
                            onClick={() => handleTierChange(tier as 'F1' | 'F2' | 'F3')}
                            className={`border-2 rounded-xl p-6 cursor-pointer transition-colors ${
                              userProfile?.subscription_tier === tier
                                ? 'border-indigo-600 bg-indigo-50'
                                : 'border-gray-200 hover:border-indigo-300'
                            }`}
                          >
                            <div className="text-center">
                              <div className={`text-3xl font-bold mb-2 ${userProfile?.subscription_tier === tier ? 'text-indigo-600' : 'text-gray-600'}`}>
                                {tier}
                              </div>
                              <p className="text-sm text-gray-600">
                                {tier === 'F1' && 'Basic Access'}
                                {tier === 'F2' && 'Advanced Features'}
                                {tier === 'F3' && 'Professional Plan'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Save Button */}
                    <button
                      onClick={() => editingProfile && handleUpdateProfile(editingProfile)}
                      className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                    >
                      Save Changes
                    </button>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Buy Tokens</h3>
              <p className="text-gray-600">Purchase utility tokens for your genetic data platform</p>
            </div>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input
                  type="number"
                  placeholder="Enter amount"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <p className="text-sm text-gray-600">1 Token = $0.10 USD</p>
              </div>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => {
                  const amount = 100;
                  handleBuyTokens(amount);
                }}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
              >
                Purchase 100 Tokens ($10)
              </button>
              <button
                onClick={() => setShowBuyTokensModal(false)}
                className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Tokens Modal */}
      {showTransferTokensModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Transfer Tokens</h3>
              <p className="text-gray-600">Send tokens to another user</p>
            </div>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Account ID</label>
                <input
                  type="text"
                  id="transfer-recipient"
                  placeholder="Enter recipient account ID"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input
                  type="number"
                  id="transfer-amount"
                  placeholder="Enter amount"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => {
                  const recipientId = (document.getElementById('transfer-recipient') as HTMLInputElement)?.value;
                  const amount = Number((document.getElementById('transfer-amount') as HTMLInputElement)?.value);
                  if (recipientId && amount > 0) {
                    handleTransferTokens(recipientId, amount);
                  } else {
                    toast.error('Please enter valid recipient ID and amount');
                  }
                }}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
              >
                Transfer Tokens
              </button>
              <button
                onClick={() => setShowTransferTokensModal(false)}
                className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AZGenesDashboard;