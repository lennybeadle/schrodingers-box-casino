'use client';

import Link from 'next/link';
import { SuiWalletButton } from '@/components/SuiWalletButton';
import { GameNavigation } from '@/components/GameNavigation';

export default function Home() {
  const NETWORK = process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet';

  return (
    <div className="min-h-screen bg-white relative">
      <GameNavigation />
      
      {/* Network Status Banner */}
      <div className={`px-6 py-3 ${
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
        {/* Welcome State */}
        <div className="min-h-screen flex items-center justify-center px-6 pb-32">
          <div className="max-w-4xl mx-auto text-center space-y-16">

            <div className="space-y-12">
              <div className="space-y-6">
                <h1 className="text-6xl font-thin text-gray-900 tracking-tight leading-tight">
                  CatsinoFun
                </h1>
                
                <div className="w-24 h-px bg-gradient-to-r from-transparent via-gray-400 to-transparent mx-auto"></div>
                
                <p className="text-lg text-gray-600 font-light max-w-2xl mx-auto leading-relaxed">
                  Premium cat-themed casino games on Sui blockchain. 
                  <br className="hidden sm:block" />
                  Choose your game and start playing.
                </p>

                {/* Contract Address */}
                <div className="bg-gray-50 rounded-2xl p-6 max-w-lg mx-auto">
                  <div className="text-sm text-gray-500 uppercase tracking-widest mb-3">
                    $CZAR Contract Address
                  </div>
                  <div className="text-center">
                    <span className="text-gray-400 font-mono text-sm italic">
                      Coming Soon
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
                <Link 
                  href="/play/coinflip"
                  className="group bg-white/80 backdrop-blur rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-105"
                >
                  <div className="text-center space-y-4">
                    <img 
                      src="https://fmijmundotmgtsemfdat.supabase.co/storage/v1/object/public/avatars/tails.webp"
                      alt="CatFlip" 
                      className="w-24 h-24 mx-auto rounded-full"
                    />
                    <h3 className="text-xl font-light text-gray-900">CatFlip CoinFlip</h3>
                    <p className="text-sm text-gray-600">Classic coin flip • 1.96x payout</p>
                    <div className="text-xs text-gray-400">Click to play →</div>
                  </div>
                </Link>

                <Link 
                  href="/play/revolver"
                  className="group bg-white/80 backdrop-blur rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-105"
                >
                  <div className="text-center space-y-4">
                    <img 
                      src="https://fmijmundotmgtsemfdat.supabase.co/storage/v1/object/public/avatars/revolver.webp"
                      alt="Revolver Roulette" 
                      className="w-24 h-24 mx-auto rounded-full"
                    />
                    <h3 className="text-xl font-light text-gray-900">Revolver Roulette</h3>
                    <p className="text-sm text-gray-600">Russian roulette • 7.76x payout</p>
                    <div className="text-xs text-gray-400">Click to play →</div>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="absolute bottom-0 left-0 right-0 px-6 py-8">
          <div className="max-w-7xl mx-auto text-center space-y-6">
            <div className="w-16 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent mx-auto"></div>
            
            <p className="text-xs text-gray-400 font-mono tracking-wider">
              CatsinoFun • Premium Sui Casino • Ultra-low fees
            </p>
            
            <div className="flex items-center justify-center gap-8 text-xs">
              <Link 
                href="/play/coinflip" 
                className="text-gray-400 hover:text-gray-600 transition-colors duration-300 font-mono tracking-wide"
              >
                CoinFlip
              </Link>
              <div className="w-px h-3 bg-gray-200"></div>
              <Link 
                href="/play/revolver" 
                className="text-gray-400 hover:text-gray-600 transition-colors duration-300 font-mono tracking-wide"
              >
                Revolver
              </Link>
              <div className="w-px h-3 bg-gray-200"></div>
              <Link 
                href="/play" 
                className="text-gray-400 hover:text-gray-600 transition-colors duration-300 font-mono tracking-wide"
              >
                Stats
              </Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}