'use client';

import Link from 'next/link';
import { WalletButton } from '@/components/WalletButton';
import { BetPanel } from '@/components/BetPanel';
import { useWallet } from '@solana/wallet-adapter-react';

export default function Play() {
  const { publicKey } = useWallet();

  return (
    <div className="min-h-screen bg-white">
      {/* Ultra-Minimal Navigation */}
      <nav className="relative z-50 px-6 py-8">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <Link 
            href="/"
            className="group flex items-center gap-3 transition-all duration-300 hover:scale-[1.02]"
          >
            <img src="/logo.svg" alt="Caesar" className="w-6 h-6 animate-caesar-float opacity-80" />
            <div>
              <h1 className="text-lg font-thin text-gray-900 tracking-wide">CATSINO</h1>
              <p className="text-xs text-gray-400 font-mono tracking-wider">Advanced Interface</p>
            </div>
          </Link>
          
          <div className="flex items-center gap-8">
            <Link 
              href="https://youtube.com" 
              target="_blank" 
              className="text-gray-400 hover:text-czar-gold transition-colors duration-300 text-sm font-mono tracking-wide"
            >
              YouTube
            </Link>
            
            {publicKey && (
              <div className="flex items-center gap-2 px-3 py-1 border border-gray-200 rounded-full bg-white">
                <div className="w-1.5 h-1.5 bg-czar-gold rounded-full animate-pulse"></div>
                <span className="text-xs font-mono text-gray-500 tracking-wide">Connected</span>
              </div>
            )}
            
            <WalletButton />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6">
        {publicKey ? (
          <div className="space-y-8">
            {/* Compact Header */}
            <div className="text-center space-y-4 py-6">
              <div className="w-8 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent mx-auto"></div>
              
              <div className="space-y-2">
                <h1 className="text-3xl font-thin text-gray-900 tracking-wide">
                  Emperor's Arena
                </h1>
                <p className="text-gray-500 font-light text-sm max-w-md mx-auto">
                  Quantum chance meets imperial legacy
                </p>
              </div>
            </div>

            {/* Game Panel */}
            <BetPanel />
          </div>
        ) : (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center space-y-12 py-20">
              {/* Ethereal Caesar Portrait */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-caesar-gold/5 via-caesar-cream/3 to-czar-bronze/5 rounded-full blur-3xl animate-pulse"></div>
                <img 
                  src="/logo.svg" 
                  alt="Caesar the Cat" 
                  className="w-48 h-48 mx-auto animate-caesar-float opacity-30 grayscale relative z-10" 
                />
              </div>
              
              <div className="space-y-8">
                <div className="space-y-4">
                  <h2 className="text-3xl font-thin text-gray-800 tracking-wide">
                    Connect to Enter
                  </h2>
                  <div className="w-12 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent mx-auto"></div>
                  <p className="text-gray-500 font-light max-w-sm mx-auto leading-relaxed">
                    The Emperor's arena awaits your wallet connection
                  </p>
                </div>
                
                <div className="pt-4">
                  <WalletButton />
                </div>
                
                {/* Minimal Features */}
                <div className="flex items-center justify-center gap-12 text-xs text-gray-400 font-mono pt-8">
                  <div className="text-center">
                    <div className="text-lg font-light text-czar-gold mb-1">⚡</div>
                    <div className="uppercase tracking-widest">Instant</div>
                  </div>
                  <div className="w-px h-8 bg-gray-200"></div>
                  <div className="text-center">
                    <div className="text-lg font-light text-czar-bronze mb-1">🎯</div>
                    <div className="uppercase tracking-widest">Fair</div>
                  </div>
                  <div className="w-px h-8 bg-gray-200"></div>
                  <div className="text-center">
                    <div className="text-lg font-light text-czar-silver mb-1">👑</div>
                    <div className="uppercase tracking-widest">Honor</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}