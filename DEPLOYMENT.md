# 🚀 CATSINO Production Deployment Guide

## Prerequisites Checklist
- [ ] 0.145 SOL in wallet `6kKDfyG7wsLcjC9Cf99G5hiWsy4gv47sS3tprYf7WNMZ` for program deployment
- [ ] 1-5 SOL in house wallet `9xDnozdsXgbi7ugacMxGTBmNxPMktPZwUKCv757WwCy4` for betting liquidity
- [ ] Vercel account (free tier works)

## Step 1: Deploy Solana Program to Mainnet

1. **Fund your deployment wallet:**
   ```bash
   # Check your wallet address
   solana address
   # Should show: 6kKDfyG7wsLcjC9Cf99G5hiWsy4gv47sS3tprYf7WNMZ
   ```
   Send 0.145 SOL to this address

2. **Run the deployment script:**
   ```bash
   cd /Users/lennybeadle/catsinofun
   ./deploy-mainnet.sh
   ```

   Or manually:
   ```bash
   solana program deploy target/deploy/catflip_ultra.so \
     --keypair target/deploy/catflip_production-keypair.json \
     --url https://api.mainnet-beta.solana.com
   ```

   Your program ID: `5xTsy7Pf5oTjiZHXmj6rHuEtDBXoKNyuUHJRnpx6Gdcc`

## Step 2: Deploy Frontend to Vercel

### Option A: Via Vercel Dashboard (Easiest)

1. Go to https://vercel.com/new
2. Import your GitHub repository (or upload the folder)
3. Select `/apps/web` as the root directory
4. Add these environment variables:
   ```
   NEXT_PUBLIC_SOLANA_CLUSTER=mainnet-beta
   NEXT_PUBLIC_RPC_HTTP_URL=https://api.mainnet-beta.solana.com
   NEXT_PUBLIC_RPC_WSS_URL=wss://api.mainnet-beta.solana.com
   NEXT_PUBLIC_PROGRAM_ID=5xTsy7Pf5oTjiZHXmj6rHuEtDBXoKNyuUHJRnpx6Gdcc
   NEXT_PUBLIC_MIN_BET_LAMPORTS=1000000
   NEXT_PUBLIC_MAX_EXPOSURE_BPS=1000
   NEXT_PUBLIC_HOUSE_EDGE_BPS=200
   ```
5. Click Deploy

### Option B: Via CLI

1. Login to Vercel:
   ```bash
   cd /Users/lennybeadle/catsinofun/apps/web
   npx vercel login
   ```

2. Deploy:
   ```bash
   npx vercel --prod
   ```

3. When prompted:
   - Setup and deploy? **Y**
   - Which scope? **Your account**
   - Link to existing project? **N**
   - Project name? **catsino**
   - Directory? **./** (current directory)
   - Override settings? **N**

## Step 3: Fund House Wallet

Send 1-5 SOL to your house wallet:
`9xDnozdsXgbi7ugacMxGTBmNxPMktPZwUKCv757WwCy4`

This wallet will:
- Pay out winnings automatically
- Collect losing bets
- Need sufficient balance for variance

## Step 4: Test Your Live Casino

1. Visit your Vercel URL (e.g., https://catsino.vercel.app)
2. Connect your wallet (Phantom/Solflare)
3. Try a small bet (0.01 SOL)
4. Verify transactions on Solana Explorer

## Important Security Notes

- **NEVER** share your house wallet private key
- **NEVER** commit private keys to git
- Consider using a hardware wallet for house funds
- Monitor your house wallet balance regularly

## Monitoring

View your transactions:
- Program: https://explorer.solana.com/address/5xTsy7Pf5oTjiZHXmj6rHuEtDBXoKNyuUHJRnpx6Gdcc
- House Wallet: https://explorer.solana.com/address/9xDnozdsXgbi7ugacMxGTBmNxPMktPZwUKCv757WwCy4

## Support

Your casino is now live on Solana mainnet! 🎉

Remember:
- 49% win rate for players
- 1.96x payout on wins
- 4% house edge ensures long-term profitability
- Fully automated, no manual intervention needed