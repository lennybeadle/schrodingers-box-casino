#!/usr/bin/env tsx

/**
 * Upgrade Script for Cat Crash Game Module
 * 
 * This script upgrades the existing Sui package to add the new crash game module
 * while maintaining the same package address using the UpgradeCap.
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

// Configuration
const PACKAGE_PATH = './sui-catsino';
const NETWORK = process.env.NETWORK || 'testnet';

// ANSI colors for console output
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
      stdio: ['inherit', 'pipe', 'pipe'],
      cwd: process.cwd()
    });
    log(`${colors.green}✓ Success${colors.reset}`);
    return output;
  } catch (error: any) {
    log(`${colors.red}✗ Failed: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

function findUpgradeCapId(): string {
  log(`\n${colors.blue}${colors.bold}Looking for UpgradeCap...${colors.reset}`);
  
  // Get all objects owned by the current active address
  const objectsOutput = executeCommand(
    'sui client objects --json',
    'Fetching owned objects'
  );
  
  try {
    const objects = JSON.parse(objectsOutput);
    
    // Look for UpgradeCap objects
    const upgradeCapObjects = objects.filter((obj: any) => 
      obj.type && obj.type.includes('UpgradeCap')
    );
    
    if (upgradeCapObjects.length === 0) {
      log(`${colors.red}No UpgradeCap found. You need an UpgradeCap to upgrade the package.${colors.reset}`);
      log(`${colors.yellow}Make sure you deployed the original package and have the UpgradeCap.${colors.reset}`);
      process.exit(1);
    }
    
    if (upgradeCapObjects.length > 1) {
      log(`${colors.yellow}Multiple UpgradeCaps found. Using the first one.${colors.reset}`);
      upgradeCapObjects.forEach((cap, index) => {
        log(`${colors.blue}  ${index + 1}. ${cap.objectId} (${cap.type})${colors.reset}`);
      });
    }
    
    const upgradeCapId = upgradeCapObjects[0].objectId;
    log(`${colors.green}Found UpgradeCap: ${upgradeCapId}${colors.reset}`);
    return upgradeCapId;
    
  } catch (error) {
    log(`${colors.red}Error parsing objects JSON: ${error}${colors.reset}`);
    process.exit(1);
  }
}

function getPackageId(): string {
  const moveTomlPath = path.join(PACKAGE_PATH, 'Move.toml');
  
  if (!existsSync(moveTomlPath)) {
    log(`${colors.red}Move.toml not found at ${moveTomlPath}${colors.reset}`);
    process.exit(1);
  }
  
  try {
    const moveToml = readFileSync(moveTomlPath, 'utf8');
    const lines = moveToml.split('\n');
    
    // Look for published-at in Move.toml
    for (const line of lines) {
      if (line.includes('published-at')) {
        const match = line.match(/published-at\s*=\s*"([^"]+)"/);
        if (match) {
          return match[1];
        }
      }
    }
    
    log(`${colors.yellow}No published-at found in Move.toml. This might be the first deployment.${colors.reset}`);
    return '';
  } catch (error) {
    log(`${colors.red}Error reading Move.toml: ${error}${colors.reset}`);
    process.exit(1);
  }
}

function main() {
  log(`${colors.bold}${colors.green}🏍️  Cat Crash Game - Package Upgrade${colors.reset}`);
  log(`${colors.blue}Network: ${NETWORK}${colors.reset}`);
  log(`${colors.blue}Package Path: ${PACKAGE_PATH}${colors.reset}`);
  
  // Check if package directory exists
  if (!existsSync(PACKAGE_PATH)) {
    log(`${colors.red}Package directory not found: ${PACKAGE_PATH}${colors.reset}`);
    process.exit(1);
  }
  
  // Build the package first
  executeCommand(
    `sui move build --path ${PACKAGE_PATH}`,
    'Building Move package'
  );
  
  // Find the UpgradeCap
  const upgradeCapId = findUpgradeCapId();
  
  // Get the current package ID
  const currentPackageId = getPackageId();
  if (currentPackageId) {
    log(`${colors.blue}Current Package ID: ${currentPackageId}${colors.reset}`);
  }
  
  // Execute the upgrade
  const upgradeOutput = executeCommand(
    `sui client upgrade --package-path ${PACKAGE_PATH} --upgrade-capability ${upgradeCapId} --gas-budget 100000000`,
    'Upgrading package with crash module'
  );
  
  // Parse upgrade output to extract new package info
  log(`\n${colors.green}${colors.bold}✅ Package upgrade completed!${colors.reset}`);
  
  // Extract package ID from output (it should remain the same)
  const packageIdMatch = upgradeOutput.match(/Package ID: (0x[a-f0-9]+)/i);
  if (packageIdMatch) {
    const newPackageId = packageIdMatch[1];
    log(`${colors.green}Package ID (should be same): ${newPackageId}${colors.reset}`);
    
    if (currentPackageId && newPackageId !== currentPackageId) {
      log(`${colors.red}⚠️  Package ID changed! This shouldn't happen with upgrades.${colors.reset}`);
      log(`${colors.red}   Old: ${currentPackageId}${colors.reset}`);
      log(`${colors.red}   New: ${newPackageId}${colors.reset}`);
    } else {
      log(`${colors.green}✓ Package ID preserved as expected${colors.reset}`);
    }
  }
  
  // Show module information
  log(`\n${colors.blue}${colors.bold}📦 Available Modules:${colors.reset}`);
  log(`${colors.green}  • catsino::casino     (existing - house management)${colors.reset}`);
  log(`${colors.green}  • catsino::revolver   (existing - revolver roulette)${colors.reset}`);
  log(`${colors.green}  • catsino::crash      (NEW - cat crash game) 🏍️${colors.reset}`);
  
  log(`\n${colors.blue}${colors.bold}🎮 Next Steps:${colors.reset}`);
  log(`${colors.yellow}1. Update your .env files with the package ID (if it changed):${colors.reset}`);
  if (packageIdMatch) {
    log(`${colors.blue}   NEXT_PUBLIC_PACKAGE_ID=${packageIdMatch[1]}${colors.reset}`);
  }
  log(`${colors.yellow}2. Deploy your frontend with the crash game page${colors.reset}`);
  log(`${colors.yellow}3. Test the new crash game at /play/crash${colors.reset}`);
  log(`${colors.yellow}4. Run smoke tests: npm run test:crash${colors.reset}`);
  
  log(`\n${colors.green}${colors.bold}🎉 Cat Crash is ready to ride! 🏍️${colors.reset}`);
}

// Run the script
if (require.main === module) {
  main();
}

export { main };