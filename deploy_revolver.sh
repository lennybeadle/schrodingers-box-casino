#!/bin/bash

# Deploy Revolver Module to Sui Network
# This script publishes the revolver game module to the existing package

echo "🎯 Deploying Revolver Roulette Module..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if we're in the sui-catsino directory
if [ ! -f "Move.toml" ]; then
    echo "❌ Error: Must run from sui-catsino directory"
    echo "Run: cd sui-catsino && ../deploy_revolver.sh"
    exit 1
fi

# Build the package
echo "📦 Building Move package..."
sui move build

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "✅ Build successful!"
echo ""

# Show current network
CURRENT_ENV=$(sui client active-env)
echo "🌐 Current network: $CURRENT_ENV"
echo ""

# Publish the package
echo "🚀 Publishing to network..."
echo "⚠️  WARNING: This will deploy the ENTIRE package including revolver module"
echo "⚠️  Make sure you're on the correct network (testnet for testing, mainnet for production)"
echo ""
read -p "Continue with deployment? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]
then
    RESULT=$(sui client publish --gas-budget 100000000 2>&1)
    
    if [ $? -eq 0 ]; then
        echo "✅ Deployment successful!"
        echo ""
        echo "📋 Full output:"
        echo "$RESULT"
        echo ""
        
        # Try to extract package ID
        PACKAGE_ID=$(echo "$RESULT" | grep -oE "0x[a-fA-F0-9]{64}" | head -1)
        
        if [ ! -z "$PACKAGE_ID" ]; then
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo "🎉 DEPLOYMENT COMPLETE!"
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo ""
            echo "📦 New Package ID: $PACKAGE_ID"
            echo ""
            echo "⚠️  IMPORTANT: Update your .env.production and .env.local files:"
            echo ""
            echo "NEXT_PUBLIC_PACKAGE_ID=$PACKAGE_ID"
            echo ""
            echo "The revolver module is now available at:"
            echo "$PACKAGE_ID::revolver"
            echo ""
            
            if [[ "$CURRENT_ENV" == "mainnet" ]]; then
                echo "🔗 View on Explorer:"
                echo "https://suiexplorer.com/object/$PACKAGE_ID?network=mainnet"
            else
                echo "🔗 View on Explorer:"
                echo "https://suiexplorer.com/object/$PACKAGE_ID?network=testnet"
            fi
        else
            echo "⚠️  Could not extract Package ID from output"
            echo "Please check the output above for the Package ID"
        fi
    else
        echo "❌ Deployment failed!"
        echo "$RESULT"
        exit 1
    fi
else
    echo "🚫 Deployment cancelled"
    exit 0
fi