/**
 * Test the chat assistant functionality
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { ChatAssistant } = require('./src/agents/ChatAssistant');

async function testChat() {
  console.log('🤖 Testing Chat Assistant...\n');

  const chat = new ChatAssistant();

  // Test 1: Simple question
  console.log('📝 Test 1: Simple question');
  console.log('User: My computer is running slow\n');

  let result = await chat.chat("My computer is running slow");

  if (result.success) {
    console.log('✅ Response received:');
    console.log(result.message);
    console.log('\n' + '═'.repeat(60) + '\n');
  } else {
    console.log('❌ Error:', result.error);
    return;
  }

  // Test 2: Follow-up question
  console.log('📝 Test 2: Follow-up question');
  console.log('User: What should I do first?\n');

  result = await chat.chat("What should I do first?");

  if (result.success) {
    console.log('✅ Response received:');
    console.log(result.message);
    console.log('\n' + '═'.repeat(60) + '\n');
  } else {
    console.log('❌ Error:', result.error);
    return;
  }

  // Test 3: Check conversation history
  console.log('📝 Test 3: Conversation history');
  const history = chat.getHistory();
  console.log(`✅ History contains ${history.length} messages`);
  console.log('Messages:', history.map(m => `${m.role}: ${m.content.substring(0, 50)}...`));

  console.log('\n✅ All tests passed!');
}

testChat().catch(error => {
  console.error('❌ Test failed:', error);
});
