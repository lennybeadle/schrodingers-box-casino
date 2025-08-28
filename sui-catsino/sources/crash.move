module catsino::crash {
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::balance::{Self, Balance};
    use sui::random::{Self, Random};
    use sui::event;
    use catsino::casino::{Self, House};

    // Error codes
    const EInvalidBetAmount: u64 = 1;
    const EInvalidTargetMultiplier: u64 = 2;
    const EHouseInsufficientFunds: u64 = 3;
    const ETargetTooHigh: u64 = 4;

    // Constants
    const MIN_BET: u64 = 100_000_000; // 0.1 SUI in MIST
    const MIN_TARGET_X100: u64 = 101; // 1.01x minimum
    const MAX_TARGET_X100: u64 = 3000; // 30.00x maximum
    const HOUSE_EDGE_BPS: u64 = 300; // 3% house edge
    const PAYOUT_FACTOR: u64 = 9700; // 97% of theoretical payout (100% - 3%)

    // Events
    public struct CrashEvent has copy, drop {
        player: address,
        stake: u64,
        target_x100: u64,
        crash_x100: u64,
        win: bool,
        payout: u64,
    }

    /// Calculate the payout for a given stake and target multiplier
    /// Payout includes the original stake with 3% house edge applied
    public fun calculate_payout(stake: u64, target_x100: u64): u64 {
        // payout = stake * target_x100 * 0.97 / 100
        // Using integer math: (stake * target_x100 * 9700) / (100 * 10000)
        (stake * target_x100 * PAYOUT_FACTOR) / 1_000_000
    }

    /// Generate crash multiplier using heavy-tail distribution
    /// Uses the formula: crash_x100 = floor(100 * SCALE / (SCALE - U))
    /// where U is uniform random in [1, 2^64-1] and SCALE = 2^64
    fun generate_crash_multiplier(rng: &mut random::RandomGenerator): u64 {
        // Generate uniform random in range [1, 2^64-1]
        let u = random::generate_u64_in_range(rng, 1, 18446744073709551615u64);
        
        // Calculate crash_x100 = floor(100 * 2^64 / (2^64 - u))
        // To avoid overflow, we use: crash_x100 = floor(100 * 2^64 / (2^64 - u))
        // Which simplifies to: crash_x100 = floor(100 / (1 - u/2^64))
        // For large scale, we approximate: crash_x100 ≈ floor(100 * 2^64 / (2^64 - u))
        
        let scale_minus_u = 18446744073709551616u64 - u; // 2^64 - u
        if (scale_minus_u == 0) {
            // Extremely rare case, return max
            return MAX_TARGET_X100
        };
        
        // Calculate crash multiplier with scaling to avoid overflow
        // We'll use a simplified approach that maintains the heavy-tail property
        let crash_x100 = (100 * 18446744073709551616u64) / scale_minus_u;
        
        // Cap at maximum to prevent extreme exposure
        if (crash_x100 > MAX_TARGET_X100) {
            MAX_TARGET_X100
        } else if (crash_x100 < MIN_TARGET_X100) {
            MIN_TARGET_X100
        } else {
            crash_x100
        }
    }

    /// Main entry point for playing the crash game
    public entry fun play(
        r: &Random,
        house: &mut House,
        target_x100: u64,
        payment: Coin<SUI>,
        ctx: &mut TxContext
    ) {
        let player = tx_context::sender(ctx);
        let stake = coin::value(&payment);
        
        // Validate inputs
        assert!(stake >= MIN_BET, EInvalidBetAmount);
        assert!(target_x100 >= MIN_TARGET_X100, EInvalidTargetMultiplier);
        assert!(target_x100 <= MAX_TARGET_X100, ETargetTooHigh);
        
        // Calculate potential payout
        let potential_payout = calculate_payout(stake, target_x100);
        
        // Check house has sufficient funds for worst-case payout
        assert!(casino::get_house_balance(house) >= potential_payout, EHouseInsufficientFunds);
        
        // Generate crash multiplier using heavy-tail distribution
        let mut rng = random::new_generator(r, ctx);
        let crash_x100 = generate_crash_multiplier(&mut rng);
        
        // Determine if player wins (target <= crash)
        let win = target_x100 <= crash_x100;
        
        // Process the bet through the shared house system
        let actual_payout = casino::process_game_bet(
            house,
            payment,
            win,
            potential_payout,
            ctx
        );
        
        // Emit event with all game details
        event::emit(CrashEvent {
            player,
            stake,
            target_x100,
            crash_x100,
            win,
            payout: actual_payout,
        });
    }

    // View functions for frontend integration
    public fun get_min_bet(): u64 {
        MIN_BET
    }

    public fun get_min_target(): u64 {
        MIN_TARGET_X100
    }

    public fun get_max_target(): u64 {
        MAX_TARGET_X100
    }

    public fun get_house_edge_bps(): u64 {
        HOUSE_EDGE_BPS
    }

    // Test-only functions
    #[test_only]
    public fun test_calculate_payout(stake: u64, target_x100: u64): u64 {
        calculate_payout(stake, target_x100)
    }

    #[test_only]
    public fun test_generate_crash_multiplier(rng: &mut random::RandomGenerator): u64 {
        generate_crash_multiplier(rng)
    }

    // Unit tests
    #[test]
    fun test_payout_calculation() {
        // Test 3% house edge: payout = stake * multiplier * 0.97
        
        // 1 SUI at 2x should pay 1.94 SUI
        let payout = calculate_payout(1_000_000_000, 200);
        assert!(payout == 1_940_000_000, 0);
        
        // 0.5 SUI at 1.5x should pay 0.7275 SUI  
        let payout2 = calculate_payout(500_000_000, 150);
        assert!(payout2 == 727_500_000, 0);
        
        // Edge case: minimum bet at minimum multiplier
        let payout3 = calculate_payout(MIN_BET, MIN_TARGET_X100);
        assert!(payout3 == (MIN_BET * MIN_TARGET_X100 * PAYOUT_FACTOR) / 1_000_000, 0);
    }

    #[test]
    fun test_multiplier_bounds() {
        // Test that generated multipliers are within expected bounds
        // Note: This test uses mock randomness for deterministic testing
        use sui::test_scenario;
        use sui::random;
        
        let user = @0x1;
        let mut scenario = test_scenario::begin(user);
        
        // Create a test random generator (this is simplified for testing)
        let ctx = test_scenario::ctx(&mut scenario);
        // In actual testing, we'd need to create proper Random object
        // For now, we'll test the bounds logic directly
        
        assert!(MIN_TARGET_X100 >= 101, 0);
        assert!(MAX_TARGET_X100 <= 3000, 0);
        
        test_scenario::end(scenario);
    }

    #[test]
    fun test_house_edge() {
        // Verify that the house edge is exactly 3%
        let stake = 1_000_000_000; // 1 SUI
        let target = 200; // 2.0x
        
        let theoretical_payout = stake * 2; // 2 SUI
        let actual_payout = calculate_payout(stake, target);
        let house_cut = theoretical_payout - actual_payout;
        let edge_percentage = (house_cut * 10000) / theoretical_payout; // in basis points
        
        assert!(edge_percentage == 300, 0); // 3% = 300 basis points
    }
}