'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { SuiWalletButton } from '@/components/SuiWalletButton';
import { BettingPanel } from '@/components/BettingPanel';
import { GameNavigation } from '@/components/GameNavigation';
import { Motorcycle } from '@/components/Motorcycle';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Dialog } from '@/components/Dialog';
import { GameLockedOverlay } from '@/components/GameLockedOverlay';
import { UnlockProgress } from '@/components/UnlockProgress';
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
  const [gameResult, setGameResult] = useState<{ 
    crashed: boolean; 
    crashMultiplier: number; 
  } | null>(null);
  const [houseBalance, setHouseBalance] = useState<number>(0);
  const [isFunding, setIsFunding] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<string>('0.1');
  const [passcode, setPasscode] = useState<string>('');
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'error' | 'warning' | 'info' | 'success';
  }>({ isOpen: false, title: '', message: '', type: 'info' });
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

  // Multiplier counting effect during animation with exponential crash curve
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    let animationFrameId: number | null = null;
    let startTime: number | null = null;
    let targetCrash: number | null = null;
    
    if (isAnimating) {
      setCurrentMultiplier(100); // Start at 1.00x
      startTime = Date.now();
      
      // If we have a known crash value from the result, use it as target
      if (lastResult && lastResult.crashMultiplier) {
        targetCrash = lastResult.crashMultiplier;
      }
      
      const animate = () => {
        const elapsed = Date.now() - (startTime || 0);
        const timeInSeconds = elapsed / 1000;
        
        // Use the standard crash game exponential formula: multiplier = e^(0.05 * t)
        // This gives a realistic exponential growth that starts slow and accelerates
        // Adjusted with factor 0.15 for better pacing
        let newMultiplier = Math.floor(100 * Math.exp(0.15 * timeInSeconds));
        
        // If we know the target crash, slow down as we approach it
        if (targetCrash && newMultiplier > targetCrash - 20) {
          // Slow down near the target
          const remaining = targetCrash - newMultiplier;
          newMultiplier = targetCrash - Math.max(0, remaining * 0.95);
        }
        
        // Stop at target or max
        if (targetCrash && newMultiplier >= targetCrash) {
          newMultiplier = targetCrash;
          setCurrentMultiplier(newMultiplier);
          return; // Stop animation
        }
        
        setCurrentMultiplier(Math.min(newMultiplier, 10000)); // Cap at 100x
        
        // Continue animation
        animationFrameId = requestAnimationFrame(animate);
      };
      
      animationFrameId = requestAnimationFrame(animate);
    } else {
      setCurrentMultiplier(100); // Reset when not animating
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isAnimating, lastResult]);

  // Calculate potential payout with 3% house edge (97% payout)
  const calculatePayout = (stake: number, target: number) => {
    return (stake * target * 0.97) / 100;
  };

  // Check for recent successful transactions when wallet communication fails
  const checkRecentTransactions = async () => {
    if (!currentAccount) return;
    
    try {
      console.log('Checking recent transactions for address:', currentAccount.address);
      
      // Query recent transactions for the current account
      const txns = await suiClient.queryTransactionBlocks({
        filter: { FromAddress: currentAccount.address },
        options: { 
          showEvents: true,
          showEffects: true,
          showInput: true 
        },
        limit: 10
      });
      
      // Look for recent crash game transactions (within last 120 seconds)
      const now = Date.now();
      const recentCutoff = now - 120000; // 120 seconds ago
      
      console.log(`Found ${txns.data.length} recent transactions, checking for crash games...`);
      
      for (const tx of txns.data) {
        const txTime = parseInt(tx.timestampMs || '0');
        const ageSeconds = Math.round((now - txTime) / 1000);
        console.log(`Transaction ${tx.digest}: ${ageSeconds}s ago (${txTime})`);
        if (txTime < recentCutoff) {
          console.log(`Transaction too old (${ageSeconds}s), skipping`);
          continue; // Too old
        }
        
        // Check if this transaction targets the crash module or has crash game events
        const isRecentTransaction = txTime >= recentCutoff;
        let isCrashTransaction = false;
        
        // Check transaction input for crash module calls
        if (tx.transaction?.data?.transaction && 'kind' in tx.transaction.data.transaction) {
          const txData = tx.transaction.data.transaction;
          // Check if it's a programmable transaction
          if (txData.kind === 'ProgrammableTransaction' && txData.inputs && txData.transactions) {
            for (const t of txData.transactions) {
              if ('MoveCall' in t && t.MoveCall) {
                const moveCall = t.MoveCall;
                if (moveCall.function === 'play' && moveCall.module === 'crash') {
                  console.log('Found crash module call in transaction:', tx.digest);
                  isCrashTransaction = true;
                  break;
                }
              }
            }
          }
        }
        
        // Check for crash game events
        if (tx.events && tx.events.length > 0) {
          console.log(`Transaction has ${tx.events.length} events:`, tx.events.map(e => e.type));
          for (const event of tx.events) {
            if (event.type && event.type.includes('crash::CrashEvent')) {
              console.log('Found crash game event in transaction:', tx.digest);
              isCrashTransaction = true;
              
              const eventData = event.parsedJson as any;
              const crashMultiplier = parseInt(eventData.crash_x100);
              const isWinner = eventData.win;
              const payout = parseInt(eventData.payout) / 1_000_000_000;
              const explorerUrl = `https://suiexplorer.com/txblock/${tx.digest}?network=${NETWORK}`;
              
              // Start the animation to show what happened
              setIsAnimating(true);
              setCurrentMultiplier(crashMultiplier);
              
              // Show the result after animation
              setTimeout(() => {
                setLastResult({
                  success: true,
                  message: isWinner 
                    ? `🎉 Found it! You won! Cashed out at ${targetMultiplier / 100}×!`
                    : `💥 Found it! Crashed at ${crashMultiplier / 100}×! Better luck next time.`,
                  txUrl: explorerUrl,
                  crashMultiplier,
                  targetMultiplier,
                  isWinner,
                  payout
                });
                
                // Add to game history
                setGameHistory(prev => [{
                  stake: parseFloat(betAmount),
                  target: targetMultiplier,
                  crash: crashMultiplier,
                  win: isWinner,
                  payout,
                  txUrl: explorerUrl
                }, ...prev.slice(0, 4)]);
                
                setIsAnimating(false);
                setIsPlaying(false);
                checkHouseBalance();
              }, 3500);
              
              return; // Found the transaction, exit
            }
          }
        }
        
        // If we found a crash transaction but couldn't parse events, at least notify the user
        if (isCrashTransaction) {
          const explorerUrl = `https://suiexplorer.com/txblock/${tx.digest}?network=${NETWORK}`;
          setLastResult({
            success: true,
            message: "🔍 Found your crash game transaction! Check the transaction details for results.",
            txUrl: explorerUrl
          });
          return;
        }
      }
      
      // No recent crash transaction found
      setLastResult({
        success: false,
        message: "⚠️ No recent crash game found in blockchain. The transaction may still be processing, or check your wallet history."
      });
      
    } catch (error) {
      console.error('Error checking recent transactions:', error);
      throw error;
    }
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
      setDialog({
        isOpen: true,
        title: 'Invalid Passcode',
        message: 'The passcode you entered is incorrect. Please try again.',
        type: 'error'
      });
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
      setDialog({
        isOpen: true,
        title: 'Wallet Not Connected',
        message: 'Please connect your Sui wallet before playing the crash game.',
        type: 'info'
      });
      return;
    }

    const stake = parseFloat(betAmount);
    const potentialPayout = calculatePayout(stake, targetMultiplier);

    if (potentialPayout > houseBalance * 0.8) {
      setDialog({
        isOpen: true,
        title: 'Bet Too Large',
        message: 'Your bet is too large for the current house balance. Please reduce your bet amount or target multiplier to continue.',
        type: 'warning'
      });
      return;
    }

    setIsPlaying(true);
    setLastResult(null);
    setGameResult(null);

    try {
      const stakeInMist = Math.floor(stake * 1_000_000_000);

      // Create transaction - exact same as coinflip
      console.log('Creating crash transaction...');
      const txb = new Transaction();
      
      // Set explicit gas budget to help wallet estimate fees
      txb.setGasBudget(10_000_000); // 0.01 SUI
      
      const [coin] = txb.splitCoins(txb.gas, [stakeInMist]);
      
      console.log('Package ID:', PACKAGE_ID);
      console.log('House Object ID:', HOUSE_OBJECT_ID);
      console.log('Bet Amount (MIST):', stakeInMist);
      console.log('Target Multiplier:', targetMultiplier);

      txb.moveCall({
        target: `${PACKAGE_ID}::crash::play`,
        arguments: [
          txb.object('0x8'),
          txb.object(HOUSE_OBJECT_ID),
          txb.pure.u64(targetMultiplier),
          coin,
        ],
      });

      console.log('Executing crash transaction...');

      const result = await new Promise<any>((resolve, reject) => {
        signAndExecuteTransaction(
          { 
            transaction: txb
          },
          {
            onSuccess: async (data) => {
              console.log('Crash transaction successful:', data);
              
              // Wait a bit for the transaction to be indexed, then fetch full details
              let fullTx = null;
              let retries = 0;
              const maxRetries = 5;
              
              while (!fullTx && retries < maxRetries) {
                try {
                  await new Promise(r => setTimeout(r, 1000)); // Wait 1 second
                  fullTx = await suiClient.getTransactionBlock({
                    digest: data.digest,
                    options: {
                      showEvents: true,
                      showEffects: true,
                      showInput: true,
                    }
                  });
                  console.log('Full transaction details:', fullTx);
                } catch (err) {
                  console.log(`Retry ${retries + 1}/${maxRetries} - Transaction not indexed yet`);
                  retries++;
                }
              }
              
              if (fullTx && fullTx.events) {
                resolve({ ...data, events: fullTx.events });
              } else {
                console.error('Could not fetch transaction events after retries');
                resolve(data);
              }
            },
            onError: (error) => {
              console.error('Crash transaction error in signAndExecuteTransaction:', error);
              reject(error);
            },
          }
        );
      });

      // Parse crash game result from transaction first
      let crashMultiplier = null;
      let didWin = false;
      let actualPayout = 0;
      
      try {
        // Check transaction events for crash game data
        console.log('Transaction events:', result.events);
        if (result.events && result.events.length > 0) {
          const crashEvent = result.events.find((event: any) => 
            event.type && event.type.includes('::crash::CrashEvent')
          );
          
          console.log('Found crash event:', crashEvent);
          
          if (crashEvent && crashEvent.parsedJson) {
            console.log('Crash event parsed JSON:', crashEvent.parsedJson);
            crashMultiplier = parseInt(crashEvent.parsedJson.crash_x100);
            didWin = crashEvent.parsedJson.win;
            actualPayout = parseInt(crashEvent.parsedJson.payout) / 1_000_000_000;
            
            console.log(`🏍️ Crash Result: crashed at ${crashMultiplier/100}x, target was ${targetMultiplier/100}x, won: ${didWin}`);
          } else {
            console.log('No parsed JSON in crash event or no crash event found');
          }
        } else {
          console.log('No events in transaction result');
        }
      } catch (e) {
        console.error('Error parsing crash result:', e);
      }
      
      // Store game result for animation but clear display result
      if (crashMultiplier !== null && !isNaN(crashMultiplier)) {
        console.log('🏍️ Setting game result:', { crashed: !didWin, crashMultiplier, didWin });
        setGameResult({
          crashed: !didWin,
          crashMultiplier
        });
      }
      setLastResult(null);
      setIsAnimating(true);
      
      // Calculate animation duration based on crash multiplier
      // Use logarithmic scale for better pacing
      const animationDuration = crashMultiplier 
        ? Math.min(8000, 1000 + Math.log(crashMultiplier / 100) * 2000) // 1-8 seconds based on multiplier
        : 3000; // Default 3 seconds
      
      setTimeout(() => {
        setIsAnimating(false);
        setIsPlaying(false);
        
        const crashValue = crashMultiplier !== null && !isNaN(crashMultiplier) 
          ? (crashMultiplier / 100).toFixed(2) 
          : '?';
        const resultMessage = didWin 
          ? `🎉 WIN! Cashed out at ${(targetMultiplier/100).toFixed(2)}x! Crash was at ${crashValue}x`
          : `💥 CRASH! Hit ${crashValue}x before your ${(targetMultiplier/100).toFixed(2)}x target`;
        
        setLastResult({
          success: didWin,
          message: resultMessage,
          txUrl: `https://suiexplorer.com/txblock/${result.digest}?network=${NETWORK}`,
          crashMultiplier: crashMultiplier ?? undefined,
          targetMultiplier,
          isWinner: didWin,
          payout: actualPayout
        });
        
        // Update current multiplier to show final crash value
        if (crashMultiplier !== null && !isNaN(crashMultiplier)) {
          setCurrentMultiplier(crashMultiplier);
        }
        
        // Add to game history
        if (crashMultiplier !== null && !isNaN(crashMultiplier)) {
          setGameHistory(prev => [{
            stake: parseFloat(betAmount),
            target: targetMultiplier,
            crash: crashMultiplier,
            win: didWin,
            payout: actualPayout || 0,
            txUrl: `https://suiexplorer.com/txblock/${result.digest}?network=${NETWORK}`
          }, ...prev.slice(0, 4)]);
        }
        
        checkHouseBalance();
      }, animationDuration);

    } catch (error: any) {
      console.error('Crash game failed:', error);
      setIsAnimating(false);
      setIsPlaying(false);
      setLastResult({
        success: false,
        message: `Game failed: ${error.message || error.toString()}`
      });
    }
  };
  useEffect(() => {
    if (currentAccount) {
      checkHouseBalance();
    }
  }, [currentAccount]);
  
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
      <GameLockedOverlay 
        game="crash"
        gameTitle="Cat Crash" 
        unlockMessage="Complete 10 Caesar's CoinFlip games to unlock the crash arena and test your timing skills."
      />
      <GameNavigation />
      {/* Sui Network Banner */}
      <div className={`border-b px-6 py-2 ${
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
                <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-orange-500/5 to-red-600/10 dark:from-red-500/20 dark:via-orange-500/10 dark:to-red-600/20 rounded-full blur-3xl animate-pulse"></div>
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
                  <h1 className="text-6xl font-thin text-gray-900 dark:text-gray-100 tracking-tight leading-tight">
                    Cat <span className="bg-gradient-to-r from-red-600 via-orange-500 to-red-700 dark:from-red-400 dark:via-orange-400 dark:to-red-500 bg-clip-text text-transparent">Crash</span>
                  </h1>
                  
                  <div className="w-24 h-px bg-gradient-to-r from-transparent via-red-500 dark:via-red-400 to-transparent mx-auto"></div>
                  
                  <p className="text-lg text-gray-600 dark:text-gray-400 font-light max-w-2xl mx-auto leading-relaxed">
                    Ride the multiplier wave and cash out before the crash.
                    <br className="hidden sm:block" />
                    Choose your target and test your nerve.
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-8 max-w-md mx-auto border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-light text-gray-700 dark:text-gray-300 mb-4">Connect wallet to ride</h3>
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
                        crashed={!isAnimating && gameResult?.crashed || false}
                        crashMultiplier={gameResult?.crashMultiplier || targetMultiplier}
                      />
                      
                      {/* Speedometer Display */}
                      {(isAnimating || (lastResult && currentMultiplier > 100)) && (
                        <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 px-8 py-4 rounded-full border-4 backdrop-blur-sm transition-all duration-300 ${
                          !isAnimating && lastResult && !lastResult.isWinner 
                            ? 'bg-red-900/40 border-red-600/60 animate-pulse' 
                            : isAnimating 
                              ? 'bg-black/40 border-green-500/60'
                              : 'bg-green-900/40 border-green-400/60'
                        }`}>
                          <div className="text-center">
                            <div className={`text-2xl font-mono font-bold ${
                              !isAnimating && lastResult && !lastResult.isWinner
                                ? 'text-red-400'
                                : isAnimating
                                  ? 'text-green-400'
                                  : 'text-green-300'
                            }`}>
                              {Math.round(currentMultiplier * 0.8)} {/* Convert multiplier to "mph" */}
                            </div>
                            <div className={`text-xs font-semibold tracking-wider ${
                              !isAnimating && lastResult && !lastResult.isWinner
                                ? 'text-red-300'
                                : isAnimating
                                  ? 'text-green-300'
                                  : 'text-green-200'
                            }`}>
                              MPH
                            </div>
                            {!isAnimating && lastResult && !lastResult.isWinner && (
                              <div className="text-xs text-red-300 mt-1">CRASHED!</div>
                            )}
                            {!isAnimating && lastResult && lastResult.isWinner && (
                              <div className="text-xs text-green-300 mt-1">CASHED OUT!</div>
                            )}
                          </div>
                        </div>
                      )}
                      
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h2 className="text-4xl font-thin text-gray-900 dark:text-gray-100">
                      Cat Crash
                    </h2>
                    <div className="w-16 h-px bg-gradient-to-r from-transparent via-red-500 dark:via-red-400 to-transparent mx-auto"></div>
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
                    multiplier={calculatePayout(parseFloat(betAmount || '0'), targetMultiplier) / parseFloat(betAmount || '1')}
                    isPlaying={isPlaying}
                    gameName="Cat Crash"
                    targetMultiplier={targetMultiplier}
                    setTargetMultiplier={setTargetMultiplier}
                    showTargetMultiplier={true}
                  />

                  {/* Unlock Progress */}
                  <div className="py-4">
                    <UnlockProgress showNextUnlock="revolver" />
                  </div>

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
                          <div className="text-sm font-mono text-gray-600 dark:text-white">
                            {lastResult.message}
                          </div>
                          {!lastResult.success && lastResult.message.includes('No recent crash game') && (
                            <button
                              onClick={checkRecentTransactions}
                              className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                            >
                              🔍 Check Transaction Status
                            </button>
                          )}
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

                    {/* Game History - Hidden */}
                    {false && gameHistory.length > 0 && (
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
              In Memoriam Caesar • $CZAR
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

      {/* Professional Dialog */}
      <Dialog
        isOpen={dialog.isOpen}
        onClose={() => setDialog({ ...dialog, isOpen: false })}
        title={dialog.title}
        message={dialog.message}
        type={dialog.type}
      />
    </div>
  );
}
