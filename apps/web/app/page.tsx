'use client';

import Link from 'next/link';
import { WalletButton } from '@/components/WalletButton';
import { CatSVG } from '@/components/CatAnimation';
import { useWallet } from '@solana/wallet-adapter-react';

export default function Home() {
  const { publicKey } = useWallet();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-20 h-20 bg-cat-purple/10 rounded-full blur-xl animate-bounce-gentle"></div>
        <div className="absolute bottom-32 right-16 w-32 h-32 bg-cat-pink/10 rounded-full blur-xl animate-bounce-gentle" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-8 w-16 h-16 bg-cat-blue/10 rounded-full blur-xl animate-bounce-gentle" style={{animationDelay: '2s'}}></div>
      </div>

      <div className="max-w-5xl w-full text-center space-y-12 animate-slide-up relative z-10">
        {/* Main Title */}
        <div className="space-y-4">
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold font-space bg-cat-gradient bg-clip-text text-transparent leading-tight">
            Schrödinger's Box
          </h1>
          <div className="flex items-center justify-center gap-2 text-sm font-mono text-slate-500 uppercase tracking-wider">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            <span>Live on Solana Devnet</span>
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
          </div>
        </div>
        
        {/* Subtitle */}
        <p className="text-xl md:text-2xl text-slate-600 max-w-3xl mx-auto font-space font-light leading-relaxed">
          A <span className="text-cat-purple font-medium">quantum cat flip</span> game with provable fairness. 
          <br />
          Is the cat alive or did it use one of its nine lives? 
          <br />
          <span className="text-cat-pink font-medium">Place your bet and find out!</span>
        </p>
        
        {/* Cat SVG with enhanced container */}
        <div className="py-8">
          <div className="relative">
            <div className="absolute inset-0 bg-cat-gradient rounded-full opacity-20 blur-2xl animate-glow-pulse"></div>
            <div className="relative bg-white/60 backdrop-blur-sm rounded-full p-8 border border-white/20 shadow-glass">
              <CatSVG />
            </div>
          </div>
        </div>
        
        {/* Wallet & Play Buttons */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
            <WalletButton />
            
            {publicKey && (
              <Link
                href="/play"
                className="group relative px-8 py-4 bg-cat-gradient text-white rounded-full font-bold text-lg hover:shadow-neon-strong transform hover:scale-105 transition-all duration-300 overflow-hidden"
              >
                <span className="relative z-10">Start Playing</span>
                <div className="absolute inset-0 bg-gradient-to-r from-cat-pink to-cat-purple opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </Link>
            )}
          </div>

          {/* Stats Preview */}
          {publicKey && (
            <div className="flex items-center justify-center gap-8 text-sm font-mono text-slate-500">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-cat-purple rounded-full"></div>
                <span>50% Win Rate</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-cat-pink rounded-full"></div>
                <span>2% House Edge</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-cat-blue rounded-full"></div>
                <span>Instant Payout</span>
              </div>
            </div>
          )}
        </div>
        
        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
          <div className="group bg-white/40 backdrop-blur-sm rounded-2xl p-8 border border-white/20 shadow-glass hover:shadow-neon transition-all duration-300 hover:scale-105">
            <div className="text-4xl mb-4 group-hover:animate-bounce-gentle">🎲</div>
            <h3 className="font-bold font-space text-xl mb-3 text-slate-800">Provably Fair</h3>
            <p className="text-slate-600 font-space leading-relaxed">True 50/50 odds with Switchboard VRF randomness verification</p>
          </div>
          
          <div className="group bg-white/40 backdrop-blur-sm rounded-2xl p-8 border border-white/20 shadow-glass hover:shadow-neon transition-all duration-300 hover:scale-105" style={{transitionDelay: '100ms'}}>
            <div className="text-4xl mb-4 group-hover:animate-bounce-gentle">⚡</div>
            <h3 className="font-bold font-space text-xl mb-3 text-slate-800">Lightning Fast</h3>
            <p className="text-slate-600 font-space leading-relaxed">Instant on-chain settlement powered by Solana's speed</p>
          </div>
          
          <div className="group bg-white/40 backdrop-blur-sm rounded-2xl p-8 border border-white/20 shadow-glass hover:shadow-neon transition-all duration-300 hover:scale-105" style={{transitionDelay: '200ms'}}>
            <div className="text-4xl mb-4 group-hover:animate-bounce-gentle">💎</div>
            <h3 className="font-bold font-space text-xl mb-3 text-slate-800">Low House Edge</h3>
            <p className="text-slate-600 font-space leading-relaxed">Only 2% house edge = 1.96x payout multiplier</p>
          </div>
        </div>

        {/* Bottom CTA */}
        {!publicKey && (
          <div className="pt-8">
            <p className="text-slate-500 font-mono text-sm mb-4">Connect your wallet to start playing</p>
            <div className="flex items-center justify-center gap-2">
              <span className="text-xs text-slate-400 font-mono">Supported wallets:</span>
              <div className="flex gap-1">
                <span className="px-2 py-1 bg-slate-100 text-xs font-mono rounded">Phantom</span>
                <span className="px-2 py-1 bg-slate-100 text-xs font-mono rounded">Solflare</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}