use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod catflip {
    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        min_bet_lamports: u64,
        max_exposure_bps: u16,
        house_edge_bps: u16,
    ) -> Result<()> {
        instructions::initialize::handler(ctx, min_bet_lamports, max_exposure_bps, house_edge_bps)
    }

    pub fn fund_vault(ctx: Context<FundVault>, amount: u64) -> Result<()> {
        instructions::fund_vault::handler(ctx, amount)
    }

    pub fn bet(ctx: Context<Bet>, amount_lamports: u64) -> Result<()> {
        instructions::bet::handler(ctx, amount_lamports)
    }

    pub fn fulfill_randomness(ctx: Context<FulfillRandomness>) -> Result<()> {
        instructions::fulfill_randomness::handler(ctx)
    }

    pub fn refund_timeout(ctx: Context<RefundTimeout>) -> Result<()> {
        instructions::refund_timeout::handler(ctx)
    }
    
    pub fn set_pause(ctx: Context<SetPause>, is_paused: bool) -> Result<()> {
        ctx.accounts.vault.is_paused = is_paused;
        msg!("Game pause status set to: {}", is_paused);
        Ok(())
    }
    
    pub fn set_limits(
        ctx: Context<SetLimits>,
        min_bet_lamports: u64,
        max_exposure_bps: u16,
    ) -> Result<()> {
        ctx.accounts.vault.min_bet_lamports = min_bet_lamports;
        ctx.accounts.vault.max_exposure_bps = max_exposure_bps;
        msg!("Limits updated - Min bet: {}, Max exposure: {}%", 
            min_bet_lamports, 
            max_exposure_bps as f64 / 100.0
        );
        Ok(())
    }
    
    pub fn set_edge(ctx: Context<SetEdge>, house_edge_bps: u16) -> Result<()> {
        ctx.accounts.vault.house_edge_bps = house_edge_bps;
        msg!("House edge updated to: {}%", house_edge_bps as f64 / 100.0);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct SetPause<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"vault"],
        bump = vault.bump,
        constraint = vault.authority == authority.key() @ errors::CatflipError::Unauthorized
    )]
    pub vault: Account<'info, state::Vault>,
}

#[derive(Accounts)]
pub struct SetLimits<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"vault"],
        bump = vault.bump,
        constraint = vault.authority == authority.key() @ errors::CatflipError::Unauthorized
    )]
    pub vault: Account<'info, state::Vault>,
}

#[derive(Accounts)]
pub struct SetEdge<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"vault"],
        bump = vault.bump,
        constraint = vault.authority == authority.key() @ errors::CatflipError::Unauthorized
    )]
    pub vault: Account<'info, state::Vault>,
}