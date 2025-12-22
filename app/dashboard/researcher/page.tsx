'use client';
import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useHederaWallet } from '@/context/HederaWalletContext';
import { useToast } from '@/context/ToastContext';
import { api } from '@/lib/apiClient';
import { useAuth } from '@/lib/useAuth';
import { useRouter } from 'next/navigation';
import Spinner from '@/components/ui/Spinner';
import { Icon } from '@iconify/react';

// Types
interface NodeTelemetry {
    consensusHealth: string;
    activeIndexers: number;
    totalTransactions: string;
    networkLatency: string;
}

interface AnalyticsData {
    id: string;
    metric: string;
    value: string;
    trend: 'up' | 'down' | 'stable';
    color: string;
}

const ResearcherDashboard = () => {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('overview');
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [showConnectModal, setShowConnectModal] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [userProfile, setUserProfile] = useState<any>(null);

    const { isConnected: isWalletConnected, connectWallet, disconnectWallet, accountId } = useHederaWallet();
    const toast = useToast();

    // Redirect if not authenticated
    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/sign-in');
        }
    }, [authLoading, user, router]);

    // Load profile
    useEffect(() => {
        const loadProfile = async () => {
            try {
                const response = await api.get('get-profile');
                if (response.ok) {
                    const profile = await response.json();
                    setUserProfile(profile);
                    // Verify role
                    if (profile.user_role !== 'researcher') {
                        // Optional: redirect if wrong role, but for now we let them stay if they reached here
                    }
                }
            } catch (err) {
                console.error('Failed to load profile:', err);
            }
        };
        if (user) loadProfile();
    }, [user]);

    const telemetry: NodeTelemetry = {
        consensusHealth: '99.98%',
        activeIndexers: 142,
        totalTransactions: '1.2M',
        networkLatency: '12ms',
    };

    const analytics: AnalyticsData[] = [
        { id: '1', metric: 'Genomic Diversity Index', value: '0.84', trend: 'up', color: 'emerald' },
        { id: '2', metric: 'Total Anonymized Records', value: '14,202', trend: 'up', color: 'blue' },
        { id: '3', metric: 'Clinical Access Latency', value: '0.4s', trend: 'down', color: 'purple' },
        { id: '4', metric: 'Consensus Reliability', value: '99.9%', trend: 'stable', color: 'teal' },
    ];

    const handleConnectWallet = async () => {
        setIsConnecting(true);
        try {
            await connectWallet();
            setShowConnectModal(false);
            setIsConnecting(false);
        } catch (error) {
            toast.error('Failed to connect node wallet');
            setIsConnecting(false);
        }
    };

    const handleLogout = async () => {
        // signOut etc
        router.push('/sign-in');
    };

    return (
        <>
            <Head>
                <title>Researcher Node | AZ Genes Protocol</title>
                <meta name="description" content="Decentralized genomic research analytics and telemetry" />
            </Head>

            <div className="flex h-screen bg-[#020403] text-slate-300 font-sans selection:bg-emerald-500/30">
                {/* Sidebar */}
                <div className={`${sidebarOpen ? 'w-72' : 'w-24'} glass-panel border-r border-white/5 transition-all duration-500 flex flex-col relative z-30`}>
                    <div className="p-8 mb-4 text-center">
                        <div className="flex items-center justify-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.4)]">
                                <Icon icon="lucide:terminal" className="text-[#020403]" width="24" />
                            </div>
                            {sidebarOpen && <span className="text-xl font-bold text-white tracking-tighter uppercase">Research</span>}
                        </div>
                    </div>

                    <nav className="flex-1 px-4 space-y-2">
                        {[
                            { id: 'overview', name: 'Analytic Pulse', icon: 'lucide:activity' },
                            { id: 'telemetry', name: 'Node Network', icon: 'lucide:network' },
                            { id: 'datasets', name: 'Asset Clusters', icon: 'lucide:layers' },
                            { id: 'tokens', name: 'Grant Allocation', icon: 'lucide:coins' },
                            { id: 'subscriptions', name: 'Protocol Tier', icon: 'lucide:star' },
                            { id: 'settings', name: 'Node Config', icon: 'lucide:sliders' },
                        ].map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl transition-all duration-300 group ${activeTab === item.id
                                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                    : 'text-slate-500 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <Icon icon={item.icon} width="20" />
                                {sidebarOpen && <span className="text-[10px] font-bold uppercase tracking-[0.2em]">{item.name}</span>}
                            </button>
                        ))}
                    </nav>

                    {/* Wallet Status */}
                    {sidebarOpen && (
                        <div className="p-6">
                            <div className="glass-panel border-white/5 p-4 rounded-2xl bg-white/[0.01]">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Node Identity</span>
                                    <div className={`w-2 h-2 rounded-full ${isWalletConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                                </div>
                                <button
                                    onClick={isWalletConnected ? disconnectWallet : () => setShowConnectModal(true)}
                                    className="w-full py-2 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-white uppercase tracking-widest hover:bg-white/10 transition-all"
                                >
                                    {isWalletConnected ? 'Disconnect Node' : 'Initialize Node'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col overflow-hidden relative">
                    <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none"></div>

                    {/* Header */}
                    <header className="glass-panel border-b border-white/5 px-10 py-6 z-20">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-[0.3em] mb-1">Ecosystem Status: Synchronized</p>
                                <h1 className="text-2xl font-bold text-white tracking-tighter uppercase">研究員プロトコル <span className="text-slate-500 tracking-widest ml-2">v1.2</span></h1>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                        <Icon icon="lucide:user" width="18" />
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-bold text-white uppercase tracking-tight">{userProfile?.name || 'Researcher'}</p>
                                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{userProfile?.subscription_tier || 'F1'} Tier</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </header>

                    <main className="flex-1 overflow-y-auto p-10 relative z-10 custom-scrollbar">
                        {activeTab === 'overview' && (
                            <div className="space-y-10">
                                {/* Stats Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    {analytics.map((item) => (
                                        <div key={item.id} className="glass-panel border-white/5 p-8 rounded-2xl hover:scale-[1.02] transition-all group overflow-hidden relative">
                                            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none"></div>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-4 group-hover:text-emerald-500 transition-colors uppercase">{item.metric}</p>
                                            <div className="flex items-end justify-between">
                                                <h3 className="text-3xl font-bold text-white font-mono tracking-tighter">{item.value}</h3>
                                                <div className={`flex items-center gap-1 ${item.trend === 'up' ? 'text-emerald-500' : 'text-blue-400'}`}>
                                                    <Icon icon={item.trend === 'up' ? "lucide:trending-up" : "lucide:repeat"} width="14" />
                                                    <span className="text-[10px] font-bold uppercase">{item.trend === 'up' ? '+12%' : 'STABLE'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Telemetry Section */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    <div className="lg:col-span-2 glass-panel border-white/5 rounded-2xl p-8 bg-white/[0.01]">
                                        <div className="flex items-center justify-between mb-8">
                                            <h2 className="text-sm font-bold text-white uppercase tracking-[0.2em]">Genomic Pattern Heatmap</h2>
                                            <div className="flex gap-2">
                                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                                <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Live Consensus</span>
                                            </div>
                                        </div>
                                        <div className="h-64 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center relative overflow-hidden group">
                                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(16,185,129,0.1)_0%,_transparent_70%)] group-hover:scale-150 transition-transform duration-1000"></div>
                                            <p className="text-[10px] text-slate-500 font-mono italic tracking-widest uppercase">Rendering Aggregated Sequencing Points...</p>
                                        </div>
                                        <div className="grid grid-cols-3 gap-4 mt-8">
                                            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                                <p className="text-[9px] text-slate-500 font-bold uppercase mb-1">Sample Depth</p>
                                                <p className="text-lg font-bold text-white font-mono">14.2k</p>
                                            </div>
                                            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                                <p className="text-[9px] text-slate-500 font-bold uppercase mb-1">Mutation Delta</p>
                                                <p className="text-lg font-bold text-emerald-500 font-mono">0.03%</p>
                                            </div>
                                            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                                <p className="text-[9px] text-slate-500 font-bold uppercase mb-1">Audit Trail</p>
                                                <p className="text-lg font-bold text-blue-400 font-mono">VERIFIED</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="glass-panel border-white/5 rounded-2xl p-8 flex flex-col bg-white/[0.01]">
                                        <h2 className="text-sm font-bold text-white uppercase tracking-[0.2em] mb-8">Consensus Feed</h2>
                                        <div className="flex-1 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                                            {[1, 2, 3, 4, 5].map((i) => (
                                                <div key={i} className="flex gap-4 group">
                                                    <div className="w-1 h-auto bg-white/10 rounded-full group-hover:bg-emerald-500 transition-colors"></div>
                                                    <div>
                                                        <p className="text-[10px] text-white font-bold leading-none mb-1 uppercase tracking-tight">Block #742,91{i}</p>
                                                        <p className="text-[9px] text-slate-500 font-mono leading-relaxed">Sequencing shard 0.0.{i}92 committed to consensus.</p>
                                                        <p className="text-[8px] text-slate-600 font-mono mt-1">2.01s ago</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <button className="w-full py-3 mt-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-500 hover:text-[#020403] transition-all">
                                            Global Node Audit
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Subscriptions Tab */}
                        {activeTab === 'subscriptions' && (
                            <div className="space-y-12">
                                <div className="text-center max-w-2xl mx-auto mb-16">
                                    <h2 className="text-2xl font-bold text-white tracking-tighter uppercase mb-4">Protocol Tier Elevation</h2>
                                    <p className="text-xs text-slate-500 leading-relaxed uppercase tracking-widest">
                                        Scale your research capabilities by choosing a protocol tier. Each tier unlocks higher consensus bandwidth and advanced genomic analytics.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    {[
                                        { tier: 'F1', name: 'Open Access', price: 'Free', features: ['100MB Node Storage', 'Standard Analytics', 'Basic Telemetry', 'Single Chain Sync'], color: 'slate' },
                                        { tier: 'F2', name: 'Pro Researcher', price: '250 GENE/mo', features: ['5GB Node Storage', 'Advanced ML Indexing', 'Full Telemetry Access', 'Multi-Shard Sync', 'Priority Support'], color: 'emerald', popular: true },
                                        { tier: 'F3', name: 'Enterprise Node', price: 'Custom', features: ['Unlimited Storage', 'Ecosystem Governance', 'API Cluster Access', 'Direct Hedera Node Sync', '24/7 Priority Protocol Support'], color: 'purple' },
                                    ].map((sub) => (
                                        <div key={sub.tier} className={`glass-panel border-white/5 rounded-3xl p-10 flex flex-col relative overflow-hidden group hover:scale-[1.02] transition-all duration-500 ${sub.popular ? 'bg-emerald-500/[0.03] ring-1 ring-emerald-500/30' : 'bg-white/[0.01]'}`}>
                                            {sub.popular && (
                                                <div className="absolute top-0 right-0 py-2 px-8 bg-emerald-500 text-[#020403] text-[9px] font-bold uppercase tracking-[0.2em] transform rotate-45 translate-x-[25px] translate-y-[10px] shadow-[0_0_15px_rgba(16,185,129,0.3)]">
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
                                                    <div key={f} className="flex items-center gap-3 group/item">
                                                        <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center group-hover/item:bg-emerald-500/20 transition-colors">
                                                            <Icon icon="lucide:check" className="text-slate-600 group-hover/item:text-emerald-500" width="12" />
                                                        </div>
                                                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">{f}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            <button className={`w-full py-4 rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all ${sub.tier === (userProfile?.subscription_tier || 'F1')
                                                ? 'bg-white/5 text-slate-500 cursor-default border border-white/10'
                                                : 'bg-emerald-500 text-[#020403] hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)] ring-anim'}`}>
                                                {sub.tier === (userProfile?.subscription_tier || 'F1') ? 'Active Protocol' : 'Select Tier'}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Other tabs as placeholders */}
                        {(activeTab === 'telemetry' || activeTab === 'datasets' || activeTab === 'tokens' || activeTab === 'settings') && (
                            <div className="glass-panel border-white/5 rounded-2xl p-16 text-center">
                                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-600 mx-auto mb-6">
                                    <Icon icon="lucide:terminal" width="32" />
                                </div>
                                <h3 className="text-sm font-bold text-white uppercase tracking-[0.2em] mb-2 font-mono">Protocol restricted / consensus pending</h3>
                                <p className="text-xs text-slate-500 max-w-sm mx-auto mb-8 leading-relaxed">
                                    The requested research layer is currently being synchronized with the Hedera Consensus Service. High-level telemetry will be available in the next node epoch.
                                </p>
                                <button className="h-10 px-8 rounded border border-white/10 text-slate-400 text-[10px] font-bold uppercase tracking-widest hover:bg-white/5 transition-all">
                                    Await Pulse
                                </button>
                            </div>
                        )}
                    </main>
                </div>
            </div>

            {/* Wallet Connect Modal Placeholder */}
            {showConnectModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-[#020403]/90 backdrop-blur-sm" onClick={() => setShowConnectModal(false)}></div>
                    <div className="glass-panel w-full max-w-sm rounded-2xl relative z-10 p-8 border-white/5">
                        <div className="text-center mb-10">
                            <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                <Icon icon="lucide:wallet" className="text-emerald-500" width="32" />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2 uppercase tracking-widest">Connect Node Wallet</h3>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">Verify node ownership on Hedera</p>
                        </div>
                        <button
                            onClick={handleConnectWallet}
                            className="w-full py-4 rounded-xl bg-emerald-500 text-[#020403] text-xs font-bold uppercase tracking-widest hover:bg-emerald-400 transition-all shadow-[0_0_20px_-5px_rgba(16,185,129,0.4)] mb-4"
                        >
                            {isConnecting ? 'Transmitting...' : 'Metamask Key'}
                        </button>
                        <button
                            onClick={() => setShowConnectModal(false)}
                            className="w-full text-slate-600 py-2 text-[10px] font-bold uppercase tracking-widest hover:text-white transition-colors"
                        >
                            Abort Protocol
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default ResearcherDashboard;
