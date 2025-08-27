use anchor_lang::prelude::*;
use crate::state::{Vault, BetRound};
use crate::errors::CatflipError;

#[derive(Accounts)]
pub struct RefundTimeout<'info> {
    #[account(mut)]
    pub player: Signer<'info>,
    
    #[account(mut)]
    pub vault: Account<'info, Vault>,
    
    #[account(
        mut,
        close = player,
        seeds = [b"bet", player.key().as_ref(), &bet_round.slot.to_le_bytes()],
        bump = bet_round.bump,
        constraint = !bet_round.is_settled @ CatflipError::BetAlreadySettled,
        constraint = bet_round.player == player.key() @ CatflipError::Unauthorized
    )]
    pub bet_round: Account<'info, BetRound>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<RefundTimeout>) -> Result<()> {
    let bet_round = &ctx.accounts.bet_round;
    let current_slot = Clock::get()?.slot;
    
    require!(
        current_slot > bet_round.slot + BetRound::TIMEOUT_SLOTS,
        CatflipError::BetNotTimedOut
    );
    
    **ctx.accounts.vault.to_account_info().lamports.borrow_mut() = ctx
        .accounts.vault.to_account_info()
        .lamports()
        .checked_sub(bet_round.stake_lamports)
        .ok_or(CatflipError::MathOverflow)?;
    
    **ctx.accounts.player.lamports.borrow_mut() = ctx
        .accounts.player
        .lamports()
        .checked_add(bet_round.stake_lamports)
        .ok_or(CatflipError::MathOverflow)?;
    
    msg!("BetRefunded: player={}, stake={}", 
        ctx.accounts.player.key(),
        bet_round.stake_lamports
    );
    
    emit!(BetRefunded {
        player: ctx.accounts.player.key(),
        stake: bet_round.stake_lamports,
        timestamp: Clock::get()?.unix_timestamp,
    });
    
    Ok(())
}

#[event]
pub struct BetRefunded {
    pub player: Pubkey,
    pub stake: u64,
    pub timestamp: i64,
}