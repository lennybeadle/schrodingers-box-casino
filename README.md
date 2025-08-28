# 🐱 CatsinoFun - Sui Multi-Game Casino

A complete, production-ready Sui blockchain casino featuring multiple quantum-themed games with cute cat mechanics and imperial elegance.

## 🎯 Games Available

### 1. **Coin Flip** - "Emperor's Game"
- **Win Rate**: 47% (reduced for house sustainability)
- **Payout**: 2.0x multiplier
- **House Edge**: 6%
- **Theme**: Quantum mechanics meets imperial elegance
- **Animation**: 3D coin flip with heads/tails sides

### 2. **Revolver Roulette** - "Alive Cat"
- **Win Rate**: 12.5% (45° out of 360°)
- **Payout**: 7.76x multiplier (194/25 ratio)
- **House Edge**: 3%
- **Theme**: Russian roulette with quantum cat
- **Animation**: Spinning revolver cylinder

## 🏗️ Architecture

### **Sui Move Smart Contracts**
- **Shared House System**: Single vault for all games
- **Native Randomness**: Uses `sui::random` for provable fairness
- **Owner Withdrawals**: Secure profit extraction system
- **Cross-Game Stats**: Unified betting statistics

### **Next.js Frontend**
- **App Router**: Modern Next.js 14 with TypeScript
- **Wallet Integration**: @mysten/dapp-kit for Sui wallets
- **Responsive Design**: Tailwind CSS with custom animations
- **Real-time Updates**: Live balance and transaction tracking

## 📁 Repository Structure

```
catsinofun/
├── apps/web/                    # Next.js 14 frontend
│   ├── app/
│   │   ├── page.tsx            # Main coin flip game
│   │   └── play/
│   │       └── revolver/       # Revolver roulette game
│   │           └── page.tsx
│   ├── components/
│   │   ├── Spinner.tsx         # Revolver spinner component
│   │   └── SuiWalletButton.tsx # Wallet connection
│   └── lib/
│       └── suiClient.ts        # Sui client helpers
├── sui-catsino/                # Sui Move workspace
│   ├── sources/
│   │   ├── catsino.move       # Main casino & house system
│   │   └── revolver.move      # Revolver roulette game
│   └── Move.toml              # Package manifest
├── scripts/                    # Deployment & utility scripts
│   ├── publish_revolver.ts    # Deploy revolver game
│   └── init_house_if_missing.ts # Check house setup
└── README.md
```

## 🚀 Quick Start

### 1. **Environment Setup**

Create `.env.local` in `apps/web/`:

```bash
# Network Configuration
NEXT_PUBLIC_SUI_NETWORK=testnet  # or "mainnet"

# Shared House System (from main casino deployment)
NEXT_PUBLIC_PACKAGE_ID=0x81e3ec93b4682c94fb57dede2507d7384ef19805d98557669aca15f7320c771b
NEXT_PUBLIC_HOUSE_OBJECT_ID=0xf9af5e31d72db67489d60e2d68f51c2ad915d4cad25f4d6acae4c51ed83b0ce3

# Revolver Game (after deploying revolver module)
NEXT_PUBLIC_REVOLVER_PACKAGE=0x... # Set after deployment
NEXT_PUBLIC_REVOLVER_MODULE=revolver
NEXT_PUBLIC_REVOLVER_FUN=play
NEXT_PUBLIC_IMAGE_REVOLVER=https://fmijmundotmgtsemfdat.supabase.co/storage/v1/object/public/avatars/revolver.webp

# Game Configuration
MIN_BET_MIST=1000000              # 0.001 SUI minimum
MAX_EXPOSURE_BPS=1000             # 10% max vault exposure
HOUSE_EDGE_BPS=300                # 3% house edge for revolver
```

### 2. **Install Dependencies**

```bash
# Install root dependencies (includes sui CLI tools)
pnpm install

# Install frontend dependencies
cd apps/web
pnpm install
cd ../..
```

### 3. **Setup Sui CLI**

```bash
# Install Sui CLI if not already installed
# Follow: https://docs.sui.io/guides/developer/getting-started/sui-install

# Configure for testnet
sui client switch --env testnet

# Create or import wallet
sui client new-address ed25519
# OR import existing: sui keytool import "your-mnemonic-phrase" ed25519

# Get testnet SUI
sui client faucet
```

### 4. **Deploy Smart Contracts**

```bash
# Build and deploy main casino (if not already deployed)
pnpm sui:build

# Check if house exists
pnpm check:house

# Deploy revolver game module
pnpm publish:revolver

# Update .env.local with the returned package ID
```

### 5. **Fund the House**

