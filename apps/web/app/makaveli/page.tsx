'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { SuiWalletButton } from '@/components/SuiWalletButton';
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';

export default function MakaveliPage() {
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();

  // Environment variables
  const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID || '0x0';
  const HOUSE_OBJECT_ID = process.env.NEXT_PUBLIC_HOUSE_OBJECT_ID || '0x0';
  const ADMIN_PASSCODE = process.env.NEXT_PUBLIC_ADMIN_PASSCODE || '';
  const NETWORK = process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet';

  const [isFunding, setIsFunding] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<string>('0.1');
  const [passcode, setPasscode] = useState<string>('');
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [houseBalance, setHouseBalance] = useState<number>(0);
  const [lastResult, setLastResult] = useState<{ success: boolean; message: string; txUrl?: string } | null>(null);

  // Check house balance
  const checkHouseBalance = async () => {
    try {
      const houseObject = await suiClient.getObject({
        id: HOUSE_OBJECT_ID,
        options: {
          showContent: true,
        }
      });

      const fields = (houseObject.data?.content as any)?.fields;
      let internalBalance = 0;
      if (fields) {
        internalBalance = parseInt(fields.balance) / 1_000_000_000;
      }

      let ownedCoinsBalance = 0;
      try {
        const coins = await suiClient.getCoins({
          owner: HOUSE_OBJECT_ID,
          coinType: '0x2::sui::SUI',
        });
        
        ownedCoinsBalance = coins.data.reduce((total, coin) => {
          return total + parseInt(coin.balance);
        }, 0) / 1_000_000_000;
      } catch (error) {
        console.log('No owned coins found for house object');
      }

      const totalBalance = internalBalance + ownedCoinsBalance;
      setHouseBalance(totalBalance);
      
    } catch (error) {
      console.error('Error checking house balance:', error);
      setHouseBalance(0);
    }
  };

  useEffect(() => {
    if (currentAccount?.address) {
      checkHouseBalance();
    }
  }, [currentAccount?.address]);

  // Fund house function
  const fundHouse = async (amount: string) => {
    if (!currentAccount?.address) return;
    
    setIsFunding(true);
    setLastResult(null);
    
    try {
      const amountInMist = Math.floor(parseFloat(amount) * 1_000_000_000);
      
      const tx = new Transaction();
      const [coin] = tx.splitCoins(tx.gas, [amountInMist]);
      
      tx.moveCall({
        target: `${PACKAGE_ID}::casino::fund_house`,
        arguments: [
          tx.object(HOUSE_OBJECT_ID),
          coin,
        ],
      });

      signAndExecuteTransaction(
        {
          transaction: tx,
        },
        {
          onSuccess: (result) => {
            const explorerUrl = `https://suiexplorer.com/txblock/${result.digest}?network=${NETWORK}`;
            setLastResult({ 
              success: true, 
              message: `Successfully funded house with ${amount} SUI!`, 
              txUrl: explorerUrl 
            });
            checkHouseBalance();
          },
          onError: (error) => {
            console.error('Funding error:', error);
            setLastResult({ 
              success: false, 
              message: `Failed to fund house: ${error.message}` 
            });
          },
        },
      );
    } catch (error) {
      console.error('Funding error:', error);
      setLastResult({ 
        success: false, 
        message: `Failed to fund house: ${error}` 
      });
    } finally {
      setIsFunding(false);
    }
  };

  // Withdraw function with passcode
  const initiateWithdrawal = () => {
    setShowPasscodeModal(true);
    setPasscode('');
  };

  const handleWithdrawal = async () => {
    if (passcode !== ADMIN_PASSCODE) {
      setLastResult({ success: false, message: 'Invalid passcode' });
      setShowPasscodeModal(false);
      return;
    }

    if (!currentAccount?.address) return;
    
    setIsWithdrawing(true);
    setLastResult(null);
    setShowPasscodeModal(false);
    
    try {
      const amountInMist = Math.floor(parseFloat(withdrawAmount) * 1_000_000_000);
      
      const tx = new Transaction();
      
      tx.moveCall({
        target: `${PACKAGE_ID}::casino::withdraw_profits`,
        arguments: [
          tx.object(HOUSE_OBJECT_ID),
          tx.pure.u64(amountInMist),
        ],
      });

      signAndExecuteTransaction(
        {
          transaction: tx,
        },
        {
          onSuccess: (result) => {
            const explorerUrl = `https://suiexplorer.com/txblock/${result.digest}?network=${NETWORK}`;
            setLastResult({ 
              success: true, 
              message: `Successfully withdrew ${withdrawAmount} SUI!`, 
              txUrl: explorerUrl 
            });
            checkHouseBalance();
          },
          onError: (error) => {
            console.error('Withdrawal error:', error);
            setLastResult({ 
              success: false, 
              message: `Failed to withdraw: ${error.message}` 
            });
          },
        },
      );
    } catch (error) {
      console.error('Withdrawal error:', error);
      setLastResult({ 
        success: false, 
        message: `Failed to withdraw: ${error}` 
      });
    } finally {
      setIsWithdrawing(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-caesar-black">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-caesar-gray">
        <Link href="/" className="text-2xl font-bold text-caesar-red hover:text-red-600 transition-colors">
          CatsinoFun
        </Link>
        <SuiWalletButton />
      </div>

      <div className="max-w-4xl mx-auto p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-caesar-red mb-2">🏛️ Admin Panel</h1>
          <p className="text-caesar-gray">House Management Controls</p>
        </div>

        {currentAccount?.address ? (
          <div className="space-y-8">
            {/* House Balance */}
            <div className="bg-caesar-light rounded-lg p-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">House Balance</h2>
                <button 
                  onClick={checkHouseBalance}
                  className="text-caesar-red hover:text-red-600 font-medium"
                >
                  🔄 Refresh
                </button>
              </div>
              <div className="text-3xl font-bold text-caesar-red mt-2">
                {houseBalance.toFixed(4)} SUI
              </div>
              <p className="text-caesar-gray text-sm mt-1">
                Shared balance across all games
              </p>
            </div>

            {/* Admin Controls */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Fund House */}
              <div className="bg-caesar-light rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">💰 Fund House</h3>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    {['0.1', '0.5', '1.0', '5.0'].map((amount) => (
                      <button
                        key={amount}
                        onClick={() => fundHouse(amount)}
                        disabled={isFunding}
                        className="px-3 py-2 bg-gradient-to-r from-slate-800 to-slate-700 text-white rounded-lg hover:from-slate-700 hover:to-slate-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                      >
                        {amount} SUI
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => fundHouse('1.0')}
                    disabled={isFunding}
                    className="w-full py-3 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-lg hover:from-green-500 hover:to-green-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                  >
                    {isFunding ? 'Funding...' : 'Fund House'}
                  </button>
                </div>
              </div>

              {/* Withdraw */}
              <div className="bg-caesar-light rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">💸 Withdraw Profits</h3>
                <div className="space-y-4">
                  <input
                    type="number"
                    step="0.001"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="Amount in SUI"
                    className="w-full px-4 py-2 border border-caesar-gray rounded-lg focus:outline-none focus:border-caesar-red"
                  />
                  <button
                    onClick={initiateWithdrawal}
                    disabled={isWithdrawing}
                    className="w-full py-3 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-lg hover:from-red-500 hover:to-red-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                  >
                    {isWithdrawing ? 'Withdrawing...' : 'Withdraw'}
                  </button>
                </div>
              </div>
            </div>

            {/* Game Links */}
            <div className="bg-caesar-light rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">🎮 Games</h3>
              <div className="grid grid-cols-2 gap-4">
                <Link
                  href="/play/coinflip"
                  className="p-4 bg-white rounded-lg border-2 border-caesar-gray hover:border-caesar-red transition-colors text-center"
                >
                  <div className="text-2xl mb-2">🪙</div>
                  <div className="font-semibold">CatFlip CoinFlip</div>
                </Link>
                <Link
                  href="/play/revolver"
                  className="p-4 bg-white rounded-lg border-2 border-caesar-gray hover:border-caesar-red transition-colors text-center"
                >
                  <div className="text-2xl mb-2">🎯</div>
                  <div className="font-semibold">Revolver Roulette</div>
                </Link>
              </div>
            </div>

            {/* Result Display */}
            {lastResult && (
              <div className={`p-4 rounded-lg ${lastResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                <p className="font-medium">{lastResult.message}</p>
                {lastResult.txUrl && (
                  <a 
                    href={lastResult.txUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-blue-600 hover:text-blue-800 underline text-sm mt-1 block"
                  >
                    View Transaction →
                  </a>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-xl text-caesar-gray mb-4">Connect your wallet to access admin controls</p>
            <SuiWalletButton />
          </div>
        )}
      </div>

      {/* Passcode Modal */}
      {showPasscodeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Enter Admin Passcode</h3>
            <input
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Passcode"
              className="w-full px-4 py-2 border border-caesar-gray rounded-lg focus:outline-none focus:border-caesar-red mb-4"
              onKeyPress={(e) => e.key === 'Enter' && handleWithdrawal()}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowPasscodeModal(false)}
                className="flex-1 py-2 px-4 bg-caesar-gray text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleWithdrawal}
                className="flex-1 py-2 px-4 bg-caesar-red text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}