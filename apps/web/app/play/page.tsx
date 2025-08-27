'use client';

import Link from 'next/link';
import { WalletButton } from '@/components/WalletButton';
import { BetPanel } from '@/components/BetPanel';
import { useWallet } from '@solana/wallet-adapter-react';

export default function Play() {
  const { publicKey } = useWallet();

  return (
    <div className="min-h-screen p-4 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10 right-20 w-24 h-24 bg-brand-orange/10 rounded-full blur-xl animate-bounce-gentle"></div>
        <div className="absolute bottom-20 left-16 w-20 h-20 bg-brand-coral/10 rounded-full blur-xl animate-bounce-gentle" style={{animationDelay: '1.5s'}}></div>
        <div className="absolute top-1/3 right-8 w-16 h-16 bg-brand-cream/10 rounded-full blur-xl animate-bounce-gentle" style={{animationDelay: '0.5s'}}></div>
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        <header className="flex flex-col sm:flex-row justify-between items-center mb-12 gap-4">
          <Link 
            href="/"
            className="group flex items-center gap-3 text-2xl font-bold font-space bg-brand-gradient bg-clip-text text-transparent hover:scale-105 transition-transform duration-300"
          >
            <img src="/logo.svg" alt="Logo" className="w-8 h-8 group-hover:animate-spin-slow" />
            Schrödinger's Box
          </Link>
          
          <div className="flex items-center gap-4">
            {publicKey && (
              <div className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full border border-white/30">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm font-mono text-slate-600">Connected</span>
              </div>
            )}
            <WalletButton />
          </div>
        </header>
        
        {publicKey ? (
          <div className="animate-slide-up">
            <BetPanel />
          </div>
        ) : (
          <div className="text-center py-32 animate-slide-up">
            <div className="max-w-md mx-auto space-y-8">
              {/* Disconnected Cat */}
              <div className="relative">
                <div className="absolute inset-0 bg-slate-200 rounded-full opacity-50 blur-2xl"></div>
                <div className="relative bg-white/60 backdrop-blur-sm rounded-full p-8 border border-white/20 shadow-glass grayscale">
                  <svg width="120" height="120" viewBox="0 0 200 200" fill="none" className="mx-auto opacity-50">
                    <circle cx="100" cy="100" r="60" fill="#94a3b8" opacity="0.3" />
                    <ellipse cx="100" cy="110" rx="40" ry="35" fill="#94a3b8" opacity="0.5" />
                    <polygon points="70,85 60,60 80,70" fill="#94a3b8" opacity="0.5" />
                    <polygon points="130,85 140,60 120,70" fill="#94a3b8" opacity="0.5" />
                    <circle cx="85" cy="100" r="3" fill="#475569" />
                    <circle cx="115" cy="100" r="3" fill="#475569" />
                    <path d="M90 115 Q100 120 110 115" stroke="#475569" strokeWidth="2" fill="none" />
                  </svg>
                </div>
              </div>
              
              <div className="space-y-4">
                <h2 className="text-3xl font-bold font-space text-slate-700">
                  Connect to Start Playing
                </h2>
                <p className="text-slate-600 font-space">
                  Connect your Solana wallet to access the quantum cat flip game
                </p>
              </div>
              
              <WalletButton />
              
              <div className="text-xs font-mono text-slate-400 space-y-1">
                <p>• Phantom & Solflare supported</p>
                <p>• No account creation needed</p>
                <p>• Instant SOL payouts</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}