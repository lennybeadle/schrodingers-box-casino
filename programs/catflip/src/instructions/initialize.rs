use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::Vault;

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        init,
        payer = authority,
        space = Vault::SIZE,
        seeds = [b"vault"],
        bump
    )]
    pub vault: Account<'info, Vault>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<Initialize>,
    min_bet_lamports: u64,
    max_exposure_bps: u16,
    house_edge_bps: u16,
) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    
    vault.authority = ctx.accounts.authority.key();
    vault.bump = ctx.bumps.vault;
    vault.is_paused = false;
    vault.min_bet_lamports = min_bet_lamports;
    vault.max_exposure_bps = max_exposure_bps;
    vault.house_edge_bps = house_edge_bps;
    vault.total_volume = 0;
    vault.total_bets = 0;
    vault.total_wins = 0;
    
    msg!("Vault initialized with authority: {}", vault.authority);
    msg!("Min bet: {} lamports", min_bet_lamports);
    msg!("Max exposure: {}%", max_exposure_bps as f64 / 100.0);
    msg!("House edge: {}%", house_edge_bps as f64 / 100.0);
    
    Ok(())
}