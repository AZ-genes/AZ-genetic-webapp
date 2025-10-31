'use client';
import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useHederaWallet } from '../../context/HederaWalletContext';
import { AccountId } from '@hashgraph/sdk';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/useAuth';



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
  // Frontend specific fields, will need to be derived or added to backend if needed
  name: string; // Mapped from file_name
  type: 'genetic' | 'health' | 'professional' | string; // Mapped from file_type
  date: string; // Placeholder for now, could be creation date from storage
  size: string; // Placeholder for now, could be from storage metadata
  accessCount: number; // Placeholder for now, would need a backend counter
  nftCertified: boolean; // Placeholder for now, would need backend logic
  isPrivate: boolean; // Placeholder for now, could be derived from encryption status or a flag
  encrypted: boolean; // Derived from encryption_key existence
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
  icon: string;
}

const AZGenesDashboard = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'data' | 'tokens' | 'sharing' | 'nft' | 'analytics' | 'settings'>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isPrivateDataUnlocked, setIsPrivateDataUnlocked] = useState(false);
  const [decryptedPrivateContent, setDecryptedPrivateContent] = useState<string | null>(null);

  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/sign-in');
    }
  }, [user, loading, router]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen bg-gray-100">Loading authentication...</div>;
  }

  if (!user) {
    return null; // Or a more explicit message/spinner while redirecting
  }

  const { isConnected: isWalletConnected, accountId, connectWallet, disconnectWallet } = useHederaWallet();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  const [userProfile, setUserProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [userData, setUserData] = useState<DataItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === 'settings') {
      const fetchUserProfile = async () => {
        setLoadingProfile(true);
        setProfileError(null);
        try {
          const response = await fetch('/api/get-profile');
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch user profile.');
          }
          const result = await response.json();
          setUserProfile(result);
        } catch (error: any) {
          setProfileError(error.message);
        } finally {
          setLoadingProfile(false);
        }
      };
      fetchUserProfile();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'analytics') {
      const fetchAnalyticsData = async () => {
        setLoadingAnalytics(true);
        setAnalyticsError(null);
        try {
          const response = await fetch('/api/get-analytics');
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch analytics data.');
          }
          const result = await response.json();
          setAnalyticsData(result.data);
        } catch (error: any) {
          setAnalyticsError(error.message);
        } finally {
          setLoadingAnalytics(false);
        }
      };
      fetchAnalyticsData();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'data') {
      const fetchUserData = async () => {
        setLoadingData(true);
        setDataError(null);
        try {
          const response = await fetch('/api/files'); // Assuming /api/files returns all user files
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch user data.');
          }
          const data: any[] = await response.json();
          const formattedData: DataItem[] = data.map(item => ({
            ...item,
            name: item.file_name,
            type: item.file_type, // Assuming file_type can be mapped directly to frontend type
            date: new Date(item.createdAt || Date.now()).toLocaleDateString(), // Assuming createdAt from backend or current date
            size: 'N/A', // Placeholder, would need to fetch from storage metadata
            accessCount: 0, // Placeholder, would need backend counter
            nftCertified: false, // Placeholder, would need backend logic
            isPrivate: !!item.encryption_key, // Derived from existence of encryption key
            encrypted: !!item.encryption_key, // Derived from existence of encryption key
          }));
          setUserData(formattedData);
        } catch (error: any) {
          setDataError(error.message);
        } finally {
          setLoadingData(false);
        }
      };
      fetchUserData();
    }
  }, [activeTab]);

  const privateData = userData.filter(item => item.isPrivate);
  const publicData = userData.filter(item => !item.isPrivate);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
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
      const response = await fetch('/api/upload-file', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'File upload failed.');
      }

      const result = await response.json();
      setUploadSuccess(`File '${result.file_name}' uploaded successfully!`);
      // Optionally, refresh data or add the new file to the list
    } catch (error: any) {
      setUploadError(error.message);
    } finally {
      setIsUploading(false);
      // Clear the file input
      event.target.value = '';
    }
  };


  const [tokenTransactions, setTokenTransactions] = useState<TokenTransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [transactionsError, setTransactionsError] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === 'tokens') {
      const fetchTokenTransactions = async () => {
        setLoadingTransactions(true);
        setTransactionsError(null);
        try {
          const response = await fetch('/api/get-token-transactions');
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch token transactions.');
          }
          const data: any[] = await response.json();
          const formattedTransactions: TokenTransaction[] = data.map(item => ({
            id: item.id,
            type: item.sender_id === user?.uid ? 'spent' : (item.recipient_id === user?.uid ? 'received' : 'earned'),
            amount: item.amount,
            description: item.description || (item.sender_id === user?.uid ? `Sent to ${item.recipient_id}` : `Received from ${item.sender_id}`),
            date: new Date(item.timestamp).toLocaleDateString(),
            fromTo: item.sender_id === user?.uid ? item.recipient_id : item.sender_id,
          }));
          setTokenTransactions(formattedTransactions);
        } catch (error: any) {
          setTransactionsError(error.message);
        } finally {
          setLoadingTransactions(false);
        }
      };
      fetchTokenTransactions();
    }
  }, [activeTab]);

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferRecipient, setTransferRecipient] = useState('');
  const [transferAmount, setTransferAmount] = useState<number | ''>(1);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [transferSuccess, setTransferSuccess] = useState<string | null>(null);

  const handleBuyTokens = () => {
    const newTransaction: TokenTransaction = {
      id: String(tokenTransactions.length + 1),
      type: 'earned',
      amount: 100, // Simulate buying 100 tokens
      description: 'Purchased tokens',
      date: new Date().toISOString().split('T')[0],
      fromTo: 'Payment Gateway',
    };
    setTokenTransactions(prev => [newTransaction, ...prev]);
  };

  const handleTransferTokens = () => {
    setIsTransferModalOpen(true);
    setTransferError(null);
    setTransferSuccess(null);
  };

  const handleCloseTransferModal = () => {
    setIsTransferModalOpen(false);
    setTransferRecipient('');
    setTransferAmount(1);
  };

  const handleConfirmTransfer = async () => {
    if (!transferRecipient || typeof transferAmount !== 'number' || transferAmount <= 0) {
      setTransferError('Please enter a valid recipient and amount.');
      return;
    }

    setTransferError(null);
    setTransferSuccess(null);

    try {
      const response = await fetch('/api/transfer-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientAccountId: transferRecipient,
          amount: transferAmount,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Token transfer failed.');
      }

      const result = await response.json();
      setTransferSuccess(`Tokens transferred successfully! Transaction ID: ${result.transactionId}`);
      
      // Refresh token transactions after successful transfer
      // This will trigger the useEffect to refetch data
      setTokenTransactions([]); // Clear to force refetch

      handleCloseTransferModal();
    } catch (error: any) {
      setTransferError(error.message);
    }
  };

  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([
    { id: '1', requester: 'Genomics Research Corp', dataType: 'Genetic Data', requestDate: '2024-01-14', status: 'pending', purpose: 'Medical Research' },
    { id: '2', requester: 'Dr. Johnson Clinic', dataType: 'Health Records', requestDate: '2024-01-12', status: 'approved', purpose: 'Treatment Planning' },
    { id: '3', requester: 'Family Member - John Doe', dataType: 'Family History', requestDate: '2024-01-10', status: 'approved', purpose: 'Family Health Awareness' },
  ]);

  const [sharedFiles, setSharedFiles] = useState<any[]>([]);
  const [loadingSharedFiles, setLoadingSharedFiles] = useState(false);
  const [sharedFilesError, setSharedFilesError] = useState<string | null>(null);

  const [pendingAccessRequests, setPendingAccessRequests] = useState<any[]>([]);
  const [loadingAccessRequests, setLoadingAccessRequests] = useState(false);
  const [accessRequestsError, setAccessRequestsError] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === 'sharing') {
      const fetchSharedFiles = async () => {
        setLoadingSharedFiles(true);
        setSharedFilesError(null);
        try {
          const response = await fetch('/api/get-shared-files');
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch shared files.');
          }
          const data = await response.json();
          setSharedFiles(data);
        } catch (error: any) {
          setSharedFilesError(error.message);
        } finally {
          setLoadingSharedFiles(false);
        }
      };

      const fetchAccessRequests = async () => {
        setLoadingAccessRequests(true);
        setAccessRequestsError(null);
        try {
          const response = await fetch('/api/get-access-requests');
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch access requests.');
          }
          const data = await response.json();
          setPendingAccessRequests(data);
        } catch (error: any) {
          setAccessRequestsError(error.message);
        } finally {
          setLoadingAccessRequests(false);
        }
      };

      fetchSharedFiles();
      fetchAccessRequests();
    }
  }, [activeTab]);

  const stats = {
    totalData: '2.35 GB',
    nftCertified: 3,
    totalTokens: tokenTransactions.reduce((sum, t) => sum + (t.type === 'earned' || t.type === 'received' ? t.amount : -t.amount), 0),
    activeShares: sharedFiles.length,
    dataRequests: pendingAccessRequests.length,
    privateFiles: privateData.length,
    encryptedFiles: userData.filter(item => item.encrypted).length,
  };

  const handleUnlockPrivateData = async () => {
    if (!isWalletConnected) {
      connectWallet(); // Trigger wallet connection if not connected
      return;
    }

    // For demonstration, assume we unlock the first private file
    const fileToUnlock = privateData[0];
    if (!fileToUnlock) {
      setProfileError('No private files to unlock.'); // Using profileError for general messages
      return;
    }

    try {
      // Fetch the decrypted file content directly from the backend
      const response = await fetch(`/api/get-file?fileId=${fileToUnlock.id}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch and decrypt private file.');
      }
      const decryptedContent = await response.text(); // Backend returns decrypted text

      setDecryptedPrivateContent(decryptedContent);
      setIsPrivateDataUnlocked(true);
      setProfileError(null); // Clear any previous errors
    } catch (error: any) {
      setProfileError(error.message);
    }
  };

  const handleLockPrivateData = () => {
    setIsPrivateDataUnlocked(false);
    setDecryptedPrivateContent(null);
  };

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
  );


  
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
              {([ 
                { id: 'overview', name: 'Overview', icon: '📊' },
                { id: 'data', name: 'My Data', icon: '🧬' },
                { id: 'tokens', name: 'Token Wallet', icon: '🪙' },
                { id: 'sharing', name: 'Data Sharing', icon: '🔗' },
                { id: 'nft', name: 'NFT Certificates', icon: '🎫' },
                { id: 'analytics', name: 'Analytics', icon: '📈' },
                { id: 'settings', name: 'Settings', icon: '⚙️' },
              ] as SidebarItem[]).map((item) => (
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
                      onClick={isWalletConnected ? disconnectWallet : connectWallet}
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
                  <p className="text-gray-600">Welcome back, Dr. Sarah Chen</p>
                </div>
                
                <div className="flex items-center space-x-4">
                  {!isWalletConnected && (
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
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        3
                      </span>
                    </button>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">Dr. Sarah Chen</p>
                      <p className="text-sm text-gray-600">Genetic Counselor</p>
                    </div>
                    <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-semibold">
                      SC
                    </div>
                  </div>
                </div>
              </div>
            </header>
  
            {/* Dashboard Content */}
            {/* Main content area */}
            <main className="flex-1 overflow-y-auto p-6 ">
              {/* Private Data Access Panel */}
              {(activeTab === 'data' || activeTab === 'overview') && privateData.length > 0 ? (
                <PrivateDataAccessPanel />
              ) : null}
  
              {activeTab === 'overview' ? (
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
              ) : null}
  
              {activeTab === 'data' ? (
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
                        {isUploading && (
                          <span className="text-indigo-600 text-sm">Uploading...</span>
                        )}
                        {uploadError && (
                          <span className="text-red-500 text-sm">Error: {uploadError}</span>
                        )}
                        {uploadSuccess && (
                          <span className="text-green-500 text-sm">{uploadSuccess}</span>
                        )}
                        <input
                          type="file"
                          id="file-upload"
                          className="hidden"
                          onChange={handleFileChange}
                        />
                        <button
                          onClick={() => document.getElementById('file-upload')?.click()}
                          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                          disabled={isUploading}
                        >
                          Upload New Data
                        </button>
                      </div>
                    </div>
                  </div> {/* Added closing div here */}
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
                          {/* Public Data */}
                          {publicData.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <span className="text-lg mr-3">
                                    {item.type.includes('genetic') ? '🧬' : item.type.includes('health') ? '🏥' : '📄'}
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
                                  <button className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">
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
                          ))}
                          {/* Private Data */}
                          {privateData.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <span className="text-lg mr-3">
                                    {item.type.includes('genetic') ? '🧬' : item.type.includes('health') ? '🏥' : '📄'}
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
                                  <button className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">
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
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : null}
  
              {/* Other tabs remain similar */}
              {activeTab === 'tokens' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-1">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Token Balance</h3>
                      <div className="text-center py-8">
                        <div className="text-4xl font-bold text-indigo-600 mb-2">{stats.totalTokens}</div>
                        <p className="text-gray-600">Utility Tokens</p>
                        <div className="mt-6 space-y-3">
                          <button
                            onClick={handleBuyTokens}
                            className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                          >
                            Buy Tokens
                          </button>
                          <button
                            onClick={handleTransferTokens}
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
                      {transferError && <div className="text-red-500 text-sm mb-4">Error: {transferError}</div>}
                      {transferSuccess && <div className="text-green-500 text-sm mb-4">{transferSuccess}</div>}
                      <div className="space-y-4">
                        {tokenTransactions.map((transaction) => (
                          <div key={transaction.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                            <div className="flex items-center space-x-4">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                transaction.type === 'earned' ? 'bg-green-100' :
                                transaction.type === 'spent' ? 'bg-red-100' : 'bg-blue-100'
                              }`}>
                                <span className={`text-lg ${
                                  transaction.type === 'earned' ? 'text-green-600' :
                                  transaction.type === 'spent' ? 'text-red-600' : 'text-blue-600'
                                }`}>
                                  {transaction.type === 'earned' ? '↑' : transaction.type === 'spent' ? '↓' : '↔'}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{transaction.description}</p>
                                <p className="text-sm text-gray-600">{transaction.fromTo}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`font-bold ${
                                transaction.type === 'earned' ? 'text-green-600' :
                                transaction.type === 'spent' ? 'text-red-600' : 'text-blue-600'
                              }`}>
                                {transaction.type === 'earned' ? '+' : transaction.type === 'spent' ? '-' : ''}
                                {transaction.amount} tokens
                              </p>
                              <p className="text-sm text-gray-600">{transaction.date}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

            {isTransferModalOpen ? (
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
                      onChange={(e) => setTransferRecipient(e.target.value)}
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
                      onChange={(e) => setTransferAmount(parseFloat(e.target.value) || '')}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      min="1"
                    />
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={handleCloseTransferModal}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmTransfer}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Confirm Transfer
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Add other tab contents similarly */}
                                        {activeTab === 'sharing' ? (
                                          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                            <h2 className="text-xl font-bold text-gray-900 mb-6">Data Sharing Management</h2>
                                            <div className="space-y-8">
                                              <div>
                                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Files Shared by Me</h3>
                                                {loadingSharedFiles ? (
                                                  <div className="text-gray-500">Loading shared files...</div>
                                                ) : sharedFilesError ? (
                                                  <div className="text-red-500">Error: {sharedFilesError}</div>
                                                ) : sharedFiles.length === 0 ? (
                                                  <p className="text-gray-600">No files shared by you yet.</p>
                                                ) : (
                                                  <ul className="divide-y divide-gray-200">
                                                    {sharedFiles.map((file) => (
                                                      <li key={file.id} className="py-3 flex justify-between items-center">
                                                        <div>
                                                          <p className="font-medium text-gray-900">{file.file_name}</p>
                                                          <p className="text-sm text-gray-500">Shared with: {file.grantee_id} ({file.access_type})</p>
                                                        </div>
                                                        <span className="text-sm text-gray-500">Expires: {new Date(file.expires_at).toLocaleDateString()}</span>
                                                      </li>
                                                    ))}
                                                  </ul>
                                                )}
                                              </div>
                                              <div>
                                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Access Requests to My Data</h3>
                                                {loadingAccessRequests ? (
                                                  <div className="text-gray-500">Loading access requests...</div>
                                                ) : accessRequestsError ? (
                                                  <div className="text-red-500">Error: {accessRequestsError}</div>
                                                ) : pendingAccessRequests.length === 0 ? (
                                                  <p className="text-gray-600">No pending access requests.</p>
                                                ) : (
                                                  <ul className="divide-y divide-gray-200">
                                                    {pendingAccessRequests.map((request) => (
                                                      <li key={request.id} className="py-3 flex justify-between items-center">
                                                        <div>
                                                          <p className="font-medium text-gray-900">Request for {request.file_name}</p>
                                                          <p className="text-sm text-gray-500">From: {request.owner_id} ({request.status})</p>
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
                                        ) : null}
            {activeTab === 'settings' ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">User Settings</h2>
                {loadingProfile ? (
                  <div className="p-6 text-center text-gray-500">Loading profile...</div>
                ) : profileError ? (
                  <div className="p-6 text-center text-red-500">Error: {profileError}</div>
                ) : userProfile ? (
                  <div className="space-y-4">
                    <p className="text-gray-700">Name: <span className="font-semibold">{userProfile.name || 'N/A'}</span></p>
                    <p className="text-gray-700">Email: <span className="font-semibold">{userProfile.email || 'N/A'}</span></p>
                    <p className="text-gray-700">Role: <span className="font-semibold">{userProfile.role || 'N/A'}</span></p>
                    <p className="text-gray-700">Country: <span className="font-semibold">{userProfile.country || 'N/A'}</span></p>
                    {userProfile.specialization && <p className="text-gray-700">Specialization: <span className="font-semibold">{userProfile.specialization}</span></p>}
                    {userProfile.institution && <p className="text-gray-700">Institution: <span className="font-semibold">{userProfile.institution}</span></p>}
                    <p className="text-gray-700">Subscription Tier: <span className="font-semibold">{userProfile.subscription_tier || 'F1'}</span></p>
                    {/* Add a form here to allow updating profile information */}
                    <button className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
                      Edit Profile
                    </button>
                  </div>
                ) : (
                  <div className="p-6 text-center text-gray-500">No profile data available.</div>
                )}
              </div>
            ) : null}
            </main>
          </div>
        </div>
      </>
    );
  };

export default AZGenesDashboard;