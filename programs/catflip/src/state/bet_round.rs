use anchor_lang::prelude::*;

#[account]
pub struct BetRound {
    pub player: Pubkey,
    pub stake_lamports: u64,
    pub potential_payout: u64,
    pub timestamp: i64,
    pub slot: u64,
    pub vrf_request_randomness: [u8; 32],
    pub is_settled: bool,
    pub is_winner: bool,
    pub bump: u8,
}

impl BetRound {
    pub const SIZE: usize = 8 + // discriminator
        32 + // player
        8 + // stake_lamports
        8 + // potential_payout
        8 + // timestamp
        8 + // slot
        32 + // vrf_request_randomness
        1 + // is_settled
        1 + // is_winner
        1 + // bump
        16; // padding
    
    pub const TIMEOUT_SLOTS: u64 = 150; // ~1 minute timeout
}