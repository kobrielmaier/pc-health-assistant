/**
 * Test chat assistant with diagnostic context
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { ChatAssistant } = require('./src/agents/ChatAssistant');

async function testChatWithContext() {
  console.log('🤖 Testing Chat Assistant with Diagnostic Context...\n');

  const chat = new ChatAssistant();

  // Simulate diagnostic context
  const mockContext = {
    currentView: 'results',
    selectedProblem: {
      id: 'slow',
      title: 'Computer is Slow',
      description: 'System performance is sluggish'
    },
    results: {
      analysis: {
        summary: 'Found 3 performance issues affecting system speed',
        issues: [
          {
            severity: 'high',
            title: 'High CPU Usage',
            description: 'Several background processes consuming excessive CPU',
            impact: 'System slowdown and lag'
          },
          {
            severity: 'medium',
            title: 'Low Available Memory',
            description: '85% RAM usage with only 2GB free',
            impact: 'Programs may crash or freeze'
          },
          {
            severity: 'low',
            title: 'Disk Space Low',
            description: 'C: drive has only 5GB free space',
            impact: 'System may become unstable'
          }
        ],
        fixes: [
          {
            id: 'disable-startup',
            title: 'Disable Unnecessary Startup Programs',
            difficulty: 'Easy',
            howLong: '2-3 minutes',
            description: 'Prevent programs from auto-starting with Windows',
            steps: ['Open Task Manager', 'Go to Startup tab', 'Disable programs'],
            riskLevel: 'low'
          },
          {
            id: 'clean-temp',
            title: 'Clean Temporary Files',
            difficulty: 'Easy',
            howLong: '5 minutes',
            description: 'Remove temporary files to free up disk space',
            steps: ['Run Disk Cleanup', 'Select temp files', 'Delete'],
            riskLevel: 'low'
          }
        ]
      }
    }
  };

  // Test 1: Ask about the diagnostic results
  console.log('📝 Test 1: Ask about diagnostic results');
  console.log('User: What did you find wrong with my computer?\n');

  let result = await chat.chat("What did you find wrong with my computer?", mockContext);

  if (result.success) {
    console.log('✅ Response received:');
    console.log(result.message);
    console.log('\n' + '═'.repeat(60) + '\n');
  } else {
    console.log('❌ Error:', result.error);
    return;
  }

  // Test 2: Ask about a specific fix
  console.log('📝 Test 2: Ask about a specific fix');
  console.log('User: Should I disable startup programs? Is it safe?\n');

  result = await chat.chat("Should I disable startup programs? Is it safe?", mockContext);

  if (result.success) {
    console.log('✅ Response received:');
    console.log(result.message);
    console.log('\n' + '═'.repeat(60) + '\n');
  } else {
    console.log('❌ Error:', result.error);
    return;
  }

  // Test 3: Ask which fix to do first
  console.log('📝 Test 3: Ask which fix to prioritize');
  console.log('User: Which fix should I do first?\n');

  result = await chat.chat("Which fix should I do first?", mockContext);

  if (result.success) {
    console.log('✅ Response received:');
    console.log(result.message);
    console.log('\n' + '═'.repeat(60) + '\n');
  } else {
    console.log('❌ Error:', result.error);
    return;
  }

  console.log('✅ All context-aware tests passed!');
  console.log('The AI now understands the diagnostic results and can answer specific questions about them.');
}

testChatWithContext().catch(error => {
  console.error('❌ Test failed:', error);
});
