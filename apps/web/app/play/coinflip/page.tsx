'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { SuiWalletButton } from '@/components/SuiWalletButton';
import { BettingPanel } from '@/components/BettingPanel';
import { GameNavigation } from '@/components/GameNavigation';
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';

export default function Home() {
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();
  const pathname = usePathname();

  // Environment variables
  const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID || '0x0';
  const HOUSE_OBJECT_ID = process.env.NEXT_PUBLIC_HOUSE_OBJECT_ID || '0x0';
  const NETWORK = process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet';
  const [betAmount, setBetAmount] = useState<string>('0.01');
  const [isPlaying, setIsPlaying] = useState(false);
  const [lastResult, setLastResult] = useState<{ success: boolean; message: string; txUrl?: string; isWinner?: boolean } | null>(null);
  const [isFunding, setIsFunding] = useState(false);
  const [houseBalance, setHouseBalance] = useState<number>(0);

  // Check house balance (both internal balance and owned coins)
  const checkHouseBalance = async () => {
    try {
      // Check internal balance from smart contract
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

      // Also check SUI coins owned by the house object
      let ownedCoinsBalance = 0;
      try {
        const balance = await suiClient.getBalance({
          owner: HOUSE_OBJECT_ID
        });
        ownedCoinsBalance = parseInt(balance.totalBalance) / 1_000_000_000;
      } catch (error) {
        console.log('Could not get owned coins balance:', error);
      }

      // Total available = internal balance + owned coins
      const totalBalance = internalBalance + ownedCoinsBalance;
      setHouseBalance(totalBalance);
      
      console.log('House balance breakdown:', {
        internal: internalBalance,
        ownedCoins: ownedCoinsBalance,
        total: totalBalance
      });

    } catch (error) {
      console.error('Failed to fetch house balance:', error);
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

  // Load house balance on component mount
  useEffect(() => {
    if (currentAccount) {
      checkHouseBalance();
    }
  }, [currentAccount, HOUSE_OBJECT_ID]);

  const handleQuickFlip = async () => {
    if (!currentAccount) {
      alert('Please connect your Sui wallet first');
      return;
    }

    setIsPlaying(true);
    setLastResult(null);

    try {
      const amountSui = parseFloat(betAmount);
      const amountMist = Math.floor(amountSui * 1_000_000_000);

      // Check wallet balance first
      console.log('Checking wallet balance...');
      const balance = await suiClient.getBalance({
        owner: currentAccount.address,
      });

      const balanceSui = parseInt(balance.totalBalance) / 1_000_000_000;
      console.log('Wallet balance:', balanceSui, 'SUI');

      if (balanceSui < amountSui) {
        throw new Error(`Insufficient balance. You have ${balanceSui} SUI, need ${amountSui} SUI`);
      }

      // Create transaction
      console.log('Creating transaction...');
      const txb = new Transaction();
      const [coin] = txb.splitCoins(txb.gas, [amountMist]);
      
      console.log('Package ID:', PACKAGE_ID);
      console.log('House Object ID:', HOUSE_OBJECT_ID);
      console.log('Bet Amount (MIST):', amountMist);

      txb.moveCall({
        target: `${PACKAGE_ID}::casino::place_bet`,
        arguments: [
          txb.object(HOUSE_OBJECT_ID),
          coin,
          txb.object('0x8'),
        ],
      });

      console.log('Executing transaction...');

      const result = await new Promise<any>((resolve, reject) => {
        signAndExecuteTransaction(
          { transaction: txb },
          {
            onSuccess: (data) => {
              console.log('Transaction successful:', data);
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

      // Parse events to get bet result
      let isWinner = false;
      let payout = 0;
      let randomValue = 0;
      let message = 'Bet placed successfully!';

      console.log('Raw transaction result:', result);

      // Enhanced event parsing for new contract
      const events = result.events || [];
      console.log('Events array:', events);
      console.log('Events length:', events.length);
      
      // Also try to get events from the transaction digest (with retry for indexing delay)
      try {
        console.log('Fetching events from transaction digest...');
        
        // Add small delay for blockchain indexing
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const txResult = await suiClient.getTransactionBlock({
          digest: result.digest,
          options: { showEvents: true }
        });
        
        console.log('Transaction events:', txResult.events);
        
        if (txResult.events && txResult.events.length > 0) {
          for (const event of txResult.events) {
            console.log('Event type:', event.type);
            console.log('Event data:', event.parsedJson);
            
            if (event.type && event.type.includes('BetPlaced')) {
              const eventData = event.parsedJson as any;
              isWinner = eventData.is_winner;
              payout = parseInt(eventData.payout) / 1_000_000_000; // Convert MIST to SUI
              randomValue = parseInt(eventData.random_value);
              
              console.log('✅ BetPlaced event found via digest!', {
                isWinner,
                payout: eventData.payout,
                randomValue,
                winThreshold: 47 // New contract threshold
              });
              
              message = isWinner 
                ? `🎉 Caesar Lives! You won ${payout.toFixed(3)} SUI! (Random: ${randomValue})` 
                : `⚱️ Caesar Falls! You lost. (Random: ${randomValue}, needed ≤ 47)`;
              break;
            }
          }
        } else {
          console.log('❌ No events found via transaction digest either');
        }
      } catch (eventError) {
        console.error('Error fetching events:', eventError);
        
        // If we can't fetch events due to indexing delay, show generic success message
        if (eventError instanceof Error && eventError.message && eventError.message.includes('Could not find the referenced transaction')) {
          console.log('💡 Transaction too new for indexing - showing generic success');
          message = 'Bet placed successfully! Check the advanced interface for results once indexing completes.';
        }
      }

      const explorerUrl = NETWORK === 'mainnet' 
        ? `https://suiexplorer.com/txblock/${result.digest}`
        : `https://suiexplorer.com/txblock/${result.digest}?network=${NETWORK}`;

      const betResult = {
        success: true,
        message,
        digest: result.digest,
        txUrl: explorerUrl,
        isWinner,
        payout,
      };
      
      // Wait for flip animation then show result  
      setTimeout(() => {
        setLastResult(betResult);
        setIsPlaying(false);
      }, 3000);
      
    } catch (error: any) {
      console.error('Quick flip failed:', error);
      setLastResult({ 
        success: false, 
        message: error.message || 'Transaction failed' 
      });
      setIsPlaying(false);
    }
  };

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
            <div className="flex items-center space-x-3">
              <img 
                src="/logo.svg" 
                alt="CatsinoFun Logo" 
                className="w-8 h-8" 
              />
              <span className="font-light text-xl tracking-wide text-gray-900">
                CatsinoFun
              </span>
            </div>
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
                <div className="absolute inset-0 bg-gradient-to-r from-caesar-gold/10 via-caesar-cream/5 to-czar-bronze/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="relative">
                  <img 
                    src="https://fmijmundotmgtsemfdat.supabase.co/storage/v1/object/public/avatars/tails.webp" 
                    alt="CatFlip Tails" 
                    className="w-80 h-80 mx-auto animate-caesar-float filter drop-shadow-2xl opacity-90" 
                  />
                </div>
              </div>

              <div className="space-y-12">
                <div className="space-y-6">
                  <h1 className="text-6xl font-thin text-gray-900 tracking-tight leading-tight">
                    CatFlip <span className="bg-gradient-to-r from-czar-gold via-caesar-gold to-czar-bronze bg-clip-text text-transparent">CoinFlip</span>
                  </h1>
                  
                  <div className="w-24 h-px bg-gradient-to-r from-transparent via-czar-gold to-transparent mx-auto"></div>
                  
                  <p className="text-lg text-gray-600 font-light max-w-2xl mx-auto leading-relaxed">
                    Classic cat coin flip with elegant style. 
                    <br className="hidden sm:block" />
                    Each flip determines the cat's fate.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-2xl p-8 max-w-md mx-auto">
                  <h3 className="text-lg font-light text-gray-700 mb-4">Connect wallet to flip</h3>
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
                
                {/* Left - Caesar's Shrine */}
                <div className="lg:col-span-2 text-center space-y-8">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-caesar-gold/10 via-caesar-cream/5 to-czar-bronze/10 rounded-full blur-3xl animate-pulse"></div>
                    
                    {/* Coin Flip Animation */}
                    <div className="relative w-72 h-72 mx-auto" style={{ perspective: '1000px' }}>
                      <div 
                        className={`w-full h-full relative transition-all duration-1000 ${isPlaying ? 'animate-coin-flip' : 'animate-caesar-float'}`} 
                        style={{ 
                          transformStyle: 'preserve-3d',
                          transform: !isPlaying && lastResult !== null 
                            ? (lastResult.success && lastResult.message.includes('won') ? 'rotateX(0deg)' : 'rotateX(180deg)')
                            : 'rotateX(0deg)'
                        }}
                      >
                        
                        {/* Heads Side */}
                        <div className="absolute inset-0 w-full h-full backface-hidden" style={{ backfaceVisibility: 'hidden' }}>
                          <img 
                            src="https://fmijmundotmgtsemfdat.supabase.co/storage/v1/object/public/avatars/heads.webp" 
                            alt="Coin Heads" 
                            className={`w-full h-full object-contain filter drop-shadow-2xl ${
                              lastResult !== null 
                                ? lastResult.success && lastResult.message.includes('won')
                                  ? 'filter brightness-110 saturate-150' 
                                  : 'filter grayscale brightness-75'
                                : ''
                            }`}
                          />
                        </div>
                        
                        {/* Tails Side */}
                        <div className="absolute inset-0 w-full h-full backface-hidden" style={{ backfaceVisibility: 'hidden', transform: 'rotateX(180deg)' }}>
                          <img 
                            src="https://fmijmundotmgtsemfdat.supabase.co/storage/v1/object/public/avatars/tails.webp" 
                            alt="Coin Tails" 
                            className={`w-full h-full object-contain filter drop-shadow-2xl ${
                              lastResult !== null 
                                ? lastResult.success && lastResult.message.includes('won')
                                  ? 'filter brightness-110 saturate-150' 
                                  : 'filter grayscale brightness-75'
                                : ''
                            }`}
                          />
                        </div>
                        
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h2 className="text-4xl font-thin text-gray-900">
                      Emperor's Game
                    </h2>
                    <div className="w-16 h-px bg-gradient-to-r from-transparent via-czar-gold to-transparent mx-auto"></div>
                  </div>
                </div>

                {/* Center - Divider */}
                <div className="hidden lg:block lg:col-span-1">
                  <div className="w-px h-96 bg-gradient-to-b from-transparent via-gray-200 to-transparent mx-auto"></div>
                </div>

                {/* Right - The Interface */}
                <div className="lg:col-span-2 space-y-12">
                  
                  {/* Betting Panel */}
                  <BettingPanel
                    betAmount={betAmount}
                    setBetAmount={setBetAmount}
                    multiplier={2.0}
                    isPlaying={isPlaying}
                    gameName="Emperor's Coin Flip"
                  />

                  {/* House Balance & Funding */}
                  <div className="text-center py-4 border-t border-gray-100">
                    <div className="text-sm text-gray-500 uppercase tracking-widest mb-2">
                      House Balance
                    </div>
                    <div className={`text-xl font-mono mb-4 ${houseBalance > 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {houseBalance.toFixed(3)} SUI
                    </div>
                    {pathname === '/makaveli' && (
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
                        
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <div className="space-y-3">
                            <div className="text-blue-600 font-medium text-sm">🏦 Add more funds to house</div>
                            <button
                              onClick={handleFundHouse}
                              disabled={isFunding}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm"
                            >
                              {isFunding ? 'Funding...' : 'Fund House (1 SUI)'}
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Flip Button */}
                  <div className="space-y-6">
                    <button 
                      onClick={handleQuickFlip}
                      disabled={isPlaying || !currentAccount}
                      className="group relative w-full py-8 bg-gradient-to-r from-gray-900 via-black to-gray-900 text-white overflow-hidden transition-all duration-700 hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02]"
                      style={{ borderRadius: '2px' }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-czar-gold via-caesar-gold to-czar-bronze opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                      <span className="relative z-10 flex items-center justify-center gap-4 text-xl font-light tracking-widest">
                        {isPlaying ? (
                          <>
                            <div className="w-6 h-6 border border-white/30 border-t-white rounded-full animate-spin"></div>
                            QUANTUM PROCESSING
                          </>
                        ) : (
                          <>
                            FLIP
                          </>
                        )}
                      </span>
                    </button>

                    {/* Result */}
                    {lastResult && (
                      <div className="text-center py-8 space-y-4 animate-in fade-in duration-1000">
                        <div className="text-6xl">
                          {lastResult.success && lastResult.message.includes('won') ? '👑' : '⚱️'}
                        </div>
                        <div className="space-y-2">
                          <div className={`text-2xl font-light ${
                            lastResult.success && lastResult.message.includes('won') ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {lastResult.success && lastResult.message.includes('won') ? 'EMPEROR LIVES' : 'EMPEROR FALLS'}
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
                                className="text-caesar-gold hover:underline"
                              >
                                View Transaction →
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Advanced Interface Link */}
                    <div className="text-center pt-4">
                      <Link 
                        href="/play" 
                        className="text-sm text-gray-400 hover:text-czar-gold transition-colors duration-300 font-mono tracking-wide"
                      >
                        Advanced Interface →
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer - Minimalist Tribute */}
        <footer className="absolute bottom-0 left-0 right-0 px-6 py-8">
          <div className="max-w-7xl mx-auto text-center space-y-6">
            <div className="w-16 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent mx-auto"></div>
            
            <p className="text-xs text-gray-400 font-mono tracking-wider">
              In Memoriam Caesar • $CZAR
            </p>
            
            <div className="flex items-center justify-center gap-8 text-xs">
              <Link 
                href="https://www.youtube.com/@catsinofun" 
                target="_blank" 
                className="text-gray-400 hover:text-czar-gold transition-colors duration-300 font-mono tracking-wide"
              >
                YouTube
              </Link>
              <div className="w-px h-3 bg-gray-200"></div>
              <Link 
                href="/play" 
                className="text-gray-400 hover:text-czar-gold transition-colors duration-300 font-mono tracking-wide"
              >
                Advanced
              </Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}