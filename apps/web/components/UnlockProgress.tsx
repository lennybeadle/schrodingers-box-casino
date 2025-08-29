'use client';

import { useGameUnlocks } from '@/hooks/useGameUnlocks';

interface UnlockProgressProps {
  showNextUnlock?: 'crash' | 'revolver';
}

export function UnlockProgress({ showNextUnlock }: UnlockProgressProps) {
  const { progress, unlocks, getProgressToUnlock, loading } = useGameUnlocks();

  if (loading) return null;

  // If no specific unlock to show, auto-determine next unlock
  const nextToUnlock = showNextUnlock || (!unlocks.crash ? 'crash' : !unlocks.revolver ? 'revolver' : null);
  
  if (!nextToUnlock || unlocks[nextToUnlock]) return null;

  const progressData = getProgressToUnlock(nextToUnlock);
  const percentage = Math.min((progressData.current / progressData.required) * 100, 100);
  
  const gameNames = {
    crash: 'Cat Crash',
    revolver: 'Revolver Roulette'
  };

  const prereqNames = {
    crash: 'coinflip',
    revolver: 'crash'
  };

  return (
    <div className="bg-gradient-to-r from-czar-gold/10 via-caesar-gold/5 to-czar-bronze/10 dark:from-czar-gold/20 dark:via-caesar-gold/10 dark:to-czar-bronze/20 rounded-lg p-4 border border-czar-gold/20 dark:border-czar-gold/30">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-6 h-6 bg-czar-gold/20 rounded-full flex items-center justify-center">
          🔓
        </div>
        <div>
          <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm">
            Unlock {gameNames[nextToUnlock]}
          </h4>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {progressData.current} / {progressData.required} {prereqNames[nextToUnlock]} games
          </p>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
        <div 
          className="bg-gradient-to-r from-czar-gold via-caesar-gold to-czar-bronze h-2 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      
      <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
        {progressData.remaining > 0 
          ? `${progressData.remaining} more games to unlock`
          : 'Unlocked! Refresh to play.'
        }
      </p>
    </div>
  );
}