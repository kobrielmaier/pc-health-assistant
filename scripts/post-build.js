/**
 * Post-build script to embed admin manifest into the executable (Windows only)
 * This is needed because signAndEditExecutable: false prevents electron-builder
 * from embedding the manifest automatically due to winCodeSign symlink issues on Windows
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const projectRoot = path.join(__dirname, '..');

// Only run on Windows - macOS doesn't need admin manifest embedding
if (process.platform !== 'win32') {
  console.log('Post-build: Skipping admin manifest embedding (not Windows)');
  console.log('Platform:', process.platform);
  process.exit(0);
}

const exePath = path.join(projectRoot, 'dist', 'win-unpacked', 'PC Health Assistant.exe');
const rceditPath = path.join(projectRoot, 'node_modules', 'rcedit', 'bin', 'rcedit-x64.exe');

console.log('Post-build: Embedding admin manifest into executable...');

if (!fs.existsSync(exePath)) {
  console.error('Error: Executable not found at:', exePath);
  console.log('This may be normal if building for a different platform.');
  process.exit(0); // Don't fail - might be building for another platform
}

if (!fs.existsSync(rceditPath)) {
  console.error('Error: rcedit not found at:', rceditPath);
  console.log('Trying alternative rcedit location...');

  // Try alternative location
  const altRceditPath = path.join(projectRoot, 'node_modules', '.bin', 'rcedit.exe');
  if (fs.existsSync(altRceditPath)) {
    console.log('Found rcedit at:', altRceditPath);
  } else {
    console.error('rcedit not found. Please install it: npm install rcedit');
    process.exit(1);
  }
}

try {
  // Set the requested execution level to requireAdministrator
  console.log('Setting execution level to requireAdministrator...');
  execSync(`"${rceditPath}" "${exePath}" --set-requested-execution-level requireAdministrator`, {
    stdio: 'inherit'
  });

  console.log('Successfully embedded admin manifest!');
} catch (error) {
  console.error('Failed to embed manifest:', error.message);

  // Try alternative approach using rcedit from .bin
  try {
    const altRceditPath = path.join(projectRoot, 'node_modules', '.bin', 'rcedit.exe');
    execSync(`"${altRceditPath}" "${exePath}" --set-requested-execution-level requireAdministrator`, {
      stdio: 'inherit'
    });
    console.log('Successfully embedded admin manifest (using .bin rcedit)!');
  } catch (altError) {
    console.error('Alternative approach also failed:', altError.message);
    process.exit(1);
  }
}
