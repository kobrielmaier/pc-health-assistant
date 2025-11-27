/**
 * Test what the UI actually receives from a diagnostic
 */

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { DiagnosticAgent } = require('./src/agents/DiagnosticAgent');

async function testUIOutput() {
  console.log('Running diagnostic to test UI output...\n');

  try {
    const agent = new DiagnosticAgent();
    const results = await agent.investigate('slow');

    // This is exactly what the UI receives
    console.log('═══════════════════════════════════════════════════');
    console.log('WHAT THE UI RECEIVES:');
    console.log('═══════════════════════════════════════════════════\n');

    console.log('results.analysis type:', typeof results.analysis);
    console.log('results.analysis is object:', results.analysis !== null && typeof results.analysis === 'object');
    console.log('results.analysis is string:', typeof results.analysis === 'string');
    console.log('\n');

    if (typeof results.analysis === 'string') {
      console.log('❌ PROBLEM: analysis is a STRING, not an object!');
      console.log('First 200 chars:', results.analysis.substring(0, 200));
    } else {
      console.log('✅ GOOD: analysis is an object');
      console.log('analysis.summary:', results.analysis.summary);
      console.log('analysis.issues:', results.analysis.issues?.length || 0, 'items');
      console.log('analysis.fixes:', results.analysis.fixes?.length || 0, 'items');

      if (results.analysis.issues && results.analysis.issues.length > 0) {
        console.log('\nFirst issue:');
        console.log(JSON.stringify(results.analysis.issues[0], null, 2));
      }

      if (results.analysis.fixes && results.analysis.fixes.length > 0) {
        console.log('\nFirst fix:');
        const fix = results.analysis.fixes[0];
        console.log('  Title:', fix.title);
        console.log('  Steps:', fix.steps?.length || 0, 'steps');
        if (fix.steps && fix.steps.length > 0) {
          console.log('  Step 1:', fix.steps[0]);
        }
      }
    }

    // Save to file for inspection
    fs.writeFileSync(
      path.join(__dirname, 'ui-test-output.json'),
      JSON.stringify(results, null, 2)
    );

    console.log('\n✅ Full results saved to ui-test-output.json');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testUIOutput();
