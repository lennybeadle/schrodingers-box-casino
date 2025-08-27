import * as anchor from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, Transaction, Connection } from '@solana/web3.js';
import { connection } from './solanaClient';
import CatflipIDL from './catflip_idl.json';

const PROGRAM_ID = new PublicKey('8bG8NieUJjFAi3vSKd6CdXQmfwVKqcZhe7CaGpo87gGh');

export interface BetResult {
  player: PublicKey;
  stake: number;
  isWinner: boolean;
  payout: number;
  timestamp: number;
}

export interface WalletInterface {
  publicKey: PublicKey;
  signTransaction: (tx: Transaction) => Promise<Transaction>;
  signAllTransactions: (txs: Transaction[]) => Promise<Transaction[]>;
}

export class CatflipClient {
  provider: anchor.AnchorProvider;
  program: anchor.Program;
  wallet: WalletInterface;

  constructor(wallet: WalletInterface) {
    this.wallet = wallet;
    const anchorWallet = {
      publicKey: wallet.publicKey,
      signTransaction: wallet.signTransaction,
      signAllTransactions: wallet.signAllTransactions,
    };
    
    this.provider = new anchor.AnchorProvider(
      connection,
      anchorWallet,
      { commitment: 'confirmed' }
    );
    
    this.program = new anchor.Program(CatflipIDL as anchor.Idl, PROGRAM_ID, this.provider);
  }

  async getVaultPDA(): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('vault')],
      PROGRAM_ID
    );
  }

  async getBetRoundPDA(player: PublicKey, slot: number): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from('bet'),
        player.toBuffer(),
        new anchor.BN(slot).toArrayLike(Buffer, 'le', 8),
      ],
      PROGRAM_ID
    );
  }

  async getVaultBalance(): Promise<number> {
    // Mock vault balance for demo - 10 SOL
    return 10_000_000_000; // 10 SOL in lamports
  }

  async getVaultData(): Promise<any> {
    // Mock data for demo purposes
    return {
      authority: this.wallet.publicKey,
      totalBets: 42,
      totalVolume: 1000000000, // 1 SOL in lamports
    };
  }

  async placeBet(
    amountLamports: number,
    vrfAccount: PublicKey,
    oracleQueue: PublicKey,
    queueAuthority: PublicKey,
    dataBuffer: PublicKey,
    permission: PublicKey,
    escrow: PublicKey,
    payerWallet: PublicKey,
    payerAuthority: PublicKey,
    switchboardProgram: PublicKey
  ): Promise<string> {
    // Mock transaction for demo - simulate successful bet placement
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
    
    // Generate a mock transaction signature
    const mockTxSignature = Array.from({length: 88}, () => 
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[
        Math.floor(Math.random() * 62)
      ]
    ).join('');

    return mockTxSignature;
  }

  async listenForSettlement(
    betRoundPDA: PublicKey,
    callback: (result: BetResult) => void
  ): Promise<number> {
    // Mock settlement listener - simulate bet resolution
    const mockSubscriptionId = Math.floor(Math.random() * 1000000);
    
    // Simulate delayed settlement (3 seconds)
    setTimeout(() => {
      const isWinner = Math.random() < 0.49; // 49% win rate
      callback({
        player: this.wallet.publicKey,
        stake: 1000000, // Mock 0.001 SOL
        isWinner,
        payout: isWinner ? 1960000 : 0, // 1.96x payout
        timestamp: Date.now(),
      });
    }, 3000);

    return mockSubscriptionId;
  }

  async getRecentBets(limit: number = 10): Promise<BetResult[]> {
    // Mock recent bets data for demo
    const mockBets: BetResult[] = Array.from({ length: Math.min(limit, 8) }, (_, i) => ({
      player: this.wallet.publicKey,
      stake: Math.floor(Math.random() * 50000000) + 1000000, // Random between 0.001 and 0.05 SOL
      isWinner: Math.random() < 0.49,
      payout: 0, // Will be calculated below
      timestamp: Date.now() - (i * 120000), // 2 minutes apart
    }));

    // Calculate payouts for winners
    return mockBets.map(bet => ({
      ...bet,
      payout: bet.isWinner ? Math.floor(bet.stake * 1.96) : 0,
    }));
  }
}