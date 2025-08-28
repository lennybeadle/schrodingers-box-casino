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
    const EUnauthorized: u64 = 4;
    const EInvalidWithdrawAmount: u64 = 5;

    // Constants - Improved house edge for sustainability
    const MIN_BET: u64 = 1_000_000; // 0.001 SUI
    const HOUSE_EDGE_BPS: u64 = 600; // 6% house edge (increased from 4%)
    const WIN_RATE: u64 = 47; // 47% win rate (reduced from 49%)
    const PAYOUT_MULTIPLIER: u64 = 200; // 2.0x payout (increased from 1.96x)

    // House object that holds the casino funds
    public struct House has key, store {
        id: UID,
        balance: Balance<SUI>,
        owner: address, // Track the original deployer/owner
        total_bets: u64,
        total_wins: u64,
        total_volume: u64,
        total_profits_withdrawn: u64, // Track total profits withdrawn
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
        owner: address,
        initial_balance: u64,
    }

    public struct ProfitWithdrawn has copy, drop {
        house_id: object::ID,
        owner: address,
        amount: u64,
        remaining_balance: u64,
    }

    public struct HouseFunded has copy, drop {
        house_id: object::ID,
        amount: u64,
        new_balance: u64,
    }

    // Initialize the house (only called once)
    fun init(ctx: &mut TxContext) {
        let owner = tx_context::sender(ctx);
        let house = House {
            id: object::new(ctx),
            balance: balance::zero(),
            owner,
            total_bets: 0,
            total_wins: 0,
            total_volume: 0,
            total_profits_withdrawn: 0,
        };

        let house_id = object::id(&house);
        
        event::emit(HouseCreated {
            house_id,
            owner,
            initial_balance: 0,
        });

        transfer::share_object(house);
    }

    // Fund the house (anyone can fund)
    public entry fun fund_house(
        house: &mut House,
        payment: Coin<SUI>,
        _ctx: &mut TxContext
    ) {
        let amount = coin::value(&payment);
        balance::join(&mut house.balance, coin::into_balance(payment));
        
        event::emit(HouseFunded {
            house_id: object::id(house),
            amount,
            new_balance: balance::value(&house.balance),
        });
    }

    // Withdraw profits (only house owner can call)
    public entry fun withdraw_profits(
        house: &mut House,
        amount: u64,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        
        // Only the original house owner can withdraw
        assert!(sender == house.owner, EUnauthorized);
        
        // Ensure there are sufficient funds
        let current_balance = balance::value(&house.balance);
        assert!(current_balance >= amount, EInsufficientFunds);
        assert!(amount > 0, EInvalidWithdrawAmount);
        
        // Extract the profits
        let profit_balance = balance::split(&mut house.balance, amount);
        let profit_coin = coin::from_balance(profit_balance, ctx);
        
        // Update total profits withdrawn
        house.total_profits_withdrawn = house.total_profits_withdrawn + amount;
        
        // Transfer to owner
        transfer::public_transfer(profit_coin, sender);
        
        // Emit event
        event::emit(ProfitWithdrawn {
            house_id: object::id(house),
            owner: sender,
            amount,
            remaining_balance: balance::value(&house.balance),
        });
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

    public fun get_house_owner(house: &House): address {
        house.owner
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

    public fun get_total_profits_withdrawn(house: &House): u64 {
        house.total_profits_withdrawn
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

    public fun get_house_edge_bps(): u64 {
        HOUSE_EDGE_BPS
    }

    // Check if an address is the house owner
    public fun is_house_owner(house: &House, addr: address): bool {
        house.owner == addr
    }

    // Generic function for other game modules to process bets
    public fun process_game_bet(
        house: &mut House,
        payment: Coin<SUI>,
        is_winner: bool,
        payout_amount: u64,
        ctx: &mut TxContext
    ): u64 {
        let player = tx_context::sender(ctx);
        let stake = coin::value(&payment);
        
        // Add player's bet to house balance
        balance::join(&mut house.balance, coin::into_balance(payment));
        
        let actual_payout = if (is_winner) {
            // Player wins - pay out from house
            let payout_balance = balance::split(&mut house.balance, payout_amount);
            let payout_coin = coin::from_balance(payout_balance, ctx);
            transfer::public_transfer(payout_coin, player);
            house.total_wins = house.total_wins + 1;
            payout_amount
        } else {
            // Player loses - house keeps the bet
            0
        };
        
        // Update statistics
        house.total_bets = house.total_bets + 1;
        house.total_volume = house.total_volume + stake;
        
        actual_payout
    }
}