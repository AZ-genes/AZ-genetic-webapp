
'use client';

import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Icon } from '@iconify/react';

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <Head>
        <title>AZ genes | Secure Genomic Protocol on Hedera</title>
        <meta name="description" content="Sovereign genomic data management powered by Hedera Hashgraph and decentralized indexing" />
      </Head>

      <div className="antialiased text-slate-400 selection:bg-emerald-500/20 selection:text-emerald-200 min-h-screen relative overflow-x-hidden">
        <div className="fixed inset-0 z-[-1] bg-grid pointer-events-none h-screen w-full"></div>

        {/* Navigation */}
        <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-[#020403]/80 backdrop-blur-xl">
          <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-2 group cursor-pointer">
                <div className="w-7 h-7 rounded-sm bg-emerald-950 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold tracking-tighter text-xs">
                  AZ
                </div>
                <span className="text-slate-200 font-medium tracking-tight text-sm">
                  genes <span className="text-slate-600 font-normal">/ protocol</span>
                </span>
              </Link>

              <div className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-500 transition-opacity duration-300">
                <Link href="#features" className="hover:text-slate-300">Features</Link>
                <Link href="#solutions" className="hover:text-slate-300">Solutions</Link>
                <Link href="/dashboard" className="hover:text-slate-300">Dashboard</Link>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/5 border border-emerald-500/10">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-widest">Hedera Mainnet Beta</span>
              </div>

              <Link href="/sign-in" className="bg-slate-100 hover:bg-white text-black px-4 py-1.5 rounded text-xs font-medium transition-all flex items-center gap-2 shadow-[0_0_15px_-3px_rgba(255,255,255,0.3)]">
                <Icon icon="lucide:wallet" width="14" />
                Connect Wallet
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="pt-32 pb-20 px-6 max-w-[1400px] mx-auto min-h-screen flex flex-col items-center justify-center text-center relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none"></div>

          <div className="inline-flex items-center gap-2 px-3 py-1 mb-8 rounded-full bg-emerald-900/20 border border-emerald-500/20 backdrop-blur-sm">
            <span className="text-[10px] font-mono text-emerald-400">v1.0 Public Release</span>
            <span className="w-px h-3 bg-emerald-500/20"></span>
            <a href="#" className="text-[10px] text-emerald-300 hover:text-emerald-200 flex items-center gap-1">
              Read the Whitepaper <Icon icon="lucide:arrow-right" width="10" />
            </a>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-semibold tracking-tighter text-white mb-6 relative z-10">
            Your DNA. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-600 text-glow">Sovereign Asset.</span>
          </h1>

          <p className="text-sm md:text-base text-slate-400 max-w-xl mx-auto mb-10 leading-relaxed relative z-10">
            Securely house your genomic profile using industry-grade encryption.
            Verify data integrity on Hedera Hashgraph and manage access through decentralized protocol layers.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 relative z-10">
            <Link href="/sign-up" className="h-10 px-6 rounded bg-emerald-500 hover:bg-emerald-400 text-[#020403] text-sm font-semibold transition-all shadow-[0_0_20px_-5px_rgba(16,185,129,0.4)] flex items-center gap-2">
              Get Started
              <Icon icon="lucide:arrow-right" width="16" />
            </Link>
            <button className="h-10 px-6 rounded glass-btn text-slate-300 hover:text-white text-sm font-medium flex items-center gap-2">
              <Icon icon="lucide:play-circle" width="16" />
              Watch Demo
            </button>
          </div>

          {/* Features Grid */}
          <div id="features" className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24 w-full max-w-5xl">
            <div className="glass-panel p-6 rounded-xl text-left hover:border-emerald-500/30 transition-colors group">
              <div className="w-10 h-10 rounded bg-emerald-900/20 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
                <Icon icon="lucide:lock" width="20" />
              </div>
              <h3 className="text-sm font-medium text-white mb-2">Immutable Integrity</h3>
              <p className="text-xs text-slate-500 leading-relaxed">Every genomic asset is hashed and timestamped on the Hedera Consensus Service, ensuring permanent verifiability.</p>
            </div>
            <div className="glass-panel p-6 rounded-xl text-left hover:border-emerald-500/30 transition-colors group">
              <div className="w-10 h-10 rounded bg-blue-900/20 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4 group-hover:scale-110 transition-transform">
                <Icon icon="lucide:database" width="20" />
              </div>
              <h3 className="text-sm font-medium text-white mb-2">Decentralized Storage</h3>
              <p className="text-xs text-slate-500 leading-relaxed">Leverage Supabase and Firestore hybrid layers for secure, low-latency access to your personal biological records.</p>
            </div>
            <div className="glass-panel p-6 rounded-xl text-left hover:border-emerald-500/30 transition-colors group">
              <div className="w-10 h-10 rounded bg-purple-900/20 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4 group-hover:scale-110 transition-transform">
                <Icon icon="lucide:network" width="20" />
              </div>
              <h3 className="text-sm font-medium text-white mb-2">Interoperable</h3>
              <p className="text-xs text-slate-500 leading-relaxed">Import from 23andMe or Ancestry. Export standardized VCF files to any decentralized health dApp.</p>
            </div>
          </div>

          <div className="mt-20 border-t border-white/5 pt-10 flex flex-wrap justify-center gap-12 grayscale opacity-50">
            <span className="text-xs font-bold text-slate-600 tracking-[0.2em]">HEDERA</span>
            <span className="text-xs font-bold text-slate-600 tracking-[0.2em]">FIREBASE</span>
            <span className="text-xs font-bold text-slate-600 tracking-[0.2em]">SUPABASE</span>
            <span className="text-xs font-bold text-slate-600 tracking-[0.2em]">NEXTJS</span>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/5 py-8 text-center bg-[#020403]">
          <p className="text-[10px] text-slate-600 font-mono">AZ-genes-protocol v1.0.4 • <span className="text-emerald-500/50">System Operational</span></p>
        </footer>
      </div>
    </>
  );
}