```bash
# The house needs SUI to pay out winners
# Fund via the web interface at /makaveli path or programmatically

# Example: Fund with 10 SUI for testing
sui client call \
  --function fund_house \
  --module casino \
  --package $NEXT_PUBLIC_PACKAGE_ID \
  --args $NEXT_PUBLIC_HOUSE_OBJECT_ID [amount] \
  --gas-budget 5000000
```

### 6. **Run Development Server**

```bash
pnpm dev
```

Visit `http://localhost:3000` to play!

## 🎮 Game Mechanics

### **Coin Flip Math**
```
Win Rate: 47%
Payout: 2.0x (includes stake return)
House Edge: 6%
Expected Value: (0.47 × 2.0) + (0.53 × 0) = 0.94 (house keeps 6%)
```

### **Revolver Roulette Math**
```
Win Condition: Angle ∈ [0°, 45°)
Win Rate: 45/360 = 12.5%
Payout: 194/25 = 7.76x (includes stake return)  
House Edge: 3%
Expected Value: (0.125 × 7.76) + (0.875 × 0) = 0.97 (house keeps 3%)
```

## 🔧 Advanced Configuration

### **House Management**

The house owner (deployer) can:
- **Withdraw Profits**: Extract accumulated house edge
- **Monitor Stats**: View total bets, wins, volume
- **Fund House**: Add SUI for larger payouts

```bash
# Withdraw 1 SUI profit
sui client call \
  --function withdraw_profits \
  --module casino \
  --package $NEXT_PUBLIC_PACKAGE_ID \
  --args $NEXT_PUBLIC_HOUSE_OBJECT_ID 1000000000 \
  --gas-budget 5000000
```

### **Admin Features**

Access admin controls by visiting `/makaveli`:
- House funding interface
- Balance warnings
- Operational insights

### **Custom Deployment**

To deploy on mainnet:

1. **Switch Network**:
   ```bash
   sui client switch --env mainnet
   ```

2. **Update Environment**:
   ```bash
   NEXT_PUBLIC_SUI_NETWORK=mainnet
   ```

3. **Deploy with Gas**:
   ```bash
   pnpm publish:revolver
   ```

4. **Fund House**:
   ```bash
   # Fund with production amount (e.g., 100 SUI)
   ```

## 🧪 Testing & Development

### **Move Package Testing**
```bash
# Test smart contracts
pnpm sui:test

# Build only
pnpm sui:build
```

### **Frontend Testing**
```bash
cd apps/web
pnpm test  # If tests are added
pnpm build # Production build
```

### **Local Testing Flow**
1. Deploy contracts to testnet
2. Fund house with testnet SUI
3. Test both games thoroughly
4. Monitor gas costs and performance
5. Deploy to mainnet when ready

## 🔐 Security Considerations

### **Randomness**
- Uses Sui's native `sui::random` for provable fairness
- No off-chain randomness dependencies
- Gas-path parity to prevent side-channel attacks

### **House Management**
- Only deployer can withdraw profits
- Solvency checks prevent over-exposure
- Shared object for cross-game consistency

### **Frontend Security**
- Input validation on bet amounts
- Balance verification before transactions
- Transaction confirmation UI

## 📊 Monitoring & Analytics

### **On-Chain Metrics**
- Total bets placed
- Total volume wagered  
- House win/loss ratio
- Profit margins per game

### **Event Tracking**
- `BetPlaced` events (coin flip)
- `SpinEvent` events (revolver)
- `ProfitWithdrawn` events
- `HouseFunded` events

## 🚨 Troubleshooting

### **Common Issues**

1. **"House Insufficient Funds"**
   - Fund the house with more SUI
   - Check house balance at `/makaveli`

2. **"Transaction Failed"**
   - Ensure wallet has enough SUI for gas
   - Check network connectivity
   - Verify contract addresses

3. **"Events Not Loading"**
   - Blockchain indexing delay (normal)
   - Wait 10-30 seconds and refresh
   - Check transaction in explorer

### **Debug Commands**
```bash
# Check house status
pnpm check:house

# View recent transactions
sui client active-address
sui client gas

# Test Move functions
pnpm sui:test
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Test thoroughly on testnet
4. Submit pull request

## 📜 License

MIT License - see LICENSE file for details.

## 🔗 Links

- **Sui Documentation**: https://docs.sui.io
- **dApp Kit**: https://sdk.mystenlabs.com/dapp-kit
- **Sui Randomness Guide**: https://docs.sui.io/guides/developer/advanced/randomness-onchain
- **Sui Explorer Testnet**: https://suiexplorer.com/?network=testnet
- **Sui Explorer Mainnet**: https://suiexplorer.com/?network=mainnet

---

*Built with ❤️ for the Sui ecosystem. May Schrödinger's cat always land on its feet!* 🐱