import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fromB64 } from '@mysten/sui/utils';

// Configuration
const NETWORK = process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet';
const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID || '0x0';
const HOUSE_OBJECT_ID = process.env.NEXT_PUBLIC_HOUSE_OBJECT_ID || '0x0';

// Create Sui client
export const suiClient = new SuiClient({
    url: getFullnodeUrl(NETWORK as 'testnet' | 'mainnet')
});

export interface WalletInterface {
    signAndExecuteTransactionBlock: (params: any, options?: any) => void;
    account: {
        address: string;
    } | null;
}

export class CatsinoSuiClient {
    private wallet: WalletInterface;
    private client: SuiClient;

    constructor(wallet: WalletInterface) {
        this.wallet = wallet;
        this.client = suiClient;
    }

    /**
     * Place a bet in the casino
     */
    async placeBet(amountSui: number): Promise<{
        success: boolean;
        message: string;
        digest?: string;
        txUrl?: string;
        isWinner?: boolean;
        payout?: number;
    }> {
        try {
            if (!this.wallet.account?.address) {
                throw new Error('Wallet not connected');
            }

            const amountMist = Math.floor(amountSui * 1_000_000_000); // Convert SUI to MIST

            // Create transaction
            const txb = new Transaction();
            
            // Split coin for bet
            const [coin] = txb.splitCoins(txb.gas, [amountMist]);
            
            // Call place_bet function
            txb.moveCall({
                target: `${PACKAGE_ID}::casino::place_bet`,
                arguments: [
                    txb.object(HOUSE_OBJECT_ID), // house
                    coin, // payment
                    txb.object('0x8'), // random object
                ],
            });

            // Execute transaction
            const result = await new Promise((resolve, reject) => {
                this.wallet.signAndExecuteTransactionBlock(
                    {
                        transaction: txb,
                        options: {
                            showEffects: true,
                            showEvents: true,
                        },
                    },
                    {
                        onSuccess: resolve,
                        onError: reject,
                    }
                );
            }) as any;

            if (result.effects?.status?.status !== 'success') {
                throw new Error(result.effects?.status?.error || 'Transaction failed');
            }

            // Parse events to get bet result
            let isWinner = false;
            let payout = 0;
            let message = 'Bet placed successfully!';

            if (result.events) {
                for (const event of result.events) {
                    if (event.type.includes('BetPlaced')) {
                        const eventData = event.parsedJson as any;
                        isWinner = eventData.is_winner;
                        payout = eventData.payout / 1_000_000_000; // Convert MIST to SUI
                        message = isWinner 
                            ? `🎉 Caesar Lives! You won ${payout.toFixed(3)} SUI!` 
                            : '⚱️ Caesar Falls! Better luck next time!';
                        break;
                    }
                }
            }

            const explorerUrl = NETWORK === 'mainnet' 
                ? `https://suiexplorer.com/txblock/${result.digest}`
                : `https://suiexplorer.com/txblock/${result.digest}?network=${NETWORK}`;

            return {
                success: true,
                message,
                digest: result.digest,
                txUrl: explorerUrl,
                isWinner,
                payout,
            };

        } catch (error: any) {
            console.error('Bet failed:', error);
            return {
                success: false,
                message: error.message || 'Transaction failed',
            };
        }
    }

    /**
     * Get house statistics
     */
    async getHouseStats(): Promise<{
        balance: number;
        totalBets: number;
        totalWins: number;
        totalVolume: number;
        winRate: number;
        minBet: number;
        payoutMultiplier: number;
    }> {
        try {
            const houseObject = await this.client.getObject({
                id: HOUSE_OBJECT_ID,
                options: {
                    showContent: true,
                }
            });

            const fields = (houseObject.data?.content as any)?.fields;
            
            if (!fields) {
                throw new Error('Could not fetch house data');
            }

            return {
                balance: parseInt(fields.balance) / 1_000_000_000, // Convert MIST to SUI
                totalBets: parseInt(fields.total_bets),
                totalWins: parseInt(fields.total_wins),
                totalVolume: parseInt(fields.total_volume) / 1_000_000_000,
                winRate: 49, // From contract
                minBet: 0.001, // From contract
                payoutMultiplier: 1.96, // From contract
            };

        } catch (error) {
            console.error('Failed to fetch house stats:', error);
            return {
                balance: 0,
                totalBets: 0,
                totalWins: 0,
                totalVolume: 0,
                winRate: 49,
                minBet: 0.001,
                payoutMultiplier: 1.96,
            };
        }
    }

