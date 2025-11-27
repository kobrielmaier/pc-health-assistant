/**
 * Automated Diagnostic Test Suite
 * Tests all diagnostic types to ensure they work properly
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { DiagnosticAgent } = require('./src/agents/DiagnosticAgent');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  bold: '\x1b[1m'
};

// Test results storage
const testResults = {
  passed: [],
  failed: [],
  warnings: []
};

/**
 * Test a single diagnostic type
 */
async function testDiagnostic(problemType, description) {
  console.log(`\n${colors.blue}${colors.bold}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.blue}Testing: ${description} (${problemType})${colors.reset}`);
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);

  const startTime = Date.now();
  const testResult = {
    type: problemType,
    description: description,
    success: false,
    duration: 0,
    errors: [],
    warnings: [],
    data: null
  };

  try {
    const agent = new DiagnosticAgent();
    console.log('  ✓ DiagnosticAgent initialized');

    const results = await agent.investigate(problemType);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    testResult.duration = duration;

    console.log(`  ✓ Investigation completed in ${duration}s`);

    // Validate results structure
    if (!results) {
      throw new Error('No results returned');
    }
    console.log('  ✓ Results object exists');

    if (!results.analysis) {
      throw new Error('No analysis in results');
    }
    console.log('  ✓ Analysis object exists');

    // Check analysis structure
    const { analysis } = results;

    if (typeof analysis.summary !== 'string') {
      testResult.warnings.push('Summary is not a string');
      console.log(`  ${colors.yellow}⚠ Warning: Summary is not a string${colors.reset}`);
    } else {
      console.log(`  ✓ Summary: "${analysis.summary.substring(0, 80)}..."`);
    }

    if (!Array.isArray(analysis.issues)) {
      testResult.warnings.push('Issues is not an array');
      console.log(`  ${colors.yellow}⚠ Warning: Issues is not an array${colors.reset}`);
    } else {
      console.log(`  ✓ Issues array: ${analysis.issues.length} issues found`);

      // Validate each issue
      analysis.issues.forEach((issue, idx) => {
        const requiredFields = ['severity', 'title', 'description'];
        const missingFields = requiredFields.filter(field => !issue[field]);

        if (missingFields.length > 0) {
          testResult.warnings.push(`Issue ${idx} missing: ${missingFields.join(', ')}`);
          console.log(`  ${colors.yellow}⚠ Issue ${idx} missing fields: ${missingFields.join(', ')}${colors.reset}`);
        } else {
          console.log(`  ✓ Issue ${idx}: [${issue.severity}] ${issue.title}`);
        }
      });
    }

    if (!Array.isArray(analysis.fixes)) {
      testResult.warnings.push('Fixes is not an array');
      console.log(`  ${colors.yellow}⚠ Warning: Fixes is not an array${colors.reset}`);
    } else {
      console.log(`  ✓ Fixes array: ${analysis.fixes.length} fixes recommended`);

      // Validate each fix
      analysis.fixes.forEach((fix, idx) => {
        const requiredFields = ['title', 'steps'];
        const missingFields = requiredFields.filter(field => !fix[field]);

        if (missingFields.length > 0) {
          testResult.warnings.push(`Fix ${idx} missing: ${missingFields.join(', ')}`);
          console.log(`  ${colors.yellow}⚠ Fix ${idx} missing fields: ${missingFields.join(', ')}${colors.reset}`);
        } else {
          console.log(`  ✓ Fix ${idx}: ${fix.title} (${fix.steps.length} steps)`);
        }
      });
    }

    testResult.success = true;
    testResult.data = {
      summary: analysis.summary,
      issueCount: analysis.issues?.length || 0,
      fixCount: analysis.fixes?.length || 0
    };

    console.log(`${colors.green}${colors.bold}✓ TEST PASSED${colors.reset}`);
    testResults.passed.push(testResult);

  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    testResult.duration = duration;
    testResult.errors.push(error.message);
    testResult.success = false;

    console.log(`${colors.red}✗ TEST FAILED: ${error.message}${colors.reset}`);
    console.log(`${colors.red}  Stack: ${error.stack}${colors.reset}`);
    testResults.failed.push(testResult);
  }

  return testResult;
}

/**
 * Run all diagnostic tests
 */
