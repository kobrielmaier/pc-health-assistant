/**
 * Test the updated EventLogInvestigator time filtering
 * Verify it now marks events with recency information
 */

const { EventLogInvestigator } = require('./src/agents/investigators/EventLogInvestigator');

async function testEventLogFiltering() {
  console.log('═══════════════════════════════════════════════');
  console.log('  Testing Event Log Time Filtering');
  console.log('═══════════════════════════════════════════════\n');

  const investigator = new EventLogInvestigator();

  try {
    const results = await investigator.investigate({
      config: {
        logNames: ['Application', 'System'],
        timeRange: '7days',
        findPatterns: true
      }
    });

    console.log('📊 Event Log Analysis:\n');

    console.log(`Total errors found: ${results.errors.length}`);

    // Count recent vs old errors
    const recentErrors = results.errors.filter(e => e.isRecent);
    const oldErrors = results.errors.filter(e => e.isOld);
    const middleErrors = results.errors.filter(e => !e.isRecent && !e.isOld);

    console.log(`  - Recent (< 2 days): ${recentErrors.length}`);
    console.log(`  - Middle (2-7 days): ${middleErrors.length}`);
    console.log(`  - Old (> 7 days): ${oldErrors.length}`);

    console.log('\n🔍 Recent Errors (Current Issues):');
    console.log('─────────────────────────────────────────────');
    if (recentErrors.length > 0) {
      for (const error of recentErrors.slice(0, 5)) {
        console.log(`  ⚠️ ${error.source}`);
        console.log(`     When: ${error.daysAgo} days ago (${error.hoursAgo} hours)`);
        console.log(`     Message: ${error.message.substring(0, 80)}...`);
        console.log();
      }
    } else {
      console.log('  ✅ No recent errors found!');
    }

    console.log('\n📈 Error Patterns (Recurring Issues):');
    console.log('─────────────────────────────────────────────');
    if (results.patterns.length > 0) {
      for (const pattern of results.patterns) {
        const severityIcon = pattern.severity === 'critical' ? '🔴' :
                            pattern.severity === 'warning' ? '🟡' : '🔵';
        console.log(`  ${severityIcon} ${pattern.pattern.substring(0, 60)}...`);
        console.log(`     Total occurrences: ${pattern.occurrences}`);
        console.log(`     Recent occurrences: ${pattern.recentOccurrences}`);
        console.log(`     Timeframe: ${pattern.timeframe}`);
        console.log(`     Severity: ${pattern.severity}`);
        console.log(`     Ongoing: ${pattern.isOngoing ? 'YES' : 'NO'}`);
        console.log();
      }
    } else {
      console.log('  ✅ No recurring error patterns detected!');
    }

    console.log('\n🗑️ Old Errors (Will be filtered out by AI):');
    console.log('─────────────────────────────────────────────');
    if (oldErrors.length > 0) {
      console.log(`  Found ${oldErrors.length} old errors (> 7 days)`);
      console.log('  These will NOT be reported as current issues:');
      for (const error of oldErrors.slice(0, 3)) {
        console.log(`    - ${error.source}: ${error.daysAgo} days ago`);
      }
    } else {
      console.log('  No old errors in this time range');
    }

    console.log('\n═══════════════════════════════════════════════');
    console.log('  Summary');
    console.log('═══════════════════════════════════════════════');

    if (results.patterns.length === 0 && recentErrors.length === 0) {
      console.log('  ✅ NO CURRENT ISSUES - No recent or recurring errors detected');
    } else {
      console.log('  ⚠️ Issues detected:');
      if (results.patterns.length > 0) {
        console.log(`     - ${results.patterns.length} recurring error pattern(s)`);
      }
      if (recentErrors.length > 0) {
        console.log(`     - ${recentErrors.length} recent error(s) (< 2 days old)`);
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error(error.stack);
  }
}

testEventLogFiltering()
  .then(() => {
    console.log('\n✅ Test complete\n');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Test error:', err);
    process.exit(1);
  });
