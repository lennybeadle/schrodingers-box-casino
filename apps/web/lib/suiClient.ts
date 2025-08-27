import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { fromB64 } from '@mysten/sui.js/utils';

// Configuration
const NETWORK = process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet';
const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID || '0x0';
const HOUSE_OBJECT_ID = process.env.NEXT_PUBLIC_HOUSE_OBJECT_ID || '0x0';

// Create Sui client
export const suiClient = new SuiClient({
    url: getFullnodeUrl(NETWORK as 'testnet' | 'mainnet')
});

export interface WalletInterface {
    signAndExecuteTransactionBlock: (params: any) => Promise<any>;
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

            // Create transaction block
            const txb = new TransactionBlock();
            
            // Split coin for bet
            const [coin] = txb.splitCoins(txb.gas, [txb.pure(amountMist)]);
            
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
            const result = await this.wallet.signAndExecuteTransactionBlock({
                transactionBlock: txb,
                options: {
                    showEffects: true,
                    showEvents: true,
                },
            });

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
}

// Network configuration
export const NETWORKS = {
    testnet: 'testnet',
    mainnet: 'mainnet',
} as const;

export const getCurrentNetwork = () => NETWORK;
export const getPackageId = () => PACKAGE_ID;
export const getHouseObjectId = () => HOUSE_OBJECT_ID;