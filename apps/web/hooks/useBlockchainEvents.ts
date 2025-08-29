'use client';

import { useEffect, useRef } from 'react';
import { useSuiClientQuery } from '@mysten/dapp-kit';
import { useNotifications } from '@/contexts/NotificationContext';

// Game contract package ID from environment
const GAME_PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID || '0x0';

export function useBlockchainEvents() {
  const { addNotification } = useNotifications();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastCheckedRef = useRef<number>(Date.now() - 60000); // Check events from last minute
  const processedEventsRef = useRef<Set<string>>(new Set()); // Track processed events by their ID
  
  // We need to query each event type separately since they're in different modules
  // Get coinflip events
  const { data: coinflipEvents, refetch: refetchCoinflip } = useSuiClientQuery(
    'queryEvents',
    {
      query: {
        MoveEventType: `${GAME_PACKAGE_ID}::casino::BetPlaced`
      },
      limit: 5,
      order: 'descending'
    },
    { enabled: false }
  );

  // Get revolver events  
  const { data: revolverEvents, refetch: refetchRevolver } = useSuiClientQuery(
    'queryEvents',
    {
      query: {
        MoveEventType: `${GAME_PACKAGE_ID}::revolver::SpinEvent`
      },
      limit: 5,
      order: 'descending'
    },
    { enabled: false }
  );

  // Get crash events
  const { data: crashEvents, refetch: refetchCrash } = useSuiClientQuery(
    'queryEvents',
    {
      query: {
        MoveEventType: `${GAME_PACKAGE_ID}::crash::CrashEvent`
      },
      limit: 5,
      order: 'descending'
    },
    { enabled: false }
  );

  useEffect(() => {
    // Function to check for new events from all games
    const checkForNewEvents = async () => {
      try {
        console.log('Checking for blockchain events...', { 
          packageId: GAME_PACKAGE_ID, 
          lastChecked: new Date(lastCheckedRef.current).toISOString() 
        });
        
        // Fetch all three event types in parallel
        const [coinflipResult, revolverResult, crashResult] = await Promise.all([
          refetchCoinflip(),
          refetchRevolver(),
          refetchCrash()
        ]);

        // Combine all events
        const allEvents = [
          ...(coinflipResult.data?.data || []),
          ...(revolverResult.data?.data || []),
          ...(crashResult.data?.data || [])
        ];
        
        console.log('Found events:', allEvents.length);
        
        // Filter events that are newer than our last check
        const recentEvents = allEvents.filter(event => {
          const eventTime = parseInt(event.timestampMs || '0');
          return eventTime > lastCheckedRef.current;
        });
        
        console.log('Recent events:', recentEvents.length);

        // Process each new event
        recentEvents.forEach(event => {
          try {
            // Create a unique ID for this event (transaction digest + event sequence)
            const eventId = `${event.id.txDigest}-${event.id.eventSeq}`;
            
            // Skip if we've already processed this event
            if (processedEventsRef.current.has(eventId)) {
              return;
            }
            
            const eventType = event.type.split('::').pop();
            const parsedJson = event.parsedJson as any;
            
            console.log('Processing new event:', { eventType, parsedJson, sender: event.sender, eventId });
            
            if (!parsedJson) return;

            // Handle different event types
            switch (eventType) {
              case 'BetPlaced':
                handleBetPlacedEvent(parsedJson, event.sender);
                break;
              case 'SpinEvent':
                handleSpinEvent(parsedJson, event.sender);
                break;
              case 'CrashEvent':
                handleCrashEvent(parsedJson, event.sender);
                break;
              default:
                console.log('Unknown event type:', eventType);
            }
            
            // Mark this event as processed
            processedEventsRef.current.add(eventId);
            
            // Keep only the last 100 processed event IDs to prevent memory leak
            if (processedEventsRef.current.size > 100) {
              const eventsArray = Array.from(processedEventsRef.current);
              processedEventsRef.current = new Set(eventsArray.slice(-50));
            }
          } catch (error) {
            console.error('Error processing event:', error);
          }
        });

        // Update last checked timestamp
        if (recentEvents.length > 0) {
          const latestEventTime = Math.max(
            ...recentEvents.map(e => parseInt(e.timestampMs || '0'))
          );
          lastCheckedRef.current = latestEventTime;
        } else if (allEvents.length > 0) {
          // If no recent events but we got events, update to the latest event time
          const latestEventTime = Math.max(
            ...allEvents.map(e => parseInt(e.timestampMs || '0'))
          );
          if (latestEventTime > lastCheckedRef.current) {
            lastCheckedRef.current = latestEventTime;
          }
        }
      } catch (error) {
        console.error('Error fetching blockchain events:', error);
      }
    };

    // Handle BetPlaced events (coinflip)
    const handleBetPlacedEvent = (eventData: any, sender: string) => {
      const amount = parseFloat(eventData.amount) / 1000000000; // Convert from MIST to SUI
      const isWinner = eventData.is_winner;
      const payout = parseFloat(eventData.payout || '0') / 1000000000;

      addNotification({
        type: isWinner ? 'success' : 'error',
        title: isWinner ? '🎉 Coinflip Win!' : '💸 Coinflip Loss',
        message: isWinner 
          ? `Won ${payout.toFixed(3)} SUI!` 
          : `Lost ${amount.toFixed(3)} SUI`,
        game: 'coinflip',
        player: sender,
        amount: isWinner ? payout : amount,
        multiplier: isWinner ? 2 : 0
      });
    };

    // Handle SpinEvent events (revolver)
    const handleSpinEvent = (eventData: any, sender: string) => {
      const amount = parseInt(eventData.stake || '0') / 1000000000;
      const isWinner = eventData.win;
      const payout = parseInt(eventData.payout || '0') / 1000000000;
      const angle = parseInt(eventData.angle_deg || '0');

      addNotification({
        type: isWinner ? 'success' : 'error',
        title: isWinner ? '🎯 Revolver Survived!' : '💀 Revolver Eliminated',
        message: isWinner 
          ? `Survived the spin and won ${payout.toFixed(3)} SUI!`
          : `Eliminated at ${angle}° - Lost ${amount.toFixed(3)} SUI`,
        game: 'revolver',
        player: sender,
        amount: isWinner ? payout : amount,
        multiplier: isWinner ? 6 : 0
      });
    };

    // Handle CrashEvent events (crash)
    const handleCrashEvent = (eventData: any, sender: string) => {
      const amount = parseInt(eventData.stake || '0') / 1000000000; // Use 'stake' instead of 'amount'
      const isWinner = eventData.win;
      const payout = parseInt(eventData.payout || '0') / 1000000000;
      const crashMultiplier = parseInt(eventData.crash_x100 || '0') / 100;
      const targetMultiplier = parseInt(eventData.target_x100 || '0') / 100;

      addNotification({
        type: isWinner ? 'success' : 'error',
        title: isWinner ? '🏍️ Crash Win!' : '💥 Crash Loss',
        message: isWinner 
          ? `Cashed out at ${targetMultiplier.toFixed(2)}x for ${payout.toFixed(3)} SUI!`
          : `Crashed at ${crashMultiplier.toFixed(2)}x - Lost ${amount.toFixed(3)} SUI`,
        game: 'crash',
        player: sender,
        amount: isWinner ? payout : amount,
        multiplier: isWinner ? targetMultiplier : crashMultiplier
      });
    };

    // Start polling for events every 5 seconds
    intervalRef.current = setInterval(checkForNewEvents, 5000);

    // Initial check
    checkForNewEvents();

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [addNotification, refetchCoinflip, refetchRevolver, refetchCrash]);

  return {
    // Could return status or control functions if needed
  };
}