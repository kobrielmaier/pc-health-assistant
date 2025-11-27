/**
 * Test script to verify 10/10 improvements
 * Tests: Priority, Confidence, Filtering, Automation, Consistency
 */

const { DiagnosticAgent } = require('./src/agents/DiagnosticAgent');

async function test10OutOf10Improvements() {
  console.log('🧪 Testing 10/10 Improvements...\n');
  console.log('='.repeat(60));

  try {
    const agent = new DiagnosticAgent();

    // Test 1: Run diagnostic and check for new fields
    console.log('\n📊 Test 1: Running comprehensive diagnostic...');
    const result = await agent.analyze('crash', {
      // Mock investigation data
      eventLog: {
        errors: [{id: 7, message: 'Bad block', daysAgo: 15, isRecent: false}],
        recentCount: 1
      },
      disk: {
        healthStatus: [{isHealthy: true}]
      },
      crashDumps: [],
      drivers: []
    });

    if (!result) {
      console.error('❌ Failed: No analysis returned');
      return;
    }

    const { issues = [], fixes = [] } = result;

    // Test 2: Check for priority fields
    console.log('\n🔸 Test 2: Checking Priority System...');
    let priorityCount = 0;
    issues.forEach((issue, idx) => {
      if (issue.priority) {
        priorityCount++;
        console.log(`  ✅ Issue ${idx + 1} has priority: ${issue.priority}`);
      } else {
        console.log(`  ⚠️  Issue ${idx + 1} missing priority field`);
      }
    });
    console.log(`  📈 ${priorityCount}/${issues.length} issues have priority`);

    // Test 3: Check for confidence fields
    console.log('\n☑️  Test 3: Checking Confidence System...');
    let confidenceCount = 0;
    issues.forEach((issue, idx) => {
      if (issue.confidence !== undefined) {
        confidenceCount++;
        const conf = Math.round(issue.confidence * 100);
        console.log(`  ✅ Issue ${idx + 1} confidence: ${conf}%`);
      } else {
        console.log(`  ⚠️  Issue ${idx + 1} missing confidence field`);
      }
    });
    console.log(`  📈 ${confidenceCount}/${issues.length} issues have confidence`);

    // Test 4: Check for actionable fields
    console.log('\n✔️  Test 4: Checking Actionable Filtering...');
    let actionableCount = 0;
    issues.forEach((issue, idx) => {
      if (issue.actionable !== undefined) {
        actionableCount++;
        console.log(`  ${issue.actionable ? '✅' : '❌'} Issue ${idx + 1} actionable: ${issue.actionable}`);
      }
    });
    console.log(`  📈 ${actionableCount}/${issues.length} issues have actionable field`);

    // Test 5: Check for timeToFix fields
    console.log('\n⏰ Test 5: Checking Time-to-Fix Indicators...');
    let timeToFixCount = 0;
    issues.forEach((issue, idx) => {
      if (issue.timeToFix) {
        timeToFixCount++;
        console.log(`  ✅ Issue ${idx + 1} time to fix: "${issue.timeToFix}"`);
      }
    });
    console.log(`  📈 ${timeToFixCount}/${issues.length} issues have time-to-fix`);

    // Test 6: Check automation improvements
    console.log('\n✨ Test 6: Checking Fix Automation...');
    let automatableCount = 0;
    fixes.forEach((fix, idx) => {
      if (fix.automatable) {
        automatableCount++;
        console.log(`  ✅ Fix ${idx + 1}: "${fix.title}" is automatable`);
        if (fix.technicalDetails?.commands?.length > 0) {
          console.log(`     Commands: ${fix.technicalDetails.commands.slice(0, 2).join(', ')}`);
        }
      } else {
        console.log(`  ⚪ Fix ${idx + 1}: "${fix.title}" requires manual steps`);
      }
    });
    console.log(`  📈 ${automatableCount}/${fixes.length} fixes are automatable (Target: >50%)`);

    // Test 7: Verify filtering (low confidence issues should be removed)
    console.log('\n🔍 Test 7: Verifying Issue Filtering...');
    let allHighConfidence = true;
    issues.forEach((issue, idx) => {
      const conf = issue.confidence !== undefined ? issue.confidence : 0.8;
      if (conf < 0.7) {
        console.log(`  ❌ Issue ${idx + 1} has low confidence (${Math.round(conf * 100)}%) but wasn't filtered`);
        allHighConfidence = false;
      }
    });
    if (allHighConfidence) {
      console.log(`  ✅ All issues meet confidence threshold (≥70%)`);
    }

    // Test 8: Verify priority sorting
    console.log('\n📊 Test 8: Verifying Priority Sorting...');
    const priorityOrder = {immediate: 1, high: 2, medium: 3, low: 4};
    let sortedCorrectly = true;
    for (let i = 1; i < issues.length; i++) {
      const prevPriority = priorityOrder[issues[i-1].priority] || 5;
      const currPriority = priorityOrder[issues[i].priority] || 5;
      if (prevPriority > currPriority) {
        console.log(`  ❌ Issue ${i} has higher priority than Issue ${i+1} (bad sort)`);
        sortedCorrectly = false;
      }
    }
    if (sortedCorrectly) {
      console.log(`  ✅ Issues are sorted by priority correctly`);
      issues.forEach((issue, idx) => {
        console.log(`     ${idx + 1}. [${issue.priority || 'N/A'}] ${issue.title}`);
      });
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 IMPROVEMENT SCORES:');
    console.log('='.repeat(60));

    const scores = {
      'Priority System': priorityCount === issues.length ? 10 : Math.round((priorityCount / issues.length) * 10),
      'Confidence Levels': confidenceCount === issues.length ? 10 : Math.round((confidenceCount / issues.length) * 10),
      'Actionable Filtering': actionableCount > 0 ? 10 : 5,
      'Urgency Indicators': timeToFixCount === issues.length ? 10 : Math.round((timeToFixCount / issues.length) * 10),
      'Fix Automation': automatableCount >= fixes.length * 0.5 ? 10 : Math.round((automatableCount / fixes.length) * 10),
      'Issue Filtering': allHighConfidence ? 10 : 5,
      'Priority Sorting': sortedCorrectly ? 10 : 5
    };

    Object.entries(scores).forEach(([category, score]) => {
      const bar = '█'.repeat(score) + '░'.repeat(10 - score);
      console.log(`${category.padEnd(25)} [${bar}] ${score}/10`);
    });

    const avgScore = Object.values(scores).reduce((a, b) => a + b, 0) / Object.keys(scores).length;
    console.log('='.repeat(60));
    console.log(`🎯 OVERALL SCORE: ${avgScore.toFixed(1)}/10`);
    console.log('='.repeat(60));

    if (avgScore >= 9.5) {
      console.log('🎉 EXCELLENT! All improvements working perfectly!');
    } else if (avgScore >= 8) {
      console.log('✅ GOOD! Most improvements working well.');
    } else {
      console.log('⚠️  NEEDS WORK: Some improvements not functioning correctly.');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error);
    console.error(error.stack);
  }
}

// Run the test
test10OutOf10Improvements().then(() => {
  console.log('\n✅ Test complete!');
}).catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
