'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useGameUnlocks } from '@/hooks/useGameUnlocks';

interface Game {
  path: string;
  name: string;
  icon: string;
}

const games: Game[] = [
  { path: '/play/coinflip', name: 'Coin Flip', icon: '🪙' },
  { path: '/play/crash', name: 'Cat Crash', icon: '🏍️' },
  { path: '/play/revolver', name: 'Revolver', icon: '🔫' },
  { path: '/play/pump', name: 'Pump/Dump', icon: '📈' },
];

export function GameNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const { unlocks } = useGameUnlocks();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Find current game index
  const currentIndex = games.findIndex(g => g.path === pathname);
  
  // Check if games are unlocked
  const isGameUnlocked = (path: string) => {
    if (path === '/play/coinflip') return true;
    if (path === '/play/crash') return unlocks.crash;
    if (path === '/play/revolver') return unlocks.revolver;
    if (path === '/play/pump') return unlocks.pump || false; // Default to locked for now
    return false;
  };
  
  const canGoLeft = currentIndex > 0 && isGameUnlocked(games[currentIndex - 1]?.path);
  const canGoRight = currentIndex < games.length - 1 && isGameUnlocked(games[currentIndex + 1]?.path);

  const navigateToGame = (direction: 'left' | 'right') => {
    if (isTransitioning) return;
    
    const newIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex >= 0 && newIndex < games.length) {
      setIsTransitioning(true);
      
      // Add transition class to body for page-wide animation
      document.body.classList.add(`slide-${direction}`);
      
      setTimeout(() => {
        router.push(games[newIndex].path);
        setTimeout(() => {
          document.body.classList.remove(`slide-${direction}`);
          setIsTransitioning(false);
        }, 100);
      }, 200);
    }
  };

  // Touch handlers for swipe
  const handleTouchStart = (e: TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && canGoRight) {
      navigateToGame('right');
    }
    if (isRightSwipe && canGoLeft) {
      navigateToGame('left');
    }
  };

  useEffect(() => {
    // Add touch listeners for swipe gestures
    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [touchStart, touchEnd, currentIndex]);

  return (
    <>
      {/* Left Chevron */}
      {canGoLeft && (
        <button
          onClick={() => navigateToGame('left')}
          disabled={isTransitioning}
          className="fixed left-4 top-1/2 transform -translate-y-1/2 z-50 p-3 bg-white/90 dark:bg-gray-800/90 backdrop-blur rounded-full shadow-lg hover:scale-110 transition-all duration-300 group disabled:opacity-50 border border-gray-200/50 dark:border-gray-700/50"
          aria-label="Previous game"
        >
          <svg 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            className="text-gray-600 dark:text-gray-300 group-hover:text-czar-gold transition-colors"
          >
            <path 
              d="M15 18L9 12L15 6" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
          <span className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-black/80 dark:bg-gray-700/90 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            {games[currentIndex - 1]?.name}
          </span>
        </button>
      )}

      {/* Right Chevron */}
      {canGoRight && (
        <button
          onClick={() => navigateToGame('right')}
          disabled={isTransitioning}
          className="fixed right-4 top-1/2 transform -translate-y-1/2 z-50 p-3 bg-white/90 dark:bg-gray-800/90 backdrop-blur rounded-full shadow-lg hover:scale-110 transition-all duration-300 group disabled:opacity-50 border border-gray-200/50 dark:border-gray-700/50"
          aria-label="Next game"
        >
          <svg 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            className="text-gray-600 dark:text-gray-300 group-hover:text-czar-gold transition-colors"
          >
            <path 
              d="M9 18L15 12L9 6" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
          <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-black/80 dark:bg-gray-700/90 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            {games[currentIndex + 1]?.name}
          </span>
        </button>
      )}

      {/* Game Indicator Dots */}
      <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-40 flex gap-2">
        {games.map((game, index) => {
          const isUnlocked = isGameUnlocked(game.path);
          const isActive = index === currentIndex;
          
          return (
            <div
              key={game.path}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                isActive 
                  ? 'bg-czar-gold w-8' 
                  : isUnlocked 
                    ? 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
                    : 'bg-red-400 dark:bg-red-600 opacity-50'
              }`}
              title={isUnlocked ? game.name : `${game.name} (Locked)`}
            />
          );
        })}
      </div>
    </>
  );
}