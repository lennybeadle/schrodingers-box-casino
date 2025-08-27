'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { CatflipClient, BetResult } from '@/lib/catflipClient';
import { 
  lamportsToSol, 
  solToLamports, 
  calculatePayout,
  MIN_BET_LAMPORTS,
  HOUSE_EDGE_BPS 
} from '@/lib/solanaClient';
import { CatAnimation } from './CatAnimation';

export function BetPanel() {
  const { publicKey, signTransaction, signAllTransactions } = useWallet();
  const [betAmount, setBetAmount] = useState<string>('0.001');
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<{ isWinner: boolean; payout: number } | null>(null);
  const [vaultBalance, setVaultBalance] = useState<number>(0);
  const [recentBets, setRecentBets] = useState<BetResult[]>([]);
  const [txLink, setTxLink] = useState<string>('');
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (publicKey && signTransaction && signAllTransactions) {
      const client = new CatflipClient({ publicKey, signTransaction, signAllTransactions });
      
      const fetchData = async () => {
        const balance = await client.getVaultBalance();
        setVaultBalance(balance);
        
        const recent = await client.getRecentBets(10);
        setRecentBets(recent);
      };
      
      fetchData();
      const interval = setInterval(fetchData, 10000);
      
      return () => clearInterval(interval);
    }
  }, [publicKey, signTransaction, signAllTransactions]);

  const handleBet = async () => {
    if (!publicKey || !signTransaction || !signAllTransactions) {
      alert('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    setIsAnimating(true);
    setLastResult(null);
    setTxLink('');

    try {
      const client = new CatflipClient({ publicKey, signTransaction, signAllTransactions });
      const amountLamports = solToLamports(parseFloat(betAmount));
      
      const vrfAccount = new PublicKey('YOUR_VRF_ACCOUNT');
      const oracleQueue = new PublicKey('F8ce7MscPZmvGzjJamoKggfq86NxZ6zDKfz6NrJJzBG7');
      const queueAuthority = new PublicKey('31Sof5r1xi7dfcaz4x9Kuwm8J9ueAdDduMcme59sP8gc');
      const dataBuffer = new PublicKey('YOUR_DATA_BUFFER');
      const permission = new PublicKey('YOUR_PERMISSION');
      const escrow = new PublicKey('YOUR_ESCROW');
      const payerWallet = publicKey;
      const payerAuthority = publicKey;
      const switchboardProgram = new PublicKey('SW1TCH7qEPTdLsDHRgPuMQjbQxKdH2aBStViMFnt64f');
      
      const tx = await client.placeBet(
        amountLamports,
        vrfAccount,
        oracleQueue,
        queueAuthority,
        dataBuffer,
        permission,
        escrow,
        payerWallet,
        payerAuthority,
        switchboardProgram
      );
      
      setTxLink(`https://explorer.solana.com/tx/${tx}?cluster=devnet`);
      
      setTimeout(() => {
        const isWinner = Math.random() < 0.49;
        const payout = isWinner ? calculatePayout(amountLamports) : 0;
        setLastResult({ isWinner, payout });
        setIsAnimating(false);
        
        const fetchData = async () => {
          const balance = await client.getVaultBalance();
          setVaultBalance(balance);
          const recent = await client.getRecentBets(10);
          setRecentBets(recent);
        };
        fetchData();
      }, 3000);
      
    } catch (error) {
      console.error('Bet failed:', error);
      alert('Bet failed. Please try again.');
      setIsAnimating(false);
    } finally {
      setIsLoading(false);
    }
  };

  const potentialPayout = calculatePayout(solToLamports(parseFloat(betAmount) || 0));
  const maxBet = (vaultBalance * 0.1) / 1_000_000_000;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Compact Game Panel */}
      <div className="bg-white border border-gray-100 p-8 transition-all duration-700 hover:border-gray-200">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-6">
            <img src="/logo.svg" alt="Caesar" className="w-6 h-6 animate-caesar-float opacity-60" />
            <div>
              <h2 className="text-xl font-thin text-gray-800 tracking-wide">
                Quantum Flip
              </h2>
              <p className="text-gray-400 font-mono text-xs tracking-widest uppercase">
                Emperor's Game
              </p>
            </div>
          </div>
          <div className="w-12 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent mx-auto"></div>
        </div>
        
        <CatAnimation 
          isWinner={lastResult?.isWinner} 
          isAnimating={isAnimating}
        />
        
        <div className="grid lg:grid-cols-5 gap-12 mt-10">
          {/* Compact Betting Interface */}
          <div className="lg:col-span-3 space-y-8">
            {/* Compact Bet Amount */}
            <div className="space-y-4">
              <div className="text-center">
                <label className="text-xs font-mono text-gray-400 uppercase tracking-widest">
                  Stake Amount
                </label>
              </div>
              <div className="relative">
                <input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  min={lamportsToSol(MIN_BET_LAMPORTS)}
                  max={maxBet}
                  step="0.001"
                  disabled={isLoading}
                  className="w-full text-center text-3xl font-thin py-6 bg-transparent border-0 border-b border-gray-200 focus:border-czar-gold focus:outline-none focus:ring-0 transition-colors duration-500 font-mono text-gray-800"
                  placeholder="0.001"
                />
                <div className="absolute right-0 bottom-2 text-gray-400 font-mono text-base font-light">
                  SOL
                </div>
              </div>
              <div className="flex justify-between text-xs font-mono text-gray-400 font-light">
                <span>Min: {lamportsToSol(MIN_BET_LAMPORTS)}</span>
                <span>Max: {maxBet.toFixed(3)}</span>
              </div>
            </div>

            {/* Compact Quick Amounts */}
            <div className="flex justify-center gap-4">
              {[0.01, 0.05, 0.1, 0.5].map((amount) => (
                <button
                  key={amount}
                  onClick={() => setBetAmount(amount.toString())}
                  disabled={isLoading}
                  className="px-3 py-1.5 text-xs font-mono text-gray-400 hover:text-czar-gold transition-colors duration-300 border border-gray-100 hover:border-gray-200"
                >
                  {amount}
                </button>
              ))}
            </div>
            
            {/* Compact Flip Button */}
            <button
              onClick={handleBet}
              disabled={isLoading || !publicKey}
              className="group relative w-full py-6 bg-gradient-to-r from-gray-900 via-black to-gray-900 text-white overflow-hidden transition-all duration-700 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.01]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-czar-gold via-caesar-gold to-czar-bronze opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
              <span className="relative z-10 flex items-center justify-center gap-4 text-lg font-light tracking-widest">
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin"></div>
                    QUANTUM PROCESSING
                  </>
                ) : (
                  <>
                    FLIP
                  </>
                )}
              </span>
            </button>
          </div>

          {/* Compact Sidebar */}
          <div className="lg:col-span-2 space-y-6">
            {/* Potential Win */}
            <div className="text-center py-4">
              <div className="space-y-3">
                <div className="text-xs text-gray-400 uppercase tracking-widest font-mono">
                  Potential Win
                </div>
                <div className="text-2xl font-thin text-czar-gold font-mono">
                  {lamportsToSol(potentialPayout).toFixed(4)}
                </div>
                <div className="text-xs text-gray-400 font-mono">SOL</div>
              </div>
            </div>

            {/* Compact Stats */}
            <div className="space-y-4 text-center">
              <div className="w-8 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mx-auto"></div>
              
              <div className="grid grid-cols-3 gap-4 text-xs font-mono text-gray-400">
                <div className="text-center">
                  <div className="text-base font-light text-czar-gold mb-1">{(HOUSE_EDGE_BPS / 100).toFixed(1)}%</div>
                  <div className="uppercase tracking-widest text-xs">Edge</div>
                </div>
                <div className="text-center">
                  <div className="text-base font-light text-czar-bronze mb-1">1.96x</div>
                  <div className="uppercase tracking-widest text-xs">Multiplier</div>
                </div>
                <div className="text-center">
                  <div className="text-base font-light text-czar-silver mb-1">50%</div>
                  <div className="uppercase tracking-widest text-xs">Win Rate</div>
                </div>
              </div>
            </div>

            {/* Compact Quantum Probability */}
            <div className="text-center space-y-3">
              <div className="text-xs text-gray-400 uppercase tracking-widest font-mono">
                Quantum State
              </div>
              <div className="w-full bg-gray-100 h-1 overflow-hidden">
                <div className="w-1/2 bg-gradient-to-r from-czar-gold to-czar-bronze h-full"></div>
              </div>
              <div className="flex justify-between text-xs text-gray-400 font-mono">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Compact Result */}
        {lastResult && (
          <div className="mt-10 text-center animate-in fade-in duration-1000">
            <div className="space-y-4">
              <div className="text-4xl opacity-60">
                {lastResult.isWinner ? '👑' : '⚱️'}
              </div>
              <div className="space-y-2">
                <div className={`text-lg font-thin tracking-wide ${
                  lastResult.isWinner ? 'text-green-600' : 'text-red-600'
                }`}>
                  {lastResult.isWinner ? 'EMPEROR LIVES' : 'EMPEROR FALLS'}
                </div>
                {lastResult.isWinner && (
                  <div className="text-base font-mono text-czar-gold font-light">
                    +{lamportsToSol(lastResult.payout).toFixed(4)} SOL
                  </div>
                )}
              </div>
              <div className="w-8 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent mx-auto"></div>
            </div>
          </div>
        )}
        
        {/* Minimal Transaction Link */}
        {txLink && (
          <div className="mt-8 text-center">
            <a
              href={txLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono text-gray-400 hover:text-czar-gold transition-colors duration-300 tracking-wide uppercase"
            >
              View Transaction
            </a>
          </div>
        )}
      </div>
      
      {/* Compact Empire Stats */}
      <div className="bg-white border border-gray-100 p-6 transition-all duration-700">
        <div className="text-center space-y-6">
          <div className="space-y-2">
            <h3 className="text-base font-thin text-gray-800 tracking-wide">Empire State</h3>
            <div className="w-8 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent mx-auto"></div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="text-center space-y-2">
              <div className="text-xs text-gray-400 uppercase tracking-widest font-mono">
                Treasury Balance
              </div>
              <div className="text-xl font-thin text-czar-gold font-mono">
                {lamportsToSol(vaultBalance).toFixed(4)}
              </div>
              <div className="text-xs text-gray-400 font-mono">SOL</div>
            </div>
            <div className="text-center space-y-2">
              <div className="text-xs text-gray-400 uppercase tracking-widest font-mono">
                Recent Games
              </div>
              <div className="text-xl font-thin text-czar-bronze font-mono">
                {recentBets.length}
              </div>
              <div className="text-xs text-gray-400 font-mono">Flips</div>
            </div>
          </div>
          
          {recentBets.length > 0 && (
            <div className="space-y-4">
              <div className="w-6 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mx-auto"></div>
              
              <div className="space-y-3">
                <div className="text-xs text-gray-400 uppercase tracking-widest font-mono">
                  Battle History
                </div>
                <div className="flex justify-center gap-1.5 flex-wrap">
                  {recentBets.map((bet, i) => (
                    <div
                      key={i}
                      className={`w-5 h-5 text-xs font-mono flex items-center justify-center border transition-colors duration-300 ${
                        bet.isWinner 
                          ? 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100' 
                          : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                      }`}
                    >
                      {bet.isWinner ? 'W' : 'L'}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}