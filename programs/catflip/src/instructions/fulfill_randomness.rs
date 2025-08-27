use anchor_lang::prelude::*;
// Mock implementation - in production use Switchboard On-Demand SDK
use crate::state::{Vault, BetRound};
use crate::errors::CatflipError;

#[derive(Accounts)]
pub struct FulfillRandomness<'info> {
    #[account(mut)]
    pub vault: Account<'info, Vault>,
    
    #[account(
        mut,
        constraint = !bet_round.is_settled @ CatflipError::BetAlreadySettled
    )]
    pub bet_round: Account<'info, BetRound>,
    
    #[account(mut)]
    pub player: SystemAccount<'info>,
    
    // Mock VRF account - in production use real Switchboard account
    pub vrf: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<FulfillRandomness>) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    let bet_round = &mut ctx.accounts.bet_round;
    
    // Mock randomness - in production, get from Switchboard VRF
    let clock = Clock::get()?;
    let pseudo_random = clock.unix_timestamp as u64 * clock.slot;
    let random_value = pseudo_random;
    
    let is_winner = (random_value % 2) == 0;
    
    bet_round.is_settled = true;
    bet_round.is_winner = is_winner;
    
    let mut payout = 0u64;
    
    if is_winner {
        payout = bet_round.potential_payout;
        
        **ctx.accounts.vault.to_account_info().lamports.borrow_mut() = ctx
            .accounts.vault.to_account_info()
            .lamports()
            .checked_sub(payout)
            .ok_or(CatflipError::MathOverflow)?;
        
        **ctx.accounts.player.lamports.borrow_mut() = ctx
            .accounts.player
            .lamports()
            .checked_add(payout)
            .ok_or(CatflipError::MathOverflow)?;
        
        vault.total_wins = vault.total_wins
            .checked_add(1)
            .ok_or(CatflipError::MathOverflow)?;
        
        msg!("Player won! Payout: {} lamports", payout);
    } else {
        msg!("House won! Stake remains in vault");
    }
    
    msg!("BetSettled: player={}, stake={}, winner={}, payout={}", 
        bet_round.player,
        bet_round.stake_lamports,
        is_winner,
        payout
    );
    
    emit!(BetSettled {
        player: bet_round.player,
        stake: bet_round.stake_lamports,
        is_winner,
        payout,
        timestamp: Clock::get()?.unix_timestamp,
    });
    
    Ok(())
}

#[event]
pub struct BetSettled {
    pub player: Pubkey,
    pub stake: u64,
    pub is_winner: bool,
    pub payout: u64,
    pub timestamp: i64,
}