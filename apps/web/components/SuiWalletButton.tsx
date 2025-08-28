'use client';

import { useCurrentAccount, useDisconnectWallet, useWallets, useConnectWallet } from '@mysten/dapp-kit';
import { useState, useEffect } from 'react';

export function SuiWalletButton() {
  const currentAccount = useCurrentAccount();
  const { mutate: disconnect } = useDisconnectWallet();
  const { mutate: connect } = useConnectWallet();
  const wallets = useWallets();
  const [mounted, setMounted] = useState(false);
  const [showWallets, setShowWallets] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleClick = () => {
    if (currentAccount) {
      disconnect();
    } else {
      setShowWallets(true);
    }
  };

  const handleWalletSelect = (walletName: string) => {
    const selectedWallet = wallets.find(w => w.name === walletName);
    if (selectedWallet) {
      connect({ wallet: selectedWallet });
      setShowWallets(false);
    }
  };

  const formatAddress = (address: string) => {
    if (address.length <= 8) return address;
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  if (!currentAccount) {
    return (
      <>
        <button
          onClick={handleClick}
          className="relative px-6 py-3 bg-gradient-to-r from-gray-800 to-gray-900 dark:from-gray-700 dark:to-gray-800 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 hover:from-gray-700 hover:to-gray-800 dark:hover:from-gray-600 dark:hover:to-gray-700"
        >
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-red-400 rounded-full"></div>
            <span className="text-sm">Connect Wallet</span>
            {mounted && wallets.length > 0 && (
              <div className="text-xs opacity-75 text-gray-300">({wallets.length} available)</div>
            )}
          </div>
        </button>
        
        {/* Custom Wallet Modal */}
        {showWallets && (
          <>
            <div 
              className="sui-wallet-overlay"
              onClick={() => setShowWallets(false)}
            />
            <div className="sui-wallet-modal p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Connect Wallet</h3>
                <button
                  onClick={() => setShowWallets(false)}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-3">
                {mounted && wallets.map((wallet) => (
                  <button
                    key={wallet.name}
                    onClick={() => handleWalletSelect(wallet.name)}
                    className="w-full flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  >
                    <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                      {wallet.name === 'Phantom' && '👻'}
                      {wallet.name === 'Sui Wallet' && '🌊'}
                      {wallet.name === 'Suiet' && '💎'}
                      {!['Phantom', 'Sui Wallet', 'Suiet'].includes(wallet.name) && '💼'}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-gray-900 dark:text-gray-100">{wallet.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {wallet.accounts.length > 0 ? 'Ready to connect' : 'Install & refresh'}
                      </div>
                    </div>
                  </button>
                ))}
                
                {(!mounted || wallets.length === 0) && (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">📱</div>
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">No Sui Wallets Found</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                      Install a Sui wallet extension to get started
                    </p>
                    <div className="space-y-2">
                      <a
                        href="https://chrome.google.com/webstore/detail/sui-wallet/opcgpfmipidbgpenhmajoajpbobppdil"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block px-4 py-2 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-800/50 text-blue-700 dark:text-blue-300 rounded-lg transition-colors text-sm"
                      >
                        Get Sui Wallet
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </>
    );
  }

  return (
    <button
      onClick={handleClick}
      className="relative px-6 py-3 bg-gradient-to-r from-gray-700 to-gray-800 dark:from-gray-600 dark:to-gray-700 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 hover:from-gray-600 hover:to-gray-700 dark:hover:from-gray-500 dark:hover:to-gray-600"
    >
      <div className="flex items-center space-x-2">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span className="text-sm font-mono">
          {formatAddress(currentAccount.address)}
        </span>
      </div>
    </button>
  );
}