module catsino::blend {
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::event;
    use sui::random::{Self, Random};
    use catsino::casino::{Self, House};

    // ======== Events ========

    /// Event emitted when a blend ladder game is played
    public struct BlendEvent has copy, drop {
        /// Address of the player
        player: address,
        /// Amount staked in MIST
        stake: u64,
        /// Chosen depth (1-6)
        depth: u8,
        /// Steps survived (0 means blended on first step)
        steps_survived: u8,
        /// Whether the player won (all steps survived)
        win: bool,
        /// Payout amount in MIST (zero on loss)
        payout: u64,
    }

    // ======== Error codes ========

    /// Depth must be between 1 and 6
    const EInvalidDepth: u64 = 0;
    /// Insufficient stake amount
    const EInsufficientStake: u64 = 1;
    /// House balance insufficient for potential payout
    const EInsufficientHouseBalance: u64 = 2;
    /// Maximum bet exceeded
    const EMaxBetExceeded: u64 = 3;

    // ======== Constants ========

    /// Minimum bet: 0.01 SUI (10,000,000 MIST)
    const MIN_BET: u64 = 10_000_000;
    /// Maximum bet: 10 SUI (10,000,000,000 MIST)
    const MAX_BET: u64 = 10_000_000_000;
    /// Maximum depth allowed
    const MAX_DEPTH: u8 = 6;
    /// Maximum exposure as percentage of house balance (20%)
    const MAX_EXPOSURE_PERCENTAGE: u64 = 20;

    // ======== Public Functions ========

    /// Play Will It Blend ladder game
    /// - depth: Target depth (1-6). Player wins if all steps survive
    /// - stake: Coin to stake
    /// - random: Random number generator
    /// - house: House object for managing funds
    /// - ctx: Transaction context
    public fun play_blend(
        depth: u8,
        stake: Coin<SUI>,
        random: &Random,
        house: &mut House,
        ctx: &mut sui::tx_context::TxContext
    ) {
        // Validate depth range (1-6)
        assert!(depth >= 1 && depth <= MAX_DEPTH, EInvalidDepth);
        
        let stake_amount = coin::value(&stake);
        let player = sui::tx_context::sender(ctx);
        
        // Validate stake amount
        assert!(stake_amount >= MIN_BET, EInsufficientStake);
        assert!(stake_amount <= MAX_BET, EMaxBetExceeded);
        
        // Calculate potential payout using rational multiplier: floor(stake × (97 × 3^D) / (100 × 2^D))
        let potential_payout = calculate_payout(stake_amount, depth);
        
        // Check house balance can cover potential payout
        let house_balance = casino::get_house_balance(house);
        assert!(house_balance >= potential_payout, EInsufficientHouseBalance);
        
        // Check maximum exposure (potential payout shouldn't exceed 20% of house balance)
        assert!(potential_payout * 100 <= house_balance * MAX_EXPOSURE_PERCENTAGE, EInsufficientHouseBalance);
        
        // Generate random seed for the ladder sequence
        let mut generator = random::new_generator(random, ctx);
        let seed = random::generate_u256(&mut generator);
        
        // Simulate the ladder with rejection sampling for unbiased trits
        let steps_survived = simulate_ladder(seed, depth);
        
        // Determine win/loss: win only if all steps survived
        let is_winner = steps_survived == depth;
        
        // Process the bet through the shared house system
        let actual_payout = casino::process_game_bet(
            house,
            stake,
            is_winner,
            potential_payout,
            ctx
        );
        
        // Emit event
        event::emit(BlendEvent {
            player,
            stake: stake_amount,
            depth,
            steps_survived,
            win: is_winner,
            payout: actual_payout,
        });
    }
    
    // ======== Helper Functions ========
    
