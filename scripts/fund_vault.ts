import * as anchor from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Program } from '@coral-xyz/anchor';
import { Catflip } from '../target/types/catflip';

async function main() {
  // Configure provider
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  
  const program = anchor.workspace.Catflip as Program<Catflip>;
  const authority = provider.wallet as anchor.Wallet;

  // Get vault PDA
  const [vaultPDA] = await PublicKey.findProgramAddress(
    [Buffer.from('vault')],
    program.programId
  );

  // Amount to fund (from command line or default)
  const amountSOL = parseFloat(process.argv[2] || '1.0');
  const amountLamports = amountSOL * LAMPORTS_PER_SOL;

  console.log('🏦 Funding Vault');
  console.log('================');
  console.log(`Authority: ${authority.publicKey.toString()}`);
  console.log(`Vault PDA: ${vaultPDA.toString()}`);
  console.log(`Amount: ${amountSOL} SOL (${amountLamports} lamports)`);
  console.log();

  try {
    // Get vault balance before
    const balanceBefore = await provider.connection.getBalance(vaultPDA);
    console.log(`Vault balance before: ${balanceBefore / LAMPORTS_PER_SOL} SOL`);

    // Fund vault
    const tx = await program.methods
      .fundVault(new anchor.BN(amountLamports))
      .accounts({
        authority: authority.publicKey,
        vault: vaultPDA,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log(`✅ Transaction signature: ${tx}`);
    console.log(`🔗 View on Explorer: https://explorer.solana.com/tx/${tx}?cluster=devnet`);

    // Get vault balance after
    await new Promise(resolve => setTimeout(resolve, 2000));
    const balanceAfter = await provider.connection.getBalance(vaultPDA);
    console.log(`Vault balance after: ${balanceAfter / LAMPORTS_PER_SOL} SOL`);
    console.log(`Added: ${(balanceAfter - balanceBefore) / LAMPORTS_PER_SOL} SOL`);

    // Get and display vault account data
    const vaultAccount = await program.account.vault.fetch(vaultPDA);
    console.log();
    console.log('📊 Vault Stats:');
    console.log(`Total Volume: ${vaultAccount.totalVolume.toNumber() / LAMPORTS_PER_SOL} SOL`);
    console.log(`Total Bets: ${vaultAccount.totalBets.toString()}`);
    console.log(`Total Wins: ${vaultAccount.totalWins.toString()}`);
    console.log(`House Edge: ${vaultAccount.houseEdgeBps / 100}%`);
    console.log(`Min Bet: ${vaultAccount.minBetLamports.toNumber() / LAMPORTS_PER_SOL} SOL`);
    console.log(`Max Exposure: ${vaultAccount.maxExposureBps / 100}%`);
    console.log(`Status: ${vaultAccount.isPaused ? '⏸️  Paused' : '▶️  Active'}`);

  } catch (error) {
    console.error('❌ Error funding vault:', error);
    process.exit(1);
  }
}

main().catch(console.error);