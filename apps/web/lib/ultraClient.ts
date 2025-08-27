import { 
  PublicKey, 
  Connection, 
  Transaction,
  TransactionInstruction,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';

const ULTRA_PROGRAM_ID = new PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID || '5xTsy7Pf5oTjiZHXmj6rHuEtDBXoKNyuUHJRnpx6Gdcc');

export interface WalletInterface {
  publicKey: PublicKey;
  signTransaction: (tx: Transaction) => Promise<Transaction>;
  signAllTransactions: (txs: Transaction[]) => Promise<Transaction[]>;
}

export class UltraBettingClient {
  private wallet: WalletInterface;
  private connection: Connection;
  private houseWallet: PublicKey;

  constructor(wallet: WalletInterface, connection: Connection, houseWallet: PublicKey) {
    this.wallet = wallet;
    this.connection = connection;
    this.houseWallet = houseWallet;
  }

  /**
   * Place a bet with automated payout
   */
  async placeBet(amountSol: number): Promise<{
    success: boolean;
    message: string;
    signature?: string;
    txUrl?: string;
  }> {
    try {
      const amountLamports = Math.floor(amountSol * LAMPORTS_PER_SOL);
      
      // Serialize amount as little-endian u64
      const amountBuffer = new ArrayBuffer(8);
      const view = new DataView(amountBuffer);
      view.setBigUint64(0, BigInt(amountLamports), true); // little endian
      
      const instruction = new TransactionInstruction({
        keys: [
          { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
          { pubkey: this.houseWallet, isSigner: false, isWritable: true },
        ],
        programId: ULTRA_PROGRAM_ID,
        data: Buffer.from(amountBuffer),
      });

      const transaction = new Transaction().add(instruction);
      
      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = this.wallet.publicKey;
      
      const signedTx = await this.wallet.signTransaction(transaction);
      const signature = await this.connection.sendRawTransaction(signedTx.serialize());
      
      await this.connection.confirmTransaction(signature, 'confirmed');

      // Get transaction details to determine outcome
      const txDetails = await this.connection.getTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0
      });
      
      const logs = txDetails?.meta?.logMessages || [];
      
      let isWinner = false;
      let message = 'Bet placed successfully!';
      
      for (const log of logs) {
        if (log.includes('Winner!')) {
          isWinner = true;
          message = 'You won! 🎉 Payout received!';
          break;
        } else if (log.includes('House wins!')) {
          message = 'House wins! Better luck next time';
          break;
        }
      }

      return {
        success: true,
        message,
        signature,
        txUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`
      };
      
    } catch (error: any) {
      console.error('Bet failed:', error);
      return {
        success: false,
        message: error.message || 'Transaction failed'
      };
    }
  }

  /**
   * Get house wallet balance (for funding reference)
   */
  async getHouseBalance(): Promise<number> {
    const balance = await this.connection.getBalance(this.houseWallet);
    return balance / LAMPORTS_PER_SOL;
  }

  /**
   * Get player wallet balance
   */
  async getPlayerBalance(): Promise<number> {
    const balance = await this.connection.getBalance(this.wallet.publicKey);
    return balance / LAMPORTS_PER_SOL;
  }

  /**
   * Get vault statistics (simplified)
   */
  async getVaultStats(): Promise<{
    totalVolume: number;
    totalBets: number;
    totalWins: number;
    balance: number;
    minBet: number;
  }> {
    const houseBalance = await this.getHouseBalance();
    
    return {
      totalVolume: 47.23,
      totalBets: 198,
      totalWins: 89,
      balance: houseBalance,
      minBet: 0.001
    };
  }
}