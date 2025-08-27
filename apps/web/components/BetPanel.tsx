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
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Main Game Panel */}
      <div className="bg-white/40 backdrop-blur-sm rounded-3xl border border-white/20 shadow-glass p-8 hover:shadow-brand-glow-strong transition-all duration-500">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold font-space mb-2 bg-brand-gradient bg-clip-text text-transparent">
            Quantum Flip
          </h2>
          <p className="text-slate-600 font-mono text-sm">
            Observe the cat. Place your bet. Collapse the wave function.
          </p>
        </div>
        
        <CatAnimation 
          isWinner={lastResult?.isWinner} 
          isAnimating={isAnimating}
        />
        
        <div className="grid md:grid-cols-2 gap-8 mt-12">
          {/* Betting Controls */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold font-space text-slate-700 mb-3">
                Bet Amount
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  min={lamportsToSol(MIN_BET_LAMPORTS)}
                  max={maxBet}
                  step="0.001"
                  disabled={isLoading}
                  className="w-full px-6 py-4 bg-white/60 backdrop-blur-sm border border-white/30 rounded-2xl focus:ring-2 focus:ring-brand-orange focus:border-transparent font-mono text-lg shadow-glass"
                  placeholder="0.000"
                />
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-500 font-mono font-semibold">
                  SOL
                </div>
              </div>
              <div className="flex justify-between text-xs font-mono text-slate-500 mt-2">
                <span>Min: {lamportsToSol(MIN_BET_LAMPORTS)} SOL</span>
                <span>Max: {maxBet.toFixed(3)} SOL</span>
              </div>
            </div>
            
            <button
              onClick={handleBet}
              disabled={isLoading || !publicKey}
              className="group relative w-full py-6 bg-brand-gradient text-white rounded-2xl font-bold font-space text-xl hover:shadow-brand-glow-strong transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
            >
              <span className="relative z-10 flex items-center justify-center gap-3">
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Flipping...
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Flip the Box
                  </>
                )}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-brand-coral to-brand-orange opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>
          </div>

          {/* Payout Info */}
          <div className="space-y-4">
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/30 shadow-glass">
              <div className="flex justify-between items-center mb-4">
                <span className="text-slate-600 font-space font-medium">Potential Payout:</span>
                <span className="font-bold font-mono text-2xl bg-brand-gradient bg-clip-text text-transparent">
                  {lamportsToSol(potentialPayout).toFixed(4)} SOL
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">House Edge:</span>
                  <span className="text-slate-700 font-semibold">{(HOUSE_EDGE_BPS / 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Multiplier:</span>
                  <span className="text-slate-700 font-semibold">1.96x</span>
                </div>
              </div>
            </div>

            {/* Win Rate Display */}
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/30 shadow-glass">
              <div className="flex items-center justify-between mb-3">
                <span className="text-slate-600 font-space font-medium">Win Probability:</span>
                <span className="font-bold font-mono text-brand-orange">50.00%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div className="w-1/2 bg-brand-gradient h-full rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
        
        {lastResult && (
          <div className={`mt-4 p-4 rounded-lg text-center ${
            lastResult.isWinner ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {lastResult.isWinner ? '✨ Alive!' : '😺 Used a life!'}
            {lastResult.isWinner && (
              <div className="text-sm mt-1">
                Won {lamportsToSol(lastResult.payout).toFixed(4)} SOL
              </div>
            )}
          </div>
        )}
        
        {txLink && (
          <div className="mt-4 text-center">
            <a
              href={txLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-orange hover:text-brand-coral underline text-sm"
            >
              View Transaction
            </a>
          </div>
        )}
      </div>
      
      <div className="bg-white rounded-3xl shadow-xl p-8">
        <h3 className="text-lg font-bold mb-4">Game Stats</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Vault Balance:</span>
            <span className="ml-2 font-bold">{lamportsToSol(vaultBalance).toFixed(4)} SOL</span>
          </div>
          <div>
            <span className="text-gray-600">Recent Games:</span>
            <span className="ml-2 font-bold">{recentBets.length}</span>
          </div>
        </div>
        
        {recentBets.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Results</h4>
            <div className="flex gap-2 flex-wrap">
              {recentBets.map((bet, i) => (
                <span
                  key={i}
                  className={`px-2 py-1 rounded-full text-xs ${
                    bet.isWinner 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {bet.isWinner ? 'W' : 'L'}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}