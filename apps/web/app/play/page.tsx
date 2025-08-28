'use client';

import Link from 'next/link';
import { SuiWalletButton } from '@/components/SuiWalletButton';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useState, useEffect } from 'react';
import { suiClient } from '@/lib/suiClient';

interface BetHistory {
  digest: string;
  timestamp: number;
  player: string;
  amount: number;
  isWinner: boolean;
  payout: number;
  randomValue: number;
  blockHeight?: number;
}

interface AdvancedStats {
  houseEdge: number;
  totalVolume24h: number;
  totalBets24h: number;
  avgBetSize: number;
  largestWin: number;
  actualWinRate: number;
  recentBets: Array<{
    player: string;
    amount: number;
    isWinner: boolean;
    payout: number;
    timestamp: number;
  }>;
}

export default function Play() {
  const currentAccount = useCurrentAccount();
  const [playerBets, setPlayerBets] = useState<BetHistory[]>([]);
  const [allBets, setAllBets] = useState<BetHistory[]>([]);
  const [stats, setStats] = useState<AdvancedStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'my-bets' | 'all-bets'>('overview');

  const fetchData = async () => {
    if (!currentAccount) return;
    
    try {
      setLoading(true);
      
      // Fetch all bet data
      const events = await suiClient.queryEvents({
        query: {
          MoveEventType: `${process.env.NEXT_PUBLIC_PACKAGE_ID}::casino::BetPlaced`
        },
        limit: 100,
        order: 'descending'
      });

      const allBetsData = events.data.map(event => ({
        digest: event.id.txDigest,
        timestamp: parseInt(event.timestampMs || '0'),
        player: (event.parsedJson as any).player,
        amount: parseInt((event.parsedJson as any).amount) / 1_000_000_000,
        isWinner: (event.parsedJson as any).is_winner,
        payout: parseInt((event.parsedJson as any).payout) / 1_000_000_000,
        randomValue: parseInt((event.parsedJson as any).random_value),
        blockHeight: event.id.eventSeq ? parseInt(event.id.eventSeq) : undefined
      }));

      setAllBets(allBetsData);
      setPlayerBets(allBetsData.filter(bet => bet.player === currentAccount.address));

      // Calculate stats
      const now = Date.now();
      const oneDayAgo = now - (24 * 60 * 60 * 1000);
      const bets24h = allBetsData.filter(bet => bet.timestamp > oneDayAgo);
      const totalVolume24h = bets24h.reduce((sum, bet) => sum + bet.amount, 0);
      const wins = allBetsData.filter(bet => bet.isWinner);
      const actualWinRate = allBetsData.length > 0 ? (wins.length / allBetsData.length) * 100 : 0;
      const avgBetSize = bets24h.length > 0 ? totalVolume24h / bets24h.length : 0;
      const largestWin = Math.max(...allBetsData.map(bet => bet.payout), 0);

      setStats({
        houseEdge: 3.5, // Combined house edge (3.96% coinflip + 3% revolver average)
        totalVolume24h,
        totalBets24h: bets24h.length,
        avgBetSize,
        largestWin,
        actualWinRate,
        recentBets: allBetsData.slice(0, 20).map(bet => ({
          player: bet.player,
          amount: bet.amount,
          isWinner: bet.isWinner,
          payout: bet.payout,
          timestamp: bet.timestamp
        }))
      });

    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentAccount) {
      fetchData();
    }
  }, [currentAccount]);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
      {/* Ultra-Minimal Navigation */}
      <nav className="relative z-50 px-6 py-8">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <Link 
            href="/"
            className="group flex items-center gap-3 transition-all duration-300 hover:scale-[1.02]"
          >
            <img src="/logo.svg" alt="Caesar" className="w-6 h-6 animate-caesar-float opacity-80" />
            <div>
              <h1 className="text-lg font-thin text-gray-900 dark:text-gray-100 tracking-wide">CATSINO</h1>
              <p className="text-xs text-gray-400 dark:text-gray-500 font-mono tracking-wider">Advanced Interface</p>
            </div>
          </Link>
          
          <div className="flex items-center gap-6">
            <ThemeToggle />
            <SuiWalletButton />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6">
        {currentAccount ? (
          <div className="space-y-8">
            {/* Compact Header */}
            <div className="text-center space-y-4 py-6">
              <div className="w-8 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent mx-auto"></div>
              
              <div className="space-y-2">
                <h1 className="text-3xl font-thin text-gray-900 dark:text-gray-100 tracking-wide">
                  Emperor's Arena
                </h1>
                <p className="text-gray-500 dark:text-gray-400 font-light text-sm max-w-md mx-auto">
                  Quantum chance meets imperial legacy
                </p>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex justify-center mb-8">
              <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700">
                {[
                  { id: 'overview', label: 'Overview' },
                  { id: 'my-bets', label: 'My Bets' },
                  { id: 'all-bets', label: 'All Bets' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-6 py-2 rounded-md font-medium text-sm transition-all ${
                      activeTab === tab.id
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="text-center py-20">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-czar-gold"></div>
                <p className="mt-4 text-gray-500 dark:text-gray-400">Loading casino data...</p>
              </div>
            ) : (
              <>
                {/* Overview Tab */}
                {activeTab === 'overview' && stats && (
                  <div className="space-y-8">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 text-center border border-gray-100 dark:border-gray-700">
                        <div className="text-lg font-bold text-czar-gold mb-1">
                          3.96% | 3.0% | 3.0%
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">House Edge</div>
                        <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">CoinFlip | Crash | Revolver</div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 text-center border border-gray-100 dark:border-gray-700">
                        <div className="text-2xl font-bold text-czar-gold mb-1">
                          {stats.totalVolume24h.toFixed(3)}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Volume 24h (SUI)</div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 text-center border border-gray-100 dark:border-gray-700">
                        <div className="text-2xl font-bold text-czar-gold mb-1">
                          {stats.actualWinRate.toFixed(1)}%
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Actual Win Rate</div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 text-center border border-gray-100 dark:border-gray-700">
                        <div className="text-2xl font-bold text-czar-gold mb-1">
                          {stats.largestWin.toFixed(3)}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Largest Win (SUI)</div>
                      </div>
                    </div>


                    {/* Recent Activity */}
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Activity</h3>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {stats.recentBets.length === 0 ? (
                          <div className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                            No bets found. Start playing to see activity!
                          </div>
                        ) : (
                          <div className="divide-y divide-gray-100 dark:divide-gray-700">
                            {stats.recentBets.map((bet, index) => (
                              <div key={index} className="px-6 py-4 flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                  <div className={`w-3 h-3 rounded-full ${bet.isWinner ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                  <div>
                                    <div className="font-mono text-sm text-gray-900 dark:text-gray-100">{formatAddress(bet.player)}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">{formatTime(bet.timestamp)}</div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-semibold text-gray-900 dark:text-gray-100">{bet.amount.toFixed(3)} SUI</div>
                                  <div className={`text-sm ${bet.isWinner ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                    {bet.isWinner ? `Won ${bet.payout.toFixed(3)}` : 'Lost'}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* My Bets Tab */}
                {activeTab === 'my-bets' && (
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">My Betting History</h3>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {playerBets.length === 0 ? (
                        <div className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                          No bets found. <Link href="/" className="text-czar-gold hover:underline">Start playing!</Link>
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-100">
                          {playerBets.map((bet, index) => (
                            <div key={index} className="px-6 py-4">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-3">
                                  <div className={`w-3 h-3 rounded-full ${bet.isWinner ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                  <div className="font-semibold">{bet.amount.toFixed(3)} SUI</div>
                                  <div className={`text-sm px-2 py-1 rounded ${
                                    bet.isWinner ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                  }`}>
                                    {bet.isWinner ? `Won ${bet.payout.toFixed(3)} SUI` : 'Lost'}
                                  </div>
                                </div>
                                <div className="text-sm text-gray-500">{formatTime(bet.timestamp)}</div>
                              </div>
                              <div className="text-xs text-gray-400 font-mono">
                                Random: {bet.randomValue} | TX: {bet.digest.slice(0, 16)}...
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* All Bets Tab */}
                {activeTab === 'all-bets' && (
                  <div className="bg-white border border-gray-200 rounded-lg">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900">All Bets</h3>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {allBets.length === 0 ? (
                        <div className="px-6 py-12 text-center text-gray-500">
                          No bets found on the network.
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-100">
                          {allBets.map((bet, index) => (
                            <div key={index} className="px-6 py-4">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-3">
                                  <div className={`w-3 h-3 rounded-full ${bet.isWinner ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                  <div className="font-mono text-sm">{formatAddress(bet.player)}</div>
                                  <div className="font-semibold">{bet.amount.toFixed(3)} SUI</div>
                                  <div className={`text-sm px-2 py-1 rounded ${
                                    bet.isWinner ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                  }`}>
                                    {bet.isWinner ? `Won ${bet.payout.toFixed(3)}` : 'Lost'}
                                  </div>
                                </div>
                                <div className="text-sm text-gray-500">{formatTime(bet.timestamp)}</div>
                              </div>
                              <div className="text-xs text-gray-400 font-mono">
                                Random: {bet.randomValue} | TX: {bet.digest.slice(0, 16)}...
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Quick Play Button */}
                <div className="text-center pt-8">
                  <Link 
                    href="/"
                    className="inline-block px-8 py-4 bg-gradient-to-r from-czar-gold via-caesar-gold to-czar-bronze text-black font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                  >
                    Home
                  </Link>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center space-y-12 py-20">
              {/* Ethereal Caesar Portrait */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-caesar-gold/5 via-caesar-cream/3 to-czar-bronze/5 rounded-full blur-3xl animate-pulse"></div>
                <img 
                  src="/logo.svg" 
                  alt="Caesar the Cat" 
                  className="w-48 h-48 mx-auto animate-caesar-float opacity-30 grayscale relative z-10" 
                />
              </div>
              
              <div className="space-y-8">
                <div className="space-y-4">
                  <h2 className="text-3xl font-thin text-gray-800 tracking-wide">
                    Connect to Enter
                  </h2>
                  <div className="w-12 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent mx-auto"></div>
                  <p className="text-gray-500 font-light max-w-sm mx-auto leading-relaxed">
                    The Emperor's arena awaits your wallet connection
                  </p>
                </div>
                
                <div className="pt-4">
                  <SuiWalletButton />
                </div>
                
                {/* Minimal Features */}
                <div className="flex items-center justify-center gap-12 text-xs text-gray-400 font-mono pt-8">
                  <div className="text-center">
                    <div className="text-lg font-light text-czar-gold mb-1">⚡</div>
                    <div className="uppercase tracking-widest">Instant</div>
                  </div>
                  <div className="w-px h-8 bg-gray-200"></div>
                  <div className="text-center">
                    <div className="text-lg font-light text-czar-bronze mb-1">🎯</div>
                    <div className="uppercase tracking-widest">Fair</div>
                  </div>
                  <div className="w-px h-8 bg-gray-200"></div>
                  <div className="text-center">
                    <div className="text-lg font-light text-czar-silver mb-1">👑</div>
                    <div className="uppercase tracking-widest">Honor</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}