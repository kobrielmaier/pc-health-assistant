/**
 * Test a single diagnostic type to debug JSON issues
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { DiagnosticAgent } = require('./src/agents/DiagnosticAgent');

async function testSingleDiagnostic(type) {
  console.log(`Testing diagnostic type: ${type}\n`);

  try {
    const agent = new DiagnosticAgent();
    const results = await agent.investigate(type);

    console.log('\n✅ SUCCESS!');
    console.log('Analysis:', JSON.stringify(results.analysis, null, 2));

  } catch (error) {
    console.log('\n❌ FAILED!');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

const diagnosticType = process.argv[2] || 'error';
testSingleDiagnostic(diagnosticType);