    /// Simulate ladder with deterministic unbiased trit generation
    /// Returns the number of steps survived (0 to depth)
    fun simulate_ladder(seed: u256, depth: u8): u8 {
        let mut current_seed = seed;
        let mut step = 0u8;
        
        while (step < depth) {
            // Generate unbiased trit {0,1,2} using rejection sampling
            let trit = generate_trit(&mut current_seed);
            
            // {0,1} = survive, {2} = blend (lose)
            if (trit == 2) {
                // Blended at this step
                return step
            };
            
            step = step + 1;
        };
        
        // All steps survived
        depth
    }
    
    /// Generate unbiased trit {0,1,2} using rejection sampling from seed
    /// Updates the seed for next iteration
    fun generate_trit(seed: &mut u256): u8 {
        loop {
            // Use seed to generate next value
            *seed = (*seed * 1103515245u256 + 12345u256) % (1u256 << 32);
            let random_byte = ((*seed % 256u256) as u8);
            
            // Rejection sampling: 256 % 3 = 1, so reject values >= 255 (only 255)
            if (random_byte < 255) {
                return random_byte % 3
            };
            // Reject 255 and try again
        }
    }
    
    // ======== View Functions ========
    
    /// Calculate potential payout using rational multiplier
    /// Multiplier = (97 × 3^D) / (100 × 2^D)
    /// Payout = floor(stake × multiplier)
    public fun calculate_payout(stake: u64, depth: u8): u64 {
        if (depth == 0) return 0;
        
        let numerator = 97u64 * power_of_3(depth);
        let denominator = 100u64 * power_of_2(depth);
        
        (stake * numerator) / denominator
    }
    
    /// Calculate win probability as percentage (0-100) for given depth
    /// P = (2/3)^D
    public fun calculate_win_probability_percent(depth: u8): u64 {
        if (depth == 0) return 100;
        
        // Calculate (2/3)^D as percentage
        let numerator = power_of_2(depth) * 100;
        let denominator = power_of_3(depth);
        
        numerator / denominator
    }
    
    /// Calculate multiplier in basis points (10000 = 1.0x)
    /// M = (97 × 3^D) / (100 × 2^D)
    public fun calculate_multiplier_bp(depth: u8): u64 {
        if (depth == 0) return 0;
        
        let numerator = 97u64 * power_of_3(depth) * 10000;
        let denominator = 100u64 * power_of_2(depth);
        
        numerator / denominator
    }
    
    /// Helper: Calculate 2^n
    fun power_of_2(n: u8): u64 {
        let mut result = 1u64;
        let mut i = 0u8;
        while (i < n) {
            result = result * 2;
            i = i + 1;
        };
        result
    }
    
    /// Helper: Calculate 3^n
    fun power_of_3(n: u8): u64 {
        let mut result = 1u64;
        let mut i = 0u8;
        while (i < n) {
            result = result * 3;
            i = i + 1;
        };
        result
    }

    #[test_only]
    use sui::test_scenario;
    
    #[test]
    fun test_calculate_payout() {
        // Test depth 1: P = 2/3, M = 0.97 * 3/2 = 1.455
        assert!(calculate_payout(100_000_000, 1) == 145_500_000, 0);
        
        // Test depth 2: P = 4/9, M = 0.97 * 9/4 = 2.1825
        assert!(calculate_payout(100_000_000, 2) == 218_250_000, 0);
        
        // Test depth 3: P = 8/27, M = 0.97 * 27/8 = 3.27375
        assert!(calculate_payout(100_000_000, 3) == 327_375_000, 0);
    }
    
    #[test]
    fun test_power_functions() {
        assert!(power_of_2(0) == 1, 0);
        assert!(power_of_2(3) == 8, 0);
        assert!(power_of_3(0) == 1, 0);
        assert!(power_of_3(3) == 27, 0);
    }
    
    #[test]
    fun test_win_probability() {
        // Depth 1: (2/3) = 66.66%
        assert!(calculate_win_probability_percent(1) == 66, 0);
        
        // Depth 2: (4/9) = 44.44%
        assert!(calculate_win_probability_percent(2) == 44, 0);
        
        // Depth 3: (8/27) = 29.62%
        assert!(calculate_win_probability_percent(3) == 29, 0);
    }
}