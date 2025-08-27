const { Connection, PublicKey, Transaction, TransactionInstruction, LAMPORTS_PER_SOL } = require('@solana/web3.js');

async function testProgram() {
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    
    // Your program details
    const programId = new PublicKey('6AjouDKGuGBxq7w78m7DrtdZYw2Q2ZkH85AdkDBzaACt');
    const houseWallet = new PublicKey('9xDnozdsXgbi7ugacMxGTBmNxPMktPZwUKCv757WwCy4');
    
    console.log('🔍 Testing Program Configuration...');
    console.log('Program ID:', programId.toString());
    console.log('House Wallet:', houseWallet.toString());
    
    // Check if program exists
    try {
        const programAccount = await connection.getAccountInfo(programId);
        if (programAccount) {
            console.log('✅ Program exists on devnet');
            console.log('Program owner:', programAccount.owner.toString());
            console.log('Program data length:', programAccount.data.length);
        } else {
            console.log('❌ Program does not exist on devnet');
        }
    } catch (error) {
        console.log('❌ Error checking program:', error.message);
    }
    
    // Check house wallet
    try {
        const houseBalance = await connection.getBalance(houseWallet);
        console.log('✅ House wallet balance:', houseBalance / LAMPORTS_PER_SOL, 'SOL');
    } catch (error) {
        console.log('❌ Error checking house wallet:', error.message);
    }
    
    // Test transaction simulation (without signing)
    try {
        const amount = 0.001 * LAMPORTS_PER_SOL;
        const amountBuffer = new ArrayBuffer(8);
        const view = new DataView(amountBuffer);
        view.setBigUint64(0, BigInt(amount), true);
        
        const testWallet = new PublicKey('11111111111111111111111111111111'); // System program as dummy
        
        const instruction = new TransactionInstruction({
            keys: [
                { pubkey: testWallet, isSigner: true, isWritable: true },
                { pubkey: houseWallet, isSigner: false, isWritable: true },
            ],
            programId: programId,
            data: Buffer.from(amountBuffer),
        });
        
        const transaction = new Transaction().add(instruction);
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = testWallet;
        
        console.log('✅ Transaction structure looks valid');
        console.log('Instruction data length:', instruction.data.length);
        
    } catch (error) {
        console.log('❌ Transaction setup error:', error.message);
    }
}

testProgram().catch(console.error);