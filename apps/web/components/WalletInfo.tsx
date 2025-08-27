'use client';

import { useWallets } from '@mysten/dapp-kit';
import { useEffect, useState } from 'react';

export function WalletInfo() {
  const wallets = useWallets();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="bg-white/50 backdrop-blur-sm border border-gray-200 rounded-lg p-6 max-w-4xl mx-auto">
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900 mb-2">Loading wallet information...</div>
        </div>
      </div>
    );
  }

  const supportedWallets = [
    { name: 'Sui Wallet', description: 'Official Sui wallet browser extension', icon: '🌊' },
    { name: 'Suiet', description: 'Multi-chain wallet with Sui support', icon: '💎' },
    { name: 'Phantom', description: 'Popular crypto wallet with Sui integration', icon: '👻' },
    { name: 'OKX Wallet', description: 'Global crypto exchange wallet', icon: '⭕' },
    { name: 'Backpack', description: 'Modern crypto wallet', icon: '🎒' },
    { name: 'Ledger', description: 'Hardware wallet via browser', icon: '🔒' },
    { name: 'Martian', description: 'Multi-chain wallet', icon: '🚀' },
    { name: 'Ethos', description: 'Sui-focused wallet', icon: '🛡️' },
  ];

  return (
    <div className="bg-white/50 backdrop-blur-sm border border-gray-200 rounded-lg p-6 max-w-4xl mx-auto">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Supported Sui Wallets
        </h3>
        <p className="text-sm text-gray-600">
          Connect with any of these wallets to play CATSINO
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {supportedWallets.map((wallet) => {
          const isDetected = wallets.some(w => 
            w.name.toLowerCase().includes(wallet.name.toLowerCase())
          );
          
          return (
            <div
              key={wallet.name}
              className={`p-4 rounded-lg border transition-all duration-200 ${
                isDetected
                  ? 'border-green-200 bg-green-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="text-2xl">{wallet.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium text-gray-900">{wallet.name}</h4>
                    {isDetected && (
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{wallet.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-center mt-6">
        <div className="text-sm text-gray-500">
          <strong>{wallets.length}</strong> wallet{wallets.length !== 1 ? 's' : ''} detected
        </div>
        {wallets.length === 0 && (
          <p className="text-xs text-amber-600 mt-2">
            💡 Install any of the above wallet extensions to get started
          </p>
        )}
      </div>
    </div>
  );
}