async function runAllTests() {
  console.log(`${colors.bold}
╔════════════════════════════════════════════════════════════╗
║     PC Health Assistant - Diagnostic Test Suite           ║
╚════════════════════════════════════════════════════════════╝
${colors.reset}`);

  // Check API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log(`${colors.red}${colors.bold}ERROR: ANTHROPIC_API_KEY not found in environment${colors.reset}`);
    console.log(`${colors.yellow}Please create a .env file with your API key${colors.reset}`);
    process.exit(1);
  }

  console.log(`${colors.green}✓ ANTHROPIC_API_KEY found${colors.reset}`);
  console.log(`Starting tests at: ${new Date().toLocaleString()}\n`);

  // Define all diagnostic types to test
  const diagnosticTypes = [
    { type: 'crash', description: 'Program/Game Keeps Crashing' },
    { type: 'slow', description: 'Computer is Slow' },
    { type: 'error', description: 'Getting Error Messages' },
    { type: 'hardware', description: 'Hardware Not Working' },
    { type: 'network', description: 'Internet Problems' },
    { type: 'full-scan', description: 'Complete System Scan' }
  ];

  // Run tests sequentially
  for (const diagnostic of diagnosticTypes) {
    await testDiagnostic(diagnostic.type, diagnostic.description);

    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Print final report
  printTestReport();
}

/**
 * Print comprehensive test report
 */
function printTestReport() {
  console.log(`\n${colors.bold}
╔════════════════════════════════════════════════════════════╗
║                      TEST REPORT                           ║
╚════════════════════════════════════════════════════════════╝
${colors.reset}`);

  const totalTests = testResults.passed.length + testResults.failed.length;
  const passRate = ((testResults.passed.length / totalTests) * 100).toFixed(1);

  console.log(`Total Tests:  ${totalTests}`);
  console.log(`${colors.green}Passed:       ${testResults.passed.length}${colors.reset}`);
  console.log(`${colors.red}Failed:       ${testResults.failed.length}${colors.reset}`);
  console.log(`Pass Rate:    ${passRate}%\n`);

  // Passed tests summary
  if (testResults.passed.length > 0) {
    console.log(`${colors.green}${colors.bold}✓ PASSED TESTS:${colors.reset}`);
    testResults.passed.forEach(test => {
      console.log(`  ${colors.green}✓${colors.reset} ${test.description}`);
      console.log(`    Duration: ${test.duration}s`);
      console.log(`    Issues: ${test.data.issueCount}, Fixes: ${test.data.fixCount}`);
      if (test.warnings.length > 0) {
        console.log(`    ${colors.yellow}Warnings: ${test.warnings.length}${colors.reset}`);
      }
    });
    console.log('');
  }

  // Failed tests summary
  if (testResults.failed.length > 0) {
    console.log(`${colors.red}${colors.bold}✗ FAILED TESTS:${colors.reset}`);
    testResults.failed.forEach(test => {
      console.log(`  ${colors.red}✗${colors.reset} ${test.description}`);
      console.log(`    Duration: ${test.duration}s`);
      test.errors.forEach(error => {
        console.log(`    ${colors.red}Error: ${error}${colors.reset}`);
      });
    });
    console.log('');
  }

  // Warnings summary
  const allWarnings = testResults.passed.filter(t => t.warnings.length > 0);
  if (allWarnings.length > 0) {
    console.log(`${colors.yellow}${colors.bold}⚠ WARNINGS:${colors.reset}`);
    allWarnings.forEach(test => {
      console.log(`  ${test.description}:`);
      test.warnings.forEach(warning => {
        console.log(`    ${colors.yellow}⚠${colors.reset} ${warning}`);
      });
    });
    console.log('');
  }

  // Save report to file
  const reportPath = path.join(__dirname, 'test-report.json');
  const reportData = {
    timestamp: new Date().toISOString(),
    summary: {
      total: totalTests,
      passed: testResults.passed.length,
      failed: testResults.failed.length,
      passRate: passRate
    },
    results: [...testResults.passed, ...testResults.failed]
  };

  require('fs').writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
  console.log(`${colors.blue}Full report saved to: ${reportPath}${colors.reset}\n`);

  // Exit with error code if tests failed
  if (testResults.failed.length > 0) {
    process.exit(1);
  }
}

// Run the tests
runAllTests().catch(error => {
  console.error(`${colors.red}${colors.bold}Fatal error running tests:${colors.reset}`, error);
  process.exit(1);
});
