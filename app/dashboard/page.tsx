'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Head from 'next/head';
import { useHederaWallet } from '../../context/HederaWalletContext';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/useAuth';
import { api } from '../../lib/apiClient';

// Types
interface DataItem {
  id: string;
  owner_id: string;
  file_name: string;
  file_type: string;
  storage_path: string;
  encryption_key: string;
  encryption_iv: string;
  hash: string;
  hedera_transaction_id: string;
  name: string;
  type: 'genetic' | 'health' | 'professional' | string;
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

interface SidebarItem {
  id: 'overview' | 'data' | 'tokens' | 'sharing' | 'nft' | 'analytics' | 'settings';
  name: string;
  icon: React.ReactNode;
}

// Icon components defined outside to prevent recreation on every render
const IconOverview = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);
const IconData = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
  </svg>
);
const IconTokens = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const IconSharing = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
  </svg>
);
const IconNFT = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
  </svg>
);
const IconAnalytics = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);
const IconSettings = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const AZGenesDashboard = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'data' | 'tokens' | 'sharing' | 'nft' | 'analytics' | 'settings'>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isPrivateDataUnlocked, setIsPrivateDataUnlocked] = useState(false);
  const [decryptedPrivateContent, setDecryptedPrivateContent] = useState<string | null>(null);

  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { isConnected: isWalletConnected, accountId, connectWallet, disconnectWallet } = useHederaWallet();

  // File Upload
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // Data Tab
  const [userData, setUserData] = useState<DataItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  // Tokens Tab
  const [tokenTransactions, setTokenTransactions] = useState<TokenTransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [transactionsError, setTransactionsError] = useState<string | null>(null);

  // Transfer Modal
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferRecipient, setTransferRecipient] = useState('');
  const [transferAmount, setTransferAmount] = useState<number | ''>(1);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [transferSuccess, setTransferSuccess] = useState<string | null>(null);

  // Sharing Tab
  const [sharedFiles, setSharedFiles] = useState<any[]>([]);
  const [pendingAccessRequests, setPendingAccessRequests] = useState<any[]>([]);
  const [loadingSharedFiles, setLoadingSharedFiles] = useState(false);
  const [loadingAccessRequests, setLoadingAccessRequests] = useState(false);
  const [sharedFilesError, setSharedFilesError] = useState<string | null>(null);
  const [accessRequestsError, setAccessRequestsError] = useState<string | null>(null);

  // Settings Tab
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Notifications
  const [notifications, setNotifications] = useState<Array<{ id: string; message: string; type: 'success' | 'info' | 'warning' | 'error'; timestamp: Date }>>([]);
  
  // Key Management
  const [encryptionKeys, setEncryptionKeys] = useState<any[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [keysError, setKeysError] = useState<string | null>(null);
  const [showKeyDetails, setShowKeyDetails] = useState<Record<string, boolean>>({});

  // Analytics Tab
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  // Auth Guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/sign-in');
    }
  }, [user, authLoading, router]);

  // Fetch User Profile on mount
  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      try {
        const response = await api.get('get-profile');
        if (!response.ok) throw new Error((await response.json()).error || 'Failed to fetch profile');
        const data = await response.json();
        setUserProfile(data);
        
        // Show welcome notification if this is first login
        const hasShownWelcome = sessionStorage.getItem('hasShownWelcome');
        if (!hasShownWelcome && data.name) {
          setNotifications(prev => [...prev, {
            id: Date.now().toString(),
            message: `Welcome to AZ-Genes, ${data.name}!`,
            type: 'success',
            timestamp: new Date()
          }]);
          sessionStorage.setItem('hasShownWelcome', 'true');
          
          // Auto-dismiss after 5 seconds
          setTimeout(() => {
            setNotifications(prev => prev.slice(1));
          }, 5000);
        }
      } catch (err: any) {
        console.error('Failed to fetch profile:', err);
      }
    };
    fetchProfile();
  }, [user]);

  // Auto-dismiss notifications after 5 seconds
  useEffect(() => {
    if (notifications.length === 0) return;
    const timer = setTimeout(() => {
      setNotifications(prev => prev.slice(1));
    }, 5000);
    return () => clearTimeout(timer);
  }, [notifications.length]);

  // Fetch User Data
  useEffect(() => {
    if (!user || activeTab !== 'data') return;
    const fetchUserData = async () => {
      setLoadingData(true);
      setDataError(null);
      try {
        const response = await api.get('files');
        if (!response.ok) throw new Error((await response.json()).error || 'Failed to fetch data');
        const data = await response.json();
        const formatted: DataItem[] = data.map((item: any) => ({
          ...item,
          name: item.file_name,
          type: item.file_type,
          date: new Date(item.createdAt || Date.now()).toLocaleDateString(),
          size: 'N/A',
          accessCount: 0,
          nftCertified: false,
          isPrivate: !!item.encryption_key,
          encrypted: !!item.encryption_key,
        }));
        setUserData(formatted);
      } catch (err: any) {
        setDataError(err.message);
      } finally {
        setLoadingData(false);
      }
    };
    fetchUserData();
  }, [activeTab, user]);

  // Fetch Token Transactions
  useEffect(() => {
    if (!user || activeTab !== 'tokens') return;
    const fetchTransactions = async () => {
      setLoadingTransactions(true);
      setTransactionsError(null);
      try {
        const response = await api.get('get-token-transactions');
        if (!response.ok) throw new Error((await response.json()).error || 'Failed to fetch transactions');
        const data = await response.json();
        const formatted: TokenTransaction[] = data.map((item: any) => {
          // Use the type from backend if available (it's already set correctly)
          const transactionType = item.type || (item.sender_id ? 'spent' : 'received');
          
          return {
            id: item.id,
            type: transactionType as 'earned' | 'spent' | 'received',
            amount: item.amount || 0,
            description: item.description || `Token ${transactionType}`,
            date: item.timestamp ? new Date(item.timestamp).toLocaleDateString() : new Date().toLocaleDateString(),
            fromTo: transactionType === 'spent' ? (item.recipient_id || 'Unknown') : (item.sender_id || 'System'),
          };
        });
        setTokenTransactions(formatted);
      } catch (err: any) {
        setTransactionsError(err.message);
      } finally {
        setLoadingTransactions(false);
      }
    };
    fetchTransactions();
  }, [activeTab, user]);

  // Fetch Profile and Keys
  useEffect(() => {
    if (!user || activeTab !== 'settings') return;
    const fetchProfile = async () => {
      setLoadingProfile(true);
      setProfileError(null);
      try {
        const response = await api.get('get-profile');
        if (!response.ok) throw new Error((await response.json()).error || 'Failed to fetch profile');
        const data = await response.json();
        setUserProfile(data);
      } catch (err: any) {
        setProfileError(err.message);
      } finally {
        setLoadingProfile(false);
      }
    };

    const fetchEncryptionKeys = async () => {
      setLoadingKeys(true);
      setKeysError(null);
      try {
        const response = await api.get('files');
        if (!response.ok) throw new Error((await response.json()).error || 'Failed to fetch files');
        const data = await response.json();
        // Extract unique encryption keys from user's files
        const keys = data
          .filter((file: any) => file.encryption_key && file.encryption_iv)
          .map((file: any) => ({
            file_id: file.id,
            file_name: file.file_name,
            key: file.encryption_key,
            iv: file.encryption_iv,
            created_at: file.created_at
          }));
        setEncryptionKeys(keys);
      } catch (err: any) {
        setKeysError(err.message);
      } finally {
        setLoadingKeys(false);
      }
    };

    fetchProfile();
    fetchEncryptionKeys();
  }, [activeTab, user]);

  // Fetch Analytics
  useEffect(() => {
    if (!user || activeTab !== 'analytics') return;
    const fetchAnalytics = async () => {
      setLoadingAnalytics(true);
      setAnalyticsError(null);
      try {
        const response = await api.get('get-analytics');
        if (!response.ok) throw new Error((await response.json()).error || 'Failed to fetch analytics');
        const { data } = await response.json();
        setAnalyticsData(data);
      } catch (err: any) {
        setAnalyticsError(err.message);
      } finally {
        setLoadingAnalytics(false);
      }
    };
    fetchAnalytics();
  }, [activeTab, user]);

  // Fetch Sharing Data
  useEffect(() => {
    if (!user || activeTab !== 'sharing') return;
    const fetchSharedFiles = async () => {
      setLoadingSharedFiles(true);
      setSharedFilesError(null);
      try {
        const response = await api.get('get-shared-files');
        if (!response.ok) throw new Error((await response.json()).error || 'Failed to fetch shared files');
        const data = await response.json();
        setSharedFiles(data);
      } catch (err: any) {
        setSharedFilesError(err.message);
      } finally {
        setLoadingSharedFiles(false);
      }
    };

    const fetchAccessRequests = async () => {
      setLoadingAccessRequests(true);
      setAccessRequestsError(null);
      try {
        const response = await api.get('get-access-requests');
        if (!response.ok) throw new Error((await response.json()).error || 'Failed to fetch access requests');
        const data = await response.json();
        setPendingAccessRequests(data);
      } catch (err: any) {
        setAccessRequestsError(err.message);
      } finally {
        setLoadingAccessRequests(false);
      }
    };

    fetchSharedFiles();
    fetchAccessRequests();
  }, [activeTab, user]);

  // File Upload Handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setUploadError('No file selected.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('upload-file', formData);

      if (!response.ok) throw new Error((await response.json()).error || 'Upload failed');
      const result = await response.json();
      setUploadSuccess(`File '${result.file_name}' uploaded successfully!`);
    } catch (err: any) {
      setUploadError(err.message);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  // Token Actions
  const handleBuyTokens = () => {
    const newTx: TokenTransaction = {
      id: Date.now().toString(),
      type: 'earned',
      amount: 100,
      description: 'Purchased tokens',
      date: new Date().toISOString().split('T')[0],
      fromTo: 'Payment Gateway',
    };
    setTokenTransactions(prev => [newTx, ...prev]);
  };

  const handleTransferTokens = () => {
    setIsTransferModalOpen(true);
    setTransferError(null);
    setTransferSuccess(null);
  };

  const handleConfirmTransfer = async () => {
    if (!transferRecipient || Number(transferAmount) <= 0) {
      setTransferError('Valid recipient and amount required.');
      return;
    }

    try {
      const response = await api.post('transfer-tokens', { recipientAccountId: transferRecipient, amount: transferAmount });

      if (!response.ok) throw new Error((await response.json()).error || 'Transfer failed');
      const result = await response.json();
      setTransferSuccess(`Transferred! Tx ID: ${result.transactionId}`);
      setIsTransferModalOpen(false);
      setTransferRecipient('');
      setTransferAmount(1);
    } catch (err: any) {
      setTransferError(err.message);
    }
  };

  // Unlock Private Data
  const handleUnlockPrivateData = async () => {
    if (!isWalletConnected) {
      connectWallet();
      return;
    }

    const file = userData.find(d => d.isPrivate);
    if (!file) {
      setProfileError('No private files found.');
      return;
    }

    try {
      const response = await api.get(`get-file?fileId=${file.id}`);
      if (!response.ok) throw new Error((await response.json()).error || 'Decryption failed');
      const content = await response.text();
      setDecryptedPrivateContent(content);
      setIsPrivateDataUnlocked(true);
    } catch (err: any) {
      setProfileError(err.message);
    }
  };

  const handleLockPrivateData = () => {
    setIsPrivateDataUnlocked(false);
    setDecryptedPrivateContent(null);
  };

  // Early returns AFTER all hooks
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        Loading authentication...
      </div>
    );
  }

  if (!user) return null;

  // Derived Data
  const privateData = userData.filter(d => d.isPrivate);
  const publicData = userData.filter(d => !d.isPrivate);
  // Calculate total tokens from transactions
  // Start with a default balance of 0 if no transactions exist
  const totalTokens = tokenTransactions.length > 0 
    ? tokenTransactions.reduce((sum, t) => {
        return t.type === 'earned' || t.type === 'received' ? sum + t.amount : sum - t.amount;
      }, 0)
    : 0;

  const stats = {
    totalData: '2.35 GB',
    nftCertified: userData.filter(d => d.nftCertified).length,
    totalTokens,
    activeShares: sharedFiles.length,
    dataRequests: pendingAccessRequests.length,
    privateFiles: privateData.length,
    encryptedFiles: userData.filter(d => d.encrypted).length,
  };

  // Define sidebar items with icons - using stable component references
  const sidebarItems: SidebarItem[] = [
    { id: 'overview', name: 'Overview', icon: <IconOverview /> },
    { id: 'data', name: 'My Data', icon: <IconData /> },
    { id: 'tokens', name: 'Token Wallet', icon: <IconTokens /> },
    { id: 'sharing', name: 'Data Sharing', icon: <IconSharing /> },
    { id: 'nft', name: 'NFT Certificates', icon: <IconNFT /> },
    { id: 'analytics', name: 'Analytics', icon: <IconAnalytics /> },
    { id: 'settings', name: 'Settings', icon: <IconSettings /> },
  ];

  return (
    <>
      <Head>
        <title>Dashboard - AZ-Genes</title>
        <meta name="description" content="AZ-Genes Dashboard - Manage your genetic data and tokens" />
      </Head>

      <div className="flex h-screen bg-gray-100">
        {/* Sidebar */}
        <div className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white shadow-lg transition-all duration-300`}>
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              {sidebarOpen && <h1 className="text-xl font-bold text-indigo-600">AZ-Genes</h1>}
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-lg hover:bg-gray-100">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>

          <nav className="mt-6">
            {sidebarItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center px-4 py-3 text-left transition-colors ${
                  activeTab === item.id
                    ? 'bg-indigo-50 text-indigo-600 border-r-2 border-indigo-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span className="mr-3 flex items-center shrink-0">{item.icon}</span>
                {sidebarOpen && <span className="font-medium">{item.name}</span>}
              </button>
            ))}
          </nav>

        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white shadow-sm z-10">
            <div className="flex items-center justify-between px-6 py-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 capitalize">
                  {activeTab === 'overview' ? 'Dashboard Overview' : activeTab.replace('-', ' ')}
                </h1>
                <p className="text-gray-600">
                  {userProfile?.name ? `Welcome back, ${userProfile.name}` : user?.email ? `Welcome back, ${user.email}` : 'Welcome back'}
                </p>
              </div>
              <div className="flex items-center space-x-4">
                {isWalletConnected && accountId ? (
                  <div className="flex items-center space-x-2 bg-green-50 px-4 py-2 rounded-lg border border-green-200">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <div className="flex flex-col">
                      <span className="text-xs text-green-600 font-medium">Wallet Connected</span>
                      <span className="text-xs text-green-700 font-mono">{accountId.toString()}</span>
                    </div>
                    <button
                      onClick={disconnectWallet}
                      className="text-xs text-green-600 hover:text-green-700 ml-2"
                    >
                      Disconnect
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={connectWallet}
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
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">3</span>
                  </button>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {userProfile?.name || user?.displayName || user?.email?.split('@')[0] || 'User'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {userProfile?.subscription_tier || 'Free Tier'}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {(userProfile?.name || user?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
                  </div>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-6">
            {/* Private Data Access Panel */}
            {privateData.length > 0 && activeTab === 'data' && (
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
                      {isPrivateDataUnlocked && decryptedPrivateContent && (
                        <div className="mt-4 p-4 bg-white bg-opacity-30 rounded-lg text-sm font-mono overflow-x-auto">
                          <p className="font-semibold mb-2">Decrypted Content Preview:</p>
                          <pre className="whitespace-pre-wrap">{decryptedPrivateContent}</pre>
                        </div>
                      )}
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
            )}

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <p className="text-sm text-gray-600">Total Data</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalData}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <p className="text-sm text-gray-600">NFT Certified</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.nftCertified}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <p className="text-sm text-gray-600">Total Tokens</p>
                  <p className="text-2xl font-bold text-indigo-600">{stats.totalTokens}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <p className="text-sm text-gray-600">Active Shares</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.activeShares}</p>
                </div>
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
                      {isUploading && <span className="text-indigo-600 text-sm">Uploading...</span>}
                      {uploadError && <span className="text-red-500 text-sm">Error: {uploadError}</span>}
                      {uploadSuccess && <span className="text-green-500 text-sm">{uploadSuccess}</span>}
                      <input type="file" id="file-upload" className="hidden" onChange={handleFileChange} />
                      <button
                        onClick={() => document.getElementById('file-upload')?.click()}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                        disabled={isUploading}
                      >
                        Upload New Data
                      </button>
                    </div>
                  </div>
                </div>

                {loadingData ? (
                  <div className="p-6 text-center text-gray-500">Loading data...</div>
                ) : dataError ? (
                  <div className="p-6 text-center text-red-500">Error: {dataError}</div>
                ) : userData.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">No data found. Upload some new data!</div>
                ) : (
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
                        {[...publicData, ...privateData].map(item => (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <span className="text-lg mr-3">
                                  {item.type.includes('genetic') ? 'DNA' : item.type.includes('health') ? 'Hospital' : 'Document'}
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
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Certified</span>
                              ) : (
                                <button className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">Get Certified</button>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              {item.isPrivate && !isPrivateDataUnlocked ? (
                                <button onClick={handleUnlockPrivateData} className="text-purple-600 hover:text-purple-700 font-medium flex items-center">
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
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'tokens' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Token Balance</h3>
                    <div className="text-center py-8">
                      <div className="text-4xl font-bold text-indigo-600 mb-2">{stats.totalTokens}</div>
                      <p className="text-gray-600">Utility Tokens</p>
                      <div className="mt-6 space-y-3">
                        <button onClick={handleBuyTokens} className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition-colors">
                          Buy Tokens
                        </button>
                        <button onClick={handleTransferTokens} className="w-full border border-indigo-600 text-indigo-600 py-2 rounded-lg hover:bg-indigo-50 transition-colors">
                          Transfer Tokens
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="lg:col-span-2">
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Transaction History</h3>
                    {transferError && <div className="text-red-500 text-sm mb-4">Error: {transferError}</div>}
                    {transferSuccess && <div className="text-green-500 text-sm mb-4">{transferSuccess}</div>}
                    {loadingTransactions ? (
                      <div className="text-center text-gray-500">Loading transactions...</div>
                    ) : transactionsError ? (
                      <div className="text-center text-red-500">Error: {transactionsError}</div>
                    ) : tokenTransactions.length === 0 ? (
                      <div className="text-center text-gray-500">No transactions yet.</div>
                    ) : (
                      <div className="space-y-4">
                        {tokenTransactions.map(tx => (
                          <div key={tx.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                            <div className="flex items-center space-x-4">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                tx.type === 'earned' ? 'bg-green-100' : tx.type === 'spent' ? 'bg-red-100' : 'bg-blue-100'
                              }`}>
                                <span className={`text-lg ${tx.type === 'earned' ? 'text-green-600' : tx.type === 'spent' ? 'text-red-600' : 'text-blue-600'}`}>
                                  {tx.type === 'earned' ? 'Up' : tx.type === 'spent' ? 'Down' : 'LeftRight'}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{tx.description}</p>
                                <p className="text-sm text-gray-600">{tx.fromTo}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`font-bold ${tx.type === 'earned' ? 'text-green-600' : tx.type === 'spent' ? 'text-red-600' : 'text-blue-600'}`}>
                                {tx.type === 'earned' ? '+' : tx.type === 'spent' ? '-' : ''}{tx.amount} tokens
                              </p>
                              <p className="text-sm text-gray-600">{tx.date}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'sharing' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Data Sharing Management</h2>
                <div className="space-y-8">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Files Shared by Me</h3>
                    {loadingSharedFiles ? (
                      <p className="text-gray-500">Loading...</p>
                    ) : sharedFilesError ? (
                      <p className="text-red-500">Error: {sharedFilesError}</p>
                    ) : sharedFiles.length === 0 ? (
                      <p className="text-gray-600">No shared files.</p>
                    ) : (
                      <ul className="divide-y divide-gray-200">
                        {sharedFiles.map(file => (
                          <li key={file.id} className="py-3 flex justify-between items-center">
                            <div>
                              <p className="font-medium text-gray-900">{file.file_name}</p>
                              <p className="text-sm text-gray-500">Shared with: {file.grantee_id}</p>
                            </div>
                            <span className="text-sm text-gray-500">Expires: {new Date(file.expires_at).toLocaleDateString()}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Access Requests</h3>
                    {loadingAccessRequests ? (
                      <p className="text-gray-500">Loading...</p>
                    ) : accessRequestsError ? (
                      <p className="text-red-500">Error: {accessRequestsError}</p>
                    ) : pendingAccessRequests.length === 0 ? (
                      <p className="text-gray-600">No pending requests.</p>
                    ) : (
                      <ul className="divide-y divide-gray-200">
                        {pendingAccessRequests.map(req => (
                          <li key={req.id} className="py-3 flex justify-between items-center">
                            <div>
                              <p className="font-medium text-gray-900">Request for {req.file_name}</p>
                              <p className="text-sm text-gray-500">From: {req.owner_id}</p>
                            </div>
                            <div className="flex space-x-2">
                              <button className="px-3 py-1 bg-green-500 text-white rounded-md text-sm">Approve</button>
                              <button className="px-3 py-1 bg-red-500 text-white rounded-md text-sm">Reject</button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Profile Settings</h2>
                  {loadingProfile ? (
                    <p className="text-center text-gray-500">Loading profile...</p>
                  ) : profileError ? (
                    <p className="text-center text-red-500">Error: {profileError}</p>
                  ) : userProfile ? (
                    <div className="space-y-4">
                      <div>
                        <p className="text-gray-700">Name: <span className="font-semibold">{userProfile.name || 'N/A'}</span></p>
                      </div>
                      <div>
                        <p className="text-gray-700">Email: <span className="font-semibold">{userProfile.email || 'N/A'}</span></p>
                      </div>
                      <div>
                        <p className="text-gray-700">Role: <span className="font-semibold">{userProfile.role || 'N/A'}</span></p>
                      </div>
                      <div>
                        <p className="text-gray-700">Subscription Tier: <span className="font-semibold text-indigo-600">{userProfile.subscription_tier || 'N/A'}</span></p>
                      </div>
                      <button className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
                        Edit Profile
                      </button>
                    </div>
                  ) : (
                    <p className="text-center text-gray-500">No profile data.</p>
                  )}
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Encryption Key Management</h2>
                  {loadingKeys ? (
                    <p className="text-center text-gray-500">Loading keys...</p>
                  ) : keysError ? (
                    <p className="text-center text-red-500">Error: {keysError}</p>
                  ) : encryptionKeys.length === 0 ? (
                    <p className="text-center text-gray-500">No encryption keys found. Upload files to generate keys.</p>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm text-gray-600 mb-4">
                        Your encryption keys are automatically generated for each file. Store them securely to decrypt your data.
                      </p>
                      <div className="space-y-3">
                        {encryptionKeys.map((key, index) => (
                          <div key={key.file_id} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="font-semibold text-gray-900">{key.file_name}</p>
                                <p className="text-sm text-gray-500">Created: {new Date(key.created_at || Date.now()).toLocaleDateString()}</p>
                              </div>
                              <button
                                onClick={() => setShowKeyDetails({ ...showKeyDetails, [key.file_id]: !showKeyDetails[key.file_id] })}
                                className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                              >
                                {showKeyDetails[key.file_id] ? 'Hide' : 'Show'} Details
                              </button>
                            </div>
                            {showKeyDetails[key.file_id] && (
                              <div className="mt-4 space-y-2 pt-4 border-t border-gray-200">
                                <div>
                                  <p className="text-xs font-semibold text-gray-700 mb-1">Encryption Key:</p>
                                  <p className="text-xs font-mono bg-gray-50 p-2 rounded border border-gray-200 break-all">{key.key}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-gray-700 mb-1">Initialization Vector (IV):</p>
                                  <p className="text-xs font-mono bg-gray-50 p-2 rounded border border-gray-200 break-all">{key.iv}</p>
                                </div>
                                <div className="flex space-x-2 mt-3">
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(key.key);
                                      alert('Encryption key copied to clipboard!');
                                    }}
                                    className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded hover:bg-gray-200"
                                  >
                                    Copy Key
                                  </button>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(key.iv);
                                      alert('IV copied to clipboard!');
                                    }}
                                    className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded hover:bg-gray-200"
                                  >
                                    Copy IV
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                        <p className="text-sm text-yellow-800">
                          <strong>⚠️ Security Notice:</strong> These keys are used to decrypt your files. Keep them secure and never share them with unauthorized parties.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Notification Toast Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map(notification => (
          <div
            key={notification.id}
            className={`p-4 rounded-lg shadow-lg max-w-sm animate-in slide-in-from-top duration-300 ${
              notification.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' :
              notification.type === 'error' ? 'bg-red-50 border border-red-200 text-red-800' :
              notification.type === 'warning' ? 'bg-yellow-50 border border-yellow-200 text-yellow-800' :
              'bg-blue-50 border border-blue-200 text-blue-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="font-medium">{notification.message}</p>
              <button
                onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
                className="ml-4 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>


      {/* Transfer Modal */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-xl font-bold text-gray-900">Transfer Tokens</h3>
            {transferError && <p className="text-red-500 text-sm">Error: {transferError}</p>}
            {transferSuccess && <p className="text-green-500 text-sm">{transferSuccess}</p>}
            <div>
              <label htmlFor="recipient" className="block text-sm font-medium text-gray-700">Recipient Account ID</label>
              <input
                type="text"
                id="recipient"
                value={transferRecipient}
                onChange={e => setTransferRecipient(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="0.0.12345"
              />
            </div>
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Amount</label>
              <input
                type="number"
                id="amount"
                value={transferAmount}
                onChange={e => setTransferAmount(parseFloat(e.target.value) || '')}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                min="1"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setIsTransferModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmTransfer}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
              >
                Confirm Transfer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AZGenesDashboard;