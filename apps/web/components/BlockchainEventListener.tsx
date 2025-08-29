'use client';

import { useBlockchainEvents } from '@/hooks/useBlockchainEvents';

export function BlockchainEventListener() {
  useBlockchainEvents();
  return null; // This component doesn't render anything
}