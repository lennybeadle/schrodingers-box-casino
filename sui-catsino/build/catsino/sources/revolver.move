module catsino::revolver {
    use sui::tx_context::{Self, TxContext};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::balance;
    use sui::random::{Self, Random};
    use sui::event;
    use sui::transfer;
    use catsino::casino::{Self, House};

    // Error codes
    const EInvalidBetAmount: u64 = 2;
    const EHouseInsufficientFunds: u64 = 3;

    // Game constants
    const MIN_BET: u64 = 1_000_000; // 0.001 SUI
    const WIN_ANGLE_DEGREES: u16 = 45; // Win if angle < 45 degrees
    
    // Payout calculation: 7.76x = 194/25 (includes stake return)
    const PAYOUT_NUMERATOR: u64 = 194;
    const PAYOUT_DENOMINATOR: u64 = 25;

    // Events
    public struct SpinEvent has copy, drop {
        player: address,
        stake: u64,
        angle_deg: u16,
        win: bool,
        payout: u64,
    }

    /// Unbiased mapping helper: Map a 64-bit random 'r' into [0, 359] using rejection sampling
    /// to remove modulo bias per Sui randomness best practices.
    fun map_to_360(rng: &mut sui::random::RandomGenerator): u16 {
        loop {
            let r = sui::random::generate_u64_in_range(rng, 0, 360);
            return (r as u16)
        }
    }

    /// Compute payout (includes stake) for a winner.
    /// Returns floor(stake * 194 / 25) = ~7.76x multiplier
    fun payout_for(stake: u64): u64 {
        (stake * PAYOUT_NUMERATOR) / PAYOUT_DENOMINATOR
    }

    /// Main game entry point - spin the revolver and determine outcome
    public entry fun play(
        house: &mut House,
        payment: Coin<SUI>,
        r: &Random,
        ctx: &mut TxContext
    ) {
        let player = tx_context::sender(ctx);
        let stake = coin::value(&payment);
        
        // Validate bet amount
        assert!(stake >= MIN_BET, EInvalidBetAmount);
        
        // Calculate potential payout and check house solvency
        let potential_payout = payout_for(stake);
        
        // Check house has enough funds for payout
        assert!(casino::get_house_balance(house) >= potential_payout, EHouseInsufficientFunds);
        
        // Build random generator
        let mut rng = random::new_generator(r, ctx);
        
        // Generate angle using unbiased mapping (0-359 degrees)
        let angle_deg = map_to_360(&mut rng);
        
        // Determine win condition: angle < 45 degrees = ALIVE CAT (win)
        let is_winner = (angle_deg < WIN_ANGLE_DEGREES);
        
        // Process the bet using the shared house system
        let payout = casino::process_game_bet(
            house,
            payment,
            is_winner,
            potential_payout,
            ctx
        );

        // Emit spin event
        event::emit(SpinEvent {
            player,
            stake,
            angle_deg,
            win: is_winner,
            payout,
        });
    }

    // View functions
    public fun get_min_bet(): u64 {
        MIN_BET
    }

    public fun get_win_angle(): u16 {
        WIN_ANGLE_DEGREES
    }

    public fun get_payout_multiplier(): (u64, u64) {
        (PAYOUT_NUMERATOR, PAYOUT_DENOMINATOR)
    }

    public fun calculate_payout(stake: u64): u64 {
        payout_for(stake)
    }

    // Test-only functions
    #[test_only]
    public fun test_map_to_360(r: &Random, ctx: &mut TxContext): u16 {
        let mut rng = random::new_generator(r, ctx);
        map_to_360(&mut rng)
    }

    #[test_only]
    public fun test_payout_calculation(stake: u64): u64 {
        payout_for(stake)
    }
}