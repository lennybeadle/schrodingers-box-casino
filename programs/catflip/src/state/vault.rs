use anchor_lang::prelude::*;

#[account]
pub struct Vault {
    pub authority: Pubkey,
    pub bump: u8,
    pub is_paused: bool,
    pub min_bet_lamports: u64,
    pub max_exposure_bps: u16,
    pub house_edge_bps: u16,
    pub total_volume: u64,
    pub total_bets: u64,
    pub total_wins: u64,
}

impl Vault {
    pub const SIZE: usize = 8 + // discriminator
        32 + // authority
        1 + // bump
        1 + // is_paused
        8 + // min_bet_lamports
        2 + // max_exposure_bps
        2 + // house_edge_bps
        8 + // total_volume
        8 + // total_bets
        8 + // total_wins
        32; // padding
}