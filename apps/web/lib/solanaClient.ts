import { Connection, PublicKey, Commitment } from '@solana/web3.js';

export const CLUSTER = process.env.NEXT_PUBLIC_SOLANA_CLUSTER || 'devnet';

// For NOWNodes, we need to include the API key in the URL
const API_KEY = process.env.NEXT_PUBLIC_NOWNODES_API_KEY || process.env.NOWNODES_API_KEY;
const BASE_RPC_URL = process.env.NEXT_PUBLIC_RPC_HTTP_URL || 'https://api.devnet.solana.com';
const BASE_WS_URL = process.env.NEXT_PUBLIC_RPC_WSS_URL || 'wss://api.devnet.solana.com';

// Construct URLs with API key if using NOWNodes, fallback to public devnet
export const RPC_URL = BASE_RPC_URL.includes('nownodes.io') && API_KEY
  ? `${BASE_RPC_URL}/${API_KEY}`
  : BASE_RPC_URL === 'https://sol.nownodes.io' 
    ? 'https://api.devnet.solana.com' // Fallback to public devnet if NOWNodes fails
    : BASE_RPC_URL;

export const WS_URL = BASE_WS_URL.includes('nownodes.io') && API_KEY
  ? BASE_WS_URL // WS URL already has the API key in the path
  : BASE_WS_URL.includes('sol.nownodes.io')
    ? 'wss://api.devnet.solana.com' // Fallback to public devnet
    : BASE_WS_URL;

export const connection = new Connection(RPC_URL, {
  commitment: 'confirmed' as Commitment,
  wsEndpoint: WS_URL,
});

export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID || '8bG8NieUJjFAi3vSKd6CdXQmfwVKqcZhe7CaGpo87gGh'
);

export const MIN_BET_LAMPORTS = parseInt(
  process.env.NEXT_PUBLIC_MIN_BET_LAMPORTS || '1000000'
);

export const MAX_EXPOSURE_BPS = parseInt(
  process.env.NEXT_PUBLIC_MAX_EXPOSURE_BPS || '1000'
);

export const HOUSE_EDGE_BPS = parseInt(
  process.env.NEXT_PUBLIC_HOUSE_EDGE_BPS || '200'
);

export const LAMPORTS_PER_SOL = 1_000_000_000;

export function lamportsToSol(lamports: number): number {
  return lamports / LAMPORTS_PER_SOL;
}

export function solToLamports(sol: number): number {
  return Math.floor(sol * LAMPORTS_PER_SOL);
}

export function calculatePayout(betAmount: number): number {
  const houseEdgeMultiplier = (10000 - HOUSE_EDGE_BPS) / 10000;
  return betAmount * 2 * houseEdgeMultiplier;
}