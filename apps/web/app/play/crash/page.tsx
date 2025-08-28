'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { SuiWalletButton } from '@/components/SuiWalletButton';
import { BettingPanel } from '@/components/BettingPanel';
import { GameNavigation } from '@/components/GameNavigation';
import { Motorcycle } from '@/components/Motorcycle';
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';

export default function CrashPage() {
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();
  const pathname = usePathname();

  // Environment variables
  const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID || '0x0';
  const HOUSE_OBJECT_ID = process.env.NEXT_PUBLIC_HOUSE_OBJECT_ID || '0x0';
  const NETWORK = process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet';
  
  const [betAmount, setBetAmount] = useState<string>('0.1');
  const [targetMultiplier, setTargetMultiplier] = useState<number>(200); // 2.00x
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentMultiplier, setCurrentMultiplier] = useState<number>(100); // 1.00x
  const [lastResult, setLastResult] = useState<{ 
    success: boolean; 
    message: string; 
    txUrl?: string; 
    crashMultiplier?: number;
    targetMultiplier?: number;
    isWinner?: boolean;
    payout?: number;
  } | null>(null);
  const [houseBalance, setHouseBalance] = useState<number>(0);
  const [isFunding, setIsFunding] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<string>('0.1');
  const [passcode, setPasscode] = useState<string>('');
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [gameHistory, setGameHistory] = useState<Array<{
    stake: number;
    target: number;
    crash: number;
    win: boolean;
    payout: number;
    txUrl: string;
  }>>([]);

  // Target multiplier options
  const targetOptions = [
    { label: '1.20×', value: 120 },
    { label: '1.50×', value: 150 },
    { label: '2.00×', value: 200 },
    { label: '3.00×', value: 300 },
    { label: '5.00×', value: 500 },
  ];

  // Multiplier counting effect during animation
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    let startTime: number | null = null;
    
    if (isAnimating) {
      setCurrentMultiplier(100); // Start at 1.00x
      startTime = Date.now();
      
      intervalId = setInterval(() => {
        setCurrentMultiplier(prev => {
          const elapsed = Date.now() - (startTime || 0);
          
          // Create a realistic crash curve - multiplier increases faster early on, then slows
          const timeInSeconds = elapsed / 1000;
          const baseMultiplier = 100 + (timeInSeconds * 30) + (Math.pow(timeInSeconds, 1.5) * 10);
          
          // Add some randomness for realism
          const randomVariation = (Math.random() - 0.5) * 5;
          const newMultiplier = baseMultiplier + randomVariation;
          
          // Cap at a reasonable maximum for display purposes
          return Math.min(newMultiplier, 1000);
        });
      }, 50); // Update every 50ms for smooth counting
    } else {
      setCurrentMultiplier(100); // Reset when not animating
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isAnimating]);

  // Calculate potential payout with 3% house edge (97% payout)
  const calculatePayout = (stake: number, target: number) => {
    return (stake * target * 0.97) / 100;
  };

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

  // Fund the house
  const handleFundHouse = async () => {
    if (!currentAccount) {
      alert('Please connect your Sui wallet first');
      return;
    }

    setIsFunding(true);
    try {
      const fundAmount = 1.0;
      const amountMist = Math.floor(fundAmount * 1_000_000_000);

      const tx = new Transaction();
      
      // Set explicit gas budget to help wallet estimate fees
      tx.setGasBudget(10_000_000); // 0.01 SUI
      
      const [coin] = tx.splitCoins(tx.gas, [amountMist]);
      
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
              message: 'House funded successfully! You can now place bets.', 
              txUrl: explorerUrl 
            });
            checkHouseBalance();
          },
          onError: (error) => {
            console.error('House funding failed:', error);
            setLastResult({ 
              success: false, 
              message: `Failed to fund house: ${error.message}` 
            });
          },
        },
      );
    } catch (error) {
      console.error('Fund house failed:', error);
      setLastResult({ 
        success: false, 
        message: `Failed to fund house: ${error}` 
      });
    } finally {
      setIsFunding(false);
    }
  };

  // Initiate withdrawal with passcode prompt
  const initiateWithdrawal = () => {
    setShowPasscodeModal(true);
    setPasscode('');
  };

  // Withdraw profits from the house
  const handleWithdrawProfits = async () => {
    if (!currentAccount) {
      alert('Please connect your Sui wallet first');
      return;
    }

    const correctPasscode = process.env.NEXT_PUBLIC_ADMIN_PASSCODE || '21563';
    if (passcode !== correctPasscode) {
      alert('❌ Invalid passcode');
      return;
    }

    setIsWithdrawing(true);
    setShowPasscodeModal(false);
    try {
      const withdrawAmountSui = parseFloat(withdrawAmount);
      const withdrawAmountMist = Math.floor(withdrawAmountSui * 1_000_000_000);

      const tx = new Transaction();
      
      // Set explicit gas budget to help wallet estimate fees
      tx.setGasBudget(10_000_000); // 0.01 SUI
      
      tx.moveCall({
        target: `${PACKAGE_ID}::casino::withdraw_profits`,
        arguments: [
          tx.object(HOUSE_OBJECT_ID),
          tx.pure.u64(withdrawAmountMist),
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
              message: `Successfully withdrew ${withdrawAmountSui} SUI!`, 
              txUrl: explorerUrl 
            });
            checkHouseBalance();
          },
          onError: (error) => {
            console.error('Withdrawal failed:', error);
            setLastResult({ 
              success: false, 
              message: `Failed to withdraw: ${error.message}` 
            });
          },
        },
      );
    } catch (error) {
      console.error('Withdraw profits failed:', error);
      setLastResult({ 
        success: false, 
        message: `Failed to withdraw: ${error}` 
      });
    } finally {
      setIsWithdrawing(false);
    }
  };

  // Play the crash game
  const handlePlay = async () => {
    if (!currentAccount?.address) {
      alert('Please connect your Sui wallet first');
      return;
    }

    const stake = parseFloat(betAmount);
    const potentialPayout = calculatePayout(stake, targetMultiplier);

    if (potentialPayout > houseBalance * 0.8) {
      alert('Bet too large for current house balance. Please reduce your bet or target multiplier.');
      return;
    }

    setIsPlaying(true);
    setLastResult(null);

    try {
      const stakeInMist = Math.floor(stake * 1_000_000_000);

      const tx = new Transaction();
      const [coin] = tx.splitCoins(tx.gas, [stakeInMist]);

      tx.moveCall({
        target: `${PACKAGE_ID}::crash::play`,
        arguments: [
          tx.object('0x8'), // Random object
          tx.object(HOUSE_OBJECT_ID),
          tx.pure.u64(targetMultiplier),
          coin,
        ],
      });

      signAndExecuteTransaction(
        {
          transaction: tx,
        },
        {
          onSuccess: async (result) => {
            console.log('Crash game transaction successful:', result);
            
            // Start the animation now that transaction is confirmed
            setIsAnimating(true);
            
            // Parse the crash event from transaction events
            let crashMultiplier = 150;
            let isWinner = false;
            let payout = 0;

            // Fetch transaction details to get events
            try {
              const txResult = await suiClient.getTransactionBlock({
                digest: result.digest,
                options: { showEvents: true }
              });

              if (txResult.events && txResult.events.length > 0) {
                const crashEvent = txResult.events.find(event => 
                  event.type && event.type.includes('crash::CrashEvent')
                );

                if (crashEvent && crashEvent.parsedJson) {
                  const eventData = crashEvent.parsedJson as any;
                  crashMultiplier = parseInt(eventData.crash_x100);
                  isWinner = eventData.win;
                  payout = parseInt(eventData.payout) / 1_000_000_000;
                }
              }
            } catch (eventError) {
              console.warn('Could not fetch events:', eventError);
            }

            const explorerUrl = `https://suiexplorer.com/txblock/${result.digest}?network=${NETWORK}`;

            // Add to game history
            setGameHistory(prev => [{
              stake,
              target: targetMultiplier,
              crash: crashMultiplier,
              win: isWinner,
              payout,
              txUrl: explorerUrl
            }, ...prev.slice(0, 4)]);

            // Wait for animation to complete
            setTimeout(() => {
              // Set the final crash multiplier before stopping animation
              setCurrentMultiplier(crashMultiplier);
              
              setLastResult({
                success: true,
                message: isWinner 
                  ? `🎉 You won! Cashed out at ${targetMultiplier / 100}×!`
                  : `💥 Crashed at ${crashMultiplier / 100}×! Better luck next time.`,
                txUrl: explorerUrl,
                crashMultiplier,
                targetMultiplier,
                isWinner,
                payout
              });
              
              // Stop animation after a brief moment to show the final multiplier
              setTimeout(() => {
                setIsAnimating(false);
                setIsPlaying(false);
                checkHouseBalance();
              }, 500);
            }, 3000);
          },
          onError: async (error) => {
            console.error('Crash game failed:', error);
            
            // Check if this might be a wallet communication error after signing
            const errorMessage = error.message || error.toString();
            if (errorMessage.includes('channel closed') || 
                errorMessage.includes('Unexpected error') ||
                errorMessage.includes('listener indicated')) {
              
              // The transaction might have succeeded despite the communication error
              // Show a message and wait a bit to see if we can find the transaction
              setLastResult({
                success: false,
                message: "⚠️ Wallet communication lost. Checking if transaction went through..."
              });
              
              // Wait a moment and provide helpful guidance
              setTimeout(() => {
                setLastResult({
                  success: false,
                  message: "⚠️ Connection lost after signing. Check your wallet history - if the transaction succeeded, you'll see the result there. You may need to refresh the page."
                });
                setIsAnimating(false);
                setIsPlaying(false);
              }, 2000);
              
            } else {
              setLastResult({
                success: false,
                message: `Game failed: ${errorMessage}`
              });
              setIsAnimating(false);
              setIsPlaying(false);
            }
          },
        },
      );
    } catch (error) {
      console.error('Crash game error:', error);
      
      const errorMessage = error?.toString() || 'Unknown error';
      if (errorMessage.includes('channel closed') || 
          errorMessage.includes('Unexpected error') ||
          errorMessage.includes('listener indicated')) {
        setLastResult({
          success: false,
          message: "⚠️ Wallet connection lost. If you signed the transaction, check your wallet history to see if it went through."
        });
      } else {
        setLastResult({
          success: false,
          message: `Transaction error: ${errorMessage}`
        });
      }
      setIsAnimating(false);
    } finally {
      setIsPlaying(false);
    }
  };

  useEffect(() => {
    if (currentAccount) {
      checkHouseBalance();
    }
  }, [currentAccount]);

  return (
    <div className="min-h-screen bg-white">
      <GameNavigation />
      {/* Sui Network Banner */}
      <div className={`border-b px-6 py-2 ${
        NETWORK === 'mainnet' 
          ? 'bg-green-500/10 border-green-500/20' 
          : 'bg-blue-500/10 border-blue-500/20'
      }`}>
        <div className="max-w-7xl mx-auto text-center">
          <p className={`text-sm font-medium ${
            NETWORK === 'mainnet' ? 'text-green-600' : 'text-blue-600'
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
              <img 
                src="/logo.svg" 
                alt="CatsinoFun Logo" 
                className="w-8 h-8" 
              />
              <span className="font-light text-xl tracking-wide text-gray-900">
                CatsinoFun
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-6">
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
                <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-orange-500/5 to-red-600/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="relative">
                  <img 
                    src="https://fmijmundotmgtsemfdat.supabase.co/storage/v1/object/public/avatars/motorcycle.webp" 
                    alt="Cat Crash Motorcycle" 
                    className="w-80 h-80 mx-auto animate-caesar-float filter drop-shadow-2xl opacity-90" 
                  />
                </div>
              </div>

              <div className="space-y-12">
                <div className="space-y-6">
                  <h1 className="text-6xl font-thin text-gray-900 tracking-tight leading-tight">
                    Cat <span className="bg-gradient-to-r from-red-600 via-orange-500 to-red-700 bg-clip-text text-transparent">Crash</span>
                  </h1>
                  
                  <div className="w-24 h-px bg-gradient-to-r from-transparent via-red-500 to-transparent mx-auto"></div>
                  
                  <p className="text-lg text-gray-600 font-light max-w-2xl mx-auto leading-relaxed">
                    Ride the multiplier wave and cash out before the crash.
                    <br className="hidden sm:block" />
                    Choose your target and test your nerve.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-2xl p-8 max-w-md mx-auto">
                  <h3 className="text-lg font-light text-gray-700 mb-4">Connect wallet to ride</h3>
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
                
                {/* Left - Motorcycle Arena */}
                <div className="lg:col-span-2 text-center space-y-8">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-orange-500/5 to-red-600/10 rounded-full blur-3xl animate-pulse"></div>
                    
                    {/* Motorcycle Animation */}
                    <div className="relative w-72 h-72 mx-auto">
                      <Motorcycle 
                        isAnimating={isAnimating}
                        crashed={lastResult?.isWinner === false}
                        crashMultiplier={lastResult?.crashMultiplier || targetMultiplier}
                      />
                      
                      {/* Live Multiplier Display */}
                      {isAnimating && (
                        <div className="absolute top-4 right-4 bg-black/90 text-white px-4 py-2 rounded-lg backdrop-blur">
                          <div className="text-xl font-mono font-bold text-green-400">
                            {(currentMultiplier / 100).toFixed(2)}×
                          </div>
                        </div>
                      )}
                      
                      {/* Target Display */}
                      {!isAnimating && (
                        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-slate-800 to-slate-900 text-white px-6 py-3 rounded-lg shadow-lg ring-2 ring-slate-400/50">
                          <div className="text-lg font-mono font-bold">Target: {targetMultiplier / 100}×</div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h2 className="text-4xl font-thin text-gray-900">
                      Crash Arena
                    </h2>
                    <div className="w-16 h-px bg-gradient-to-r from-transparent via-red-500 to-transparent mx-auto"></div>
                  </div>
                </div>

                {/* Center - Divider */}
                <div className="hidden lg:block lg:col-span-1">
                  <div className="w-px h-96 bg-gradient-to-b from-transparent via-gray-200 to-transparent mx-auto"></div>
                </div>

                {/* Right - The Interface */}
                <div className="lg:col-span-2 space-y-12">
                  
                  {/* Target Multiplier Selection */}
                  <div className="space-y-6">
                    <div className="bg-white/80 backdrop-blur rounded-2xl p-8 border border-gray-100 shadow-sm space-y-4">
                      <h3 className="text-xl font-light text-gray-900">Target Multiplier</h3>
                      
                      {/* Target Slider */}
                      <div className="space-y-4">
                        <input
                          type="range"
                          min="120"
                          max="500"
                          step="10"
                          value={targetMultiplier}
                          onChange={(e) => setTargetMultiplier(parseInt(e.target.value))}
                          disabled={isPlaying}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-slate disabled:opacity-50"
                        />
                        <div className="text-center">
                          <div className="text-3xl font-light text-slate-800 font-mono">{targetMultiplier / 100}×</div>
                          <div className="text-xs text-gray-500 mt-1">Potential {((targetMultiplier / 100) * 0.97).toFixed(2)}x return</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Betting Panel */}
                  <BettingPanel
                    betAmount={betAmount}
                    setBetAmount={setBetAmount}
                    multiplier={calculatePayout(parseFloat(betAmount || '0'), targetMultiplier) / parseFloat(betAmount || '1')}
                    isPlaying={isPlaying}
                    gameName="Cat Crash"
                  />

                  {/* House Balance & Funding */}
                  <div className="text-center py-4 border-t border-gray-100">
                    <div className="text-sm text-gray-500 uppercase tracking-widest mb-2">
                      House Balance
                    </div>
                    <div className={`text-xl font-mono mb-4 ${
                      houseBalance > 0 ? 'text-green-600' : 'text-red-500'
                    }`}>
                      {houseBalance.toFixed(3)} SUI
                    </div>
                    {pathname.includes('makaveli') && (
                      <>
                        {houseBalance > 0 && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <div className="space-y-2">
                              <div className="text-yellow-600 font-medium text-sm">⚠️ House has coins but they're not in the internal balance</div>
                              <div className="text-yellow-600 text-xs">
                                The smart contract can only use funds added through the fund_house function. 
                                Direct transfers to the house address aren't accessible for betting.
                              </div>
                            </div>
                          </div>
                        )}
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="space-y-3">
                              <div className="text-blue-600 font-medium text-sm">🏦 Add funds to house</div>
                              <button
                                onClick={handleFundHouse}
                                disabled={isFunding}
                                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm"
                              >
                                {isFunding ? 'Funding...' : 'Fund House (1 SUI)'}
                              </button>
                            </div>
                          </div>

                          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <div className="space-y-3">
                              <div className="text-green-600 font-medium text-sm">💰 Withdraw profits</div>
                              <div className="flex space-x-2">
                                <input
                                  type="number"
                                  value={withdrawAmount}
                                  onChange={(e) => setWithdrawAmount(e.target.value)}
                                  step="0.01"
                                  min="0.01"
                                  className="flex-1 px-2 py-1 border border-green-300 rounded text-sm"
                                  placeholder="0.1"
                                />
                                <button
                                  onClick={initiateWithdrawal}
                                  disabled={isWithdrawing || parseFloat(withdrawAmount) <= 0}
                                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors text-sm"
                                >
                                  {isWithdrawing ? 'Withdrawing...' : 'Withdraw'}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Ride Button */}
                  <div className="space-y-6">
                    <button 
                      onClick={handlePlay}
                      disabled={isPlaying || !currentAccount || parseFloat(betAmount) < 0.1}
                      className="group relative w-full py-8 bg-gradient-to-r from-gray-900 via-black to-gray-900 text-white overflow-hidden transition-all duration-700 hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02]"
                      style={{ borderRadius: '2px' }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-red-600 via-orange-500 to-red-700 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                      <span className="relative z-10 flex items-center justify-center gap-4 text-xl font-light tracking-widest">
                        {isPlaying ? (
                          <>
                            <div className="w-6 h-6 border border-white/30 border-t-white rounded-full animate-spin"></div>
                            RIDING THE WAVE
                          </>
                        ) : (
                          <>
                            🏍️ RIDE
                          </>
                        )}
                      </span>
                    </button>

                    {/* Result */}
                    {lastResult && (
                      <div className="text-center py-8 space-y-4 animate-in fade-in duration-1000">
                        <div className="text-6xl">
                          {lastResult.success && lastResult.isWinner ? '🎉' : '💥'}
                        </div>
                        <div className="space-y-2">
                          <div className={`text-2xl font-light ${
                            lastResult.success && lastResult.isWinner ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {lastResult.success && lastResult.isWinner ? 'CASHED OUT!' : 'CRASHED!'}
                          </div>
                          <div className="text-sm font-mono text-gray-600">
                            {lastResult.message}
                          </div>
                          {lastResult.txUrl && (
                            <div className="text-xs">
                              <a 
                                href={lastResult.txUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-red-500 hover:underline"
                              >
                                View Transaction →
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Game History */}
                    {gameHistory.length > 0 && (
                      <div className="border-t border-gray-100 pt-6">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Recent Rides</h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {gameHistory.slice(0, 5).map((game, index) => (
                            <div key={index} className="flex justify-between items-center py-2 text-sm">
                              <div className="flex items-center space-x-2">
                                <div className={`w-2 h-2 rounded-full ${
                                  game.win ? 'bg-green-500' : 'bg-red-500'
                                }`}></div>
                                <span className="font-mono">{game.stake} SUI @ {game.target / 100}×</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="font-mono text-gray-500">{game.crash / 100}×</span>
                                <span className={`font-mono ${
                                  game.win ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {game.win ? `+${game.payout.toFixed(3)}` : 'Lost'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="absolute bottom-0 left-0 right-0 px-6 py-8">
          <div className="max-w-7xl mx-auto text-center space-y-6">
            <div className="w-16 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent mx-auto"></div>
            
            <p className="text-xs text-gray-400 font-mono tracking-wider">
              Crash Arena • Ultra-low fees on SUI
            </p>
            
            <div className="flex items-center justify-center gap-6 text-xs">
              <a 
                href="https://www.youtube.com/@catsinofun" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-red-500 transition-colors duration-300"
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
                className="text-gray-400 hover:text-red-500 transition-colors duration-300"
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
                className="text-gray-400 hover:text-red-500 transition-colors duration-300"
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
                className="text-gray-400 hover:text-red-500 transition-colors duration-300"
                title="Discord"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0190 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9460 2.4189-2.1568 2.4189Z"/>
                </svg>
              </a>
              <div className="w-px h-3 bg-gray-200"></div>
              <Link 
                href="/play" 
                className="text-gray-400 hover:text-red-500 transition-colors duration-300 font-mono tracking-wide"
              >
                Advanced
              </Link>
            </div>
          </div>
        </footer>
      </main>

      {/* Passcode Modal */}
      {showPasscodeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Enter Admin Passcode</h3>
            <input
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4"
              placeholder="Enter passcode"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleWithdrawProfits();
                }
              }}
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowPasscodeModal(false)}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleWithdrawProfits}
                disabled={!passcode}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
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
