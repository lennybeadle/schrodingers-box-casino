'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Game {
  path: string;
  name: string;
  icon: string;
}

const games: Game[] = [
  { path: '/', name: 'Coin Flip', icon: '🪙' },
  { path: '/play/revolver', name: 'Revolver', icon: '🔫' },
];

export function GameNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Find current game index
  const currentIndex = games.findIndex(g => g.path === pathname);
  const canGoLeft = currentIndex > 0;
  const canGoRight = currentIndex < games.length - 1;

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
          className="fixed left-4 top-1/2 transform -translate-y-1/2 z-50 p-3 bg-white/90 backdrop-blur rounded-full shadow-lg hover:scale-110 transition-all duration-300 group disabled:opacity-50"
          aria-label="Previous game"
        >
          <svg 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            className="text-gray-600 group-hover:text-czar-gold transition-colors"
          >
            <path 
              d="M15 18L9 12L15 6" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
          <span className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-black/80 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            {games[currentIndex - 1]?.name}
          </span>
        </button>
      )}

      {/* Right Chevron */}
      {canGoRight && (
        <button
          onClick={() => navigateToGame('right')}
          disabled={isTransitioning}
          className="fixed right-4 top-1/2 transform -translate-y-1/2 z-50 p-3 bg-white/90 backdrop-blur rounded-full shadow-lg hover:scale-110 transition-all duration-300 group disabled:opacity-50"
          aria-label="Next game"
        >
          <svg 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            className="text-gray-600 group-hover:text-czar-gold transition-colors"
          >
            <path 
              d="M9 18L15 12L9 6" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
          <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-black/80 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            {games[currentIndex + 1]?.name}
          </span>
        </button>
      )}

      {/* Game Indicator Dots */}
      <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-40 flex gap-2">
        {games.map((game, index) => (
          <div
            key={game.path}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              index === currentIndex 
                ? 'bg-czar-gold w-8' 
                : 'bg-gray-300 hover:bg-gray-400'
            }`}
            title={game.name}
          />
        ))}
      </div>
    </>
  );
}