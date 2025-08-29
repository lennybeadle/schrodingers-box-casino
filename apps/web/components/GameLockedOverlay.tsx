'use client';

import Link from 'next/link';
import { useGameUnlocks } from '@/hooks/useGameUnlocks';

interface GameLockedOverlayProps {
  game: 'crash' | 'revolver' | 'pump';
  gameTitle: string;
  unlockMessage: string;
}

export function GameLockedOverlay({ game, gameTitle, unlockMessage }: GameLockedOverlayProps) {
  const { unlocks, getProgressToUnlock, loading } = useGameUnlocks();

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-900/80 backdrop-blur-md flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md mx-4 text-center border border-gray-200 dark:border-gray-700 shadow-2xl">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-czar-gold mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Checking unlock status...</p>
        </div>
      </div>
    );
  }

  // If game is unlocked, don't show overlay
  if (unlocks[game]) {
    return null;
  }

  const progress = getProgressToUnlock(game);
  const prerequisiteGame = game === 'crash' ? 'coinflip' : game === 'revolver' ? 'crash' : 'revolver';
  const prerequisiteGameTitle = game === 'crash' ? 'Caesar\'s CoinFlip' : game === 'revolver' ? 'Cat Crash' : 'Revolver Roulette';

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/80 backdrop-blur-md flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md mx-4 text-center border border-gray-200 dark:border-gray-700 shadow-2xl">
        {/* Lock Icon */}
        <div className="mb-6">
          <img 
            src="https://fmijmundotmgtsemfdat.supabase.co/storage/v1/object/public/avatars/locked.webp"
            alt="Locked" 
            className="w-16 h-16 mx-auto opacity-80"
          />
        </div>

        {/* Game Title */}
        <h2 className="text-2xl font-light text-gray-900 dark:text-gray-100 mb-4">
          {gameTitle} Locked
        </h2>

        {/* Unlock Message */}
        <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
          {unlockMessage}
        </p>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-2">
            <span>{progress.current} / {progress.required}</span>
            <span>{Math.round((progress.current / progress.required) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-czar-gold via-caesar-gold to-czar-bronze h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min((progress.current / progress.required) * 100, 100)}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {progress.remaining > 0 
              ? `${progress.remaining} more ${prerequisiteGame} games needed`
              : 'Unlocked! Refresh to play.'
            }
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Link
            href={game === 'crash' ? "/play/coinflip" : game === 'revolver' ? "/play/crash" : "/play/revolver"}
            className="block w-full py-3 bg-gradient-to-r from-czar-gold via-caesar-gold to-czar-bronze text-black font-semibold rounded-lg hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
          >
            Play {prerequisiteGameTitle}
          </Link>
          
          <Link
            href="/"
            className="block w-full py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
          >
            Back to Home
          </Link>
        </div>

        {/* Flavor Text */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-400 dark:text-gray-500 italic">
            "Every emperor must prove their worth through trials"
          </p>
        </div>
      </div>
    </div>
  );
}