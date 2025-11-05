/**
 * Performance Test Runner
 * 
 * Run comprehensive performance tests to validate scaling projections
 * and identify bottlenecks before they impact users.
 * 
 * Usage:
 *   npm run test:performance
 *   or
 *   npx tsx src/__tests__/performance/run-performance-tests.ts
 */

import { PerformanceTestSuite } from './load-testing-suite';

async function main() {
  console.log('🚀 Starting Performance Test Suite');
  console.log('📋 This will validate our scaling roadmap and identify bottlenecks\n');

  // Configuration
  const baseUrl = process.env.TEST_API_URL || 'http://localhost:8007';
  const authToken = process.env.TEST_AUTH_TOKEN || '';

  if (!authToken) {
    console.log('⚠️  No auth token provided. Some tests may fail.');
    console.log('   Set TEST_AUTH_TOKEN environment variable for authenticated tests.\n');
  }

  // Initialize test suite
  const testSuite = new PerformanceTestSuite(baseUrl, authToken);

  try {
    // Quick health check first
    console.log('🔍 Performing quick health check...');
    const healthResponse = await fetch(`${baseUrl}/health`);
    
    if (!healthResponse.ok) {
      throw new Error(`API health check failed: ${healthResponse.status} ${healthResponse.statusText}`);
    }

    const healthData = await healthResponse.json();
    console.log(`✅ API is healthy: ${JSON.stringify(healthData.services)}\n`);

    // Run the comprehensive test suite
    await testSuite.runComprehensiveTestSuite();

  } catch (error) {
    console.error('❌ Performance test suite failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { main as runPerformanceTests };