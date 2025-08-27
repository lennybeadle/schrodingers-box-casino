import * as anchor from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL, Keypair } from '@solana/web3.js';
import { Program } from '@coral-xyz/anchor';
import { Catflip } from '../target/types/catflip';

async function main() {
  // Configure provider
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  
  const program = anchor.workspace.Catflip as Program<Catflip>;
  const player = provider.wallet as anchor.Wallet;

  // Get vault PDA
  const [vaultPDA] = await PublicKey.findProgramAddress(
    [Buffer.from('vault')],
    program.programId
  );

  // Bet amount (from command line or default)
  const betAmountSOL = parseFloat(process.argv[2] || '0.01');
  const betAmountLamports = Math.floor(betAmountSOL * LAMPORTS_PER_SOL);

  console.log('🎲 Placing Bet');
  console.log('==============');
  console.log(`Player: ${player.publicKey.toString()}`);
  console.log(`Bet Amount: ${betAmountSOL} SOL (${betAmountLamports} lamports)`);
  console.log();

  try {
    // Get current slot for bet round PDA
    const slot = await provider.connection.getSlot();
    const [betRoundPDA] = await PublicKey.findProgramAddress(
      [
        Buffer.from('bet'),
        player.publicKey.toBuffer(),
        new anchor.BN(slot).toArrayLike(Buffer, 'le', 8),
      ],
      program.programId
    );

    console.log(`Bet Round PDA: ${betRoundPDA.toString()}`);

    // Get vault data
    const vaultAccount = await program.account.vault.fetch(vaultPDA);
    const vaultBalance = await provider.connection.getBalance(vaultPDA);
    
    console.log(`Vault Balance: ${vaultBalance / LAMPORTS_PER_SOL} SOL`);
    console.log(`House Edge: ${vaultAccount.houseEdgeBps / 100}%`);
    
    // Calculate potential payout
    const houseEdgeMultiplier = (10000 - vaultAccount.houseEdgeBps) / 10000;
    const potentialPayout = betAmountLamports * 2 * houseEdgeMultiplier;
    console.log(`Potential Payout: ${potentialPayout / LAMPORTS_PER_SOL} SOL`);
    console.log();

    // NOTE: In a real implementation, you would need valid Switchboard VRF accounts
    // For testing purposes, these are mock accounts that will cause the transaction to fail
    console.log('⚠️  Using mock VRF accounts - transaction will fail');
    console.log('   In production, replace with real Switchboard VRF accounts');

    const mockVrfAccount = Keypair.generate();
    const mockOracleQueue = new PublicKey('F8ce7MscPZmvGzjJamoKggfq86NxZ6zDKfz6NrJJzBG7');
    const mockQueueAuthority = new PublicKey('31Sof5r1xi7dfcaz4x9Kuwm8J9ueAdDduMcme59sP8gc');
    const mockDataBuffer = Keypair.generate();
    const mockPermission = Keypair.generate();
    const mockEscrow = Keypair.generate();
    const mockSwitchboard = new PublicKey('SW1TCH7qEPTdLsDHRgPuMQjbQxKdH2aBStViMFnt64f');

    const tx = await program.methods
      .bet(new anchor.BN(betAmountLamports))
      .accounts({
        player: player.publicKey,
        vault: vaultPDA,
        betRound: betRoundPDA,
        vrf: mockVrfAccount.publicKey,
        oracleQueue: mockOracleQueue,
        queueAuthority: mockQueueAuthority,
        dataBuffer: mockDataBuffer.publicKey,
        permission: mockPermission.publicKey,
        escrow: mockEscrow.publicKey,
        payerWallet: player.publicKey,
        payerAuthority: player.publicKey,
        recentBlockhashes: anchor.web3.SYSVAR_RECENT_BLOCKHASHES_PUBKEY,
        programState: new PublicKey('BYM81n8TvmbKKRGSGw5TqAHG7sN1CAEQC2afz8JCd3u7'),
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        switchboardProgram: mockSwitchboard,
      })
      .rpc();

    console.log(`✅ Transaction signature: ${tx}`);
    console.log(`🔗 View on Explorer: https://explorer.solana.com/tx/${tx}?cluster=devnet`);

    // Wait and check bet round account
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    try {
      const betRound = await program.account.betRound.fetch(betRoundPDA);
      console.log();
      console.log('📊 Bet Round Info:');
      console.log(`Player: ${betRound.player.toString()}`);
      console.log(`Stake: ${betRound.stakeLamports.toNumber() / LAMPORTS_PER_SOL} SOL`);
      console.log(`Potential Payout: ${betRound.potentialPayout.toNumber() / LAMPORTS_PER_SOL} SOL`);
      console.log(`Settled: ${betRound.isSettled ? '✅' : '⏳'}`);
      if (betRound.isSettled) {
        console.log(`Winner: ${betRound.isWinner ? '🎉 YES' : '😿 NO'}`);
      }
    } catch (error) {
      console.log('⏳ Bet round account not yet created (expected with mock VRF)');
    }

  } catch (error) {
    console.error('❌ Error placing bet:', error.message);
    
    if (error.message.includes('BetBelowMinimum')) {
      console.log('💡 Try a higher bet amount');
    } else if (error.message.includes('BetExceedsMaxExposure')) {
      console.log('💡 Try a lower bet amount');
    } else if (error.message.includes('InsufficientVaultBalance')) {
      console.log('💡 Vault needs more funding');
    }
  }
}

main().catch(console.error);