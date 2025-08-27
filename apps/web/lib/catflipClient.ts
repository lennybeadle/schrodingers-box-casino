import * as anchor from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { connection, PROGRAM_ID } from './solanaClient';
import idl from './catflip.json';

export interface BetResult {
  player: PublicKey;
  stake: number;
  isWinner: boolean;
  payout: number;
  timestamp: number;
}

export class CatflipClient {
  program: anchor.Program;
  provider: anchor.AnchorProvider;

  constructor(wallet: anchor.Wallet) {
    this.provider = new anchor.AnchorProvider(
      connection,
      wallet,
      { commitment: 'confirmed' }
    );
    this.program = new anchor.Program(idl as any, PROGRAM_ID, this.provider);
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
    const [vaultPDA] = await this.getVaultPDA();
    const balance = await connection.getBalance(vaultPDA);
    return balance;
  }

  async getVaultData(): Promise<any> {
    const [vaultPDA] = await this.getVaultPDA();
    try {
      const vault = await this.program.account.vault.fetch(vaultPDA);
      return vault;
    } catch (error) {
      console.error('Error fetching vault data:', error);
      return null;
    }
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
    const [vaultPDA] = await this.getVaultPDA();
    const slot = await connection.getSlot();
    const [betRoundPDA] = await this.getBetRoundPDA(
      this.provider.wallet.publicKey,
      slot
    );

    const tx = await this.program.methods
      .bet(new anchor.BN(amountLamports))
      .accounts({
        player: this.provider.wallet.publicKey,
        vault: vaultPDA,
        betRound: betRoundPDA,
        vrf: vrfAccount,
        oracleQueue,
        queueAuthority,
        dataBuffer,
        permission,
        escrow,
        payerWallet,
        payerAuthority,
        recentBlockhashes: anchor.web3.SYSVAR_RECENT_BLOCKHASHES_PUBKEY,
        programState: new PublicKey('BYM81n8TvmbKKRGSGw5TqAHG7sN1CAEQC2afz8JCd3u7'),
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        switchboardProgram,
      })
      .rpc();

    return tx;
  }

  async listenForSettlement(
    betRoundPDA: PublicKey,
    callback: (result: BetResult) => void
  ): Promise<number> {
    const subscriptionId = connection.onAccountChange(
      betRoundPDA,
      async (accountInfo) => {
        try {
          const betRound = await this.program.account.betRound.fetch(betRoundPDA);
          if (betRound.isSettled) {
            callback({
              player: betRound.player,
              stake: betRound.stakeLamports.toNumber(),
              isWinner: betRound.isWinner,
              payout: betRound.isWinner ? betRound.potentialPayout.toNumber() : 0,
              timestamp: betRound.timestamp.toNumber(),
            });
          }
        } catch (error) {
          console.error('Error parsing bet settlement:', error);
        }
      },
      'confirmed'
    );

    return subscriptionId;
  }

  async getRecentBets(limit: number = 10): Promise<BetResult[]> {
    try {
      const bets = await this.program.account.betRound.all();
      return bets
        .filter((bet) => bet.account.isSettled)
        .sort((a, b) => b.account.timestamp.toNumber() - a.account.timestamp.toNumber())
        .slice(0, limit)
        .map((bet) => ({
          player: bet.account.player,
          stake: bet.account.stakeLamports.toNumber(),
          isWinner: bet.account.isWinner,
          payout: bet.account.isWinner ? bet.account.potentialPayout.toNumber() : 0,
          timestamp: bet.account.timestamp.toNumber(),
        }));
    } catch (error) {
      console.error('Error fetching recent bets:', error);
      return [];
    }
  }
}