/**
 * Test the updated DiskInvestigator
 * Verify it now checks ACTUAL disk health, not just space
 */

const { DiskInvestigator } = require('./src/agents/investigators/DiskInvestigator');

async function testDiskHealth() {
  console.log('═══════════════════════════════════════════════');
  console.log('  Testing Updated Disk Health Checking');
  console.log('═══════════════════════════════════════════════\n');

  const investigator = new DiskInvestigator();

  try {
    const results = await investigator.investigate({
      config: {
        criticalThreshold: 5,
        warningThreshold: 10
      }
    });

    console.log('📊 Investigation Results:\n');

    console.log('💾 Disk Space:');
    console.log('─────────────────────────────────────────────');
    for (const disk of results.disks) {
      const percentFree = ((disk.freeSpace / disk.totalSpace) * 100).toFixed(1);
      console.log(`  ${disk.name}: ${disk.freeSpaceGB} GB free of ${disk.totalSpaceGB} GB (${percentFree}% free)`);
    }

    console.log('\n💚 Disk Health Status (SMART Data):');
    console.log('─────────────────────────────────────────────');
    if (results.healthStatus && results.healthStatus.length > 0) {
      for (const disk of results.healthStatus) {
        const healthIcon = disk.isHealthy ? '✅' : '❌';
        console.log(`  ${healthIcon} ${disk.friendlyName}`);
        console.log(`     Health: ${disk.healthStatus}`);
        console.log(`     Operational: ${disk.operationalStatus}`);
        console.log(`     Type: ${disk.mediaType}`);
        console.log(`     Overall: ${disk.isHealthy ? 'HEALTHY' : 'UNHEALTHY'}`);
      }
    } else {
      console.log('  ⚠️ No health data available (may not be supported on this system)');
    }

    console.log('\n⚠️ Warnings & Recommendations:');
    console.log('─────────────────────────────────────────────');
    if (results.lowSpaceWarnings.length > 0) {
      console.log('  Low Space Warnings:');
      for (const warning of results.lowSpaceWarnings) {
        console.log(`    - ${warning.message}`);
      }
    } else {
      console.log('  ✅ No low space warnings');
    }

    if (results.recommendations.length > 0) {
      console.log('\n  Health Warnings:');
      for (const rec of results.recommendations) {
        console.log(`    - ${rec.message}`);
      }
    } else {
      console.log('  ✅ No health warnings - all disks are healthy!');
    }

    console.log('\n═══════════════════════════════════════════════');
    console.log('  Summary');
    console.log('═══════════════════════════════════════════════');

    const allHealthy = results.healthStatus.every(d => d.isHealthy);
    const hasSpace = results.lowSpaceWarnings.length === 0;

    if (allHealthy && hasSpace) {
      console.log('  ✅ ALL SYSTEMS GO - Disks are healthy with adequate space');
    } else {
      console.log('  ⚠️ Issues detected:');
      if (!allHealthy) console.log('     - Unhealthy disk(s) detected');
      if (!hasSpace) console.log('     - Low disk space warnings');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error(error.stack);
  }
}

testDiskHealth()
  .then(() => {
    console.log('\n✅ Test complete\n');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Test error:', err);
    process.exit(1);
  });
