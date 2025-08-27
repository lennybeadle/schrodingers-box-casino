module catsino::casino {
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::balance::{Self, Balance};
    use sui::random::{Self, Random};
    use sui::event;

    // Error codes
    const EInsufficientFunds: u64 = 1;
    const EInvalidBetAmount: u64 = 2;
    const EHouseInsufficientFunds: u64 = 3;

    // Constants
    const MIN_BET: u64 = 1_000_000; // 0.001 SUI
    const HOUSE_EDGE_BPS: u64 = 400; // 4% house edge
    const WIN_RATE: u64 = 49; // 49% win rate
    const PAYOUT_MULTIPLIER: u64 = 196; // 1.96x payout

    // House object that holds the casino funds
    public struct House has key, store {
        id: UID,
        balance: Balance<SUI>,
        total_bets: u64,
        total_wins: u64,
        total_volume: u64,
    }

    // Events
    public struct BetPlaced has copy, drop {
        player: address,
        amount: u64,
        is_winner: bool,
        payout: u64,
        random_value: u64,
    }

    public struct HouseCreated has copy, drop {
        house_id: object::ID,
        initial_balance: u64,
    }

    // Initialize the house (only called once)
    fun init(ctx: &mut TxContext) {
        let house = House {
            id: object::new(ctx),
            balance: balance::zero(),
            total_bets: 0,
            total_wins: 0,
            total_volume: 0,
        };

        let house_id = object::id(&house);
        
        event::emit(HouseCreated {
            house_id,
            initial_balance: 0,
        });

        transfer::share_object(house);
    }

    // Fund the house (called by house owner)
    public entry fun fund_house(
        house: &mut House,
        payment: Coin<SUI>,
        _ctx: &mut TxContext
    ) {
        let amount = coin::value(&payment);
        balance::join(&mut house.balance, coin::into_balance(payment));
    }

    // Main betting function
    public entry fun place_bet(
        house: &mut House,
        payment: Coin<SUI>,
        r: &Random,
        ctx: &mut TxContext
    ) {
        let player = tx_context::sender(ctx);
        let bet_amount = coin::value(&payment);
        
        // Validate bet amount
        assert!(bet_amount >= MIN_BET, EInvalidBetAmount);
        
        // Calculate potential payout
        let potential_payout = (bet_amount * PAYOUT_MULTIPLIER) / 100;
        
        // Check house has enough funds for payout
        assert!(balance::value(&house.balance) >= potential_payout, EHouseInsufficientFunds);
        
        // Generate random number for game outcome
        let mut rng = random::new_generator(r, ctx);
        let random_value = random::generate_u64_in_range(&mut rng, 1, 100);
        
        // Determine if player wins (49% chance)
        let is_winner = random_value <= WIN_RATE;
        
        // Add player's bet to house balance
        balance::join(&mut house.balance, coin::into_balance(payment));
        
        let payout = if (is_winner) {
            // Player wins - pay out from house
            let payout_balance = balance::split(&mut house.balance, potential_payout);
            let payout_coin = coin::from_balance(payout_balance, ctx);
            transfer::public_transfer(payout_coin, player);
            house.total_wins = house.total_wins + 1;
            potential_payout
        } else {
            // Player loses - house keeps the bet
            0
        };
        
        // Update statistics
        house.total_bets = house.total_bets + 1;
        house.total_volume = house.total_volume + bet_amount;
        
        // Emit event
        event::emit(BetPlaced {
            player,
            amount: bet_amount,
            is_winner,
            payout,
            random_value,
        });
    }

    // View functions
    public fun get_house_balance(house: &House): u64 {
        balance::value(&house.balance)
    }

    public fun get_total_bets(house: &House): u64 {
        house.total_bets
    }

    public fun get_total_wins(house: &House): u64 {
        house.total_wins
    }

    public fun get_total_volume(house: &House): u64 {
        house.total_volume
    }

    public fun get_win_rate(): u64 {
        WIN_RATE
    }

    public fun get_min_bet(): u64 {
        MIN_BET
    }

    public fun get_payout_multiplier(): u64 {
        PAYOUT_MULTIPLIER
    }
}