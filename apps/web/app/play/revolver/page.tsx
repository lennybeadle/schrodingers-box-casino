'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { SuiWalletButton } from '@/components/SuiWalletButton';
import { Spinner } from '@/components/Spinner';
import { BettingPanel } from '@/components/BettingPanel';
import { GameNavigation } from '@/components/GameNavigation';
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
  
  const [betAmount, setBetAmount] = useState<string>('0.01');
  const [isSpinning, setIsSpinning] = useState(false);
  const [lastResult, setLastResult] = useState<{ 
    success: boolean; 
    message: string; 
    txUrl?: string; 
    angle?: number; 
    isWinner?: boolean;
    payout?: number;
  } | null>(null);
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
      let internalBalance = 0;
      if (fields) {
        internalBalance = parseInt(fields.balance) / 1_000_000_000;
      }

      setHouseBalance(internalBalance);
    } catch (error) {
      console.error('Error checking house balance:', error);
    }
  };

  useEffect(() => {
    if (currentAccount) {
      checkHouseBalance();
    }
  }, [currentAccount]);

  const handleSpin = async () => {
    if (!currentAccount) return;
    
    setIsSpinning(true);
    setLastResult(null);
    
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
        checkHouseBalance(); // Refresh house balance
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
    <div className="min-h-screen bg-white relative">
      <GameNavigation />
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
                  <h1 className="text-6xl font-thin text-gray-900 tracking-tight leading-tight">
                    Revolver<br/>
                    <span className="text-red-600">Roulette</span>
                  </h1>
                  <p className="text-lg text-gray-600 font-light max-w-2xl mx-auto leading-relaxed">
                    Russian roulette meets quantum probability. 
                    <br className="hidden sm:block" />
                    Will the cat live or die? Spin the cylinder to find out.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-2xl p-8 max-w-md mx-auto">
                  <h3 className="text-lg font-light text-gray-700 mb-4">Connect wallet to spin</h3>
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
                    />
                  </div>
                  
                  <div className="space-y-4">
                    <h2 className="text-4xl font-thin text-gray-900">
                      Revolver Roulette
                    </h2>
                    <p className="text-gray-600 font-light">
                      45° = ALIVE CAT (7.76x payout)
                      <br />
                      Otherwise = DEAD CAT
                    </p>
                  </div>
                </div>

                {/* Right - Controls */}
                <div className="lg:col-span-3 space-y-8">
                  
                  {/* Betting Panel */}
                  <BettingPanel
                    betAmount={betAmount}
                    setBetAmount={setBetAmount}
                    multiplier={7.76}
                    isPlaying={isSpinning}
                    gameName="Revolver Roulette"
                  />
                  
                  {/* House Balance */}
                  <div className="text-center text-sm text-gray-600">
                    House Balance: <span className="font-mono">{houseBalance.toFixed(3)} SUI</span>
                  </div>
                  
                  {pathname === '/makaveli' && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="text-yellow-600 text-xs">
                        Admin mode: House funding controls available at main game
                      </div>
                    </div>
                  )}

                  {/* Spin Button */}
                  <div className="space-y-6">
                    <button
                      onClick={handleSpin}
                      disabled={isSpinning || !currentAccount}
                      className="w-full relative bg-gradient-to-r from-red-600 via-orange-600 to-yellow-600 text-white px-12 py-6 rounded-2xl font-light text-xl tracking-wide transition-all duration-300 hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none overflow-hidden group"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-red-700 via-orange-700 to-yellow-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <span className="relative z-10 flex items-center justify-center gap-4 text-xl font-light tracking-widest">
                        {isSpinning ? (
                          <>
                            <div className="w-6 h-6 border border-white/30 border-t-white rounded-full animate-spin"></div>
                            SPINNING CYLINDER
                          </>
                        ) : (
                          'SPIN THE REVOLVER'
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
                            lastResult.success && lastResult.isWinner ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {lastResult.success && lastResult.isWinner ? 'ALIVE CAT' : 'DEAD CAT'}
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
                                className="text-red-600 hover:underline"
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
            <div className="w-16 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent mx-auto"></div>
            
            <p className="text-xs text-gray-400 font-mono tracking-wider">
              Revolver Roulette • 7.76x • 3% House Edge
            </p>
            
            <div className="flex items-center justify-center gap-8 text-xs">
              <Link 
                href="/" 
                className="text-gray-400 hover:text-red-600 transition-colors duration-300 font-mono tracking-wide"
              >
                Home
              </Link>
              <div className="w-px h-3 bg-gray-200"></div>
              <Link 
                href="/play" 
                className="text-gray-400 hover:text-red-600 transition-colors duration-300 font-mono tracking-wide"
              >
                Coin Flip
              </Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}