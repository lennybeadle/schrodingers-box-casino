'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { SuiWalletButton } from '@/components/SuiWalletButton';
import { BettingPanel } from '@/components/BettingPanel';
import { GameNavigation } from '@/components/GameNavigation';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Dialog } from '@/components/Dialog';
import { GameLockedOverlay } from '@/components/GameLockedOverlay';
import { UnlockProgress } from '@/components/UnlockProgress';
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';

export default function PumpPage() {
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();
  const pathname = usePathname();

  // Environment variables
  const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID || '0x0';
  const HOUSE_OBJECT_ID = process.env.NEXT_PUBLIC_HOUSE_OBJECT_ID || '0x0';
  const NETWORK = process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet';

  const [betAmount, setBetAmount] = useState<string>('0.1');
  const [threshold, setThreshold] = useState<number>(50); // Default 50% win chance
  const [isPlaying, setIsPlaying] = useState(false);
  const [lastResult, setLastResult] = useState<{
    success: boolean;
    message: string;
    txUrl?: string;
    isWinner?: boolean;
    payout?: number;
    randomResult?: number;
    threshold?: number;
  } | null>(null);
  const [showWinImage, setShowWinImage] = useState(false);
  const [showLossImage, setShowLossImage] = useState(false);
  const [houseBalance, setHouseBalance] = useState<number>(0);
  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'error' | 'warning' | 'info' | 'success';
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  // Calculate multiplier and win probability
  const multiplier = threshold > 0 ? 97 / threshold : 0;
  const winProbability = threshold;
  const potentialPayout = parseFloat(betAmount || '0') * multiplier;

  // Check house balance
  const checkHouseBalance = async () => {
    try {
      const houseObject = await suiClient.getObject({
        id: HOUSE_OBJECT_ID,
        options: { showContent: true }
      });

      const fields = (houseObject.data?.content as any)?.fields;
      let internalBalance = 0;
      if (fields) {
        internalBalance = parseInt(fields.balance) / 1_000_000_000;
      }

      let ownedCoinsBalance = 0;
      try {
        const balance = await suiClient.getBalance({ owner: HOUSE_OBJECT_ID });
        ownedCoinsBalance = parseInt(balance.totalBalance) / 1_000_000_000;
      } catch (error) {
        console.log('Could not get owned coins balance:', error);
      }

      const totalBalance = internalBalance + ownedCoinsBalance;
      setHouseBalance(totalBalance);
    } catch (error) {
      console.error('Failed to fetch house balance:', error);
    }
  };

  // Load house balance on mount
  useEffect(() => {
    if (currentAccount) {
      checkHouseBalance();
    }
  }, [currentAccount, HOUSE_OBJECT_ID]);

  const handlePlay = async () => {
    if (!currentAccount) {
      setDialog({
        isOpen: true,
        title: 'Wallet Required',
        message: 'Please connect your Sui wallet first',
        type: 'warning'
      });
      return;
    }

    // Check if bet exceeds house balance capacity
    const maxPayout = potentialPayout;
    if (maxPayout > houseBalance * 0.2) {
      setDialog({
        isOpen: true,
        title: 'Bet Too Large',
        message: 'Your bet is too large for the current house balance. Please reduce your bet amount or choose a higher threshold.',
        type: 'warning'
      });
      return;
    }

    setLastResult(null);
    setShowWinImage(false);
    setShowLossImage(false);
    setIsPlaying(true);

    try {
      const amountSui = parseFloat(betAmount);
      const amountMist = Math.floor(amountSui * 1_000_000_000);

      // Check wallet balance
      const balance = await suiClient.getBalance({ owner: currentAccount.address });
      const balanceSui = parseInt(balance.totalBalance) / 1_000_000_000;

      if (balanceSui < amountSui) {
        throw new Error(`Insufficient balance. You have ${balanceSui} SUI, need ${amountSui} SUI`);
      }

      // Create transaction
      const txb = new Transaction();
      const [coin] = txb.splitCoins(txb.gas, [amountMist]);

      txb.moveCall({
        target: `${PACKAGE_ID}::pump::play_pump_or_dump`,
        arguments: [
          txb.pure.u8(threshold),
          coin,
          txb.object('0x8'), // Random object
          txb.object(HOUSE_OBJECT_ID),
        ],
      });

      const result = await new Promise<any>((resolve, reject) => {
        signAndExecuteTransaction(
          { transaction: txb },
          {
            onSuccess: (data) => {
              console.log('Transaction successful:', data);
              setIsPlaying(false);
              resolve(data);
            },
            onError: (error) => {
              console.error('Transaction failed:', error);
              setIsPlaying(false);
              reject(error);
            },
          }
        );
      });

      // Parse events to get result
      let isWinner = false;
      let payout = 0;
      let randomResult = 0;
      let message = 'Bet placed successfully!';

      try {
        await new Promise(resolve => setTimeout(resolve, 1000));

        const txResult = await suiClient.getTransactionBlock({
          digest: result.digest,
          options: { showEvents: true }
        });

        if (txResult.events && txResult.events.length > 0) {
          for (const event of txResult.events) {
            if (event.type && event.type.includes('PumpEvent')) {
              const eventData = event.parsedJson as any;
              isWinner = eventData.win;
              payout = parseInt(eventData.payout) / 1_000_000_000;
              randomResult = parseInt(eventData.result);

              console.log('✅ PumpEvent found!', {
                isWinner,
                payout: eventData.payout,
                randomResult,
                threshold: eventData.threshold
              });

              message = isWinner
                ? `🚀 PUMP! You won ${payout.toFixed(3)} SUI! (Rolled: ${randomResult}, Threshold: ${threshold})`
                : `📉 DUMP! You lost. (Rolled: ${randomResult}, Threshold: ${threshold})`;
              break;
            }
          }
        }
      } catch (eventError) {
        console.error('Error fetching events:', eventError);
        message = 'Bet placed successfully! Check the advanced interface for results once indexing completes.';
      }

      const explorerUrl = NETWORK === 'mainnet'
        ? `https://suiexplorer.com/txblock/${result.digest}`
        : `https://suiexplorer.com/txblock/${result.digest}?network=${NETWORK}`;

      const gameResult = {
        success: true,
        message,
        txUrl: explorerUrl,
        isWinner,
        payout,
        randomResult,
        threshold
      };

      setLastResult(gameResult);

      // Show appropriate image after a delay
      setTimeout(() => {
        if (isWinner) {
          setShowWinImage(true);
        } else {
          setShowLossImage(true);
        }
      }, 1000);

    } catch (error: any) {
      console.error('Play failed:', error);
      setLastResult({
        success: false,
        message: error.message || 'Transaction failed'
      });
      setIsPlaying(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
      <GameLockedOverlay 
        game="pump"
        gameTitle="Pump or Dump" 
        unlockMessage="Complete 25 Revolver Roulette games to unlock the market prediction arena."
      />
      <GameNavigation />
      
      {/* Network Status Banner */}
      <div className={`px-6 py-3 ${
        NETWORK === 'mainnet' 
          ? 'bg-green-500/10 dark:bg-green-500/20 border-green-500/20 dark:border-green-500/30' 
          : 'bg-blue-500/10 dark:bg-blue-500/20 border-blue-500/20 dark:border-blue-500/30'
      }`}>
        <div className="max-w-7xl mx-auto text-center">
          <p className={`text-sm font-medium ${
            NETWORK === 'mainnet' ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'
          }`}>
            {NETWORK === 'mainnet' 
              ? '🚀 SUI MAINNET - Real SUI betting with ultra-low fees!'
              : '🌊 SUI TESTNET - Use testnet SUI for testing • Much cheaper than Solana!'
            }
          </p>
        </div>
      </div>

      {/* Navigation Header */}
      <nav className="relative z-50 px-6 py-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
              <img src="/logo.svg" alt="CatsinoFun Logo" className="w-8 h-8" />
              <span className="font-light text-xl tracking-wide text-gray-900 dark:text-gray-100">
                CatsinoFun
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-6">
            <ThemeToggle />
            <SuiWalletButton />
          </div>
        </div>
      </nav>

      <main className="relative">
        {!currentAccount ? (
          /* Welcome State */
          <div className="min-h-screen flex items-center justify-center px-6 pb-32">
            <div className="max-w-4xl mx-auto text-center space-y-16">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 via-red-500/10 to-green-500/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="relative">
                  <img 
                    src="https://fmijmundotmgtsemfdat.supabase.co/storage/v1/object/public/avatars/pump.webp" 
                    alt="Pump Cat" 
                    className="w-80 h-80 mx-auto animate-caesar-float filter drop-shadow-2xl opacity-90" 
                  />
                </div>
              </div>

              <div className="space-y-12">
                <div className="space-y-6">
                  <h1 className="text-6xl font-thin text-gray-900 dark:text-gray-100 tracking-tight leading-tight">
                    Pump or <span className="bg-gradient-to-r from-green-500 via-red-500 to-green-500 bg-clip-text text-transparent">Dump</span>
                  </h1>
                  
                  <div className="w-24 h-px bg-gradient-to-r from-transparent via-gray-400 dark:via-gray-500 to-transparent mx-auto"></div>
                  
                  <p className="text-lg text-gray-600 dark:text-gray-300 font-light max-w-2xl mx-auto leading-relaxed">
                    Predict the market with threshold-based betting. 
                    <br className="hidden sm:block" />
                    Choose your win probability and multiplier.
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-8 max-w-md mx-auto border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-light text-gray-700 dark:text-gray-300 mb-4">Connect wallet to trade</h3>
                  <SuiWalletButton />
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Game State */
          <div className="min-h-screen flex items-center justify-center px-6 pb-32">
            <div className="max-w-6xl mx-auto">
              <div className="grid lg:grid-cols-5 gap-16 items-center">
                
                {/* Left - Market Display */}
                <div className="lg:col-span-2 text-center space-y-8">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 via-red-500/10 to-green-500/10 rounded-full blur-3xl animate-pulse"></div>
                    
                    {/* Market Display */}
                    <div className="relative w-72 h-72 mx-auto">
                      {!lastResult || isPlaying ? (
                        /* Default/Loading State */
                        <div className="relative w-full h-full animate-caesar-float">
                          <img 
                            src="https://fmijmundotmgtsemfdat.supabase.co/storage/v1/object/public/avatars/pump.webp" 
                            alt="Market Pump" 
                            className="w-full h-full object-contain filter drop-shadow-2xl"
                          />
                        </div>
                      ) : (
                        /* Result State */
                        <div className="w-full h-full relative animate-caesar-float">
                          {lastResult.success && lastResult.isWinner ? (
                            /* Win state - show pump with enhanced effects */
                            <>
                              <img 
                                src="https://fmijmundotmgtsemfdat.supabase.co/storage/v1/object/public/avatars/pump.webp"
                                alt="Pump - You Win!"
                                className={`absolute inset-0 w-full h-full object-contain filter drop-shadow-2xl transition-all duration-700 ease-in-out ${
                                  showWinImage ? 'opacity-100 filter brightness-125 saturate-150 contrast-110' : 'opacity-100'
                                }`}
                              />
                            </>
                          ) : (
                            /* Loss state - crossfade to dump */
                            <>
                              {/* Normal pump image */}
                              <img 
                                src="https://fmijmundotmgtsemfdat.supabase.co/storage/v1/object/public/avatars/pump.webp"
                                alt="Market"
                                className={`absolute inset-0 w-full h-full object-contain filter drop-shadow-2xl transition-opacity duration-700 ease-in-out ${
                                  showLossImage ? 'opacity-0' : 'opacity-100'
                                }`}
                              />
                              
                              {/* Dump image */}
                              <img 
                                src="https://fmijmundotmgtsemfdat.supabase.co/storage/v1/object/public/avatars/dump.webp"
                                alt="Dump - Market Crashed"
                                className={`absolute inset-0 w-full h-full object-contain filter drop-shadow-2xl transition-all duration-700 ease-in-out ${
                                  showLossImage 
                                    ? 'opacity-100 filter grayscale brightness-50 contrast-75 saturate-0' 
                                    : 'opacity-0'
                                }`}
                              />
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h2 className="text-4xl font-thin text-gray-900 dark:text-gray-100">
                      Market Prediction
                    </h2>
                    <div className="w-16 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent mx-auto"></div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                      <p>Threshold: {threshold}% • Win Probability: {winProbability}%</p>
                      <p>Multiplier: {multiplier.toFixed(2)}x • 3% House Edge</p>
                    </div>
                  </div>
                </div>

                {/* Center - Divider */}
                <div className="hidden lg:block lg:col-span-1">
                  <div className="w-px h-96 bg-gradient-to-b from-transparent via-gray-200 dark:via-gray-700 to-transparent mx-auto"></div>
                </div>

                {/* Right - The Interface */}
                <div className="lg:col-span-2 space-y-12">
                  
                  {/* Betting Panel */}
                  <BettingPanel
                    betAmount={betAmount}
                    setBetAmount={setBetAmount}
                    multiplier={multiplier}
                    isPlaying={isPlaying}
                    gameName="Pump or Dump"
                  />

                  {/* Threshold Slider */}
                  <div className="space-y-4">
                    <div className="text-center">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Win Threshold</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Win if random result &lt; {threshold}
                      </p>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                        <span>1% (97x payout)</span>
                        <span>98% (0.99x payout)</span>
                      </div>
                      
                      <div className="relative">
                        <input
                          type="range"
                          min="1"
                          max="98"
                          value={threshold}
                          onChange={(e) => setThreshold(parseInt(e.target.value))}
                          disabled={isPlaying}
                          className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                        />
                        <style jsx>{`
                          .slider::-webkit-slider-thumb {
                            appearance: none;
                            width: 24px;
                            height: 24px;
                            border-radius: 50%;
                            background: linear-gradient(45deg, #d4af37, #ffd700, #b8860b);
                            cursor: pointer;
                            border: 2px solid white;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                          }
                          .slider::-moz-range-thumb {
                            width: 24px;
                            height: 24px;
                            border-radius: 50%;
                            background: linear-gradient(45deg, #d4af37, #ffd700, #b8860b);
                            cursor: pointer;
                            border: 2px solid white;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                          }
                        `}</style>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-2xl font-bold text-czar-gold">{threshold}%</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Win pays {multiplier.toFixed(2)}x incl. stake (3% edge)
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Unlock Progress */}
                  <div className="py-4">
                    <UnlockProgress />
                  </div>

                  {/* Play Button */}
                  <div className="space-y-6">
                    <button 
                      onClick={handlePlay}
                      disabled={isPlaying || !currentAccount}
                      className="group relative w-full py-8 bg-gradient-to-r from-green-600 via-green-700 to-red-600 text-white overflow-hidden transition-all duration-700 hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02]"
                      style={{ borderRadius: '2px' }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-green-400 via-yellow-400 to-red-400 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                      <span className="relative z-10 flex items-center justify-center gap-4 text-xl font-light tracking-widest">
                        {isPlaying ? (
                          <>
                            <div className="w-6 h-6 border border-white/30 border-t-white rounded-full animate-spin"></div>
                            READING MARKET
                          </>
                        ) : (
                          <>
                            PUMP OR DUMP
                          </>
                        )}
                      </span>
                    </button>

                    {/* Result */}
                    {lastResult && (
                      <div className="text-center py-8 space-y-4 animate-in fade-in duration-1000">
                        <div className="text-6xl">
                          {lastResult.success && lastResult.isWinner ? '🚀' : '📉'}
                        </div>
                        <div className="space-y-2">
                          <div className={`text-2xl font-light ${
                            lastResult.success && lastResult.isWinner ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                          }`}>
                            {lastResult.success && lastResult.isWinner ? 'PUMPED!' : 'DUMPED!'}
                          </div>
                          <div className="text-sm font-mono text-gray-600 dark:text-gray-300">
                            {lastResult.message}
                          </div>
                          {lastResult.txUrl && (
                            <div className="text-xs">
                              <a 
                                href={lastResult.txUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-czar-gold hover:underline"
                              >
                                View Transaction →
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Dialog */}
      <Dialog
        isOpen={dialog.isOpen}
        onClose={() => setDialog(prev => ({ ...prev, isOpen: false }))}
        title={dialog.title}
        message={dialog.message}
        type={dialog.type}
      />
    </div>
  );
}