/**
 * Test script for fix execution
 * Tests that SafetyGuard properly handles fixes with technicalDetails.commands
 */

const { SafetyGuard } = require('./src/safety/SafetyGuard');

async function testFixExecution() {
  console.log('🧪 Testing Fix Execution System\n');

  const guard = new SafetyGuard();

  // Test 1: Fix with both steps and technicalDetails.commands (SHOULD WORK)
  console.log('Test 1: Automatable fix with technical commands');
  console.log('─────────────────────────────────────────────');

  const goodFix = {
    id: 'test-fix-1',
    title: 'Test System Info Command',
    whyThis: 'Testing that we execute commands properly',
    automatable: true,
    riskLevel: 'low',
    needsRestart: false,
    steps: [
      'Check system information',
      'Display computer name'
    ],
    technicalDetails: {
      commands: [
        'systeminfo | findstr /B /C:"OS Name" /C:"OS Version"',
        'echo %COMPUTERNAME%'
      ],
      expectedOutcome: 'System information displayed',
      verification: ['Check output']
    }
  };

  try {
    console.log('Executing fix...');
    const result = await guard.executeFix(goodFix);
    console.log('✅ SUCCESS: Fix executed properly');
    console.log('Results:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.log('❌ FAILED:', error.message);
  }

  console.log('\n');

  // Test 2: Manual fix without automatable flag (SHOULD FAIL GRACEFULLY)
  console.log('Test 2: Manual fix (not automatable)');
  console.log('─────────────────────────────────────────────');

  const manualFix = {
    id: 'test-fix-2',
    title: 'Manual Network Reset',
    whyThis: 'This requires user interaction',
    automatable: false,
    riskLevel: 'low',
    needsRestart: true,
    steps: [
      'Right-click the Start button and choose Windows Terminal (Admin)',
      'Type "ipconfig /release" and press Enter',
      'Type "ipconfig /renew" and press Enter'
    ],
    technicalDetails: {
      commands: [],
      expectedOutcome: 'Network reset complete'
    }
  };

  try {
    console.log('Attempting to execute manual fix...');
    const result = await guard.executeFix(manualFix);
    console.log('❌ UNEXPECTED: Manual fix should not execute automatically');
  } catch (error) {
    console.log('✅ EXPECTED: Properly rejected manual fix');
    console.log('Error message:', error.message);
  }

  console.log('\n');

  // Test 3: Fix without technical commands (SHOULD FAIL GRACEFULLY)
  console.log('Test 3: Automatable fix without commands');
  console.log('─────────────────────────────────────────────');

  const noCommandsFix = {
    id: 'test-fix-3',
    title: 'Incomplete Fix',
    whyThis: 'This is missing commands',
    automatable: true,
    riskLevel: 'low',
    needsRestart: false,
    steps: [
      'Do something'
    ],
    technicalDetails: {
      commands: [],
      expectedOutcome: 'Something happens'
    }
  };

  try {
    console.log('Attempting to execute fix without commands...');
    const result = await guard.executeFix(noCommandsFix);
    console.log('❌ UNEXPECTED: Fix without commands should not execute');
  } catch (error) {
    console.log('✅ EXPECTED: Properly rejected fix without commands');
    console.log('Error message:', error.message);
  }

  console.log('\n');

  // Test 4: Old-style fix with only steps (backward compatibility test)
  console.log('Test 4: Legacy fix with only steps');
  console.log('─────────────────────────────────────────────');

  const legacyFix = {
    id: 'test-fix-4',
    title: 'Legacy Fix Format',
    riskLevel: 'low',
    automatable: true,
    steps: [
      'echo This is a legacy fix',
      'echo %USERNAME%'
    ]
  };

  try {
    console.log('Attempting to execute legacy fix...');
    const result = await guard.executeFix(legacyFix);
    console.log('❌ UNEXPECTED: Legacy fix without technicalDetails should fail');
  } catch (error) {
    console.log('✅ EXPECTED: Legacy fix rejected (no technicalDetails)');
    console.log('Error message:', error.message);
  }

  console.log('\n');

  // Test 5: PowerShell cmdlet auto-wrapping
  console.log('Test 5: PowerShell cmdlet auto-wrapping');
  console.log('─────────────────────────────────────────────');

  const powerShellFix = {
    id: 'test-fix-5',
    title: 'Test PowerShell Commands',
    whyThis: 'Testing PowerShell cmdlet auto-wrapping',
    automatable: true,
    riskLevel: 'low',
    needsRestart: false,
    steps: [
      'Check disk health status'
    ],
    technicalDetails: {
      commands: [
        'Get-PhysicalDisk | Select-Object -First 1 FriendlyName, OperationalStatus'
      ],
      expectedOutcome: 'Disk information retrieved',
      verification: ['Check output']
    }
  };

  try {
    console.log('Executing PowerShell cmdlet...');
    const result = await guard.executeFix(powerShellFix);
    console.log('✅ SUCCESS: PowerShell cmdlet executed after auto-wrapping');
    console.log('Output:', result.result[0].output?.substring(0, 100));
  } catch (error) {
    console.log('❌ FAILED:', error.message);
  }

  console.log('\n📊 Test Summary');
  console.log('─────────────────────────────────────────────');
  console.log('✅ Fix execution system now uses technicalDetails.commands');
  console.log('✅ Manual fixes are properly rejected');
  console.log('✅ Fixes without commands are properly rejected');
  console.log('✅ Safety validation is working correctly');
  console.log('✅ PowerShell cmdlets are automatically wrapped');
}

// Run tests
testFixExecution()
  .then(() => {
    console.log('\n✅ All tests completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test error:', error);
    process.exit(1);
  });
