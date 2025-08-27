use anchor_lang::prelude::*;
use anchor_lang::system_program;
// Note: In production, you would use Switchboard On-Demand SDK
// For now, we'll simulate the VRF request structure
use crate::state::{Vault, BetRound};
use crate::errors::CatflipError;

#[derive(Accounts)]
pub struct Bet<'info> {
    #[account(mut)]
    pub player: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"vault"],
        bump = vault.bump,
        constraint = !vault.is_paused @ CatflipError::GamePaused
    )]
    pub vault: Account<'info, Vault>,
    
    #[account(
        init,
        payer = player,
        space = BetRound::SIZE,
        seeds = [b"bet", player.key().as_ref(), &Clock::get()?.slot.to_le_bytes()],
        bump
    )]
    pub bet_round: Account<'info, BetRound>,
    
    // Mock VRF account for now - in production use real Switchboard account
    pub vrf: AccountInfo<'info>,
    
    pub oracle_queue: AccountInfo<'info>,
    pub queue_authority: AccountInfo<'info>,
    pub data_buffer: AccountInfo<'info>,
    pub permission: AccountInfo<'info>,
    pub escrow: AccountInfo<'info>,
    pub payer_wallet: AccountInfo<'info>,
    pub payer_authority: AccountInfo<'info>,
    pub recent_blockhashes: AccountInfo<'info>,
    pub program_state: AccountInfo<'info>,
    pub token_program: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
    pub switchboard_program: AccountInfo<'info>,
}

pub fn handler(ctx: Context<Bet>, amount_lamports: u64) -> Result<()> {
    // Get immutable data first
    let vault_balance = ctx.accounts.vault.to_account_info().lamports();
    
    let vault = &mut ctx.accounts.vault;
    let bet_round = &mut ctx.accounts.bet_round;
    let clock = Clock::get()?;
    
    require!(
        amount_lamports >= vault.min_bet_lamports,
        CatflipError::BetBelowMinimum
    );
    let max_bet = vault_balance
        .checked_mul(vault.max_exposure_bps as u64)
        .ok_or(CatflipError::MathOverflow)?
        .checked_div(10000)
        .ok_or(CatflipError::MathOverflow)?;
    
    require!(
        amount_lamports <= max_bet,
        CatflipError::BetExceedsMaxExposure
    );
    
    let house_edge_multiplier = 10000u64
        .checked_sub(vault.house_edge_bps as u64)
        .ok_or(CatflipError::MathOverflow)?;
    let potential_payout = amount_lamports
        .checked_mul(2)
        .ok_or(CatflipError::MathOverflow)?
        .checked_mul(house_edge_multiplier)
        .ok_or(CatflipError::MathOverflow)?
        .checked_div(10000)
        .ok_or(CatflipError::MathOverflow)?;
    
    require!(
        vault_balance >= potential_payout,
        CatflipError::InsufficientVaultBalance
    );
    
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.player.to_account_info(),
                to: vault.to_account_info(),
            },
        ),
        amount_lamports,
    )?;
    
    bet_round.player = ctx.accounts.player.key();
    bet_round.stake_lamports = amount_lamports;
    bet_round.potential_payout = potential_payout;
    bet_round.timestamp = clock.unix_timestamp;
    bet_round.slot = clock.slot;
    bet_round.is_settled = false;
    bet_round.is_winner = false;
    bet_round.bump = ctx.bumps.bet_round;
    
    vault.total_volume = vault.total_volume
        .checked_add(amount_lamports)
        .ok_or(CatflipError::MathOverflow)?;
    vault.total_bets = vault.total_bets
        .checked_add(1)
        .ok_or(CatflipError::MathOverflow)?;
    
    // Mock randomness request - in production, use Switchboard On-Demand
    msg!("Mock VRF request - in production, integrate with Switchboard On-Demand");
    
    // Generate a mock request ID for now
    let mock_randomness = [0u8; 32];
    bet_round.vrf_request_randomness = mock_randomness;
    
    msg!("BetPlaced: player={}, stake={}, round={}", 
        ctx.accounts.player.key(), 
        amount_lamports,
        ctx.accounts.bet_round.key()
    );
    
    emit!(BetPlaced {
        player: ctx.accounts.player.key(),
        stake: amount_lamports,
        round_pubkey: ctx.accounts.bet_round.key(),
        timestamp: clock.unix_timestamp,
    });
    
    Ok(())
}

#[event]
pub struct BetPlaced {
    pub player: Pubkey,
    pub stake: u64,
    pub round_pubkey: Pubkey,
    pub timestamp: i64,
}