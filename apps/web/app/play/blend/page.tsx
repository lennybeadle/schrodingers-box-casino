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

export default function BlendPage() {
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();
  const pathname = usePathname();

  // Environment variables
  const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID || '0x0';
  const HOUSE_OBJECT_ID = process.env.NEXT_PUBLIC_HOUSE_OBJECT_ID || '0x0';
  const NETWORK = process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet';

  const [betAmount, setBetAmount] = useState<string>('0.1');
  const [depth, setDepth] = useState<number>(3); // Default depth 3
  const [isPlaying, setIsPlaying] = useState(false);
  const [lastResult, setLastResult] = useState<{
    success: boolean;
    message: string;
    txUrl?: string;
    isWinner?: boolean;
    payout?: number;
    stepsSurvived?: number;
    depth?: number;
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
  const multiplier = depth > 0 ? (97 * Math.pow(3, depth)) / (100 * Math.pow(2, depth)) : 0;
  const winProbability = depth > 0 ? (Math.pow(2, depth) * 100) / Math.pow(3, depth) : 100;
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
        message: 'Your bet is too large for the current house balance. Please reduce your bet amount or choose a lower depth.',
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
      txb.setGasBudget(100_000_000); // 0.1 SUI gas budget
      
      // Ensure depth is valid u8 (1-6)
      const validDepth = Math.min(Math.max(Math.floor(depth), 1), 6);
      
      console.log('Creating blend transaction:', {
        packageId: PACKAGE_ID,
        houseId: HOUSE_OBJECT_ID,
        depth: validDepth,
        amountMist,
        amountSui
      });
      
      const [coin] = txb.splitCoins(txb.gas, [amountMist]);

      txb.moveCall({
        target: `${PACKAGE_ID}::blend::play_blend`,
        arguments: [
          txb.pure.u8(validDepth),
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
      let stepsSurvived = 0;
      let message = 'Bet placed successfully!';

      try {
        await new Promise(resolve => setTimeout(resolve, 1000));

        const txResult = await suiClient.getTransactionBlock({
          digest: result.digest,
          options: { showEvents: true }
        });

        if (txResult.events && txResult.events.length > 0) {
          for (const event of txResult.events) {
            if (event.type && event.type.includes('BlendEvent')) {
              const eventData = event.parsedJson as any;
              isWinner = eventData.win;
              payout = parseInt(eventData.payout) / 1_000_000_000;
              stepsSurvived = parseInt(eventData.steps_survived);
              message = isWinner 
                ? `🎉 You survived all ${depth} steps! Won ${payout.toFixed(3)} SUI`
                : `😵 Blended at step ${stepsSurvived + 1}! Better luck next time.`;
              break;
            }
          }
        }
      } catch (error) {
        console.error('Error parsing events:', error);
      }

      const networkName = NETWORK === 'testnet' ? 'testnet' : 'mainnet';
      const txUrl = `https://suiscan.xyz/${networkName}/tx/${result.digest}`;

      setLastResult({
        success: true,
        message,
        txUrl,
        isWinner,
        payout,
        stepsSurvived,
        depth: validDepth
      });

      // Show appropriate image with delay
      setTimeout(() => {
        if (isWinner) {
          setShowWinImage(true);
        } else {
          setShowLossImage(true);
        }
      }, 300);

      // Refresh house balance
      await checkHouseBalance();

    } catch (error: any) {
      setIsPlaying(false);
      console.error('Error playing blend:', error);
      
      let errorMessage = 'Failed to play blend game';
      if (error.message) {
        if (error.message.includes('Insufficient balance')) {
          errorMessage = error.message;
        } else if (error.message.includes('rejected')) {
          errorMessage = 'Transaction was rejected';
        } else if (error.message.includes('InsufficientGas')) {
          errorMessage = 'Insufficient gas for transaction';
        }
      }

      setDialog({
        isOpen: true,
        title: 'Transaction Failed',
        message: errorMessage,
        type: 'error'
      });
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 relative transition-colors duration-300">
      <GameNavigation />
      <GameLockedOverlay 
        game="blend" 
        gameTitle="Will It Blend" 
        unlockMessage="Complete 10 Pump or Dump games to unlock Will It Blend! Survive the ladder by making it through all steps without getting blended." 
      />
      
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
          <div className="min-h-screen flex items-center justify-center px-6 pb-48">
            <div className="max-w-4xl mx-auto text-center space-y-16">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 via-purple-500/10 to-orange-500/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="relative">
                  <img 
                    src="https://fmijmundotmgtsemfdat.supabase.co/storage/v1/object/public/avatars/blend_win.webp" 
                    alt="Blend Cat" 
                    className="w-80 h-80 mx-auto animate-caesar-float filter drop-shadow-2xl opacity-90" 
                  />
                </div>
              </div>

              <div className="space-y-12">
                <div className="space-y-6">
                  <h1 className="text-6xl font-thin text-gray-900 dark:text-gray-100 tracking-tight leading-tight">
                    Will It <span className="bg-gradient-to-r from-orange-500 via-purple-500 to-orange-500 bg-clip-text text-transparent">Blend</span>
                  </h1>
                  
                  <div className="w-24 h-px bg-gradient-to-r from-transparent via-gray-400 dark:via-gray-500 to-transparent mx-auto"></div>
                  
                  <p className="text-lg text-gray-600 dark:text-gray-300 font-light max-w-2xl mx-auto leading-relaxed">
                    Survive the ladder! Each step has a 2/3 chance to survive. 
                    <br className="hidden sm:block" />
                    Choose your depth and risk it all for bigger rewards.
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-8 max-w-md mx-auto border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-light text-gray-700 dark:text-gray-300 mb-4">Connect wallet to blend</h3>
                  <SuiWalletButton />
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Game State */
          <div className="min-h-screen flex items-center justify-center px-6 pb-48">
            <div className="max-w-6xl mx-auto">
              <div className="grid lg:grid-cols-5 gap-16 items-center">
                
                {/* Left - Ladder Display */}
                <div className="lg:col-span-2 text-center space-y-8">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 via-purple-500/10 to-orange-500/10 rounded-full blur-3xl animate-pulse"></div>
                    
                    {/* Ladder Display */}
                    <div className="relative w-72 h-72 mx-auto">
                      {!lastResult || isPlaying ? (
                        /* Default/Loading State */
                        <div className="relative w-full h-full animate-caesar-float">
                          <img 
                            src="https://fmijmundotmgtsemfdat.supabase.co/storage/v1/object/public/avatars/blend_win.webp" 
                            alt="Will It Blend" 
                            className="w-full h-full object-contain filter drop-shadow-2xl"
                          />
                        </div>
                      ) : (
                        /* Result State */
                        <div className="w-full h-full relative animate-caesar-float">
                          {lastResult.success && lastResult.isWinner ? (
                            /* Win state - show survival with enhanced effects */
                            <>
                              <img 
                                src="https://fmijmundotmgtsemfdat.supabase.co/storage/v1/object/public/avatars/blend_win.webp"
                                alt="Survived - You Win!"
                                className={`absolute inset-0 w-full h-full object-contain filter drop-shadow-2xl transition-all duration-700 ease-in-out ${
                                  showWinImage ? 'opacity-100 filter brightness-125 saturate-150 contrast-110' : 'opacity-100'
                                }`}
                              />
                            </>
                          ) : (
                            /* Loss state - crossfade to blend */
                            <>
                              {/* Normal image */}
                              <img 
                                src="https://fmijmundotmgtsemfdat.supabase.co/storage/v1/object/public/avatars/blend_win.webp"
                                alt="Ladder"
                                className={`absolute inset-0 w-full h-full object-contain filter drop-shadow-2xl transition-opacity duration-700 ease-in-out ${
                                  showLossImage ? 'opacity-0' : 'opacity-100'
                                }`}
                              />
                              
                              {/* Blended image */}
                              <img 
                                src="https://fmijmundotmgtsemfdat.supabase.co/storage/v1/object/public/avatars/blend_lose.webp"
                                alt="Blended - Game Over"
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
                      Ladder Challenge
                    </h2>
                    <div className="w-16 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent mx-auto"></div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                      <p>Depth: {depth} • Win Probability: {winProbability.toFixed(1)}%</p>
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
                    gameName="Will It Blend"
                  />

                  {/* House Balance */}
                  <div className="text-center py-4 border-t border-gray-100 dark:border-gray-700">
                    <div className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">
                      House Balance
                    </div>
                    <div className={`text-xl font-mono ${houseBalance > 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {houseBalance.toFixed(3)} SUI
                    </div>
                  </div>

                  {/* Depth Selector */}
                  <div className="space-y-4">
                    <div className="text-center">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Ladder Depth</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Survive {depth} steps to win
                      </p>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                        <span>1 step (1.46x payout)</span>
                        <span>6 steps (49.22x payout)</span>
                      </div>
                      
                      <div className="relative">
                        <input
                          type="range"
                          min="1"
                          max="6"
                          value={depth}
                          onChange={(e) => setDepth(parseInt(e.target.value))}
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
                        <div className="text-2xl font-bold text-czar-gold">{depth} steps</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Win pays {multiplier.toFixed(2)}x incl. stake (3% edge)
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Unlock Progress */}
                  <UnlockProgress />

                  {/* Play Button */}
                  <div className="space-y-6">
                    <button 
                      onClick={handlePlay}
                      disabled={isPlaying || !currentAccount}
                      className="group relative w-full py-8 bg-gradient-to-r from-orange-600 via-purple-700 to-orange-600 text-white overflow-hidden transition-all duration-700 hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02]"
                      style={{ borderRadius: '2px' }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-orange-400 via-purple-400 to-orange-400 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                      <span className="relative z-10 flex items-center justify-center gap-4 text-xl font-light tracking-widest">
                        {isPlaying ? (
                          <>
                            <div className="w-6 h-6 border border-white/30 border-t-white rounded-full animate-spin"></div>
                            BLENDING...
                          </>
                        ) : (
                          <>
                            WILL IT BLEND?
                          </>
                        )}
                      </span>
                    </button>

                    {/* Result */}
                    {lastResult && (
                      <div className="text-center py-8 space-y-4 animate-in fade-in duration-1000">
                        <div className="text-6xl">
                          {lastResult.success && lastResult.isWinner ? '🏆' : '💥'}
                        </div>
                        <div className="space-y-2">
                          <div className={`text-2xl font-light ${
                            lastResult.success && lastResult.isWinner ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                          }`}>
                            {lastResult.success && lastResult.isWinner ? 'SURVIVED!' : 'BLENDED!'}
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

      {/* Footer */}
      <footer className="absolute bottom-0 left-0 right-0 px-6 py-8">
        <div className="max-w-7xl mx-auto text-center space-y-6">
          <div className="w-16 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent mx-auto"></div>
          
          <p className="text-xs text-gray-400 dark:text-gray-500 font-mono tracking-wider">
            Provably-Fair • On-Chain Sui Casino • Ultra-low fees
          </p>
          
          <div className="flex items-center justify-center gap-2 text-xs mb-4">
            <Link 
              href="/play" 
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors duration-300 underline decoration-dotted underline-offset-4"
            >
              Advanced Interface
            </Link>
          </div>
          
          <div className="flex items-center justify-center gap-6 text-xs">
            <a 
              href="https://www.youtube.com/@catsinofun" 
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors duration-300"
              title="YouTube"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </a>
            <a 
              href="https://www.tiktok.com/@catsinofun" 
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors duration-300"
              title="TikTok"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-.88-.05A6.33 6.33 0 0 0 5.76 20.3 6.33 6.33 0 0 0 17.47 14.5V6.7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-2.65-1.52z"/>
              </svg>
            </a>
            <a 
              href="https://x.com/catsinofun" 
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors duration-300"
              title="X (Twitter)"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
            <a 
              href="https://discord.gg/zaxbFxVBHE" 
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors duration-300"
              title="Discord"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0190 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9460 2.4189-2.1568 2.4189Z"/>
              </svg>
            </a>
          </div>
        </div>
      </footer>

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