use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    clock::Clock,
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program_error::ProgramError,
    pubkey::Pubkey,
    system_instruction,
    sysvar::Sysvar,
    program::invoke,
};

// Program entrypoint
entrypoint!(process_instruction);

// Instructions
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub enum CatflipInstruction {
    /// Initialize vault
    /// Accounts: [signer, vault_account, system_program]
    Initialize { min_bet: u64 },
    
    /// Place bet
    /// Accounts: [signer, vault_account, system_program]  
    Bet { amount: u64 },
}

// Vault state (minimal)
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct Vault {
    pub is_initialized: bool,
    pub authority: Pubkey,
    pub min_bet: u64,
    pub total_bets: u64,
    pub total_volume: u64,
}

impl Vault {
    pub const LEN: usize = 1 + 32 + 8 + 8 + 8; // 57 bytes
}

// Process instruction
pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let instruction = CatflipInstruction::try_from_slice(instruction_data)?;
    
    match instruction {
        CatflipInstruction::Initialize { min_bet } => {
            initialize(program_id, accounts, min_bet)
        }
        CatflipInstruction::Bet { amount } => {
            bet(program_id, accounts, amount)
        }
    }
}

// Initialize vault
fn initialize(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
    min_bet: u64,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let authority = next_account_info(account_info_iter)?;
    let vault_account = next_account_info(account_info_iter)?;
    
    if !authority.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // Check if already initialized
    if vault_account.data_len() > 0 {
        let vault = Vault::try_from_slice(&vault_account.data.borrow())?;
        if vault.is_initialized {
            return Err(ProgramError::AccountAlreadyInitialized);
        }
    }

    // Create vault
    let vault = Vault {
        is_initialized: true,
        authority: *authority.key,
        min_bet,
        total_bets: 0,
        total_volume: 0,
    };

    vault.serialize(&mut &mut vault_account.data.borrow_mut()[..])?;
    
    msg!("Vault initialized with min bet: {}", min_bet);
    Ok(())
}

// Place bet
fn bet(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
    amount: u64,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let player = next_account_info(account_info_iter)?;
    let vault_account = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;

    if !player.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // Load and validate vault
    let mut vault = Vault::try_from_slice(&vault_account.data.borrow())?;
    if !vault.is_initialized {
        return Err(ProgramError::UninitializedAccount);
    }

    if amount < vault.min_bet {
        msg!("Bet too small: {} < {}", amount, vault.min_bet);
        return Err(ProgramError::InvalidArgument);
    }

    // Transfer bet to vault
    invoke(
        &system_instruction::transfer(player.key, vault_account.key, amount),
        &[player.clone(), vault_account.clone(), system_program.clone()],
    )?;

    // Simple deterministic "randomness" using clock
    let clock = Clock::get()?;
    let random_seed = clock.unix_timestamp as u64 ^ clock.slot ^ amount;
    let is_winner = (random_seed % 100) < 49; // 49% win rate

    let mut payout = 0u64;
    
    if is_winner {
        // Calculate payout (1.96x for 4% house edge)
        payout = (amount * 196) / 100;
        
        // Check vault has enough balance
        if **vault_account.lamports.borrow() < payout {
            msg!("Insufficient vault funds");
            return Err(ProgramError::InsufficientFunds);
        }

        // Transfer payout to player
        **vault_account.try_borrow_mut_lamports()? -= payout;
        **player.try_borrow_mut_lamports()? += payout;
        
        msg!("Winner! Payout: {}", payout);
    } else {
        msg!("House wins! Bet: {}", amount);
    }

    // Update vault stats
    vault.total_bets += 1;
    vault.total_volume += amount;
    vault.serialize(&mut &mut vault_account.data.borrow_mut()[..])?;

    msg!("Bet result: player={}, stake={}, winner={}, payout={}", 
         player.key, amount, is_winner, payout);

    Ok(())
}