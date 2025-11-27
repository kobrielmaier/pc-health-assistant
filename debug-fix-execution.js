/**
 * Debug script to trace fix execution step-by-step
 * This will show us exactly where the failure occurs
 */

const { SafetyGuard } = require('./src/safety/SafetyGuard');

// Mock a fix that's similar to what Claude would generate
const testFix = {
  id: 'debug-disk-check',
  title: 'Check How Bad Your Hard Drive Is',
  whyThis: 'Your hard drive has errors and bad blocks',
  automatable: true,
  riskLevel: 'low',
  needsRestart: false,
  steps: [
    'Check basic disk status',
    'Get detailed disk information',
    'Check physical disk health'
  ],
  technicalDetails: {
    commands: [
      'wmic diskdrive get status',
      'wmic diskdrive get status,model,serialnumber',
      'Get-PhysicalDisk | Select-Object FriendlyName, OperationalStatus, HealthStatus'
    ],
    expectedOutcome: 'Disk health status displayed',
    verification: [
      'Status should display as OK, Pred Fail, Error, or Unknown',
      'Pred Fail or Error indicates imminent drive failure'
    ]
  }
};

console.log('═══════════════════════════════════════════════');
console.log('  DEBUG: Fix Execution Trace');
console.log('═══════════════════════════════════════════════\n');

console.log('📋 Fix Structure:');
console.log('─────────────────────────────────────────────');
console.log('Title:', testFix.title);
console.log('Automatable:', testFix.automatable);
console.log('Risk Level:', testFix.riskLevel);
console.log('\n📝 Human-readable steps:');
testFix.steps.forEach((step, i) => {
  console.log(`  ${i + 1}. ${step}`);
});
console.log('\n💻 Technical commands:');
testFix.technicalDetails.commands.forEach((cmd, i) => {
  console.log(`  ${i + 1}. ${cmd}`);
});

console.log('\n');
console.log('═══════════════════════════════════════════════');
console.log('  EXECUTION START');
console.log('═══════════════════════════════════════════════\n');

async function debugExecute() {
  const guard = new SafetyGuard();

  // Attach progress listener to see all stages
  guard.onProgress = (progress) => {
    console.log(`📊 [${progress.stage}] ${progress.percentage}% - ${progress.message}`);
    if (progress.command) {
      console.log(`   Command: ${progress.command}`);
    }
    if (progress.output) {
      console.log(`   Output: ${progress.output.substring(0, 100)}...`);
    }
    if (progress.error) {
      console.log(`   ❌ Error: ${progress.error}`);
    }
  };

  try {
    console.log('Starting executeFix()...\n');
    const result = await guard.executeFix(testFix);

    console.log('\n');
    console.log('═══════════════════════════════════════════════');
    console.log('  ✅ EXECUTION SUCCESSFUL');
    console.log('═══════════════════════════════════════════════\n');

    console.log('Results:');
    result.result.forEach((stepResult, i) => {
      console.log(`\nStep ${i + 1}:`);
      console.log(`  Command: ${stepResult.command}`);
      console.log(`  Success: ${stepResult.success}`);
      if (stepResult.output) {
        console.log(`  Output:\n${stepResult.output.split('\n').map(l => '    ' + l).join('\n')}`);
      }
      if (stepResult.error && stepResult.error.trim()) {
        console.log(`  Stderr:\n${stepResult.error.split('\n').map(l => '    ' + l).join('\n')}`);
      }
    });

  } catch (error) {
    console.log('\n');
    console.log('═══════════════════════════════════════════════');
    console.log('  ❌ EXECUTION FAILED');
    console.log('═══════════════════════════════════════════════\n');

    console.log('Error Message:', error.message);
    console.log('\nError Stack:');
    console.log(error.stack);

    // Try to extract more details
    if (error.message.includes('Step')) {
      const stepMatch = error.message.match(/Step (\d+)/);
      if (stepMatch) {
        const stepNum = parseInt(stepMatch[1]);
        console.log(`\n🔍 Failed Step Analysis:`);
        console.log(`   Step Number: ${stepNum}`);
        console.log(`   Human Instruction: ${testFix.steps[stepNum - 1]}`);
        console.log(`   Technical Command: ${testFix.technicalDetails.commands[stepNum - 1]}`);

        // Test if PowerShell wrapping is working
        const cmd = testFix.technicalDetails.commands[stepNum - 1];
        const wrapped = guard.wrapPowerShellIfNeeded(cmd);
        console.log(`   Command after wrapping: ${wrapped}`);
      }
    }
  }
}

debugExecute()
  .then(() => {
    console.log('\n✅ Debug complete');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Debug script error:', err);
    process.exit(1);
  });
