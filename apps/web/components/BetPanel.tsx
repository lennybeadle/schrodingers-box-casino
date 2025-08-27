'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { UltraBettingClient } from '@/lib/ultraClient';
import { connection } from '@/lib/solanaClient';
import { CatAnimation } from './CatAnimation';

interface BetResult {
  success: boolean;
  message: string;
  signature?: string;
  txUrl?: string;
}

export function BetPanel() {
  const { publicKey, signTransaction, signAllTransactions } = useWallet();
  const [betAmount, setBetAmount] = useState<string>('0.001');
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<BetResult | null>(null);
  const [houseBalance, setHouseBalance] = useState<number>(0);
  const [playerBalance, setPlayerBalance] = useState<number>(0);
  const [txLink, setTxLink] = useState<string>('');
  const [isAnimating, setIsAnimating] = useState(false);

  const houseWallet = new PublicKey('9xDnozdsXgbi7ugacMxGTBmNxPMktPZwUKCv757WwCy4');

  useEffect(() => {
    if (publicKey && signTransaction && signAllTransactions) {
      const client = new UltraBettingClient({ publicKey, signTransaction, signAllTransactions }, connection, houseWallet);
      
      const fetchData = async () => {
        try {
          const balance = await client.getHouseBalance();
          setHouseBalance(balance);
          
          const playerBal = await client.getPlayerBalance();
          setPlayerBalance(playerBal);
        } catch (error) {
          console.error('Failed to fetch balances:', error);
        }
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
      const client = new UltraBettingClient({ publicKey, signTransaction, signAllTransactions }, connection, houseWallet);
      const result = await client.placeBet(parseFloat(betAmount));
      
      setTimeout(() => {
        setLastResult(result);
        setTxLink(result.txUrl || '');
        setIsLoading(false);
        setIsAnimating(false);
        
        // Refresh balances after bet
        const fetchBalances = async () => {
          const balance = await client.getHouseBalance();
          setHouseBalance(balance);
          const playerBal = await client.getPlayerBalance();
          setPlayerBalance(playerBal);
        };
        fetchBalances();
      }, 3000);
      
    } catch (error: any) {
      console.error('Bet failed:', error);
      setLastResult({ 
        success: false, 
        message: error.message || 'Transaction failed' 
      });
      setIsLoading(false);
      setIsAnimating(false);
    }
  };

  const getWinProbability = () => 49;
  const calculatePayout = (amount: number) => amount * 1.96;

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* Left Column - Game Stats */}
        <div className="space-y-6">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Game Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">House Balance</span>
                <span className="text-white font-mono">{houseBalance.toFixed(3)} SOL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Your Balance</span>
                <span className="text-white font-mono">{playerBalance.toFixed(3)} SOL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Win Rate</span>
                <span className="text-green-400">{getWinProbability()}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Payout</span>
                <span className="text-caesar-gold">1.96x</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center Column - Game */}
        <div className="space-y-6">
          <div className="text-center">
            <CatAnimation isAnimating={isAnimating} />
          </div>

          {/* Bet Controls */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Bet Amount (SOL)
                </label>
                <input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  step="0.001"
                  min="0.001"
                  disabled={isLoading}
                  className="w-full px-4 py-3 bg-black/50 border border-gray-600 rounded-lg text-white text-center font-mono text-lg focus:outline-none focus:border-caesar-gold"
                  placeholder="0.001"
                />
              </div>

              <div className="text-center py-2">
                <div className="text-sm text-gray-400 mb-1">Potential Win</div>
                <div className="text-2xl font-bold text-caesar-gold font-mono">
                  {calculatePayout(parseFloat(betAmount || '0')).toFixed(3)} SOL
                </div>
              </div>

              <button
                onClick={handleBet}
                disabled={isLoading || !publicKey}
                className="w-full py-4 bg-gradient-to-r from-caesar-gold to-czar-bronze text-black font-bold text-lg rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                    <span>Flipping...</span>
                  </div>
                ) : (
                  'FLIP COIN'
                )}
              </button>
            </div>
          </div>

          {/* Result */}
          {lastResult && (
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 text-center">
              <div className="text-6xl mb-4">
                {lastResult.success && lastResult.message.includes('won') ? '👑' : '⚱️'}
              </div>
              <div className={`text-2xl font-bold mb-2 ${
                lastResult.success && lastResult.message.includes('won') ? 'text-green-400' : 'text-red-400'
              }`}>
                {lastResult.success && lastResult.message.includes('won') ? 'CAESAR LIVES!' : 'CAESAR FALLS'}
              </div>
              <div className="text-gray-400 mb-4">{lastResult.message}</div>
              {lastResult.txUrl && (
                <a 
                  href={lastResult.txUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-caesar-gold hover:underline text-sm"
                >
                  View Transaction →
                </a>
              )}
            </div>
          )}
        </div>

        {/* Right Column - Info */}
        <div className="space-y-6">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">How to Play</h3>
            <div className="space-y-3 text-sm text-gray-300">
              <div className="flex items-start space-x-3">
                <span className="text-caesar-gold">1.</span>
                <span>Enter your bet amount in SOL</span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-caesar-gold">2.</span>
                <span>Click "FLIP COIN" to place your bet</span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-caesar-gold">3.</span>
                <span>Win 1.96x your bet (49% chance)</span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-caesar-gold">4.</span>
                <span>Payouts are instant and automatic</span>
              </div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Game Rules</h3>
            <div className="space-y-2 text-sm text-gray-300">
              <div className="flex justify-between">
                <span>Min Bet:</span>
                <span className="text-white">0.001 SOL</span>
              </div>
              <div className="flex justify-between">
                <span>Win Rate:</span>
                <span className="text-green-400">49%</span>
              </div>
              <div className="flex justify-between">
                <span>House Edge:</span>
                <span className="text-red-400">4%</span>
              </div>
              <div className="flex justify-between">
                <span>Payout:</span>
                <span className="text-caesar-gold">1.96x</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}