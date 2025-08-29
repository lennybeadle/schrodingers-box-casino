'use client';

import { useState, useEffect } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { suiClient } from '@/lib/suiClient';

export interface GameProgress {
  coinflip: number;
  crash: number;
  revolver: number;
  pump: number;
}

export interface UnlockRequirements {
  coinflip: 0; // Always unlocked
  crash: 10; // Requires 10 coinflip games
  revolver: 50; // Requires 50 crash games
  pump: 25; // Requires 25 revolver games
}

export interface GameUnlocks {
  coinflip: boolean;
  crash: boolean;
  revolver: boolean;
  pump: boolean;
}

const UNLOCK_REQUIREMENTS: UnlockRequirements = {
  coinflip: 0,
  crash: 10,
  revolver: 50,
  pump: 25
};

export function useGameUnlocks() {
  const currentAccount = useCurrentAccount();
  const [progress, setProgress] = useState<GameProgress>({ coinflip: 0, crash: 0, revolver: 0, pump: 0 });
  const [unlocks, setUnlocks] = useState<GameUnlocks>({ coinflip: true, crash: false, revolver: false, pump: false });
  const [loading, setLoading] = useState(true);

  const fetchGameProgress = async () => {
    if (!currentAccount) {
      setProgress({ coinflip: 0, crash: 0, revolver: 0, pump: 0 });
      setUnlocks({ coinflip: true, crash: false, revolver: false, pump: false });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Define both package IDs to preserve game history
      const OLD_PACKAGE_ID = '0xb2a6c0ebfe6fdac6d8261fd0df496cc90522d745aada4a0bf699c5f32406d583';
      const CURRENT_PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID || OLD_PACKAGE_ID;

      // Fetch all game events from BOTH old and new packages
      const [
        coinflipEventsOld, coinflipEventsCurrent,
        crashEventsOld, crashEventsCurrent,
        revolverEventsOld, revolverEventsCurrent,
        pumpEvents
      ] = await Promise.all([
        // Coinflip events from old package
        suiClient.queryEvents({
          query: { MoveEventType: `${OLD_PACKAGE_ID}::casino::BetPlaced` },
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
        // Revolver events from current package
        suiClient.queryEvents({
          query: { MoveEventType: `${CURRENT_PACKAGE_ID}::revolver::SpinEvent` },
          limit: 1000,
          order: 'descending'
        }),
        // Pump events (only in new package)
        suiClient.queryEvents({
          query: { MoveEventType: `${CURRENT_PACKAGE_ID}::pump::PumpEvent` },
          limit: 1000,
          order: 'descending'
        })
      ]);

      // Combine events from both packages
      const coinflipEvents = { data: [...(coinflipEventsOld.data || []), ...(coinflipEventsCurrent.data || [])] };
      const crashEvents = { data: [...(crashEventsOld.data || []), ...(crashEventsCurrent.data || [])] };
      const revolverEvents = { data: [...(revolverEventsOld.data || []), ...(revolverEventsCurrent.data || [])] };

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

      const coinflipCount = playerCoinflipEvents.length;
      const crashCount = playerCrashEvents.length;
      const revolverCount = playerRevolverEvents.length;
      const pumpCount = playerPumpEvents.length;

      console.log('Debug event fetching:', {
        coinflipEventsTotal: coinflipEvents.data.length,
        crashEventsTotal: crashEvents.data.length,
        revolverEventsTotal: revolverEvents.data.length,
        pumpEventsTotal: pumpEvents.data.length,
        playerAddress: currentAccount.address,
        sampleCoinflipEvent: coinflipEvents.data[0],
        sampleCrashEvent: crashEvents.data[0],
        sampleRevolverEvent: revolverEvents.data[0],
        samplePumpEvent: pumpEvents.data[0]
      });

      console.log('Game unlock counts:', { 
        coinflipCount, 
        crashCount, 
        revolverCount,
        pumpCount,
        playerAddress: currentAccount.address 
      });

      const newProgress: GameProgress = {
        coinflip: coinflipCount,
        crash: crashCount,
        revolver: revolverCount,
        pump: pumpCount
      };

      const newUnlocks: GameUnlocks = {
        coinflip: true, // Always unlocked
        crash: coinflipCount >= UNLOCK_REQUIREMENTS.crash,
        revolver: crashCount >= UNLOCK_REQUIREMENTS.revolver,
        pump: revolverCount >= UNLOCK_REQUIREMENTS.pump
      };

      setProgress(newProgress);
      setUnlocks(newUnlocks);

    } catch (error) {
      console.error('Failed to fetch game progress:', error);
      // On error, assume no progress
      setProgress({ coinflip: 0, crash: 0, revolver: 0, pump: 0 });
      setUnlocks({ coinflip: true, crash: false, revolver: false, pump: false });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGameProgress();
  }, [currentAccount]);

  const getProgressToUnlock = (game: 'crash' | 'revolver' | 'pump'): { current: number; required: number; remaining: number } => {
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
    } else {
      return {
        current: progress.revolver,
        required: UNLOCK_REQUIREMENTS.pump,
        remaining: Math.max(0, UNLOCK_REQUIREMENTS.pump - progress.revolver)
      };
    }
  };

  return {
    progress,
    unlocks,
    loading,
    requirements: UNLOCK_REQUIREMENTS,
    getProgressToUnlock,
    refetch: fetchGameProgress
  };
}