    /**
     * Get player's SUI balance
     */
    async getPlayerBalance(): Promise<number> {
        try {
            if (!this.wallet.account?.address) {
                return 0;
            }

            const balance = await this.client.getBalance({
                owner: this.wallet.account.address,
            });

            return parseInt(balance.totalBalance) / 1_000_000_000; // Convert MIST to SUI

        } catch (error) {
            console.error('Failed to fetch player balance:', error);
            return 0;
        }
    }

    /**
     * Get all bet history (both own and others)
     */
    async getAllBetHistory(): Promise<Array<{
        digest: string;
        timestamp: number;
        player: string;
        amount: number;
        isWinner: boolean;
        payout: number;
        randomValue: number;
        blockHeight?: number;
    }>> {
        try {
            // Query all BetPlaced events from the package
            const events = await this.client.queryEvents({
                query: {
                    MoveEventType: `${PACKAGE_ID}::casino::BetPlaced`
                },
                limit: 100,
                order: 'descending'
            });

            return events.data.map(event => ({
                digest: event.id.txDigest,
                timestamp: parseInt(event.timestampMs || '0'),
                player: (event.parsedJson as any).player,
                amount: parseInt((event.parsedJson as any).amount) / 1_000_000_000,
                isWinner: (event.parsedJson as any).is_winner,
                payout: parseInt((event.parsedJson as any).payout) / 1_000_000_000,
                randomValue: parseInt((event.parsedJson as any).random_value),
                blockHeight: event.id.eventSeq ? parseInt(event.id.eventSeq) : undefined
            }));

        } catch (error) {
            console.error('Failed to fetch bet history:', error);
            return [];
        }
    }

    /**
     * Get player's bet history
     */
    async getPlayerBetHistory(): Promise<Array<{
        digest: string;
        timestamp: number;
        amount: number;
        isWinner: boolean;
        payout: number;
        randomValue: number;
        blockHeight?: number;
    }>> {
        try {
            if (!this.wallet.account?.address) {
                return [];
            }

            const allBets = await this.getAllBetHistory();
            return allBets.filter(bet => bet.player === this.wallet.account?.address)
                .map(bet => ({
                    digest: bet.digest,
                    timestamp: bet.timestamp,
                    amount: bet.amount,
                    isWinner: bet.isWinner,
                    payout: bet.payout,
                    randomValue: bet.randomValue,
                    blockHeight: bet.blockHeight
                }));

        } catch (error) {
            console.error('Failed to fetch player bet history:', error);
            return [];
        }
    }

    /**
     * Get advanced statistics
     */
    async getAdvancedStats(): Promise<{
        houseEdge: number;
        totalVolume24h: number;
        totalBets24h: number;
        avgBetSize: number;
        largestWin: number;
        actualWinRate: number;
        recentBets: Array<{
            player: string;
            amount: number;
            isWinner: boolean;
            payout: number;
            timestamp: number;
        }>;
    }> {
        try {
            const allBets = await this.getAllBetHistory();
            const now = Date.now();
            const oneDayAgo = now - (24 * 60 * 60 * 1000);
            
            const bets24h = allBets.filter(bet => bet.timestamp > oneDayAgo);
            const totalVolume24h = bets24h.reduce((sum, bet) => sum + bet.amount, 0);
            const wins = allBets.filter(bet => bet.isWinner);
            const actualWinRate = allBets.length > 0 ? (wins.length / allBets.length) * 100 : 0;
            const avgBetSize = allBets.length > 0 ? totalVolume24h / bets24h.length : 0;
            const largestWin = Math.max(...allBets.map(bet => bet.payout), 0);
            
            // House edge = (expected return - actual return) / expected return
            // With 49% win rate and 1.96x payout: expected return = 0.49 * 1.96 = 0.9604
            const expectedReturn = 0.49 * 1.96; // 96.04%
            const houseEdge = (1 - expectedReturn) * 100; // 3.96%

            return {
                houseEdge,
                totalVolume24h,
                totalBets24h: bets24h.length,
                avgBetSize,
                largestWin,
                actualWinRate,
                recentBets: allBets.slice(0, 20).map(bet => ({
                    player: bet.player,
                    amount: bet.amount,
                    isWinner: bet.isWinner,
                    payout: bet.payout,
                    timestamp: bet.timestamp
                }))
            };

        } catch (error) {
            console.error('Failed to fetch advanced stats:', error);
            return {
                houseEdge: 3.96,
                totalVolume24h: 0,
                totalBets24h: 0,
                avgBetSize: 0,
                largestWin: 0,
                actualWinRate: 49,
                recentBets: []
            };
        }
    }
}

// Network configuration
export const NETWORKS = {
    testnet: 'testnet',
    mainnet: 'mainnet',
} as const;

export const getCurrentNetwork = () => NETWORK;
export const getPackageId = () => PACKAGE_ID;
export const getHouseObjectId = () => HOUSE_OBJECT_ID;