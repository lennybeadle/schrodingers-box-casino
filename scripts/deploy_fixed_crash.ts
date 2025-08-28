#!/usr/bin/env tsx

/**
 * Deploy a new package with the fixed crash module
 * This is necessary because we don't have the UpgradeCap for the current package
 */

import { execSync } from 'child_process';
import { writeFileSync, readFileSync } from 'fs';
import path from 'path';

const PACKAGE_PATH = './sui-catsino';
const NETWORK = 'mainnet';

// ANSI colors
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

function log(message: string, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function executeCommand(command: string, description: string): string {
  log(`\n${colors.blue}${colors.bold}${description}${colors.reset}`);
  log(`${colors.yellow}Executing: ${command}${colors.reset}`);
  
  try {
    const output = execSync(command, { 
      encoding: 'utf8',
      stdio: ['inherit', 'pipe', 'pipe']
    });
    log(`${colors.green}✓ Success${colors.reset}`);
    return output;
  } catch (error: any) {
    log(`${colors.red}✗ Failed: ${error.message}${colors.reset}`);
    if (error.stderr) {
      log(`${colors.red}Error details: ${error.stderr}${colors.reset}`);
    }
    process.exit(1);
  }
}

async function main() {
  log(`${colors.green}${colors.bold}🏍️  Deploying Fixed Crash Game Package${colors.reset}`);
  log(`${colors.blue}Network: ${NETWORK}${colors.reset}`);
  log(`${colors.blue}Package Path: ${PACKAGE_PATH}${colors.reset}`);

  // Step 1: Build the package
  const buildOutput = executeCommand(
    `sui move build --path ${PACKAGE_PATH}`,
    'Building Move package with fixed crash module'
  );

  // Step 2: Deploy the package
  log(`\n${colors.yellow}⚠️  This will deploy a NEW package with a different address${colors.reset}`);
  log(`${colors.yellow}The old package with the overflow bug will remain at the current address${colors.reset}`);
  
  const deployOutput = executeCommand(
    `sui client publish --path ${PACKAGE_PATH} --gas-budget 100000000`,
    'Deploying new package to mainnet'
  );

  // Parse the output to get the new package ID
  const packageIdMatch = deployOutput.match(/Published Objects.*?PackageID: (0x[a-f0-9]+)/s);
  if (!packageIdMatch) {
    log(`${colors.red}Failed to extract package ID from deployment output${colors.reset}`);
    process.exit(1);
  }

  const newPackageId = packageIdMatch[1];
  
  // Parse for the new House object if created
  const houseMatch = deployOutput.match(/Object Changes.*?Created Objects:.*?ObjectType: 0x[a-f0-9]+::casino::House.*?ObjectID: (0x[a-f0-9]+)/s);
  const newHouseId = houseMatch ? houseMatch[1] : null;

  log(`\n${colors.green}${colors.bold}✅ Deployment Successful!${colors.reset}`);
  log(`${colors.green}New Package ID: ${newPackageId}${colors.reset}`);
  if (newHouseId) {
    log(`${colors.green}New House Object ID: ${newHouseId}${colors.reset}`);
  }

  // Step 3: Update environment files
  log(`\n${colors.blue}${colors.bold}Updating environment files...${colors.reset}`);
  
  const envFiles = ['.env.local', '.env.production'];
  for (const envFile of envFiles) {
    const envPath = path.join('./apps/web', envFile);
    try {
      let content = readFileSync(envPath, 'utf8');
      
      // Update package ID
      content = content.replace(
        /NEXT_PUBLIC_PACKAGE_ID=0x[a-f0-9]+/,
        `NEXT_PUBLIC_PACKAGE_ID=${newPackageId}`
      );
      
      // Update house ID if we have a new one
      if (newHouseId) {
        content = content.replace(
          /NEXT_PUBLIC_HOUSE_OBJECT_ID=0x[a-f0-9]+/,
          `NEXT_PUBLIC_HOUSE_OBJECT_ID=${newHouseId}`
        );
      }
      
      writeFileSync(envPath, content);
      log(`${colors.green}✓ Updated ${envFile}${colors.reset}`);
    } catch (error) {
      log(`${colors.yellow}⚠️  Could not update ${envFile}: ${error}${colors.reset}`);
    }
  }

  log(`\n${colors.green}${colors.bold}🎉 Fixed crash module deployed successfully!${colors.reset}`);
  log(`${colors.yellow}Note: You'll need to fund the new House object before playing${colors.reset}`);
  log(`${colors.yellow}The other games (coinflip, revolver) will need to be updated to use the new package${colors.reset}`);
}

main().catch(error => {
  log(`${colors.red}${colors.bold}Error: ${error.message}${colors.reset}`, colors.red);
  process.exit(1);
});