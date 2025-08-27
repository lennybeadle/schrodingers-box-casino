# 🐱 Schrödinger's Box - Solana Casino

A complete, production-ready starter repository for a single-game Solana casino featuring a 50/50 "Schrödinger's Box" coin flip game with a cute cat theme.

## 🎯 Features

- **50/50 Coin Flip Game**: Fair odds with Switchboard VRF randomness
- **No User Accounts**: Just connect wallet and play
- **Automatic Payouts**: On-chain settlement in SOL
- **Low House Edge**: Only 2% house edge
- **Modern UI**: Next.js 14 with Tailwind CSS and cute cat animations
- **Production Ready**: Complete testing, deployment scripts, and monitoring

## 📁 Repository Structure

```
catsinofun/
├── apps/web/                 # Next.js frontend
│   ├── app/                  # App Router pages
│   ├── components/           # React components
│   └── lib/                  # Solana client libraries
├── programs/catflip/         # Anchor program
│   ├── src/
│   │   ├── instructions/     # Program instructions
│   │   └── state/           # Account structures
├── tests/                    # Anchor tests
├── scripts/                  # Utility scripts
└── configs/                  # Configuration templates
```

## 🚀 Quick Start

### Prerequisites

- [Node.js 18+](https://nodejs.org/)
- [Rust](https://rustup.rs/)
- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools)
- [Anchor CLI](https://www.anchor-lang.com/docs/installation)
- [pnpm](https://pnpm.io/)

### 1. Clone and Install

```bash
git clone <repo-url>
cd catsinofun
pnpm install
```

### 2. Setup Solana Wallet

```bash
# Generate a new keypair (or use existing)
solana-keygen new --outfile ~/.config/solana/id.json

# Set to devnet
solana config set --url devnet

# Airdrop SOL for development
solana airdrop 2
```

### 3. Configure Environment

```bash
# Copy environment templates
cp .env.example .env
cp apps/web/.env.example apps/web/.env.local

# Edit .env files with your configuration
```

### 4. Build and Deploy

```bash
# Build the Anchor program
anchor build

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Update your .env files with the deployed PROGRAM_ID
```

### 5. Initialize and Fund Vault

```bash
# Initialize the game vault
anchor run initialize

# Fund vault with 10 SOL
ts-node scripts/fund_vault.ts 10
```

### 6. Start Frontend

```bash
# Start the web application
pnpm dev
```

Visit `http://localhost:3000` and start playing! 🎮

## 🔧 Configuration

### Environment Variables

#### Root `.env`
```bash
SOLANA_CLUSTER=devnet
RPC_HTTP_URL=https://solana-devnet.nownodes.io/YOUR-API-KEY
RPC_WSS_URL=wss://solana-devnet.nownodes.io/YOUR-API-KEY
HOUSE_AUTHORITY_SECRET=your_base58_secret_key
SWITCHBOARD_VRF_QUEUE=F8ce7MscPZmvGzjJamoKggfq86NxZ6zDKfz6NrJJzBG7
SWITCHBOARD_VRF_ACCOUNT=your_vrf_account_address
PROGRAM_ID=your_deployed_program_id
MIN_BET_LAMPORTS=1000000      # 0.001 SOL
MAX_EXPOSURE_BPS=1000         # 10% of vault
HOUSE_EDGE_BPS=200            # 2% house edge
```

#### Frontend `.env.local`
```bash
NEXT_PUBLIC_SOLANA_CLUSTER=devnet
NEXT_PUBLIC_RPC_HTTP_URL=https://solana-devnet.nownodes.io/YOUR-API-KEY
NEXT_PUBLIC_RPC_WSS_URL=wss://solana-devnet.nownodes.io/YOUR-API-KEY
NEXT_PUBLIC_PROGRAM_ID=your_deployed_program_id
NEXT_PUBLIC_MIN_BET_LAMPORTS=1000000
NEXT_PUBLIC_MAX_EXPOSURE_BPS=1000
NEXT_PUBLIC_HOUSE_EDGE_BPS=200
```

## 🎲 Switchboard VRF Setup

### Create VRF Account

```bash
# Install Switchboard CLI
npm install -g @switchboard-xyz/cli

# Create VRF account
sbv2 solana vrf create --keypair ~/.config/solana/id.json --cluster devnet
```

### Grant Permissions

```bash
# Grant permissions to the VRF account
sbv2 solana permission create \
  --granter <QUEUE_AUTHORITY> \
  --grantee <YOUR_VRF_ACCOUNT> \
  --keypair ~/.config/solana/id.json \
  --cluster devnet
```

### Update Configuration

Add your VRF account address to both `.env` files:
```bash
SWITCHBOARD_VRF_ACCOUNT=your_new_vrf_account_address
```

## 🧪 Testing

```bash
# Run all tests
anchor test

# Run specific test file
anchor test --file tests/catflip.ts

# Test with custom configuration
anchor test --provider.cluster devnet
```

## 📊 Utility Scripts

### Fund Vault
```bash
# Fund with specific amount
ts-node scripts/fund_vault.ts 5.0  # Fund with 5 SOL
```

### Place Test Bet
```bash
# Place a test bet
ts-node scripts/place_bet.ts 0.1  # Bet 0.1 SOL
```

### View Statistics
```bash
# View casino statistics
ts-node scripts/read_stats.ts
```

## 📱 Frontend Architecture

### Pages
- `/` - Landing page with cat SVG and wallet connect
- `/play` - Game interface with betting panel

### Key Components
- `CatAnimation` - Animated SVG cat with win/lose states
- `BetPanel` - Main betting interface
- `WalletButton` - Solana wallet connection

### State Management
- Real-time vault balance updates
- Transaction status tracking
- Recent game results
- Responsive UI animations

## 🏗️ Smart Contract Architecture

### Program Instructions

1. **initialize** - Set up game vault with configuration
2. **fund_vault** - Add SOL to the vault (house only)
3. **bet** - Place a bet and request randomness
4. **fulfill_randomness** - VRF callback to settle bet
5. **refund_timeout** - Refund if VRF fails
6. **set_pause** - Emergency pause (admin)
7. **set_limits** - Update betting limits (admin)
8. **set_edge** - Update house edge (admin)

### Account Structure

#### Vault Account
```rust
pub struct Vault {
    pub authority: Pubkey,      // House authority
    pub bump: u8,               // PDA bump seed
    pub is_paused: bool,        // Emergency pause
    pub min_bet_lamports: u64,  // Minimum bet
    pub max_exposure_bps: u16,  // Max single bet (basis points)
    pub house_edge_bps: u16,    // House edge (basis points)
    pub total_volume: u64,      // Total wagered
    pub total_bets: u64,        // Number of bets
    pub total_wins: u64,        // Player wins
}
```

#### Bet Round Account
```rust
pub struct BetRound {
    pub player: Pubkey,              // Player wallet
    pub stake_lamports: u64,         // Bet amount
    pub potential_payout: u64,       // Win payout
    pub timestamp: i64,              // Bet timestamp
    pub slot: u64,                   // Solana slot
    pub vrf_request_randomness: [u8; 32], // VRF request ID
    pub is_settled: bool,            // Settlement status
    pub is_winner: bool,             // Win/lose result
    pub bump: u8,                    // PDA bump
}
```

### Security Features

- **Single Settlement**: Each bet can only be settled once
- **Vault Balance Checks**: Ensures sufficient funds for payouts
- **Exposure Limits**: Prevents large bets from draining vault
- **Timeout Protection**: Players can recover funds if VRF fails
- **Admin Controls**: Emergency pause and parameter updates

## 🚀 Deployment Guide

### Devnet Deployment

```bash
# Build program
anchor build

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Initialize vault
anchor run initialize

# Fund vault
ts-node scripts/fund_vault.ts 10

# Deploy frontend to Vercel
vercel --prod
```

### Mainnet-Beta Deployment

```bash
# Switch to mainnet
solana config set --url mainnet-beta

# Update Anchor.toml
# [programs.mainnet-beta]
# catflip = "YOUR_PROGRAM_ID"

# Deploy program
anchor deploy --provider.cluster mainnet-beta

# Update production environment variables
# Deploy frontend with mainnet config
```

### Vercel Deployment

1. Connect repository to Vercel
2. Set environment variables:
   ```
   NEXT_PUBLIC_SOLANA_CLUSTER=mainnet-beta
   NEXT_PUBLIC_RPC_HTTP_URL=your_mainnet_rpc
   NEXT_PUBLIC_PROGRAM_ID=your_mainnet_program_id
   ```
3. Deploy from `apps/web` directory

## ⚡ NOWNodes RPC Configuration

1. Sign up at [NOWNodes](https://nownodes.io/)
2. Get your API key
3. Configure endpoints:
   ```bash
   # Devnet
   RPC_HTTP_URL=https://solana-devnet.nownodes.io/YOUR-API-KEY  
   RPC_WSS_URL=wss://solana-devnet.nownodes.io/YOUR-API-KEY
   
   # Mainnet
   RPC_HTTP_URL=https://solana.nownodes.io/YOUR-API-KEY
   RPC_WSS_URL=wss://solana.nownodes.io/YOUR-API-KEY
   ```

## 📈 Game Economics

### Payout Calculation
```
Win Payout = Bet Amount × 2 × (1 - House Edge)
Example: 1 SOL bet = 1.96 SOL payout (2% house edge)
```

### Risk Management
- **Max Exposure**: 10% of vault balance per bet
- **Min Bet**: 0.001 SOL (configurable)
- **House Edge**: 2% (configurable)

### Example Scenarios

| Vault Balance | Max Single Bet | Min Bet | House Edge |
|---------------|----------------|---------|------------|
| 100 SOL       | 10 SOL         | 0.001 SOL | 2% |
| 1000 SOL      | 100 SOL        | 0.001 SOL | 2% |

## 🛡️ Security Considerations

### Smart Contract Security
- ✅ No re-entrancy vulnerabilities
- ✅ Overflow protection with checked math
- ✅ Proper authority checks
- ✅ Single settlement enforcement
- ✅ Timeout protection for failed randomness

### Operational Security
- 🔐 Use hardware wallet for mainnet authority
- 🔐 Implement multi-sig for large vaults
- 🔐 Regular security audits
- 🔐 Monitor vault balance and unusual activity

### Frontend Security
- ✅ No private keys stored in frontend
- ✅ RPC endpoint validation
- ✅ Transaction verification
- ✅ Proper error handling

## 🌍 Legal and Compliance

⚠️ **Important Notice**: Online gambling is subject to various laws and regulations. Before deploying:

1. **Research Local Laws**: Check gambling regulations in your jurisdiction
2. **Age Verification**: Implement age verification if required
3. **Geofencing**: Consider blocking access from restricted regions
4. **Licensing**: Obtain appropriate gambling licenses
5. **Responsible Gaming**: Implement betting limits and self-exclusion

### Geofencing Template
```typescript
// Add to frontend for geofencing
const RESTRICTED_COUNTRIES = ['US', 'CN', 'IN']; // Example
const userCountry = getUserCountry(); // Implement IP-based detection
if (RESTRICTED_COUNTRIES.includes(userCountry)) {
  showGeofencingMessage();
}
```

## 🔧 Advanced Configuration

### Custom House Edge
```bash
# Set 3% house edge
ts-node scripts/set_edge.ts 300
```

### Custom Betting Limits
```bash
# Set min bet to 0.01 SOL, max exposure to 5%
ts-node scripts/set_limits.ts 0.01 500
```

### Emergency Pause
```bash
# Pause the game
ts-node scripts/pause.ts true

# Resume the game  
ts-node scripts/pause.ts false
```

## 📊 Monitoring and Analytics

### On-Chain Metrics
- Total volume wagered
- Number of bets placed
- Player win rate
- Vault balance over time
- Average bet size

### Off-Chain Analytics
```typescript
// Example analytics integration
import { Analytics } from './analytics';

Analytics.track('bet_placed', {
  amount: betAmount,
  player: playerPubkey.toString(),
  timestamp: Date.now()
});
```

## 🆘 Troubleshooting

### Common Issues

#### "Program account does not exist"
```bash
# Redeploy the program
anchor build && anchor deploy
```

#### "Insufficient funds for rent"  
```bash
# Airdrop more SOL
solana airdrop 2
```

#### "VRF account invalid"
```bash
# Create and configure VRF account
sbv2 solana vrf create --keypair ~/.config/solana/id.json
```

#### Frontend wallet connection issues
```bash
# Clear browser cache and localStorage
# Ensure wallet extension is updated
```

### Debug Mode

Enable debug logging:
```bash
export ANCHOR_LOG=true
anchor test --file tests/catflip.ts
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

### Development Guidelines
- Follow Rust naming conventions
- Add comprehensive tests
- Update documentation
- Use TypeScript for frontend code

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- [Anchor Framework](https://www.anchor-lang.com/)
- [Switchboard Network](https://switchboard.xyz/)
- [Solana Labs](https://solana.com/)
- [NOWNodes](https://nownodes.io/)

---

## 📞 Support

For questions and support:
- Open an issue on GitHub
- Join the Solana Discord
- Check Anchor documentation

**Happy building! 🐱✨**