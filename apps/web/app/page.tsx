'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { SuiWalletButton } from '@/components/SuiWalletButton';
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';

export default function Home() {
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();

  // Environment variables
  const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID || '0x0';
  const HOUSE_OBJECT_ID = process.env.NEXT_PUBLIC_HOUSE_OBJECT_ID || '0x0';
  const NETWORK = process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet';
  const [betAmount, setBetAmount] = useState<string>('0.01');
  const [isPlaying, setIsPlaying] = useState(false);
  const [lastResult, setLastResult] = useState<{ success: boolean; message: string; txUrl?: string; isWinner?: boolean } | null>(null);
  const [isFunding, setIsFunding] = useState(false);
  const [houseBalance, setHouseBalance] = useState<number>(0);

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
      if (fields) {
        const balance = parseInt(fields.balance) / 1_000_000_000;
        setHouseBalance(balance);
      }
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
      console.log('Wallet balance:', parseInt(balance.totalBalance) / 1_000_000_000, 'SUI');

      if (parseInt(balance.totalBalance) < amountMist) {
        throw new Error(`Insufficient SUI balance. You have ${(parseInt(balance.totalBalance) / 1_000_000_000).toFixed(3)} SUI but need ${amountSui} SUI + gas fees.`);
      }

      // Create transaction
      const txb = new Transaction();
      
      // Split coin for bet
      const [coin] = txb.splitCoins(txb.gas, [amountMist]);
      
      // Call place_bet function
      txb.moveCall({
        target: `${PACKAGE_ID}::casino::place_bet`,
        arguments: [
          txb.object(HOUSE_OBJECT_ID), // house
          coin, // payment
          txb.object('0x8'), // random object
        ],
      });

      // Execute transaction
      console.log('Executing transaction:', {
        packageId: PACKAGE_ID,
        houseId: HOUSE_OBJECT_ID,
        amount: amountMist,
        sender: currentAccount.address
      });
      
      // Execute transaction using the hook with proper error handling
      console.log('About to sign transaction...');
      
      const result = await new Promise((resolve, reject) => {
        try {
          signAndExecuteTransaction(
            { transaction: txb },
            {
              onSuccess: async (data) => {
                console.log('Transaction signed successfully:', data);
                
                // Fetch full transaction details
                try {
                  const txDetails = await suiClient.getTransactionBlock({
                    digest: data.digest,
                    options: {
                      showEffects: true,
                      showEvents: true,
                    },
                  });
                  console.log('Transaction details:', txDetails);
                  resolve(txDetails);
                } catch (fetchError) {
                  console.error('Error fetching transaction details:', fetchError);
                  // Still resolve with basic data
                  resolve(data);
                }
              },
              onError: (error) => {
                console.error('Transaction signing failed:', error);
                console.error('Error details:', JSON.stringify(error, null, 2));
                reject(error);
              },
            }
          );
        } catch (syncError) {
          console.error('Synchronous error in transaction execution:', syncError);
          reject(syncError);
        }
      }) as any;

      // Parse events to get bet result
      let isWinner = false;
      let payout = 0;
      let message = 'Bet placed successfully!';

      if (result.events) {
        for (const event of result.events) {
          if (event.type.includes('BetPlaced')) {
            const eventData = event.parsedJson as any;
            isWinner = eventData.is_winner;
            payout = parseInt(eventData.payout) / 1_000_000_000; // Convert MIST to SUI
            const randomValue = eventData.random_value;
            
            console.log('Bet result:', {
              isWinner,
              payout: eventData.payout,
              randomValue,
              winThreshold: 49
            });
            
            message = isWinner 
              ? `🎉 Caesar Lives! You won ${payout.toFixed(3)} SUI! (Random: ${randomValue})` 
              : `⚱️ Caesar Falls! You lost. (Random: ${randomValue}, needed ≤ 49)`;
            break;
          }
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
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="CATSINO" className="w-10 h-10 animate-caesar-float" />
            <div>
              <h1 className="text-2xl font-bold bg-caesar-gradient bg-clip-text text-transparent">CATSINO</h1>
              <p className="text-xs text-gray-500 font-mono">$CZAR TOKEN</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <Link 
              href="https://www.youtube.com/@catsinofun" 
              target="_blank" 
              className="text-gray-600 hover:text-czar-gold transition-colors duration-200 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
              <span className="hidden sm:inline text-sm">YouTube</span>
            </Link>
            <SuiWalletButton />
          </div>
        </div>
      </nav>

      {/* Hero Section - Ultra Minimalist */}
      <main className="relative">
        {!currentAccount ? (
          /* Welcome State - Exceptional Minimalism */
          <div className="min-h-screen flex items-center justify-center px-6">
            <div className="max-w-4xl mx-auto text-center space-y-16">
              {/* Floating Caesar Portrait */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-caesar-gold/10 via-caesar-cream/5 to-czar-bronze/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="relative">
                  <img 
                    src="/logo.svg" 
                    alt="Caesar the Cat" 
                    className="w-80 h-80 mx-auto animate-caesar-float filter drop-shadow-2xl opacity-90" 
                  />
                </div>
              </div>

              {/* Elegant Typography */}
              <div className="space-y-8">
                <div className="space-y-4">
                  <h1 className="text-8xl md:text-9xl font-thin tracking-tight text-gray-900">
                    CATSINO
                  </h1>
                  <div className="w-24 h-px bg-gradient-to-r from-transparent via-czar-gold to-transparent mx-auto"></div>
                  <p className="text-xl text-gray-500 font-light max-w-lg mx-auto leading-relaxed">
                    Honor Emperor Caesar through the art of quantum chance
                  </p>
                </div>

                {/* Minimal Stats */}
                <div className="flex items-center justify-center gap-12 text-sm text-gray-400 font-mono">
                  <div className="text-center">
                    <div className="text-2xl font-light text-czar-gold mb-1">50%</div>
                    <div className="text-xs uppercase tracking-widest">Fair Odds</div>
                  </div>
                  <div className="w-px h-12 bg-gray-200"></div>
                  <div className="text-center">
                    <div className="text-2xl font-light text-czar-bronze mb-1">$CZAR</div>
                    <div className="text-xs uppercase tracking-widest">Token</div>
                  </div>
                  <div className="w-px h-12 bg-gray-200"></div>
                  <div className="text-center">
                    <div className="text-2xl font-light text-czar-silver mb-1">∞</div>
                    <div className="text-xs uppercase tracking-widest">Legacy</div>
                  </div>
                </div>

                {/* Elegant Connect */}
                <div className="pt-8 space-y-8">
                  <SuiWalletButton />
                  <p className="text-xs text-gray-400 font-mono">
                    Connect any Sui wallet to enter the quantum realm
                  </p>
                </div>
              </div>
            </div>

          </div>
        ) : (
          /* Game State - Pure Gaming Elegance */
          <div className="min-h-screen flex items-center justify-center px-6">
            <div className="max-w-6xl mx-auto">
              <div className="grid lg:grid-cols-5 gap-16 items-center">
                
                {/* Left - Caesar's Shrine */}
                <div className="lg:col-span-2 text-center space-y-8">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-caesar-gold/10 via-caesar-cream/5 to-czar-bronze/10 rounded-full blur-3xl animate-pulse"></div>
                    <img 
                      src="/logo.svg" 
                      alt="Caesar the Cat" 
                      className={`w-72 h-72 mx-auto filter drop-shadow-2xl relative z-10 transition-all duration-1000 ${
                        isPlaying 
                          ? 'animate-spin scale-110' 
                          : 'animate-caesar-float'
                      } ${
                        lastResult !== null 
                          ? lastResult.success && lastResult.message.includes('won')
                            ? 'filter brightness-110 saturate-150' 
                            : 'filter grayscale brightness-75'
                          : ''
                      }`}
                    />
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

                {/* Right - Pure Game Interface */}
                <div className="lg:col-span-2 space-y-8">
                  
                  {/* Bet Input - Minimal Perfection */}
                  <div className="space-y-4">
                    <div className="text-center">
                      <label className="text-sm font-medium text-gray-600 uppercase tracking-widest">
                        Stake Amount
                      </label>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        value={betAmount}
                        onChange={(e) => setBetAmount(e.target.value)}
                        step="0.001"
                        min="0.001"
                        disabled={isPlaying}
                        className="w-full text-4xl font-light text-center py-6 bg-transparent border-0 border-b-2 border-gray-200 focus:border-czar-gold focus:outline-none focus:ring-0 transition-colors duration-500 font-mono"
                        placeholder="0.000"
                      />
                      <div className="absolute right-0 bottom-2 text-gray-400 font-mono text-lg">
                        SUI
                      </div>
                    </div>
                  </div>

                  {/* Potential Win - Elegant Display */}
                  <div className="text-center py-6">
                    <div className="text-sm text-gray-500 uppercase tracking-widest mb-2">
                      Potential Win
                    </div>
                    <div className="text-3xl font-light text-czar-gold font-mono">
                      {(parseFloat(betAmount || '0') * 1.96).toFixed(3)} SUI
                    </div>
                  </div>

                  {/* House Balance & Funding */}
                  <div className="text-center py-4 border-t border-gray-100">
                    <div className="text-sm text-gray-500 uppercase tracking-widest mb-2">
                      House Balance
                    </div>
                    <div className={`text-xl font-mono mb-4 ${houseBalance > 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {houseBalance.toFixed(3)} SUI
                    </div>
                    {houseBalance === 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="space-y-3">
                          <div className="text-red-600 font-medium text-sm">⚠️ House needs funding to pay winners</div>
                          <button
                            onClick={handleFundHouse}
                            disabled={isFunding}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors text-sm"
                          >
                            {isFunding ? 'Funding...' : 'Fund House (1 SUI)'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Flip Button - Masterpiece */}
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

                    {/* Result - Zen Simplicity */}
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

                    {/* Advanced Link */}
                    <div className="text-center pt-4">
                      <Link 
                        href="/play"
                        className="text-sm text-gray-400 hover:text-czar-gold transition-colors duration-300 uppercase tracking-widest"
                      >
                        Advanced Interface
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Ethereal Legacy Section - Whisper Minimalism */}
        <div className="py-32 px-6">
          <div className="max-w-3xl mx-auto text-center space-y-20">
            {/* Minimal Divider */}
            <div className="w-16 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent mx-auto"></div>
            
            {/* Legend Whisper */}
            <div className="space-y-12">
              <h2 className="text-3xl font-thin text-gray-800 tracking-wide">
                The Emperor's Eternal Game
              </h2>
              
              <div className="grid md:grid-cols-3 gap-16 mt-20">
                <div className="text-center space-y-6">
                  <div className="text-5xl opacity-40">👑</div>
                  <div className="space-y-3">
                    <h3 className="text-sm uppercase tracking-widest text-gray-600 font-light">Reign</h3>
                    <p className="text-gray-500 text-sm leading-relaxed font-light">
                      Digital sovereignty through wisdom
                    </p>
                  </div>
                </div>
                
                <div className="text-center space-y-6">
                  <div className="text-5xl opacity-40">⚡</div>
                  <div className="space-y-3">
                    <h3 className="text-sm uppercase tracking-widest text-gray-600 font-light">Quantum</h3>
                    <p className="text-gray-500 text-sm leading-relaxed font-light">
                      Existing in all possibilities
                    </p>
                  </div>
                </div>
                
                <div className="text-center space-y-6">
                  <div className="text-5xl opacity-40">∞</div>
                  <div className="space-y-3">
                    <h3 className="text-sm uppercase tracking-widest text-gray-600 font-light">Legacy</h3>
                    <p className="text-gray-500 text-sm leading-relaxed font-light">
                      $CZAR preserves the memory
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Ultra-Minimal Footer */}
        <footer className="border-t border-gray-100 py-16">
          <div className="max-w-4xl mx-auto px-6 text-center space-y-8">
            <div className="opacity-60">
              <img src="/logo.svg" alt="Caesar" className="w-6 h-6 mx-auto opacity-50" />
            </div>
            
            <div className="space-y-4">
              <p className="text-xs text-gray-400 font-mono tracking-wider uppercase">
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
          </div>
        </footer>
      </main>
    </div>
  );
}