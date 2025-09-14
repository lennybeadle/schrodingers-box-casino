module catsino::pump {
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::balance;
    use sui::event;
    use sui::random::{Self, Random};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use catsino::casino::{Self, House};

    // ======== Events ========

    /// Event emitted when a pump or dump game is played
    public struct PumpEvent has copy, drop {
        /// Address of the player
        player: address,
        /// Amount staked in MIST
        stake: u64,
        /// Selected threshold (1-98)
        threshold: u8,
        /// Random result (0-99) 
        result: u8,
        /// Whether the player won
        win: bool,
        /// Payout amount in MIST (zero on loss)
        payout: u64,
    }

    // ======== Error codes ========

    /// Threshold must be between 1 and 98
    const EInvalidThreshold: u64 = 0;
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
    /// Maximum exposure as percentage of house balance (20%)
    const MAX_EXPOSURE_PERCENTAGE: u64 = 20;

    // ======== Public Functions ========

    /// Play pump or dump game
    /// - threshold: Selected threshold (1-98). Win if random result < threshold
    /// - stake: Coin to stake
    /// - random: Random number generator
    /// - house: House object for managing funds
    /// - ctx: Transaction context
    public fun play_pump_or_dump(
        threshold: u8,
        stake: Coin<SUI>,
        random: &Random,
        house: &mut House,
        ctx: &mut TxContext
    ) {
        // Validate threshold range (1-98)
        assert!(threshold >= 1 && threshold <= 98, EInvalidThreshold);
        
        let stake_amount = coin::value(&stake);
        let player = tx_context::sender(ctx);
        
        // Validate stake amount
        assert!(stake_amount >= MIN_BET, EInsufficientStake);
        assert!(stake_amount <= MAX_BET, EMaxBetExceeded);
        
        // Calculate potential payout: floor(stake × 97 ÷ threshold)
        let potential_payout = (stake_amount * 97) / (threshold as u64);
        
        // Check house balance can cover potential payout
        let house_balance = casino::get_house_balance(house);
        assert!(house_balance >= potential_payout, EInsufficientHouseBalance);
        
        // Check maximum exposure (potential payout shouldn't exceed 20% of house balance)
        assert!(potential_payout * 100 <= house_balance * MAX_EXPOSURE_PERCENTAGE, EInsufficientHouseBalance);
        
        // Generate random number in range [0, 99] using rejection sampling
        let mut generator = random::new_generator(random, ctx);
        let random_result = generate_uniform_u8(&mut generator, 100);
        
        // Determine win/loss: win if random_result < threshold
        let is_winner = random_result < threshold;
        
        // Process the bet through the shared house system
        let actual_payout = casino::process_game_bet(
            house,
            stake,
            is_winner,
            potential_payout,
            ctx
        );
        
        // Emit event
        event::emit(PumpEvent {
            player,
            stake: stake_amount,
            threshold,
            result: random_result,
            win: is_winner,
            payout: actual_payout,
        });
    }
    
    // ======== Helper Functions ========
    
    /// Generate uniform random u8 in range [0, max) using rejection sampling
    /// This avoids modulo bias by rejecting values that would cause uneven distribution
    fun generate_uniform_u8(generator: &mut random::RandomGenerator, max: u8): u8 {
        assert!(max > 0, 0);
        
        // For max = 100, we need to avoid bias
        // 256 % 100 = 56, so we reject values >= 200 to ensure uniform distribution
        let reject_threshold = 256 - (256 % (max as u16));
        
        loop {
            let random_byte = random::generate_u8(generator);
            if ((random_byte as u16) < reject_threshold) {
                return random_byte % max
            };
            // Reject and try again if random_byte >= reject_threshold
        }
    }
    
    // ======== View Functions ========
    
    /// Calculate potential payout for given stake and threshold
    public fun calculate_payout(stake: u64, threshold: u8): u64 {
        if (threshold == 0) return 0;
        (stake * 97) / (threshold as u64)
    }
    
    /// Calculate win probability as percentage (0-100) for given threshold
    public fun calculate_win_probability(threshold: u8): u8 {
        threshold
    }
    
    /// Get the multiplier (in basis points, 10000 = 1.0x) for given threshold
    public fun calculate_multiplier_bp(threshold: u8): u64 {
        if (threshold == 0) return 0;
        (97 * 10000) / (threshold as u64)
    }

    #[test_only]
    use sui::test_scenario;
    #[test_only]
    use sui::coin;
    
    #[test]
    fun test_calculate_payout() {
        // Test various thresholds
        assert!(calculate_payout(100_000_000, 50) == 194_000_000, 0); // ~1.94x at 50% win chance
        assert!(calculate_payout(100_000_000, 97) == 100_000_000, 0); // ~1.0x at 97% win chance  
        assert!(calculate_payout(100_000_000, 1) == 9_700_000_000, 0); // 97x at 1% win chance
    }
    
    #[test] 
    fun test_calculate_multiplier_bp() {
        // Test multiplier calculation
        assert!(calculate_multiplier_bp(50) == 19400, 0); // 1.94x in basis points
        assert!(calculate_multiplier_bp(97) == 10000, 0); // ~1.0x in basis points
        assert!(calculate_multiplier_bp(1) == 970000, 0); // 97x in basis points
    }
}