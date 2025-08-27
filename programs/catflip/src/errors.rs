use anchor_lang::prelude::*;

#[error_code]
pub enum CatflipError {
    #[msg("Bet amount is below minimum")]
    BetBelowMinimum,
    
    #[msg("Bet amount exceeds maximum exposure")]
    BetExceedsMaxExposure,
    
    #[msg("Insufficient vault balance for potential payout")]
    InsufficientVaultBalance,
    
    #[msg("Game is currently paused")]
    GamePaused,
    
    #[msg("Bet already settled")]
    BetAlreadySettled,
    
    #[msg("Bet not yet timed out")]
    BetNotTimedOut,
    
    #[msg("Invalid VRF account")]
    InvalidVrfAccount,
    
    #[msg("Unauthorized")]
    Unauthorized,
    
    #[msg("Math overflow")]
    MathOverflow,
}