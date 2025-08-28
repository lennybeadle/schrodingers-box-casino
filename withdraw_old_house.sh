#!/bin/bash

# Withdraw all funds from old coinflip house
# Old house: 0xf9af5e31d72db67489d60e2d68f51c2ad915d4cad25f4d6acae4c51ed83b0ce3
# Old package: 0x81e3ec93b4682c94fb57dede2507d7384ef19805d98557669aca15f7320c771b

echo "💰 Withdrawing from Old CoinFlip House"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

OLD_PACKAGE="0x81e3ec93b4682c94fb57dede2507d7384ef19805d98557669aca15f7320c771b"
OLD_HOUSE="0xf9af5e31d72db67489d60e2d68f51c2ad915d4cad25f4d6acae4c51ed83b0ce3"

# Check current balance first
echo "📊 Checking old house balance..."
sui client call \
  --function get_house_balance \
  --module casino \
  --package $OLD_PACKAGE \
  --args $OLD_HOUSE

echo ""
echo "💡 To withdraw funds, you need to:"
echo "1. Check the balance above"
echo "2. Go to your deployed site at /play/coinflip/makaveli"
echo "3. Use the withdraw function there (it uses the old contract)"
echo ""
echo "🔗 Old Contract Explorer:"
echo "https://suiexplorer.com/object/$OLD_PACKAGE?network=mainnet"
echo ""
echo "🏦 Old House Explorer:"
echo "https://suiexplorer.com/object/$OLD_HOUSE?network=mainnet"
echo ""

# Alternative: Direct CLI withdrawal (if you want to do it here)
echo "❓ Want to withdraw directly via CLI? (y/n)"
read -p "Amount to withdraw (in SUI): " WITHDRAW_AMOUNT

if [ ! -z "$WITHDRAW_AMOUNT" ] && [ "$WITHDRAW_AMOUNT" != "0" ]; then
    WITHDRAW_MIST=$(echo "$WITHDRAW_AMOUNT * 1000000000" | bc)
    
    echo "🔄 Withdrawing $WITHDRAW_AMOUNT SUI ($WITHDRAW_MIST MIST)..."
    
    sui client call \
      --function withdraw_profits \
      --module casino \
      --package $OLD_PACKAGE \
      --args $OLD_HOUSE $WITHDRAW_MIST \
      --gas-budget 10000000
    
    if [ $? -eq 0 ]; then
        echo "✅ Withdrawal successful!"
        echo "💰 $WITHDRAW_AMOUNT SUI has been sent to your wallet"
    else
        echo "❌ Withdrawal failed"
    fi
else
    echo "🚫 No withdrawal requested"
fi

echo ""
echo "🎯 Next Steps:"
echo "1. Update Vercel environment variables:"
echo "   NEXT_PUBLIC_PACKAGE_ID=0x4395891c1542142d74cf1d6a318ba4ecadde4cd70fdca04958c3922ba6c6eb7c"
echo "   NEXT_PUBLIC_HOUSE_OBJECT_ID=0x0785b3fab06a472860a92fe78bfd2d032c3b09a16824c932d11d3f04bd9918af"
echo "   NEXT_PUBLIC_ADMIN_PASSCODE=21563"
echo "2. Redeploy your Vercel app"
echo "3. Both games will work with the new unified house!"