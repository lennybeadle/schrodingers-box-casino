'use client';

import Link from 'next/link';
import { SuiWalletButton } from '@/components/SuiWalletButton';
import { GameNavigation } from '@/components/GameNavigation';
import { ThemeToggle } from '@/components/ThemeToggle';
import { GameCarousel } from '@/components/GameCarousel';

export default function Home() {
  const NETWORK = process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet';

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 relative transition-colors duration-300">
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
            <div className="flex items-center space-x-3">
              <img 
                src="/logo.svg" 
                alt="CatsinoFun Logo" 
                className="w-8 h-8" 
              />
              <span className="font-light text-xl tracking-wide text-gray-900 dark:text-gray-100">
                CatsinoFun
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <ThemeToggle />
            <SuiWalletButton />
          </div>
        </div>
      </nav>

      <main className="relative">
        {/* Welcome State */}
        <div className="min-h-screen flex items-center justify-center px-6 pb-32">
          <div className="max-w-4xl mx-auto text-center space-y-16">

            <div className="space-y-12">
              <div className="space-y-6">
                <h1 className="text-6xl font-thin text-gray-900 dark:text-gray-100 tracking-tight leading-tight">
                  CatsinoFun
                </h1>
                
                <div className="w-24 h-px bg-gradient-to-r from-transparent via-gray-400 dark:via-gray-500 to-transparent mx-auto"></div>
                
                <p className="text-lg text-gray-600 dark:text-gray-300 font-light max-w-2xl mx-auto leading-relaxed">
                  Welcome to Caesar's Games on SUI blockchain.
                  <br className="hidden sm:block" />
                  Choose your game and start playing.
                </p>

                {/* Contract Address */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6 max-w-lg mx-auto border border-gray-200 dark:border-gray-700">
                  <div className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">
                    $CZAR Contract Address
                  </div>
                  <div className="text-center">
                    <span className="text-gray-400 dark:text-gray-500 font-mono text-sm italic">
                      Coming Soon
                    </span>
                  </div>
                </div>
              </div>

              {/* Game Carousel */}
              <div className="py-8">
                <GameCarousel />
              </div>

              {/* Legacy Grid View - Hidden 
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
                <Link 
                  href="/play/coinflip"
                  className="group bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-105"
                >
                  <div className="text-center space-y-3">
                    <img 
                      src="https://fmijmundotmgtsemfdat.supabase.co/storage/v1/object/public/avatars/tails.webp"
                      alt="Caesar's" 
                      className="w-20 h-20 mx-auto rounded-full"
                    />
                    <h3 className="text-lg font-light text-gray-900 dark:text-gray-100">Caesar's CoinFlip</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Classic coin flip • 1.96x payout</p>
                    <div className="text-xs text-gray-400 dark:text-gray-500">Click to play →</div>
                  </div>
                </Link>

{unlocks.crash ? (
                  <Link 
                    href="/play/crash"
                    className="group bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-105"
                  >
                    <div className="text-center space-y-3">
                      <img 
                        src="https://fmijmundotmgtsemfdat.supabase.co/storage/v1/object/public/avatars/motorcycle.webp"
                        alt="Cat Crash" 
                        className="w-20 h-20 mx-auto rounded-full"
                      />
                      <h3 className="text-lg font-light text-gray-900 dark:text-gray-100">Cat Crash</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Crash game • Up to 5x multiplier</p>
                      <div className="text-xs text-gray-400 dark:text-gray-500">Click to play →</div>
                    </div>
                  </Link>
                ) : (
                  <div className="group relative bg-white/40 dark:bg-gray-800/40 backdrop-blur rounded-2xl p-6 border border-gray-200 dark:border-gray-600 shadow-sm opacity-60">
                    <div className="text-center space-y-3">
                      <div className="relative">
                        <img 
                          src="https://fmijmundotmgtsemfdat.supabase.co/storage/v1/object/public/avatars/motorcycle.webp"
                          alt="Cat Crash" 
                          className="w-20 h-20 mx-auto rounded-full filter grayscale blur-sm"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <img 
                            src="https://fmijmundotmgtsemfdat.supabase.co/storage/v1/object/public/avatars/locked.webp"
                            alt="Locked" 
                            className="w-8 h-8"
                          />
                        </div>
                      </div>
                      <h3 className="text-lg font-light text-gray-500 dark:text-gray-400">Cat Crash</h3>
                      <p className="text-sm text-gray-400 dark:text-gray-500">Crash game • Up to 5x multiplier</p>
                      <div className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                        {unlocksLoading ? 'Loading...' : `Play ${getProgressToUnlock('crash').remaining} more coinflip games`}
                      </div>
                    </div>
                  </div>
                )}

{unlocks.revolver ? (
                  <Link 
                    href="/play/revolver"
                    className="group bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-105"
                  >
                    <div className="text-center space-y-3">
                      <img 
                        src="https://fmijmundotmgtsemfdat.supabase.co/storage/v1/object/public/avatars/revolver.webp"
                        alt="Revolver Roulette" 
                        className="w-20 h-20 mx-auto rounded-full"
                      />
                      <h3 className="text-lg font-light text-gray-900 dark:text-gray-100">Revolver Roulette</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Russian roulette • 7.76x payout</p>
                      <div className="text-xs text-gray-400 dark:text-gray-500">Click to play →</div>
                    </div>
                  </Link>
                ) : (
                  <div className="group relative bg-white/40 dark:bg-gray-800/40 backdrop-blur rounded-2xl p-6 border border-gray-200 dark:border-gray-600 shadow-sm opacity-60">
                    <div className="text-center space-y-3">
                      <div className="relative">
                        <img 
                          src="https://fmijmundotmgtsemfdat.supabase.co/storage/v1/object/public/avatars/revolver.webp"
                          alt="Revolver Roulette" 
                          className="w-20 h-20 mx-auto rounded-full filter grayscale blur-sm"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <img 
                            src="https://fmijmundotmgtsemfdat.supabase.co/storage/v1/object/public/avatars/locked.webp"
                            alt="Locked" 
                            className="w-8 h-8"
                          />
                        </div>
                      </div>
                      <h3 className="text-lg font-light text-gray-500 dark:text-gray-400">Revolver Roulette</h3>
                      <p className="text-sm text-gray-400 dark:text-gray-500">Russian roulette • 7.76x payout</p>
                      <div className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                        {unlocksLoading ? 'Loading...' : `Play ${getProgressToUnlock('revolver').remaining} more crash games`}
                      </div>
                    </div>
                  </div>
                )}

                {unlocks.pump ? (
                  <Link 
                    href="/play/pump"
                    className="group bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-105"
                  >
                    <div className="text-center space-y-3">
                      <img 
                        src="https://fmijmundotmgtsemfdat.supabase.co/storage/v1/object/public/avatars/pump.webp"
                        alt="Pump or Dump" 
                        className="w-20 h-20 mx-auto rounded-full"
                      />
                      <h3 className="text-lg font-light text-gray-900 dark:text-gray-100">Pump or Dump</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Market prediction • 3% house edge</p>
                      <div className="text-xs text-gray-400 dark:text-gray-500">Click to play →</div>
                    </div>
                  </Link>
                ) : (
                  <div className="group relative bg-white/40 dark:bg-gray-800/40 backdrop-blur rounded-2xl p-6 border border-gray-200 dark:border-gray-600 shadow-sm opacity-60">
                    <div className="text-center space-y-3">
                      <div className="relative">
                        <img 
                          src="https://fmijmundotmgtsemfdat.supabase.co/storage/v1/object/public/avatars/pump.webp"
                          alt="Pump or Dump" 
                          className="w-20 h-20 mx-auto rounded-full filter grayscale blur-sm"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <img 
                            src="https://fmijmundotmgtsemfdat.supabase.co/storage/v1/object/public/avatars/locked.webp"
                            alt="Locked" 
                            className="w-8 h-8"
                          />
                        </div>
                      </div>
                      <h3 className="text-lg font-light text-gray-500 dark:text-gray-400">Pump or Dump</h3>
                      <p className="text-sm text-gray-400 dark:text-gray-500">Market prediction • 3% house edge</p>
                      <div className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                        {unlocksLoading ? 'Loading...' : `Play ${getProgressToUnlock('pump').remaining} more revolver games`}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              */}
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="absolute bottom-0 left-0 right-0 px-6 py-8">
          <div className="max-w-7xl mx-auto text-center space-y-6">
            <div className="w-16 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent mx-auto"></div>
            
            <p className="text-xs text-gray-400 dark:text-gray-500 font-mono tracking-wider">
              Provably-Fair • On-Chain Sui Casino • Ultra-low fees
            </p>
            
            <div className="flex items-center justify-center gap-2 text-xs mb-4">
              <Link 
                href="/play" 
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors duration-300 underline decoration-dotted underline-offset-4"
              >
                Advanced Interface
              </Link>
            </div>
            
            <div className="flex items-center justify-center gap-6 text-xs">
              <a 
                href="https://www.youtube.com/@catsinofun" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors duration-300"
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
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors duration-300"
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
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors duration-300"
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
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors duration-300"
                title="Discord"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0190 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9460 2.4189-2.1568 2.4189Z"/>
                </svg>
              </a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}