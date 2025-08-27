'use client';

import { useWalletKit } from '@mysten/wallet-kit';

export function SuiWalletButton() {
  const { isConnected, currentAccount, connect, disconnect } = useWalletKit();

  const handleClick = () => {
    if (isConnected) {
      disconnect();
    } else {
      connect();
    }
  };

  const formatAddress = (address: string) => {
    if (address.length <= 8) return address;
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  return (
    <button
      onClick={handleClick}
      className="relative px-6 py-3 bg-gradient-to-r from-czar-gold via-caesar-gold to-czar-bronze text-black font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
    >
      <div className="flex items-center space-x-2">
        {isConnected ? (
          <>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-mono">
              {currentAccount ? formatAddress(currentAccount.address) : 'Connected'}
            </span>
          </>
        ) : (
          <>
            <div className="w-2 h-2 bg-red-400 rounded-full"></div>
            <span className="text-sm">Connect Sui Wallet</span>
          </>
        )}
      </div>
    </button>
  );
}