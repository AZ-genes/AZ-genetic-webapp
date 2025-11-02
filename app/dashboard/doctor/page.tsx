'use client';
import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useHederaWallet } from '@/context/HederaWalletContext';
import { api } from '@/lib/apiClient';


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
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isPrivateDataUnlocked, setIsPrivateDataUnlocked] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [nftCertificates, setNftCertificates] = useState<any[]>([]);
  const [loadingNFTs, setLoadingNFTs] = useState(false);
  const [mintingFileId, setMintingFileId] = useState<string | null>(null);
  const [userData, setUserData] = useState<DataItem[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  
  // Use real Hedera wallet context
  const { isConnected: isWalletConnected, connectWallet, disconnectWallet, accountId } = useHederaWallet();

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
    try {
      await connectWallet();
      setShowConnectModal(false);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
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

  const handleMintNFT = async (fileId: string) => {
    if (!isWalletConnected) {
      setShowConnectModal(true);
      return;
    }

    setMintingFileId(fileId);
    try {
      const response = await fetch('/api/mint-nft-certificate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileId }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`Failed to mint NFT: ${error.error}`);
        return;
      }

      const result = await response.json();
      
      // Update local data
      const updatedData = userData.map(item => 
        item.id === fileId 
          ? { ...item, nftCertified: true }
          : item
      );
      
      // Reload files and NFTs
      await loadFiles();
      alert('NFT Certificate minted successfully!');
    } catch (error) {
      console.error('Error minting NFT:', error);
      alert('Failed to mint NFT certificate');
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Connect Your Wallet</h3>
          <p className="text-gray-600 mb-4">
            Connect your Hedera wallet to access private genetic data. Wallet-based authentication enables secure, decentralized access control for your sensitive information.
          </p>
          {accountId && (
            <p className="text-sm text-indigo-600 mb-6 font-mono bg-indigo-50 px-3 py-2 rounded">
              {accountId.toString()}
            </p>
          )}
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
            disabled={mintingFileId === item.id}
            className="text-indigo-600 hover:text-indigo-700 text-sm font-medium disabled:opacity-50"
          >
            {mintingFileId === item.id ? 'Minting...' : 'Get Certified'}
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
                <p className="text-gray-600">Welcome back, Dr. Sarah Chen</p>
              </div>
              
              <div className="flex items-center space-x-4">
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
                      <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
                        Upload New Data
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
                      <div className="text-4xl font-bold text-indigo-600 mb-2">160</div>
                      <p className="text-gray-600">Utility Tokens</p>
                      <div className="mt-6 space-y-3">
                        <button className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition-colors">
                          Buy Tokens
                        </button>
                        <button className="w-full border border-indigo-600 text-indigo-600 py-2 rounded-lg hover:bg-indigo-50 transition-colors">
                          Transfer Tokens
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="lg:col-span-2">
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Transaction History</h3>
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
            )}

            {/* Add other tab contents similarly */}
            {activeTab === 'sharing' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Data Sharing Management</h2>
                <p className="text-gray-600">Data sharing interface coming soon...</p>
              </div>
            )}

            {activeTab === 'nft' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">NFT Certificates</h2>
                  {!isWalletConnected && (
                    <button
                      onClick={() => setShowConnectModal(true)}
                      className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                      Connect Wallet to Mint
                    </button>
                  )}
                </div>

                {loadingNFTs ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                  </div>
                ) : nftCertificates.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🎫</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No NFT Certificates Yet</h3>
                    <p className="text-gray-600 mb-6">Mint your first NFT certificate for your genetic data files</p>
                    <button
                      onClick={() => setActiveTab('data')}
                      className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      Go to My Data
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {nftCertificates.map((nft) => (
                      <div key={nft.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-2xl font-bold">
                            🧬
                          </div>
                          <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
                            Certified
                          </span>
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-2">{nft.name}</h3>
                        <div className="space-y-2 text-sm text-gray-600 mb-4">
                          <div className="flex items-center">
                            <span className="font-medium mr-2">Type:</span>
                            <span className="capitalize">{nft.type}</span>
                          </div>
                          <div className="flex items-center">
                            <span className="font-medium mr-2">Date:</span>
                            <span>{nft.date}</span>
                          </div>
                          <div className="flex items-center">
                            <span className="font-medium mr-2">Serial:</span>
                            <span className="font-mono text-xs">{nft.serialNumber}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`${nft.tokenId}:${nft.serialNumber}`);
                            alert('Token ID copied!');
                          }}
                          className="w-full border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                        >
                          Copy Token ID
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Show files that can be certified */}
                {userData.filter(item => !item.nftCertified).length > 0 && (
                  <div className="mt-8 pt-8 border-t border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Available to Certify</h3>
                    <div className="space-y-3">
                      {userData.filter(item => !item.nftCertified).map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-4">
                            <span className="text-2xl">
                              {item.type === 'genetic' ? '🧬' : item.type === 'health' ? '🏥' : '📄'}
                            </span>
                            <div>
                              <p className="font-medium text-gray-900">{item.name}</p>
                              <p className="text-sm text-gray-600">{item.type} • {item.date}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleMintNFT(item.id)}
                            disabled={mintingFileId === item.id}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                          >
                            {mintingFileId === item.id ? 'Minting...' : 'Mint NFT'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Connect Wallet Modal */}
      {showConnectModal && <ConnectWalletModal />}
    </>
  );
};

export default AZGenesDashboard;