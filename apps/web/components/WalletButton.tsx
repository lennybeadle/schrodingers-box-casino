'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';

export function WalletButton() {
  const { publicKey, disconnect } = useWallet();
  const { setVisible } = useWalletModal();

  if (publicKey) {
    return (
      <button
        onClick={disconnect}
        className="group relative px-6 py-3 bg-white/10 backdrop-blur-sm border border-white/20 text-slate-700 rounded-full hover:bg-white/20 transition-all duration-300 font-mono font-medium shadow-glass hover:shadow-neon"
      >
        <span className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-sm">
            {publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}
          </span>
          <svg className="w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={() => setVisible(true)}
      className="group relative px-8 py-4 bg-white/10 backdrop-blur-sm border border-white/30 text-slate-700 rounded-full hover:bg-white/20 transition-all duration-300 font-space font-semibold shadow-glass hover:shadow-neon hover:scale-105"
    >
      <span className="flex items-center gap-3">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <span>Connect Wallet</span>
        <div className="absolute inset-0 bg-cat-gradient opacity-0 group-hover:opacity-10 rounded-full transition-opacity duration-300"></div>
      </span>
    </button>
  );
}