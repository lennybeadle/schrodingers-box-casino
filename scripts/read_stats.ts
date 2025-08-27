import * as anchor from '@coral-xyz/anchor';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Program } from '@coral-xyz/anchor';
import { Catflip } from '../target/types/catflip';

async function main() {
  // Configure provider
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  
  const program = anchor.workspace.Catflip as Program<Catflip>;

  // Get vault PDA
  const [vaultPDA] = await PublicKey.findProgramAddress(
    [Buffer.from('vault')],
    program.programId
  );

  console.log('📊 Casino Statistics');
  console.log('===================');
  console.log(`Program ID: ${program.programId.toString()}`);
  console.log(`Vault PDA: ${vaultPDA.toString()}`);
  console.log();

  try {
    // Get vault account data
    const vaultAccount = await program.account.vault.fetch(vaultPDA);
    const vaultBalance = await provider.connection.getBalance(vaultPDA);

    console.log('🏦 Vault Information:');
    console.log(`Authority: ${vaultAccount.authority.toString()}`);
    console.log(`Balance: ${vaultBalance / LAMPORTS_PER_SOL} SOL`);
    console.log(`Status: ${vaultAccount.isPaused ? '⏸️  Paused' : '▶️  Active'}`);
    console.log();

    console.log('⚙️  Game Configuration:');
    console.log(`Min Bet: ${vaultAccount.minBetLamports.toNumber() / LAMPORTS_PER_SOL} SOL`);
    console.log(`Max Exposure: ${vaultAccount.maxExposureBps / 100}%`);
    console.log(`House Edge: ${vaultAccount.houseEdgeBps / 100}%`);
    console.log(`Max Single Bet: ${(vaultBalance * vaultAccount.maxExposureBps / 10000) / LAMPORTS_PER_SOL} SOL`);
    console.log();

    console.log('📈 Game Statistics:');
    console.log(`Total Volume: ${vaultAccount.totalVolume.toNumber() / LAMPORTS_PER_SOL} SOL`);
    console.log(`Total Bets: ${vaultAccount.totalBets.toString()}`);
    console.log(`Total Wins: ${vaultAccount.totalWins.toString()}`);
    
    const totalBets = vaultAccount.totalBets.toNumber();
    const totalWins = vaultAccount.totalWins.toNumber();
    
    if (totalBets > 0) {
      const winRate = (totalWins / totalBets) * 100;
      const houseWins = totalBets - totalWins;
      const houseWinRate = (houseWins / totalBets) * 100;
      
      console.log(`Player Win Rate: ${winRate.toFixed(2)}%`);
      console.log(`House Win Rate: ${houseWinRate.toFixed(2)}%`);
    }
    console.log();

    // Get all bet rounds
    console.log('🎲 Recent Bet Rounds:');
    console.log('====================');
    
    try {
      const betRounds = await program.account.betRound.all();
      
      if (betRounds.length === 0) {
        console.log('No bet rounds found');
      } else {
        // Sort by timestamp (newest first)
        const sortedBets = betRounds
          .sort((a, b) => b.account.timestamp.toNumber() - a.account.timestamp.toNumber())
          .slice(0, 10); // Show last 10 bets

        console.log(`Showing last ${Math.min(10, betRounds.length)} of ${betRounds.length} total bets:`);
        console.log();

        sortedBets.forEach((betRound, index) => {
          const bet = betRound.account;
          const date = new Date(bet.timestamp.toNumber() * 1000);
          const result = bet.isSettled ? (bet.isWinner ? '🎉 WIN' : '😿 LOSE') : '⏳ PENDING';
          
          console.log(`${index + 1}. Player: ${bet.player.toString().slice(0, 8)}...`);
          console.log(`   Stake: ${bet.stakeLamports.toNumber() / LAMPORTS_PER_SOL} SOL`);
          console.log(`   Potential Payout: ${bet.potentialPayout.toNumber() / LAMPORTS_PER_SOL} SOL`);
          console.log(`   Result: ${result}`);
          console.log(`   Time: ${date.toLocaleString()}`);
          console.log(`   PDA: ${betRound.publicKey.toString()}`);
          console.log();
        });

        // Calculate some aggregate stats
        const settledBets = betRounds.filter(b => b.account.isSettled);
        const totalVolume = settledBets.reduce(
          (sum, bet) => sum + bet.account.stakeLamports.toNumber(),
          0
        );
        const totalPayouts = settledBets
          .filter(bet => bet.account.isWinner)
          .reduce((sum, bet) => sum + bet.account.potentialPayout.toNumber(), 0);
        
        console.log('📊 Calculated Stats:');
        console.log(`Settled Bets: ${settledBets.length}/${betRounds.length}`);
        console.log(`Total Wagered: ${totalVolume / LAMPORTS_PER_SOL} SOL`);
        console.log(`Total Paid Out: ${totalPayouts / LAMPORTS_PER_SOL} SOL`);
        console.log(`House Profit: ${(totalVolume - totalPayouts) / LAMPORTS_PER_SOL} SOL`);
      }
    } catch (error) {
      console.log('No bet rounds found or error fetching:', error.message);
    }

  } catch (error) {
    console.error('❌ Error fetching stats:', error);
    
    if (error.message.includes('Account does not exist')) {
      console.log('💡 Vault has not been initialized yet.');
      console.log('   Run: anchor run initialize');
    }
  }
}

main().catch(console.error);