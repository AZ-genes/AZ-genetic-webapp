"use client"
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/useAuth';
import { useRouter } from 'next/navigation';

// Types
interface GeneticData {
  id: string;
  name: string;
  type: 'dna' | 'health' | 'report';
  date: string;
  size: string;
  nftCertified: boolean;
  sharedWith: number;
}

interface HealthInsight {
  id: string;
  title: string;
  description: string;
  category: 'nutrition' | 'fitness' | 'health' | 'genetic';
  date: string;
  priority: 'high' | 'medium' | 'low';
}

interface FamilyMember {
  id: string;
  name: string;
  relationship: string;
  dataShared: number;
  lastActive: string;
}

const IndividualDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/sign-in');
    }
  }, [authLoading, user, router]);

  // Mock data for individual user
  const geneticData: GeneticData[] = [
    { id: '1', name: '23andMe Raw Data', type: 'dna', date: '2024-01-15', size: '45 MB', nftCertified: true, sharedWith: 2 },
    { id: '2', name: 'AncestryDNA Results', type: 'dna', date: '2024-01-10', size: '38 MB', nftCertified: true, sharedWith: 1 },
    { id: '3', name: 'Blood Test Report', type: 'health', date: '2024-01-08', size: '2 MB', nftCertified: false, sharedWith: 0 },
    { id: '4', name: 'Wellness DNA Report', type: 'report', date: '2024-01-05', size: '5 MB', nftCertified: true, sharedWith: 1 },
  ];

  const healthInsights: HealthInsight[] = [
    { id: '1', title: 'Lactose Intolerance Risk', description: 'Based on your genetic markers, you have a higher probability of lactose intolerance', category: 'nutrition', date: '2024-01-16', priority: 'high' },
    { id: '2', title: 'Optimal Exercise Type', description: 'Your genetic profile suggests better response to endurance training', category: 'fitness', date: '2024-01-15', priority: 'medium' },
    { id: '3', title: 'Vitamin D Metabolism', description: 'Consider monitoring Vitamin D levels due to genetic variations', category: 'health', date: '2024-01-14', priority: 'medium' },
    { id: '4', title: 'Caffeine Sensitivity', description: 'Normal caffeine metabolism based on CYP1A2 gene', category: 'genetic', date: '2024-01-13', priority: 'low' },
  ];

  const familyMembers: FamilyMember[] = [
    { id: '1', name: 'Sarah Chen', relationship: 'Mother', dataShared: 3, lastActive: '2 days ago' },
    { id: '2', name: 'Michael Chen', relationship: 'Brother', dataShared: 2, lastActive: '1 week ago' },
    { id: '3', name: 'Lisa Chen', relationship: 'Sister', dataShared: 1, lastActive: '3 days ago' },
  ];

  const quickStats = {
    totalData: '90 MB',
    nftCertified: 3,
    healthInsights: 12,
    familyConnected: 3,
    dataShares: 4,
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'nutrition': return '🍎';
      case 'fitness': return '💪';
      case 'health': return '❤️';
      case 'genetic': return '🧬';
      default: return '📊';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Show loading spinner while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if user is not authenticated (will redirect)
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Genetic Health</h1>
            <p className="text-gray-600">Welcome back, Alex! Here's your genetic data overview.</p>
          </div>
          <div className="flex items-center space-x-4">
            <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
              Upload Data
            </button>
            <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-semibold">
              AC
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 w-full">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <nav className="space-y-2">
              {[
                { id: 'overview', name: 'Overview', icon: '📊' },
                { id: 'my-data', name: 'My Genetic Data', icon: '🧬' },
                { id: 'insights', name: 'Health Insights', icon: '💡' },
                { id: 'family', name: 'Family Sharing', icon: '👨‍👩‍👧‍👦' },
                { id: 'reports', name: 'Health Reports', icon: '📄' },
                { id: 'settings', name: 'Settings', icon: '⚙️' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${
                    activeTab === item.id
                      ? 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className="font-medium">{item.name}</span>
                </button>
              ))}
            </nav>

            {/* Quick Stats */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Data Stored</span>
                  <span className="font-semibold text-gray-900">{quickStats.totalData}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">NFT Certified</span>
                  <span className="font-semibold text-gray-900">{quickStats.nftCertified}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Health Insights</span>
                  <span className="font-semibold text-gray-900">{quickStats.healthInsights}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Family Connected</span>
                  <span className="font-semibold text-gray-900">{quickStats.familyConnected}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3  w-screen">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Genetic Data Files</p>
                      <p className="text-2xl font-bold text-gray-900">{geneticData.length}</p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-xl">
                      <span className="text-2xl">🧬</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Insights</p>
                      <p className="text-2xl font-bold text-gray-900">{healthInsights.length}</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-xl">
                      <span className="text-2xl">💡</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Family Members</p>
                      <p className="text-2xl font-bold text-gray-900">{familyMembers.length}</p>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-xl">
                      <span className="text-2xl">👨‍👩‍👧‍👦</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Health Insights */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Recent Health Insights</h3>
                    <button className="text-indigo-600 hover:text-indigo-700 font-medium">
                      View All
                    </button>
                  </div>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {healthInsights.slice(0, 3).map((insight) => (
                      <div key={insight.id} className="flex items-start space-x-4 p-4 border border-gray-200 rounded-xl hover:border-indigo-200 transition-colors">
                        <div className="text-2xl">{getCategoryIcon(insight.category)}</div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-gray-900">{insight.title}</h4>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(insight.priority)}`}>
                              {insight.priority} priority
                            </span>
                          </div>
                          <p className="text-gray-600 text-sm">{insight.description}</p>
                          <p className="text-gray-500 text-xs mt-2">{insight.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <button className="p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 transition-colors text-center">
                    <div className="text-2xl mb-2">📤</div>
                    <p className="font-medium text-gray-900">Upload Data</p>
                    <p className="text-sm text-gray-600">Add new genetic data</p>
                  </button>
                  <button className="p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 transition-colors text-center">
                    <div className="text-2xl mb-2">🔗</div>
                    <p className="font-medium text-gray-900">Share with Family</p>
                    <p className="text-sm text-gray-600">Connect family members</p>
                  </button>
                  <button className="p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 transition-colors text-center">
                    <div className="text-2xl mb-2">🎫</div>
                    <p className="font-medium text-gray-900">Get Certified</p>
                    <p className="text-sm text-gray-600">NFT certification</p>
                  </button>
                  <button className="p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 transition-colors text-center">
                    <div className="text-2xl mb-2">📊</div>
                    <p className="font-medium text-gray-900">Generate Report</p>
                    <p className="text-sm text-gray-600">Health insights</p>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* My Genetic Data Tab */}
          {activeTab === 'my-data' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">My Genetic Data</h3>
                  <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
                    Upload New Data
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {geneticData.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-indigo-200 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className="text-2xl">
                          {item.type === 'dna' ? '🧬' : item.type === 'health' ? '❤️' : '📄'}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{item.name}</h4>
                          <div className="flex items-center space-x-4 mt-1">
                            <span className="text-sm text-gray-600">{item.date}</span>
                            <span className="text-sm text-gray-600">•</span>
                            <span className="text-sm text-gray-600">{item.size}</span>
                            <span className="text-sm text-gray-600">•</span>
                            <span className="text-sm text-gray-600">
                              Shared with {item.sharedWith} {item.sharedWith === 1 ? 'person' : 'people'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        {item.nftCertified ? (
                          <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                            NFT Certified
                          </span>
                        ) : (
                          <button className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">
                            Get Certified
                          </button>
                        )}
                        <button className="text-gray-600 hover:text-gray-900 p-2">
                          •••
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Health Insights Tab */}
          {activeTab === 'insights' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Your Health Insights</h3>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {healthInsights.map((insight) => (
                      <div key={insight.id} className="border border-gray-200 rounded-xl p-5 hover:border-indigo-200 transition-colors">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="text-2xl">{getCategoryIcon(insight.category)}</div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(insight.priority)}`}>
                              {insight.priority}
                            </span>
                          </div>
                          <span className="text-gray-500 text-sm">{insight.date}</span>
                        </div>
                        <h4 className="font-semibold text-gray-900 mb-2">{insight.title}</h4>
                        <p className="text-gray-600 text-sm mb-4">{insight.description}</p>
                        <button className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">
                          Learn More →
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Family Sharing Tab */}
          {activeTab === 'family' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Family Members</h3>
                    <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
                      Invite Family Member
                    </button>
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {familyMembers.map((member) => (
                      <div key={member.id} className="border border-gray-200 rounded-xl p-6 text-center hover:border-indigo-200 transition-colors">
                        <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 text-xl font-semibold mx-auto mb-4">
                          {member.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <h4 className="font-semibold text-gray-900">{member.name}</h4>
                        <p className="text-gray-600 text-sm mb-3">{member.relationship}</p>
                        <div className="flex items-center justify-center space-x-4 text-sm text-gray-600">
                          <span>{member.dataShared} data shared</span>
                          <span>•</span>
                          <span>Active {member.lastActive}</span>
                        </div>
                        <div className="mt-4 flex justify-center space-x-2">
                          <button className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">
                            View Data
                          </button>
                          <button className="text-gray-600 hover:text-gray-900 text-sm font-medium">
                            Message
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    {/* Add Family Member Card */}
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-indigo-300 hover:bg-indigo-50 transition-colors cursor-pointer">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 text-2xl mx-auto mb-4">
                        +
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-2">Add Family Member</h4>
                      <p className="text-gray-600 text-sm">Invite family to share genetic insights</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Other tabs can be implemented similarly */}
          {(activeTab === 'reports' || activeTab === 'settings') && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
              <div className="text-4xl mb-4">🚧</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Coming Soon</h3>
              <p className="text-gray-600">
                {activeTab === 'reports' 
                  ? 'Health reports feature is under development.' 
                  : 'Settings panel will be available soon.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IndividualDashboard;