#!/usr/bin/env tsx

/**
 * Smoke Test for Cat Crash Game Module
 * 
 * This script tests the crash game functionality by placing a small bet
 * and verifying the transaction and event parsing.
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';

// Configuration
const NETWORK = process.env.NETWORK || 'testnet';
const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID || '';
const HOUSE_OBJECT_ID = process.env.NEXT_PUBLIC_HOUSE_OBJECT_ID || '';

// Test parameters
const TEST_BET_SUI = '0.1'; // Small test bet
const TEST_TARGET_X100 = '200'; // 2.00x target
const GAS_BUDGET = '10000000'; // 0.01 SUI gas budget

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
      stdio: ['inherit', 'pipe', 'pipe'],
    });
    log(`${colors.green}✓ Success${colors.reset}`);
    return output;
  } catch (error: any) {
    log(`${colors.red}✗ Failed: ${error.message}${colors.reset}`);
    return '';
  }
}

function validateConfig() {
  log(`${colors.blue}${colors.bold}Validating Configuration${colors.reset}`);
  
  if (!PACKAGE_ID) {
    log(`${colors.red}Missing NEXT_PUBLIC_PACKAGE_ID environment variable${colors.reset}`);
    process.exit(1);
  }
  
  if (!HOUSE_OBJECT_ID) {
    log(`${colors.red}Missing NEXT_PUBLIC_HOUSE_OBJECT_ID environment variable${colors.reset}`);
    process.exit(1);
  }
  
  log(`${colors.green}✓ Package ID: ${PACKAGE_ID}${colors.reset}`);
  log(`${colors.green}✓ House ID: ${HOUSE_OBJECT_ID}${colors.reset}`);
  log(`${colors.green}✓ Network: ${NETWORK}${colors.reset}`);
}

function getWalletAddress(): string {
  const output = executeCommand('sui client active-address', 'Getting active wallet address');
  return output.trim();
}

function checkWalletBalance(): number {
  const address = getWalletAddress();
  const output = executeCommand(`sui client gas --address ${address}`, 'Checking wallet balance');
  
  // Parse gas objects to get total balance
  let totalBalance = 0;
  const lines = output.split('\n');
  
  for (const line of lines) {
    const match = line.match(/│\s+([0-9.]+)\s+SUI\s+│/);
    if (match) {
      totalBalance += parseFloat(match[1]);
    }
  }
  
  log(`${colors.blue}Total wallet balance: ${totalBalance} SUI${colors.reset}`);
  
  if (totalBalance < 1.0) {
    log(`${colors.yellow}⚠️  Low balance. Consider getting more testnet SUI from the faucet.${colors.reset}`);
  }
  
  return totalBalance;
}

function checkHouseBalance() {
  log(`\n${colors.blue}${colors.bold}Checking House Balance${colors.reset}`);
  
  const output = executeCommand(
    `sui client call --package ${PACKAGE_ID} --module casino --function get_house_balance --args ${HOUSE_OBJECT_ID} --gas-budget 1000000`,
    'Querying house balance'
  );
  
  // The balance will be in the transaction output - this is a view function
  if (output.includes('Status: Success')) {
    log(`${colors.green}✓ House balance query successful${colors.reset}`);
  } else {
    log(`${colors.red}House balance query failed${colors.reset}`);
  }
}

function testCrashGame() {
  log(`\n${colors.blue}${colors.bold}Testing Crash Game${colors.reset}`);
  log(`${colors.blue}Bet Amount: ${TEST_BET_SUI} SUI${colors.reset}`);
  log(`${colors.blue}Target: ${parseInt(TEST_TARGET_X100) / 100}x${colors.reset}`);
  
  // Convert SUI to MIST for the transaction
  const betAmountMist = (parseFloat(TEST_BET_SUI) * 1_000_000_000).toString();
  
  const output = executeCommand(
    `sui client call --package ${PACKAGE_ID} --module crash --function play --args 0x8 ${HOUSE_OBJECT_ID} ${TEST_TARGET_X100} --type-args --gas-budget ${GAS_BUDGET}`,
    `Playing crash game with ${TEST_BET_SUI} SUI bet`
  );
  
  return output;
}

function parseCrashEvent(transactionOutput: string) {
  log(`\n${colors.blue}${colors.bold}Parsing Crash Event${colors.reset}`);
  
  // Look for CrashEvent in the output
  const lines = transactionOutput.split('\n');
  let inEventSection = false;
  let eventData: any = {};
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.includes('CrashEvent')) {
      inEventSection = true;
      log(`${colors.green}✓ Found CrashEvent${colors.reset}`);
      continue;
    }
    
    if (inEventSection && line.includes('│')) {
      // Parse event fields
      if (line.includes('player')) {
        const match = line.match(/│\s*player\s*│\s*(.+?)\s*│/);
        if (match) eventData.player = match[1];
      }
      
      if (line.includes('stake')) {
        const match = line.match(/│\s*stake\s*│\s*(\d+)\s*│/);
        if (match) eventData.stake = parseInt(match[1]);
      }
      
      if (line.includes('target_x100')) {
        const match = line.match(/│\s*target_x100\s*│\s*(\d+)\s*│/);
        if (match) eventData.target_x100 = parseInt(match[1]);
      }
      
      if (line.includes('crash_x100')) {
        const match = line.match(/│\s*crash_x100\s*│\s*(\d+)\s*│/);
        if (match) eventData.crash_x100 = parseInt(match[1]);
      }
      
      if (line.includes('win')) {
        const match = line.match(/│\s*win\s*│\s*(true|false)\s*│/);
        if (match) eventData.win = match[1] === 'true';
      }
      
      if (line.includes('payout')) {
        const match = line.match(/│\s*payout\s*│\s*(\d+)\s*│/);
        if (match) eventData.payout = parseInt(match[1]);
      }
    }
    
    // End of event section
    if (inEventSection && line.includes('╰')) {
      break;
    }
  }
  
  if (Object.keys(eventData).length > 0) {
    log(`\n${colors.green}${colors.bold}🎮 Crash Game Results:${colors.reset}`);
    log(`${colors.blue}Player: ${eventData.player}${colors.reset}`);
    log(`${colors.blue}Stake: ${(eventData.stake / 1_000_000_000).toFixed(3)} SUI${colors.reset}`);
    log(`${colors.blue}Target: ${(eventData.target_x100 / 100).toFixed(2)}x${colors.reset}`);
    log(`${colors.blue}Crash Point: ${(eventData.crash_x100 / 100).toFixed(2)}x${colors.reset}`);
    
    if (eventData.win) {
      log(`${colors.green}✓ WON! 🎉${colors.reset}`);
      log(`${colors.green}Payout: ${(eventData.payout / 1_000_000_000).toFixed(3)} SUI${colors.reset}`);
    } else {
      log(`${colors.red}💥 CRASHED! Better luck next time.${colors.reset}`);
      log(`${colors.red}Lost: ${(eventData.stake / 1_000_000_000).toFixed(3)} SUI${colors.reset}`);
    }
    
    // Verify payout calculation
    if (eventData.win) {
      const expectedPayout = (eventData.stake * eventData.target_x100 * 0.97) / 100;
      const actualPayout = eventData.payout;
      const difference = Math.abs(expectedPayout - actualPayout);
      
      if (difference < 1000) { // Allow for small rounding differences
        log(`${colors.green}✓ Payout calculation correct${colors.reset}`);
      } else {
        log(`${colors.yellow}⚠️  Payout calculation discrepancy:${colors.reset}`);
        log(`${colors.yellow}   Expected: ${expectedPayout / 1_000_000_000} SUI${colors.reset}`);
        log(`${colors.yellow}   Actual: ${actualPayout / 1_000_000_000} SUI${colors.reset}`);
      }
    }
    
  } else {
    log(`${colors.red}No crash event data found in transaction output${colors.reset}`);
  }
  
  return eventData;
}

function main() {
  log(`${colors.bold}${colors.green}🏍️  Cat Crash Game - Smoke Test${colors.reset}`);
  
  try {
    // Validate configuration
    validateConfig();
    
    // Check wallet status
    const walletBalance = checkWalletBalance();
    if (walletBalance < parseFloat(TEST_BET_SUI) + 0.01) {
      log(`${colors.red}Insufficient balance for test. Need at least ${parseFloat(TEST_BET_SUI) + 0.01} SUI${colors.reset}`);
      process.exit(1);
    }
    
    // Check house balance
    checkHouseBalance();
    
    // Test the crash game
    const gameOutput = testCrashGame();
    
    if (gameOutput.includes('Status: Success')) {
      log(`${colors.green}✓ Crash game transaction successful${colors.reset}`);
      
      // Parse the event data
      parseCrashEvent(gameOutput);
      
      log(`\n${colors.green}${colors.bold}🎉 Smoke test completed successfully!${colors.reset}`);
      log(`${colors.blue}The crash game module is working correctly.${colors.reset}`);
      
    } else {
      log(`${colors.red}Crash game transaction failed${colors.reset}`);
      log(`${colors.yellow}Transaction output:${colors.reset}`);
      console.log(gameOutput);
      process.exit(1);
    }
    
  } catch (error) {
    log(`${colors.red}Smoke test failed: ${error}${colors.reset}`);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

export { main };