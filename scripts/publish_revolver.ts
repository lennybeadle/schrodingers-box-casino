import { execSync } from 'child_process';
import path from 'path';

const NETWORK = process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet';

async function publishRevolver() {
  console.log(`🚀 Publishing Revolver Roulette to ${NETWORK}...`);
  
  try {
    // Navigate to the Move package directory
    const movePackageDir = path.join(process.cwd(), 'sui-catsino');
    process.chdir(movePackageDir);
    
    console.log('📁 Current directory:', process.cwd());
    console.log('📦 Building Move package...');
    
    // Build the package first
    execSync('sui move build', { stdio: 'inherit' });
    
    console.log('✅ Build successful!');
    console.log('🔧 Publishing to network...');
    
    // Publish the package
    const publishCommand = `sui client publish --gas-budget 100000000`;
    const result = execSync(publishCommand, { encoding: 'utf8' });
    
    console.log('📋 Publish result:');
    console.log(result);
    
    // Parse the result to extract package ID
    const packageIdMatch = result.match(/Package ID: (0x[a-fA-F0-9]+)/);
    if (packageIdMatch) {
      const packageId = packageIdMatch[1];
      console.log('');
      console.log('🎉 SUCCESS! Revolver Roulette deployed!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📦 Package ID: ${packageId}`);
      console.log(`🌐 Network: ${NETWORK}`);
      console.log('');
      console.log('📝 Add these to your .env.local:');
      console.log(`NEXT_PUBLIC_REVOLVER_PACKAGE=${packageId}`);
      console.log('NEXT_PUBLIC_REVOLVER_MODULE=revolver');
      console.log('NEXT_PUBLIC_REVOLVER_FUN=play');
      console.log('NEXT_PUBLIC_IMAGE_REVOLVER=https://fmijmundotmgtsemfdat.supabase.co/storage/v1/object/public/avatars/revolver.webp');
      console.log('');
      console.log('🔗 Explorer:');
      if (NETWORK === 'mainnet') {
        console.log(`https://suiexplorer.com/object/${packageId}?network=mainnet`);
      } else {
        console.log(`https://suiexplorer.com/object/${packageId}?network=testnet`);
      }
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    } else {
      console.log('⚠️  Could not extract package ID from result');
    }
    
  } catch (error) {
    console.error('❌ Error publishing revolver:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  publishRevolver();
}

export { publishRevolver };