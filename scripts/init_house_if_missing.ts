import { execSync } from 'child_process';
import { SuiClient } from '@mysten/sui/client';

const NETWORK = process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet';
const HOUSE_ID = process.env.NEXT_PUBLIC_HOUSE_OBJECT_ID;
const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID;

async function initHouseIfMissing() {
  console.log(`🏠 Checking for House object on ${NETWORK}...`);
  
  if (!HOUSE_ID) {
    console.log('❌ NEXT_PUBLIC_HOUSE_OBJECT_ID not found in environment');
    console.log('💡 You need to create a House object first using the existing casino module');
    console.log('');
    console.log('📝 Steps to create a House:');
    console.log('1. Deploy the main casino package if not already deployed');
    console.log('2. The House object is created automatically on first deployment');
    console.log('3. Add the House object ID to your .env.local:');
    console.log('   NEXT_PUBLIC_HOUSE_OBJECT_ID=0x...');
    console.log('');
    console.log('🔍 You can find the House object ID in the deployment transaction');
    console.log('   or by querying objects owned by the deployer address');
    return;
  }
  
  if (!PACKAGE_ID) {
    console.log('❌ NEXT_PUBLIC_PACKAGE_ID not found in environment');
    console.log('💡 You need to deploy the main casino package first');
    return;
  }
  
  try {
    // Initialize Sui client
    const rpcUrl = NETWORK === 'mainnet' 
      ? 'https://fullnode.mainnet.sui.io:443'
      : 'https://fullnode.testnet.sui.io:443';
      
    const client = new SuiClient({ url: rpcUrl });
    
    // Check if House object exists
    console.log(`🔍 Checking House object: ${HOUSE_ID}`);
    
    const houseObject = await client.getObject({
      id: HOUSE_ID,
      options: {
        showContent: true,
        showType: true,
      }
    });
    
    if (houseObject.data) {
      console.log('✅ House object found and accessible!');
      console.log('📊 House details:');
      console.log(`   Type: ${houseObject.data.type}`);
      console.log(`   Object ID: ${houseObject.data.objectId}`);
      
      if (houseObject.data.content && 'fields' in houseObject.data.content) {
        const fields = houseObject.data.content.fields as any;
        if (fields.balance) {
          const balance = parseInt(fields.balance) / 1_000_000_000;
          console.log(`   Balance: ${balance} SUI`);
        }
        if (fields.owner) {
          console.log(`   Owner: ${fields.owner}`);
        }
        if (fields.total_bets) {
          console.log(`   Total Bets: ${fields.total_bets}`);
        }
        if (fields.total_volume) {
          const volume = parseInt(fields.total_volume) / 1_000_000_000;
          console.log(`   Total Volume: ${volume} SUI`);
        }
      }
      
      console.log('');
      console.log('🎉 House is ready for Revolver Roulette!');
      console.log('💡 The revolver game will use the same House object for consistency');
      
    } else {
      console.log('❌ House object not found or not accessible');
      console.log('💡 This could mean:');
      console.log('   1. The object ID is incorrect');
      console.log('   2. The House has been deleted');
      console.log('   3. Network mismatch');
      console.log('');
      console.log('🔧 To create a new House, deploy the main casino package');
    }
    
  } catch (error) {
    console.error('❌ Error checking House object:', error);
    console.log('');
    console.log('💡 Make sure your environment variables are correct:');
    console.log(`   NEXT_PUBLIC_SUI_NETWORK=${NETWORK}`);
    console.log(`   NEXT_PUBLIC_PACKAGE_ID=${PACKAGE_ID}`);
    console.log(`   NEXT_PUBLIC_HOUSE_OBJECT_ID=${HOUSE_ID}`);
  }
}

// Run if called directly
if (require.main === module) {
  initHouseIfMissing();
}

export { initHouseIfMissing };