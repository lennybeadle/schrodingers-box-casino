'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useGameUnlocks } from '@/hooks/useGameUnlocks';

interface Game {
  id: string;
  name: string;
  description: string;
  image: string;
  href: string;
  locked?: boolean;
  unlockMessage?: string;
}

export function GameCarousel() {
  const { unlocks, getProgressToUnlock, loading: unlocksLoading } = useGameUnlocks();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const games: Game[] = [
    {
      id: 'coinflip',
      name: "Caesar's CoinFlip",
      description: 'Classic coin flip • 1.96x payout',
      image: 'https://fmijmundotmgtsemfdat.supabase.co/storage/v1/object/public/avatars/tails.webp',
      href: '/play/coinflip',
      locked: false,
    },
    {
      id: 'crash',
      name: 'Cat Crash',
      description: 'Multiplier crash • Up to 30x',
      image: 'https://fmijmundotmgtsemfdat.supabase.co/storage/v1/object/public/avatars/motorcycle.webp',
      href: '/play/crash',
      locked: !unlocks.crash,
      unlockMessage: unlocksLoading ? 'Loading...' : `Play ${getProgressToUnlock('crash').remaining} more coinflip games`,
    },
    {
      id: 'revolver',
      name: 'Revolver Roulette',
      description: 'Russian roulette • 7.76x payout',
      image: 'https://fmijmundotmgtsemfdat.supabase.co/storage/v1/object/public/avatars/revolver.webp',
      href: '/play/revolver',
      locked: !unlocks.revolver,
      unlockMessage: unlocksLoading ? 'Loading...' : `Play ${getProgressToUnlock('revolver').remaining} more crash games`,
    },
    {
      id: 'pump',
      name: 'Pump or Dump',
      description: 'Market prediction • 3% house edge',
      image: 'https://fmijmundotmgtsemfdat.supabase.co/storage/v1/object/public/avatars/pump.webp',
      href: '/play/pump',
      locked: !unlocks.pump,
      unlockMessage: unlocksLoading ? 'Loading...' : `Play ${getProgressToUnlock('pump').remaining} more revolver games`,
    },
  ];

  // Auto-rotate carousel
  useEffect(() => {
    if (!isAutoPlaying) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % games.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, games.length]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    setIsAutoPlaying(false);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + games.length) % games.length);
    setIsAutoPlaying(false);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % games.length);
    setIsAutoPlaying(false);
  };

  const getCardStyle = (index: number) => {
    const diff = (index - currentIndex + games.length) % games.length;
    const adjustedDiff = diff > games.length / 2 ? diff - games.length : diff;
    
    let transform = '';
    let opacity = 1;
    let scale = 1;
    let zIndex = 0;
    let blur = 0;

    if (adjustedDiff === 0) {
      // Center card
      transform = 'translateX(0) translateZ(100px)';
      scale = 1.1;
      zIndex = 30;
      opacity = 1;
    } else if (adjustedDiff === 1) {
      // Right card
      transform = 'translateX(280px) translateZ(0)';
      scale = 0.9;
      zIndex = 20;
      opacity = 0.8;
      blur = 0;
    } else if (adjustedDiff === -1) {
      // Left card
      transform = 'translateX(-280px) translateZ(0)';
      scale = 0.9;
      zIndex = 20;
      opacity = 0.8;
      blur = 0;
    } else if (adjustedDiff === 2 || adjustedDiff === -2) {
      // Far cards
      const direction = adjustedDiff > 0 ? 1 : -1;
      transform = `translateX(${direction * 480}px) translateZ(-100px)`;
      scale = 0.75;
      zIndex = 10;
      opacity = 0.4;
      blur = 0;
    } else {
      // Hidden cards
      opacity = 0;
      zIndex = 0;
    }

    // Extract translation values for cleaner transform
    const translateX = transform.includes('translateX') ? transform.match(/translateX\(([^)]+)\)/)?.[1] || '0' : '0';
    const translateZ = transform.includes('translateZ') ? transform.match(/translateZ\(([^)]+)\)/)?.[1] || '0' : '0';
    
    return {
      transform: `translateX(${translateX}) scale(${scale})`,
      opacity,
      zIndex,
      backfaceVisibility: 'hidden' as const,
      WebkitFontSmoothing: 'antialiased' as const,
      MozOsxFontSmoothing: 'grayscale' as const,
      textRendering: 'optimizeLegibility' as const,
    };
  };

  return (
    <div className="relative w-full max-w-6xl mx-auto">
      {/* Carousel Container */}
      <div className="relative h-[320px] overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center" style={{
          WebkitFontSmoothing: 'antialiased' as const,
          MozOsxFontSmoothing: 'grayscale' as const,
          textRendering: 'optimizeLegibility' as const
        }}>
          {games.map((game, index) => {
            const style = getCardStyle(index);
            const isCenter = index === currentIndex;
            
            return (
              <div
                key={game.id}
                className="absolute transition-all duration-500 ease-out"
                style={style}
                onMouseEnter={() => setIsAutoPlaying(false)}
                onMouseLeave={() => setIsAutoPlaying(true)}
              >
                {game.locked ? (
                  <div className={`w-64 bg-white/80 dark:bg-gray-800/80 rounded-2xl p-6 border ${isCenter ? 'border-gray-300 dark:border-gray-600' : 'border-gray-200 dark:border-gray-700'} shadow-lg`}>
                    <div className="text-center space-y-3">
                      <div className="relative">
                        <img 
                          src={game.image}
                          alt={game.name}
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
                      <h3 className="text-lg font-light text-gray-500 dark:text-gray-400" style={{WebkitFontSmoothing: 'antialiased' as const, textRendering: 'optimizeLegibility' as const}}>{game.name}</h3>
                      <p className="text-sm text-gray-400 dark:text-gray-500" style={{WebkitFontSmoothing: 'antialiased' as const, textRendering: 'optimizeLegibility' as const}}>{game.description}</p>
                      <div className="text-xs text-orange-600 dark:text-orange-400 font-medium" style={{WebkitFontSmoothing: 'antialiased' as const, textRendering: 'optimizeLegibility' as const}}>
                        {game.unlockMessage}
                      </div>
                    </div>
                  </div>
                ) : (
                  <Link 
                    href={game.href}
                    className={`block w-64 bg-white/90 dark:bg-gray-800/90 rounded-2xl p-6 border ${isCenter ? 'border-czar-gold/30 dark:border-czar-gold/40 shadow-2xl' : 'border-gray-100 dark:border-gray-700 shadow-lg'} transition-all duration-300 ${isCenter ? 'hover:scale-105' : ''}`}
                    onClick={(e) => !isCenter && e.preventDefault()}
                  >
                    <div className="text-center space-y-3">
                      <img 
                        src={game.image}
                        alt={game.name}
                        className={`w-20 h-20 mx-auto rounded-full ${isCenter ? '' : 'opacity-90'}`}
                      />
                      <h3 className="text-lg font-light text-gray-900 dark:text-gray-100" style={{WebkitFontSmoothing: 'antialiased' as const, textRendering: 'optimizeLegibility' as const}}>{game.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300" style={{WebkitFontSmoothing: 'antialiased' as const, textRendering: 'optimizeLegibility' as const}}>{game.description}</p>
                      {isCenter && (
                        <div className="text-xs text-czar-gold dark:text-caesar-gold font-medium animate-pulse" style={{WebkitFontSmoothing: 'antialiased' as const, textRendering: 'optimizeLegibility' as const}}>
                          Click to play →
                        </div>
                      )}
                    </div>
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={goToPrevious}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-40 w-10 h-10 bg-white/80 dark:bg-gray-800/80 rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
        aria-label="Previous game"
      >
        <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      
      <button
        onClick={goToNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-40 w-10 h-10 bg-white/80 dark:bg-gray-800/80 rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
        aria-label="Next game"
      >
        <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

    </div>
  );
}