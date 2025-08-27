use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::Vault;
use crate::errors::CatflipError;

#[derive(Accounts)]
pub struct FundVault<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"vault"],
        bump = vault.bump,
        constraint = vault.authority == authority.key() @ CatflipError::Unauthorized
    )]
    pub vault: Account<'info, Vault>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<FundVault>, amount: u64) -> Result<()> {
    let transfer_cpi_ctx = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        system_program::Transfer {
            from: ctx.accounts.authority.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
        },
    );
    
    system_program::transfer(transfer_cpi_ctx, amount)?;
    
    msg!("Vault funded with {} lamports", amount);
    msg!("New vault balance: {} lamports", ctx.accounts.vault.to_account_info().lamports());
    
    Ok(())
}