/**
 * Test to verify IPC handlers are properly registered
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Check if the chat handlers exist in the main process file
const fs = require('fs');
const mainProcessCode = fs.readFileSync(path.join(__dirname, 'src/main/index.js'), 'utf8');

console.log('🔍 Checking for IPC handlers in main process...\n');

const handlers = [
  'send-chat-message',
  'clear-chat-history',
  'get-chat-history'
];

let allFound = true;

handlers.forEach(handler => {
  const found = mainProcessCode.includes(`ipcMain.handle('${handler}'`);
  if (found) {
    console.log(`✅ Handler found: ${handler}`);
  } else {
    console.log(`❌ Handler NOT found: ${handler}`);
    allFound = false;
  }
});

console.log('\n' + '═'.repeat(60));

if (allFound) {
  console.log('✅ All IPC handlers are registered in the main process!');
  console.log('\nℹ️  If you\'re getting "No handler registered" errors:');
  console.log('   1. Make sure the Electron app was fully restarted');
  console.log('   2. Close the app completely and run: npm run dev');
  console.log('   3. Check the console for "PC Health Assistant - Main process started"');
} else {
  console.log('❌ Some handlers are missing!');
}

console.log('═'.repeat(60));
