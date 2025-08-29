'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { SuiWalletButton } from '@/components/SuiWalletButton';
import { Spinner } from '@/components/Spinner';
import { BettingPanel } from '@/components/BettingPanel';
import { GameNavigation } from '@/components/GameNavigation';
import { ThemeToggle } from '@/components/ThemeToggle';
import { GameLockedOverlay } from '@/components/GameLockedOverlay';
import { UnlockProgress } from '@/components/UnlockProgress';
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';

export default function RevolverPage() {
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();
  const pathname = usePathname();

  // Environment variables
  const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID || '0x0';
  const HOUSE_OBJECT_ID = process.env.NEXT_PUBLIC_HOUSE_OBJECT_ID || '0x0';
  const NETWORK = process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet';
  
  const [betAmount, setBetAmount] = useState<string>('0.1');
  const [isSpinning, setIsSpinning] = useState(false);
  const [lastResult, setLastResult] = useState<{ 
    success: boolean; 
    message: string; 
    txUrl?: string; 
    angle?: number; 
    isWinner?: boolean;
    payout?: number;
  } | null>(null);
  const [showLossImage, setShowLossImage] = useState(false);
  const [houseBalance, setHouseBalance] = useState<number>(0);
  const [isFunding, setIsFunding] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<string>('0.1');
  const [passcode, setPasscode] = useState<string>('');
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);

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

      setHouseBalance(internalBalance);
    } catch (error) {
      console.error('Error checking house balance:', error);
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
      const fundAmount = 1.0; // Fund with 1 SUI
      const amountMist = Math.floor(fundAmount * 1_000_000_000);

      // Create transaction to fund house
      const txb = new Transaction();
      const [coin] = txb.splitCoins(txb.gas, [amountMist]);
      
      txb.moveCall({
        target: `${PACKAGE_ID}::casino::fund_house`,
        arguments: [
          txb.object(HOUSE_OBJECT_ID),
          coin,
        ],
      });

      console.log('Funding house with 1 SUI...');

      const result = await new Promise((resolve, reject) => {
        signAndExecuteTransaction(
          { transaction: txb },
          {
            onSuccess: (data) => {
              console.log('House funding successful:', data);
              resolve(data);
            },
            onError: (error) => {
              console.error('House funding failed:', error);
              reject(error);
            },
          }
        );
      });

      alert('🏦 House funded successfully! You can now place bets.');
      checkHouseBalance(); // Refresh balance

    } catch (error: any) {
      console.error('Fund house failed:', error);
      alert(`Failed to fund house: ${error.message || 'Unknown error'}`);
    } finally {
      setIsFunding(false);
    }
  };

  // Initiate withdrawal with passcode prompt
  const initiateWithdrawal = () => {
    setShowPasscodeModal(true);
    setPasscode('');
  };

  // Withdraw profits from the house (after passcode verification)
  const handleWithdrawProfits = async () => {
    if (!currentAccount) {
      alert('Please connect your Sui wallet first');
      return;
    }

    // Verify passcode
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

      // Create transaction to withdraw profits
      const txb = new Transaction();
      
      txb.moveCall({
        target: `${PACKAGE_ID}::casino::withdraw_profits`,
        arguments: [
          txb.object(HOUSE_OBJECT_ID),
          txb.pure.u64(withdrawAmountMist),
        ],
      });

      console.log(`Withdrawing ${withdrawAmountSui} SUI from house...`);

      const result = await new Promise((resolve, reject) => {
        signAndExecuteTransaction(
          { transaction: txb },
          {
            onSuccess: (data) => {
              console.log('Withdrawal successful:', data);
              resolve(data);
            },
            onError: (error) => {
              console.error('Withdrawal failed:', error);
              reject(error);
            },
          }
        );
      });

      alert(`💰 Successfully withdrew ${withdrawAmountSui} SUI from house!`);
      checkHouseBalance(); // Refresh balance

    } catch (error: any) {
      console.error('Withdraw profits failed:', error);
      alert(`Failed to withdraw: ${error.message || 'Unknown error'}`);
    } finally {
      setIsWithdrawing(false);
    }
  };

  useEffect(() => {
    if (currentAccount) {
      checkHouseBalance();
    }
  }, [currentAccount]);

  const handleSpin = async () => {
    if (!currentAccount) return;
    
    setLastResult(null);
    setShowLossImage(false);
    
    try {
      console.log('Starting spin...');
      
      const amountSui = parseFloat(betAmount);
      const amountMist = Math.floor(amountSui * 1_000_000_000);
      
      console.log(`Spinning with ${amountSui} SUI (${amountMist} MIST)`);
      
      // Check user balance
      const balance = await suiClient.getBalance({
        owner: currentAccount.address
      });
      const balanceSui = parseInt(balance.totalBalance) / 1_000_000_000;
      
      if (balanceSui < amountSui) {
        throw new Error(`Insufficient balance. You have ${balanceSui} SUI, need ${amountSui} SUI`);
      }

      // Check house can cover potential payout (7.76x)
      const potentialPayout = Math.floor(amountMist * 194 / 25) / 1_000_000_000;
      if (houseBalance < potentialPayout) {
        throw new Error(`House insufficient funds. Needed ${potentialPayout} SUI, available ${houseBalance} SUI`);
      }

      // Create transaction
      console.log('Creating transaction...');
      const txb = new Transaction();
      const [coin] = txb.splitCoins(txb.gas, [amountMist]);
      
      console.log('Package ID:', PACKAGE_ID);
      console.log('House Object ID:', HOUSE_OBJECT_ID);
      
      txb.moveCall({
        target: `${PACKAGE_ID}::revolver::play`,
        arguments: [
          txb.object(HOUSE_OBJECT_ID),
          coin,
          txb.object('0x8'), // Random object
        ],
      });

      console.log('Executing transaction...');

      const result = await new Promise<any>((resolve, reject) => {
        signAndExecuteTransaction(
          { transaction: txb },
          {
            onSuccess: (data) => {
              console.log('Transaction successful:', data);
              // Start the spin animation only after transaction confirmation
              setIsSpinning(true);
              resolve(data);
            },
            onError: (error) => {
              console.error('Transaction failed:', error);
              reject(error);
            },
          }
        );
      });

      console.log('Transaction result:', result);

      // Parse the spin event
      let angle = 0;
      let isWinner = false;
      let payout = 0;
      let message = 'Spin completed!';

      console.log('Raw transaction result:', result);

      // Enhanced event parsing
      const events = result.events || [];
      console.log('Events array:', events);
      
      // Try to get events from transaction digest
      try {
        console.log('Fetching events from transaction digest...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const txEvents = await suiClient.queryEvents({
          query: { Transaction: result.digest }
        });
        
        console.log('Transaction events:', txEvents);
        
        if (txEvents.data && txEvents.data.length > 0) {
          for (const event of txEvents.data) {
            console.log('Processing event:', event);
            
            if (event.type.includes('::revolver::SpinEvent')) {
              const eventData = event.parsedJson as any;
              console.log('Found SpinEvent:', eventData);
              
              angle = parseInt(eventData.angle_deg);
              isWinner = eventData.win;
              payout = parseInt(eventData.payout) / 1_000_000_000;
              
              message = isWinner 
                ? `ALIVE CAT! Won ${payout.toFixed(3)} SUI at ${angle}°!` 
                : `DEAD CAT! Lost at ${angle}°`;
              break;
            }
          }
        }
      } catch (eventError) {
        console.error('Error fetching events:', eventError);
      }

      const explorerUrl = NETWORK === 'mainnet' 
        ? `https://suiexplorer.com/txblock/${result.digest}?network=mainnet`
        : `https://suiexplorer.com/txblock/${result.digest}?network=testnet`;

      const spinResult = {
        success: true,
        message,
        digest: result.digest,
        txUrl: explorerUrl,
        angle,
        isWinner,
        payout,
      };
      
      // Wait for spin animation then show result  
      setTimeout(() => {
        setLastResult(spinResult);
        setIsSpinning(false);
        setShowLossImage(false); // Reset loss image state
        checkHouseBalance(); // Refresh house balance
        
        // If it's a loss, show revolver_loss.webp after 2 seconds
        if (!isWinner) {
          setTimeout(() => {
            setShowLossImage(true);
          }, 2000);
        }
      }, 3000);
      
    } catch (error: any) {
      console.error('Spin failed:', error);
      setLastResult({ 
        success: false, 
        message: error.message || 'Spin failed' 
      });
      setIsSpinning(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 relative transition-colors duration-300">
      <GameLockedOverlay 
        game="revolver"
        gameTitle="Revolver Roulette" 
        unlockMessage="Complete 50 Cat Crash games to unlock the revolver chamber and face the ultimate risk."
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
              <img 
                src="/logo.svg" 
                alt="CatsinoFun Logo" 
                className="w-8 h-8" 
              />
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
                <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-orange-500/5 to-yellow-500/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="relative">
                  <img 
                    src={process.env.NEXT_PUBLIC_IMAGE_REVOLVER || "https://fmijmundotmgtsemfdat.supabase.co/storage/v1/object/public/avatars/revolver.webp"}
                    alt="Revolver" 
                    className="w-80 h-80 mx-auto animate-caesar-float filter drop-shadow-2xl opacity-90" 
                  />
                </div>
              </div>

              <div className="space-y-8">
                <div className="space-y-4">
                  <h1 className="text-6xl font-thin text-gray-900 dark:text-gray-100 tracking-tight leading-tight">
                    Revolver <span className="text-red-600 dark:text-red-400">Roulette</span>
                  </h1>
                  <p className="text-lg text-gray-600 dark:text-gray-300 font-light max-w-2xl mx-auto leading-relaxed">
                    Russian roulette meets quantum probability. 
                    <br className="hidden sm:block" />
                    Will the cat live or die? Spin the cylinder to find out.
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-8 max-w-md mx-auto border border-gray-100 dark:border-gray-700">
                  <h3 className="text-lg font-light text-gray-700 dark:text-gray-300 mb-4">Connect wallet to spin</h3>
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
                
                {/* Left - Revolver */}
                <div className="lg:col-span-2 text-center space-y-8">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-orange-500/5 to-yellow-500/10 rounded-full blur-3xl animate-pulse"></div>
                    
                    {/* Revolver Spinner */}
                    <Spinner 
                      isSpinning={isSpinning}
                      finalAngle={lastResult?.angle || 0}
                      imageUrl={process.env.NEXT_PUBLIC_IMAGE_REVOLVER || "https://fmijmundotmgtsemfdat.supabase.co/storage/v1/object/public/avatars/revolver.webp"}
                      showLossImage={!!(lastResult && !lastResult.isWinner && showLossImage)}
                    />
                  </div>
                  
                  <div className="space-y-4">
                    <h2 className="text-4xl font-thin text-gray-900 dark:text-gray-100">
                      Revolver Roulette
                    </h2>
                    <p className="text-gray-600 dark:text-gray-300 font-light">
                      45° = ALIVE CAT (7.76x payout)
                      <br />
                      Otherwise = DEAD CAT
                    </p>
                  </div>
                </div>

                {/* Vertical Divider */}
                <div className="hidden lg:block lg:col-span-1">
                  <div className="w-px h-96 bg-gradient-to-b from-transparent via-gray-200 dark:via-gray-700 to-transparent mx-auto"></div>
                </div>

                {/* Right - Controls */}
                <div className="lg:col-span-2 space-y-8">
                  
                  {/* Betting Panel */}
                  <BettingPanel
                    betAmount={betAmount}
                    setBetAmount={setBetAmount}
                    multiplier={7.76}
                    isPlaying={isSpinning}
                    gameName="Revolver Roulette"
                  />

                  {/* Unlock Progress */}
                  <div className="py-4">
                    <UnlockProgress showNextUnlock="pump" />
                  </div>
                  
                  {/* House Balance */}
                  <div className="text-center py-4 border-t border-gray-100 dark:border-gray-700">
                    <div className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">
                      House Balance
                    </div>
                    <div className={`text-xl font-mono ${houseBalance > 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {houseBalance.toFixed(3)} SUI
                    </div>
                  </div>
                  
                  {pathname.includes('makaveli') && (
                    <>
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 mb-4">
                        <div className="text-yellow-600 dark:text-yellow-400 text-sm">
                          ⚠️ Admin Mode: Revolver House Controls
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                          <div className="space-y-3">
                            <div className="text-blue-600 dark:text-blue-400 font-medium text-sm">🏦 Add funds to house</div>
                            <button
                              onClick={handleFundHouse}
                              disabled={isFunding}
                              className="w-full px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50 transition-colors text-sm"
                            >
                              {isFunding ? 'Funding...' : 'Fund House (1 SUI)'}
                            </button>
                          </div>
                        </div>

                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
                          <div className="space-y-3">
                            <div className="text-green-600 dark:text-green-400 font-medium text-sm">💰 Withdraw profits</div>
                            <div className="flex space-x-2">
                              <input
                                type="number"
                                value={withdrawAmount}
                                onChange={(e) => setWithdrawAmount(e.target.value)}
                                step="0.01"
                                min="0.01"
                                className="flex-1 px-2 py-1 border border-green-300 dark:border-green-600 dark:bg-gray-800 dark:text-gray-100 rounded text-sm"
                                placeholder="0.1"
                              />
                              <button
                                onClick={initiateWithdrawal}
                                disabled={isWithdrawing || parseFloat(withdrawAmount) <= 0}
                                className="px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-800 disabled:opacity-50 transition-colors text-sm"
                              >
                                {isWithdrawing ? 'Withdrawing...' : 'Withdraw'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Spin Button */}
                  <div className="space-y-6">
                    <button
                      onClick={handleSpin}
                      disabled={isSpinning || !currentAccount}
                      className="group relative w-full py-8 bg-gradient-to-r from-gray-900 via-black to-gray-900 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 text-white overflow-hidden transition-all duration-700 hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02]"
                      style={{ borderRadius: '2px' }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-red-600 via-orange-500 to-red-700 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                      <span className="relative z-10 flex items-center justify-center gap-4 text-xl font-light tracking-widest">
                        {isSpinning ? (
                          <>
                            <div className="w-6 h-6 border border-white/30 border-t-white rounded-full animate-spin"></div>
                            SPINNING CYLINDER
                          </>
                        ) : (
                          <>
                            🔫 SPIN
                          </>
                        )}
                      </span>
                    </button>

                    {/* Result */}
                    {lastResult && (
                      <div className="text-center py-8 space-y-4 animate-in fade-in duration-1000">
                        <div className="text-6xl">
                          {lastResult.success && lastResult.isWinner ? '😸' : '💀'}
                        </div>
                        <div className="space-y-2">
                          <div className={`text-2xl font-light ${
                            lastResult.success && lastResult.isWinner ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                          }`}>
                            {lastResult.success && lastResult.isWinner ? 'ALIVE CAT' : 'DEAD CAT'}
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
                                className="text-red-600 dark:text-red-400 hover:underline"
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

        {/* Footer */}
        <footer className="absolute bottom-0 left-0 right-0 px-6 py-8">
          <div className="max-w-7xl mx-auto text-center space-y-6">
            <div className="w-16 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent mx-auto"></div>
            
            <p className="text-xs text-gray-400 dark:text-gray-500 font-mono tracking-wider">
              In Memoriam Caesar • $CZAR
            </p>
            
            <div className="flex items-center justify-center gap-6 text-xs">
              <a 
                href="https://www.youtube.com/@catsinofun" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors duration-300"
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
                className="text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors duration-300"
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
                className="text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors duration-300"
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
                className="text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors duration-300"
                title="Discord"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0190 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9460 2.4189-2.1568 2.4189Z"/>
                </svg>
              </a>
              <div className="w-px h-3 bg-gray-200 dark:bg-gray-700"></div>
              <Link 
                href="/play" 
                className="text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors duration-300 font-mono tracking-wide"
              >
                Advanced
              </Link>
            </div>
          </div>
        </footer>
      </main>

      {/* Passcode Modal */}
      {showPasscodeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black dark:bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Enter Admin Passcode</h3>
            <input
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg mb-4"
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
                className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleWithdrawProfits}
                disabled={!passcode}
                className="flex-1 px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-800 disabled:opacity-50 transition-colors"
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