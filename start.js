#!/usr/bin/env node

/**
 * WhatsApp Bot Starter Script
 * This script performs pre-flight checks before starting the bot
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
require('dotenv').config();

console.log('🚀 WhatsApp Bot Starter\n');
console.log('━'.repeat(50));

// Check if config.js exists
if (!fs.existsSync('./config.js')) {
  console.error('❌ config.js not found!');
  console.log('Please make sure config.js exists in the project directory.');
  process.exit(1);
}

// Check Node.js version
const nodeVersion = process.versions.node.split('.')[0];
if (parseInt(nodeVersion) < 14) {
  console.error(`❌ Node.js version ${process.versions.node} is not supported.`);
  console.log('Please upgrade to Node.js v14 or higher.');
  process.exit(1);
}

console.log(`✅ Node.js version: ${process.versions.node}`);

// Check if node_modules exists
if (!fs.existsSync('./node_modules')) {
  console.log('⚠️  node_modules not found. Running npm install...\n');
  try {
    execSync('npm install', { stdio: 'inherit' });
    console.log('\n✅ Dependencies installed successfully!\n');
  } catch (error) {
    console.error('❌ Failed to install dependencies.');
    console.log('Please run: npm install');
    process.exit(1);
  }
}

// Load and validate config
try {
  const config = require('./config.js');

  console.log('\n📋 Configuration:');
  console.log(`   Auto-Reply: ${config.autoReply.enabled ? '✅ Enabled' : '❌ Disabled'}`);
  console.log(`   Auto-Send: ${config.autoSend.enabled ? '✅ Enabled' : '❌ Disabled'}`);

  if (config.autoReply.enabled) {
    const keywordCount = Object.keys(config.autoReply.keywords).length;
    console.log(`   Keywords configured: ${keywordCount}`);
  }

  if (config.autoSend.enabled) {
    console.log(`   Scheduled messages: ${config.autoSend.messages.length}`);
  }

  // Check for Google Calendar credentials if enabled
  if (config.aiBot.calendar && config.aiBot.calendar.enabled) {
    const credPath = config.aiBot.calendar.credentialsPath;
    const absolutePath = path.resolve(credPath);
    if (!fs.existsSync(credPath)) {
      console.log(`   Calendar Integration: ❌ Credentials file missing!`);
      console.warn(`   ⚠️  Warning: ${credPath} was not found.`);
      console.log(`      To use the calendar, please place your Service Account JSON key at: ${absolutePath}`);
    } else {
      console.log(`   Calendar Integration: ✅ Credentials file found`);
    }

    if (!config.aiBot.calendar.calendarId) {
      console.log(`   Calendar ID: ❌ Missing!`);
      console.error(`   ⚠️  Error: calendarId is not defined in config.js or .env`);
      console.log(`      Please add CALENDAR_ID=your-email@gmail.com to your .env file.`);
    } else {
      console.log(`   Calendar ID: ✅ ${config.aiBot.calendar.calendarId}`);
    }
  }

} catch (error) {
  console.error('❌ Error loading config.js:', error.message);
  process.exit(1);
}

console.log('\n━'.repeat(50));
console.log('Starting WhatsApp Bot...\n');

// Start the bot
require('./index.js');
