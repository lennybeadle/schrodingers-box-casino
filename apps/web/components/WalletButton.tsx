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
        className="group relative px-4 py-2 bg-caesar-gray border border-gray-300 text-gray-700 rounded-full hover:bg-white hover:border-czar-gold transition-all duration-300 font-mono font-medium shadow-clean-shadow hover:shadow-caesar-glow"
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
      className="group relative px-6 py-3 bg-caesar-gradient text-white rounded-full font-bold hover:shadow-caesar-glow transform hover:scale-105 transition-all duration-300 overflow-hidden"
    >
      <span className="flex items-center gap-3">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <span>Connect Wallet</span>
        <div className="absolute inset-0 bg-czar-gradient opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      </span>
    </button>
  );
}