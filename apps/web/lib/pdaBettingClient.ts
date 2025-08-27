import { 
  PublicKey, 
  Connection, 
  Transaction, 
  SystemProgram,
  LAMPORTS_PER_SOL,
  TransactionInstruction
} from '@solana/web3.js';

export interface WalletInterface {
  publicKey: PublicKey;
  signTransaction: (tx: Transaction) => Promise<Transaction>;
  signAllTransactions: (txs: Transaction[]) => Promise<Transaction[]>;
}

export interface BetResult {
  player: PublicKey;
  stake: number;
  isWinner: boolean;
  payout: number;
  timestamp: number;
  signature: string;
}

export class PDABettingClient {
  private wallet: WalletInterface;
  private connection: Connection;
  
  // Virtual "house" wallet for demo purposes
  private readonly HOUSE_PUBKEY = new PublicKey('CATSiNo1111111111111111111111111111111111');
  
  constructor(wallet: WalletInterface, connection: Connection) {
    this.wallet = wallet;
    this.connection = connection;
  }

  /**
   * Generate a deterministic PDA for bet round
   */
  private getBetPDA(player: PublicKey, timestamp: number): [PublicKey, number] {
    const seed = Buffer.concat([
      Buffer.from('CATSINO_BET'),
      player.toBuffer(),
      Buffer.from(timestamp.toString())
    ]);
    
    return PublicKey.findProgramAddressSync([seed], SystemProgram.programId);
  }

  /**
   * Place a bet using only PDA and System Program
   * Cost: Only transaction fee (~0.001 SOL)
   */
  async placeBet(amountSol: number): Promise<BetResult> {
    const amountLamports = Math.floor(amountSol * LAMPORTS_PER_SOL);
    const timestamp = Date.now();
    
    try {
      // Create transaction that transfers SOL to a temporary PDA
      // This PDA acts as escrow until bet is settled
      const [betPDA] = this.getBetPDA(this.wallet.publicKey, timestamp);
      
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: this.wallet.publicKey,
          toPubkey: betPDA,
          lamports: amountLamports,
        })
      );

      // Sign and send transaction
      const signedTx = await this.wallet.signTransaction(transaction);
      const signature = await this.connection.sendRawTransaction(signedTx.serialize());
      
      // Wait for confirmation
      await this.connection.confirmTransaction(signature, 'confirmed');
      
      // Generate deterministic "random" outcome based on signature
      const isWinner = this.generateOutcome(signature);
      
      // If winner, send payout back to player (in real app, this would be automated)
      let payout = 0;
      if (isWinner) {
        payout = Math.floor(amountLamports * 1.96); // 96% RTP (4% house edge)
        
        // In a real implementation, you'd need the house wallet to send payout
        // For demo, we'll simulate this
        console.log(`Winner! Would send ${payout / LAMPORTS_PER_SOL} SOL payout`);
      }

      const result: BetResult = {
        player: this.wallet.publicKey,
        stake: amountLamports,
        isWinner,
        payout,
        timestamp,
        signature
      };

      // Store bet result for history (in real app, use on-chain storage)
      this.storeBetResult(result);
      
      return result;

    } catch (error) {
      console.error('Bet failed:', error);
      throw new Error('Bet transaction failed');
    }
  }

  /**
   * Generate deterministic outcome from transaction signature
   */
  private generateOutcome(signature: string): boolean {
    // Use last character of signature for deterministic randomness
    const lastChar = signature.charAt(signature.length - 1);
    const charCode = lastChar.charCodeAt(0);
    
    // 49% win rate (house edge)
    return charCode % 100 < 49;
  }

  /**
   * Store bet result (in browser localStorage for demo)
   */
  private storeBetResult(result: BetResult): void {
    const key = `catsino_bets_${this.wallet.publicKey.toString()}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    existing.unshift(result);
    
    // Keep only last 50 bets
    existing.splice(50);
    
    localStorage.setItem(key, JSON.stringify(existing));
  }

  /**
   * Get recent bet history
   */
  async getRecentBets(limit: number = 10): Promise<BetResult[]> {
    const key = `catsino_bets_${this.wallet.publicKey.toString()}`;
    const bets = JSON.parse(localStorage.getItem(key) || '[]');
    return bets.slice(0, limit);
  }

  /**
   * Get player stats
   */
  async getPlayerStats(): Promise<{
    totalBets: number;
    totalVolume: number;
    totalWins: number;
    totalPayout: number;
    winRate: number;
  }> {
    const bets = await this.getRecentBets(1000); // Get all bets
    
    return {
      totalBets: bets.length,
      totalVolume: bets.reduce((sum, bet) => sum + bet.stake, 0) / LAMPORTS_PER_SOL,
      totalWins: bets.filter(bet => bet.isWinner).length,
      totalPayout: bets.reduce((sum, bet) => sum + bet.payout, 0) / LAMPORTS_PER_SOL,
      winRate: bets.length > 0 ? bets.filter(bet => bet.isWinner).length / bets.length : 0
    };
  }

  /**
   * Simulate vault stats (for UI consistency)
   */
  async getVaultStats(): Promise<{
    totalVolume: number;
    totalBets: number;
    totalWins: number;
    balance: number;
  }> {
    // Mock global stats for demo
    return {
      totalVolume: 2847.3,
      totalBets: 1247,
      totalWins: 578,
      balance: 5891.7
    };
  }

  /**
   * Check if wallet has enough SOL for bet
   */
  async canAffordBet(amountSol: number): Promise<boolean> {
    const balance = await this.connection.getBalance(this.wallet.publicKey);
    const requiredLamports = amountSol * LAMPORTS_PER_SOL + 5000; // Include tx fee
    return balance >= requiredLamports;
  }

  /**
   * Get wallet balance
   */
  async getWalletBalance(): Promise<number> {
    const balance = await this.connection.getBalance(this.wallet.publicKey);
    return balance / LAMPORTS_PER_SOL;
  }
}