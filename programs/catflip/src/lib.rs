use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("8bG8NieUJjFAi3vSKd6CdXQmfwVKqcZhe7CaGpo87gGh");

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

    pub fn bet(ctx: Context<Bet>, amount_lamports: u64) -> Result<()> {
        instructions::bet::handler(ctx, amount_lamports)
    }

    pub fn fulfill_randomness(ctx: Context<FulfillRandomness>) -> Result<()> {
        instructions::fulfill_randomness::handler(ctx)
    }
    
}