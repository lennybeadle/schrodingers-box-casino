#!/bin/bash

echo "🚀 CATSINO Mainnet Deployment Script"
echo "===================================="

# Set PATH for Solana tools
export PATH="$HOME/.cargo/bin:$PATH"

# Check current balance
echo -e "\n📊 Checking wallet balance..."
BALANCE=$(solana balance)
echo "Current balance: $BALANCE"

# Confirm we're on mainnet
echo -e "\n🌐 Confirming mainnet configuration..."
solana config get

echo -e "\n⚠️  IMPORTANT: This will deploy to MAINNET!"
echo "Required: 0.145 SOL for deployment"
echo "Program will be deployed with keypair: target/deploy/catflip_production-keypair.json"
read -p "Continue? (y/n): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]
then
    echo -e "\n📦 Deploying program to mainnet..."
    solana program deploy target/deploy/catflip_ultra.so \
        --keypair target/deploy/catflip_production-keypair.json \
        --url https://api.mainnet-beta.solana.com
    
    echo -e "\n✅ Deployment complete!"
    echo "Program ID: 5xTsy7Pf5oTjiZHXmj6rHuEtDBXoKNyuUHJRnpx6Gdcc"
    echo -e "\n📝 Next steps:"
    echo "1. Fund your house wallet: 9xDnozdsXgbi7ugacMxGTBmNxPMktPZwUKCv757WwCy4"
    echo "2. Deploy frontend to Vercel"
else
    echo "Deployment cancelled"
fi