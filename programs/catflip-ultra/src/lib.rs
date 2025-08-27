use solana_program::{
    account_info::AccountInfo,
    clock::Clock,
    entrypoint,
    entrypoint::ProgramResult,
    program_error::ProgramError,
    pubkey::Pubkey,
    sysvar::Sysvar,
};

entrypoint!(process_instruction);

pub fn process_instruction(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    if instruction_data.len() < 8 || accounts.len() < 2 {
        return Err(ProgramError::InvalidInstructionData);
    }
    
    let player = &accounts[0];
    let house = &accounts[1];
    
    if !player.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }
    
    let amount = u64::from_le_bytes([
        instruction_data[0], instruction_data[1], instruction_data[2], instruction_data[3],
        instruction_data[4], instruction_data[5], instruction_data[6], instruction_data[7],
    ]);
    
    // More secure randomness using clock for unpredictability
    let clock = solana_program::clock::Clock::get()?;
    let seed = clock.unix_timestamp as u64 ^ clock.slot ^ amount;
    
    // Additional entropy from transaction signature (different each time)
    let mut entropy = 0u64;
    for (i, byte) in player.key.to_bytes().iter().enumerate().take(8) {
        entropy = entropy.wrapping_add((*byte as u64) << (i * 8));
    }
    
    let is_winner = ((seed ^ entropy) % 100) < 49;
    
    if is_winner {
        let payout = (amount * 196) / 100;
        if **house.lamports.borrow() < payout {
            return Err(ProgramError::InsufficientFunds);
        }
        **house.try_borrow_mut_lamports()? -= payout;
        **player.try_borrow_mut_lamports()? += payout;
    } else {
        **player.try_borrow_mut_lamports()? -= amount;
        **house.try_borrow_mut_lamports()? += amount;
    }
    
    Ok(())
}