'use client';

import { useState, useEffect, useRef } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { suiClient } from '@/lib/suiClient';

export interface GameProgress {
  coinflip: number;
  crash: number;
  revolver: number;
  pump: number;
  blend: number;
}

export interface UnlockRequirements {
  coinflip: 0; // Always unlocked
  crash: 10; // Requires 10 coinflip games
  revolver: 50; // Requires 50 crash games
  pump: 25; // Requires 25 revolver games
  blend: 10; // Requires 10 pump games
}

export interface GameUnlocks {
  coinflip: boolean;
  crash: boolean;
  revolver: boolean;
  pump: boolean;
  blend: boolean;
}

const UNLOCK_REQUIREMENTS: UnlockRequirements = {
  coinflip: 0,
  crash: 10,
  revolver: 50,
  pump: 25,
  blend: 10
};

export function useGameUnlocks() {
  const currentAccount = useCurrentAccount();
  const [progress, setProgress] = useState<GameProgress>(() => {
    // Try to load from localStorage
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('gameProgress');
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch (e) {
          console.warn('Failed to parse cached game progress');
        }
      }
    }
    return { coinflip: 0, crash: 0, revolver: 0, pump: 0, blend: 0 };
  });
  const [unlocks, setUnlocks] = useState<GameUnlocks>(() => {
    // Try to load from localStorage
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('gameUnlocks');
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch (e) {
          console.warn('Failed to parse cached game unlocks');
        }
      }
    }
    return { coinflip: true, crash: false, revolver: false, pump: false, blend: false };
  });
  const [loading, setLoading] = useState(true);
  const hasLoadedOnce = useRef(false);
  
  // Debug logging
  console.log('useGameUnlocks state:', { loading, unlocks, progress, hasLoadedOnce: hasLoadedOnce.current });

  const fetchGameProgress = async () => {
    if (!currentAccount) {
      setProgress({ coinflip: 0, crash: 0, revolver: 0, pump: 0, blend: 0 });
      setUnlocks({ coinflip: true, crash: false, revolver: false, pump: false, blend: false });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Define all package IDs to preserve game history
      const OLD_PACKAGE_ID = '0xb2a6c0ebfe6fdac6d8261fd0df496cc90522d745aada4a0bf699c5f32406d583';
      const INTERMEDIATE_PACKAGE_ID = '0x21897e3702d4fc77e8753a4dc8e7a46e4c6872f17ea88fe4e2c02aa6c9eb7533';
      const CURRENT_PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID || OLD_PACKAGE_ID;

      // Fetch all game events from ALL packages
      const [
        coinflipEventsOld, coinflipEventsIntermediate, coinflipEventsCurrent,
        crashEventsOld, crashEventsIntermediate, crashEventsCurrent,
        revolverEventsOld, revolverEventsIntermediate, revolverEventsCurrent,
        pumpEventsIntermediate, pumpEventsCurrent,
        blendEvents
      ] = await Promise.all([
        // Coinflip events from old package
        suiClient.queryEvents({
          query: { MoveEventType: `${OLD_PACKAGE_ID}::casino::BetPlaced` },
          limit: 1000,
          order: 'descending'
        }),
        // Coinflip events from intermediate package
        suiClient.queryEvents({
          query: { MoveEventType: `${INTERMEDIATE_PACKAGE_ID}::casino::BetPlaced` },
          limit: 1000,
          order: 'descending'
        }),
        // Coinflip events from current package
        suiClient.queryEvents({
          query: { MoveEventType: `${CURRENT_PACKAGE_ID}::casino::BetPlaced` },
          limit: 1000,
          order: 'descending'
        }),
        // Crash events from old package
        suiClient.queryEvents({
          query: { MoveEventType: `${OLD_PACKAGE_ID}::crash::CrashEvent` },
          limit: 1000,
          order: 'descending'
        }),
        // Crash events from intermediate package
        suiClient.queryEvents({
          query: { MoveEventType: `${INTERMEDIATE_PACKAGE_ID}::crash::CrashEvent` },
          limit: 1000,
          order: 'descending'
        }),
        // Crash events from current package
        suiClient.queryEvents({
          query: { MoveEventType: `${CURRENT_PACKAGE_ID}::crash::CrashEvent` },
          limit: 1000,
          order: 'descending'
        }),
        // Revolver events from old package
        suiClient.queryEvents({
          query: { MoveEventType: `${OLD_PACKAGE_ID}::revolver::SpinEvent` },
          limit: 1000,
          order: 'descending'
        }),
        // Revolver events from intermediate package
        suiClient.queryEvents({
          query: { MoveEventType: `${INTERMEDIATE_PACKAGE_ID}::revolver::SpinEvent` },
          limit: 1000,
          order: 'descending'
        }),
        // Revolver events from current package
        suiClient.queryEvents({
          query: { MoveEventType: `${CURRENT_PACKAGE_ID}::revolver::SpinEvent` },
          limit: 1000,
          order: 'descending'
        }),
        // Pump events from intermediate package
        suiClient.queryEvents({
          query: { MoveEventType: `${INTERMEDIATE_PACKAGE_ID}::pump::PumpEvent` },
          limit: 1000,
          order: 'descending'
        }),
        // Pump events from current package
        suiClient.queryEvents({
          query: { MoveEventType: `${CURRENT_PACKAGE_ID}::pump::PumpEvent` },
          limit: 1000,
          order: 'descending'
        }),
        // Blend events (only in new package)
        suiClient.queryEvents({
          query: { MoveEventType: `${CURRENT_PACKAGE_ID}::blend::BlendEvent` },
          limit: 1000,
          order: 'descending'
        })
      ]);

      // Combine events from all packages
      const coinflipEvents = { data: [...(coinflipEventsOld.data || []), ...(coinflipEventsIntermediate.data || []), ...(coinflipEventsCurrent.data || [])] };
      const crashEvents = { data: [...(crashEventsOld.data || []), ...(crashEventsIntermediate.data || []), ...(crashEventsCurrent.data || [])] };
      const revolverEvents = { data: [...(revolverEventsOld.data || []), ...(revolverEventsIntermediate.data || []), ...(revolverEventsCurrent.data || [])] };
      const pumpEvents = { data: [...(pumpEventsIntermediate.data || []), ...(pumpEventsCurrent.data || [])] };
      const blendEventsData = { data: blendEvents.data || [] };

      // Filter events by the current player address
      const playerCoinflipEvents = coinflipEvents.data.filter(event => 
        (event.parsedJson as any)?.player === currentAccount.address
      );
      const playerCrashEvents = crashEvents.data.filter(event => 
        (event.parsedJson as any)?.player === currentAccount.address
      );
      const playerRevolverEvents = revolverEvents.data.filter(event => 
        (event.parsedJson as any)?.player === currentAccount.address
      );
      const playerPumpEvents = pumpEvents.data.filter(event => 
        (event.parsedJson as any)?.player === currentAccount.address
      );
      const playerBlendEvents = blendEventsData.data.filter(event => 
        (event.parsedJson as any)?.player === currentAccount.address
      );

      const coinflipCount = playerCoinflipEvents.length;
      const crashCount = playerCrashEvents.length;
      const revolverCount = playerRevolverEvents.length;
      const pumpCount = playerPumpEvents.length;
      const blendCount = playerBlendEvents.length;

      console.log('Debug event fetching:', {
        coinflipEventsTotal: coinflipEvents.data.length,
        crashEventsTotal: crashEvents.data.length,
        revolverEventsTotal: revolverEvents.data.length,
        pumpEventsTotal: pumpEvents.data.length,
        blendEventsTotal: blendEventsData.data.length,
        playerAddress: currentAccount.address,
        sampleCoinflipEvent: coinflipEvents.data[0],
        sampleCrashEvent: crashEvents.data[0],
        sampleRevolverEvent: revolverEvents.data[0],
        samplePumpEvent: pumpEvents.data[0],
        sampleBlendEvent: blendEventsData.data[0]
      });

      console.log('Game unlock counts:', { 
        coinflipCount, 
        crashCount, 
        revolverCount,
        pumpCount,
        blendCount,
        playerAddress: currentAccount.address 
      });

      const newProgress: GameProgress = {
        coinflip: coinflipCount,
        crash: crashCount,
        revolver: revolverCount,
        pump: pumpCount,
        blend: blendCount
      };

      const newUnlocks: GameUnlocks = {
        coinflip: true, // Always unlocked
        crash: coinflipCount >= UNLOCK_REQUIREMENTS.crash,
        revolver: crashCount >= UNLOCK_REQUIREMENTS.revolver,
        pump: revolverCount >= UNLOCK_REQUIREMENTS.pump,
        blend: pumpCount >= UNLOCK_REQUIREMENTS.blend
      };

      setProgress(newProgress);
      setUnlocks(newUnlocks);
      hasLoadedOnce.current = true;
      
      // Cache the successful results in localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('gameProgress', JSON.stringify(newProgress));
        localStorage.setItem('gameUnlocks', JSON.stringify(newUnlocks));
      }

    } catch (error) {
      console.error('Failed to fetch game progress:', error);
      // On error, only reset if we don't have cached data
      const hasCachedData = typeof window !== 'undefined' && 
        localStorage.getItem('gameProgress') && 
        localStorage.getItem('gameUnlocks');
      
      if (!hasCachedData) {
        setProgress({ coinflip: 0, crash: 0, revolver: 0, pump: 0, blend: 0 });
        setUnlocks({ coinflip: true, crash: false, revolver: false, pump: false, blend: false });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGameProgress();
  }, [currentAccount]);
  
  // Manual unlock override based on logs - you have 13 pump games which should unlock blend
  useEffect(() => {
    if (progress.pump >= UNLOCK_REQUIREMENTS.blend && !unlocks.blend) {
      console.log('Manual unlock override: blend should be unlocked based on pump count', progress.pump);
      const newUnlocks = { ...unlocks, blend: true };
      setUnlocks(newUnlocks);
      if (typeof window !== 'undefined') {
        localStorage.setItem('gameUnlocks', JSON.stringify(newUnlocks));
      }
    }
  }, [progress.pump, unlocks.blend]);

  const getProgressToUnlock = (game: 'crash' | 'revolver' | 'pump' | 'blend'): { current: number; required: number; remaining: number } => {
    if (game === 'crash') {
      return {
        current: progress.coinflip,
        required: UNLOCK_REQUIREMENTS.crash,
        remaining: Math.max(0, UNLOCK_REQUIREMENTS.crash - progress.coinflip)
      };
    } else if (game === 'revolver') {
      return {
        current: progress.crash,
        required: UNLOCK_REQUIREMENTS.revolver,
        remaining: Math.max(0, UNLOCK_REQUIREMENTS.revolver - progress.crash)
      };
    } else if (game === 'pump') {
      return {
        current: progress.revolver,
        required: UNLOCK_REQUIREMENTS.pump,
        remaining: Math.max(0, UNLOCK_REQUIREMENTS.pump - progress.revolver)
      };
    } else {
      return {
        current: progress.pump,
        required: UNLOCK_REQUIREMENTS.blend,
        remaining: Math.max(0, UNLOCK_REQUIREMENTS.blend - progress.pump)
      };
    }
  };

  return {
    progress,
    unlocks,
    loading,
    hasLoadedOnce: hasLoadedOnce.current,
    requirements: UNLOCK_REQUIREMENTS,
    getProgressToUnlock,
    refetch: fetchGameProgress
  };
}