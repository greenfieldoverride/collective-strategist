/**
 * Performance Test Suite
 * 
 * Comprehensive load testing to validate scaling projections and identify bottlenecks
 * before they impact users. This suite tests the performance thresholds identified
 * in our scaling roadmap analysis.
 */

import { performance } from 'perf_hooks';

interface LoadTestConfig {
  concurrent_users: number;
  duration_seconds: number;
  ramp_up_seconds: number;
  target_rps: number; // requests per second
}

interface PerformanceMetrics {
  response_times: number[];
  error_count: number;
  total_requests: number;
  rps_achieved: number;
  memory_usage_mb: number;
  cpu_usage_percent: number;
}

interface LoadTestResult {
  config: LoadTestConfig;
  metrics: PerformanceMetrics;
  passed: boolean;
  bottlenecks: string[];
  recommendations: string[];
}

class PerformanceTestSuite {
  private baseUrl: string;
  private authToken: string;

  constructor(baseUrl: string = 'http://localhost:8007', authToken: string = '') {
    this.baseUrl = baseUrl;
    this.authToken = authToken;
  }

  /**
   * Test Suite 1: Current State Validation (100 users)
   * Validates that our current architecture handles expected load
   */
  async testCurrentStateLoad(): Promise<LoadTestResult> {
    const config: LoadTestConfig = {
      concurrent_users: 100,
      duration_seconds: 300, // 5 minutes
      ramp_up_seconds: 60,
      target_rps: 50
    };

    console.log('🚀 Running Current State Load Test (100 concurrent users)');
    return this.runLoadTest(config, this.getCurrentStateScenarios());
  }

  /**
   * Test Suite 2: First Bottleneck Validation (500 users)
   * Tests the projected breaking point from our scaling analysis
   */
  async testFirstBottleneckLoad(): Promise<LoadTestResult> {
    const config: LoadTestConfig = {
      concurrent_users: 500,
      duration_seconds: 600, // 10 minutes
      ramp_up_seconds: 120,
      target_rps: 250
    };

    console.log('🔥 Running First Bottleneck Load Test (500 concurrent users)');
    return this.runLoadTest(config, this.getScalingBottleneckScenarios());
  }

  /**
   * Test Suite 3: Database Stress Test
   * Specifically tests database connection pooling and query performance
   */
  async testDatabaseStress(): Promise<LoadTestResult> {
    const config: LoadTestConfig = {
      concurrent_users: 200,
      duration_seconds: 180, // 3 minutes
      ramp_up_seconds: 30,
      target_rps: 100
    };

    console.log('💾 Running Database Stress Test');
    return this.runLoadTest(config, this.getDatabaseIntensiveScenarios());
  }

  /**
   * Test Suite 4: Cache Performance Validation
   * Tests Redis caching effectiveness under load
   */
  async testCachePerformance(): Promise<LoadTestResult> {
    const config: LoadTestConfig = {
      concurrent_users: 300,
      duration_seconds: 240, // 4 minutes
      ramp_up_seconds: 60,
      target_rps: 150
    };

    console.log('⚡ Running Cache Performance Test');
    return this.runLoadTest(config, this.getCacheTestScenarios());
  }

  /**
   * Test Suite 5: AI Service Load Test
   * Tests Qdrant vector search and AI generation under load
   */
  async testAIServiceLoad(): Promise<LoadTestResult> {
    const config: LoadTestConfig = {
      concurrent_users: 50,
      duration_seconds: 300, // 5 minutes
      ramp_up_seconds: 30,
      target_rps: 25
    };

    console.log('🤖 Running AI Service Load Test');
    return this.runLoadTest(config, this.getAIIntensiveScenarios());
  }

  /**
   * Core load testing implementation
   */
  private async runLoadTest(
    config: LoadTestConfig,
    scenarios: Array<() => Promise<void>>
  ): Promise<LoadTestResult> {
    const startTime = performance.now();
    const metrics: PerformanceMetrics = {
      response_times: [],
      error_count: 0,
      total_requests: 0,
      rps_achieved: 0,
      memory_usage_mb: 0,
      cpu_usage_percent: 0
    };

    const workers: Promise<void>[] = [];
    
    // Ramp up users gradually
    const rampUpInterval = (config.ramp_up_seconds * 1000) / config.concurrent_users;
    
    for (let i = 0; i < config.concurrent_users; i++) {
      setTimeout(() => {
        const worker = this.startWorker(scenarios, config.duration_seconds, metrics);
        workers.push(worker);
      }, i * rampUpInterval);
    }

    // Wait for test duration plus ramp up
    await new Promise(resolve => 
      setTimeout(resolve, (config.duration_seconds + config.ramp_up_seconds) * 1000)
    );

    // Calculate final metrics
    const totalTime = (performance.now() - startTime) / 1000;
    metrics.rps_achieved = metrics.total_requests / totalTime;

    // Analyze results
    const result = this.analyzeResults(config, metrics);
    console.log(`✅ Test completed: ${result.passed ? 'PASSED' : 'FAILED'}`);
    console.log(`📊 RPS: ${metrics.rps_achieved.toFixed(2)} (target: ${config.target_rps})`);
    console.log(`⏱️  Avg response time: ${this.calculateAverage(metrics.response_times).toFixed(2)}ms`);
    console.log(`❌ Error rate: ${(metrics.error_count / metrics.total_requests * 100).toFixed(2)}%`);

    return result;
  }

  /**
   * Individual worker that simulates a single user
   */
  private async startWorker(
    scenarios: Array<() => Promise<void>>,
    durationSeconds: number,
    metrics: PerformanceMetrics
  ): Promise<void> {
    const endTime = Date.now() + (durationSeconds * 1000);

    while (Date.now() < endTime) {
      try {
        // Pick random scenario
        const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
        
        const requestStart = performance.now();
        await scenario();
        const requestEnd = performance.now();

        metrics.response_times.push(requestEnd - requestStart);
        metrics.total_requests++;

        // Random delay between requests (500ms to 2s)
        await new Promise(resolve => 
          setTimeout(resolve, Math.random() * 1500 + 500)
        );
      } catch (error) {
        metrics.error_count++;
        console.error('Request failed:', error);
      }
    }
  }

  /**
   * Current state scenarios (normal user flows)
   */
  private getCurrentStateScenarios(): Array<() => Promise<void>> {
    return [
      () => this.makeRequest('GET', '/health'),
      () => this.makeRequest('GET', '/ventures'),
      () => this.makeRequest('GET', '/ventures/550e8400-e29b-41d4-a716-446655440000'),
      () => this.makeRequest('GET', '/ventures/550e8400-e29b-41d4-a716-446655440000/stats'),
      () => this.makeRequest('GET', '/content-drafter/drafts/550e8400-e29b-41d4-a716-446655440000'),
      () => this.makeRequest('GET', '/social-media/accounts'),
    ];
  }

  /**
   * Scaling bottleneck scenarios (heavy database operations)
   */
  private getScalingBottleneckScenarios(): Array<() => Promise<void>> {
    return [
      () => this.makeRequest('GET', '/ventures'),
      () => this.makeRequest('GET', '/ventures', { includeMembers: true }),
      () => this.makeRequest('GET', '/ventures/550e8400-e29b-41d4-a716-446655440000/stats'),
      () => this.makeRequest('GET', '/conversations'),
      () => this.makeRequest('GET', '/conversations', { limit: 50 }),
    ];
  }

  /**
   * Database intensive scenarios
   */
  private getDatabaseIntensiveScenarios(): Array<() => Promise<void>> {
    return [
      () => this.makeRequest('GET', '/ventures'),
      () => this.makeRequest('GET', '/conversations'),
      () => this.makeRequest('GET', '/ventures/550e8400-e29b-41d4-a716-446655440000/stats'),
      () => this.makeRequest('POST', '/ventures', {
        name: `Test Venture ${Date.now()}`,
        ventureType: 'professional'
      }),
      () => this.makeRequest('GET', '/content-drafter/drafts/550e8400-e29b-41d4-a716-446655440000'),
    ];
  }

  /**
   * Cache-focused test scenarios
   */
  private getCacheTestScenarios(): Array<() => Promise<void>> {
    return [
      // Hit same venture repeatedly (should be cached)
      () => this.makeRequest('GET', '/ventures/550e8400-e29b-41d4-a716-446655440000'),
      () => this.makeRequest('GET', '/ventures/550e8400-e29b-41d4-a716-446655440000'),
      () => this.makeRequest('GET', '/ventures/550e8400-e29b-41d4-a716-446655440000'),
      // Hit ventures list repeatedly (should be cached)
      () => this.makeRequest('GET', '/ventures'),
      () => this.makeRequest('GET', '/ventures'),
      // Test cache invalidation scenarios
      () => this.makeRequest('GET', '/ventures/550e8400-e29b-41d4-a716-446655440000/stats'),
    ];
  }

  /**
   * AI and vector search intensive scenarios
   */
  private getAIIntensiveScenarios(): Array<() => Promise<void>> {
    return [
      () => this.makeRequest('POST', '/ai-consultant/ask', {
        contextualCoreId: '550e8400-e29b-41d4-a716-446655440000',
        sessionType: 'strategic_advice',
        query: 'What are the key trends affecting our market?'
      }),
      () => this.makeRequest('POST', '/content-drafter/generate', {
        contextualCoreId: '550e8400-e29b-41d4-a716-446655440000',
        contentType: 'social_post',
        tone: 'professional'
      }),
      () => this.makeRequest('POST', '/ai-consultant/market-analysis', {
        contextualCoreId: '550e8400-e29b-41d4-a716-446655440000',
        analysisType: 'trends'
      }),
    ];
  }

  /**
   * Make HTTP request with timing and error handling
   */
  private async makeRequest(
    method: string, 
    path: string, 
    body?: any, 
    queryParams?: any
  ): Promise<void> {
    const url = new URL(path, this.baseUrl);
    
    if (queryParams) {
      Object.keys(queryParams).forEach(key => 
        url.searchParams.append(key, queryParams[key])
      );
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    const requestOptions: RequestInit = {
      method,
      headers,
    };

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      requestOptions.body = JSON.stringify(body);
    }

    const response = await fetch(url.toString(), requestOptions);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Consume response to simulate real usage
    await response.json();
  }

  /**
   * Analyze test results and provide insights
   */
  private analyzeResults(config: LoadTestConfig, metrics: PerformanceMetrics): LoadTestResult {
    const avgResponseTime = this.calculateAverage(metrics.response_times);
    const p95ResponseTime = this.calculatePercentile(metrics.response_times, 95);
    const errorRate = (metrics.error_count / metrics.total_requests) * 100;

    const bottlenecks: string[] = [];
    const recommendations: string[] = [];

    // Performance thresholds from our scaling analysis
    const PERFORMANCE_THRESHOLDS = {
      MAX_AVG_RESPONSE_TIME: 500, // 500ms average
      MAX_P95_RESPONSE_TIME: 2000, // 2s 95th percentile  
      MAX_ERROR_RATE: 0.1, // 0.1% error rate
      MIN_RPS_RATIO: 0.8 // Must achieve 80% of target RPS
    };

    let passed = true;

    // Check response time thresholds
    if (avgResponseTime > PERFORMANCE_THRESHOLDS.MAX_AVG_RESPONSE_TIME) {
      passed = false;
      bottlenecks.push(`Average response time too high: ${avgResponseTime.toFixed(2)}ms`);
      recommendations.push('Consider implementing Redis caching or database optimization');
    }

    if (p95ResponseTime > PERFORMANCE_THRESHOLDS.MAX_P95_RESPONSE_TIME) {
      passed = false;
      bottlenecks.push(`95th percentile response time too high: ${p95ResponseTime.toFixed(2)}ms`);
      recommendations.push('Investigate slow queries and add database indexing');
    }

    // Check error rate
    if (errorRate > PERFORMANCE_THRESHOLDS.MAX_ERROR_RATE) {
      passed = false;
      bottlenecks.push(`Error rate too high: ${errorRate.toFixed(2)}%`);
      recommendations.push('Check for connection pool exhaustion or service timeouts');
    }

    // Check RPS achievement
    const rpsRatio = metrics.rps_achieved / config.target_rps;
    if (rpsRatio < PERFORMANCE_THRESHOLDS.MIN_RPS_RATIO) {
      passed = false;
      bottlenecks.push(`Failed to achieve target RPS: ${metrics.rps_achieved.toFixed(2)}/${config.target_rps}`);
      recommendations.push('System may be hitting CPU or I/O limits - consider horizontal scaling');
    }

    // Specific threshold warnings based on user count (from scaling analysis)
    if (config.concurrent_users >= 500) {
      recommendations.push('Monitor database connection pool - consider read replicas');
    }

    if (config.concurrent_users >= 1000) {
      recommendations.push('Consider Qdrant optimization and clustering');
    }

    if (config.concurrent_users >= 2000) {
      recommendations.push('Plan for Redis clustering and advanced caching strategies');
    }

    return {
      config,
      metrics,
      passed,
      bottlenecks,
      recommendations
    };
  }

  private calculateAverage(numbers: number[]): number {
    return numbers.length > 0 ? numbers.reduce((a, b) => a + b) / numbers.length : 0;
  }

  private calculatePercentile(numbers: number[], percentile: number): number {
    if (numbers.length === 0) return 0;
    
    const sorted = numbers.slice().sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }

  /**
   * Run comprehensive test suite and generate report
   */
  async runComprehensiveTestSuite(): Promise<void> {
    console.log('🏁 Starting Comprehensive Performance Test Suite');
    console.log('📋 This will validate our scaling projections and identify bottlenecks\n');

    const results: LoadTestResult[] = [];

    try {
      // Test current state (baseline)
      results.push(await this.testCurrentStateLoad());
      await this.waitBetweenTests();

      // Test cache performance
      results.push(await this.testCachePerformance());
      await this.waitBetweenTests();

      // Test database stress
      results.push(await this.testDatabaseStress());
      await this.waitBetweenTests();

      // Test AI service load
      results.push(await this.testAIServiceLoad());
      await this.waitBetweenTests();

      // Test first bottleneck scenario
      results.push(await this.testFirstBottleneckLoad());

    } catch (error) {
      console.error('❌ Test suite failed:', error);
      return;
    }

    // Generate comprehensive report
    this.generateReport(results);
  }

  private async waitBetweenTests(seconds: number = 30): Promise<void> {
    console.log(`⏳ Waiting ${seconds}s between tests to allow system recovery...\n`);
    await new Promise(resolve => setTimeout(resolve, seconds * 1000));
  }

  private generateReport(results: LoadTestResult[]): void {
    console.log('\n📊 COMPREHENSIVE PERFORMANCE TEST REPORT');
    console.log('=' .repeat(50));

    const passedTests = results.filter(r => r.passed).length;
    const totalTests = results.length;

    console.log(`\n🎯 Overall Results: ${passedTests}/${totalTests} tests passed\n`);

    results.forEach((result, index) => {
      const testName = this.getTestName(index);
      console.log(`${result.passed ? '✅' : '❌'} ${testName}`);
      console.log(`   Users: ${result.config.concurrent_users}, RPS: ${result.metrics.rps_achieved.toFixed(2)}`);
      console.log(`   Avg Response: ${this.calculateAverage(result.metrics.response_times).toFixed(2)}ms`);
      console.log(`   Error Rate: ${(result.metrics.error_count / result.metrics.total_requests * 100).toFixed(2)}%`);
      
      if (result.bottlenecks.length > 0) {
        console.log(`   🚨 Bottlenecks: ${result.bottlenecks.join(', ')}`);
      }
      
      if (result.recommendations.length > 0) {
        console.log(`   💡 Recommendations: ${result.recommendations.join(', ')}`);
      }
      console.log('');
    });

    // Generate scaling roadmap validation
    console.log('🛣️  SCALING ROADMAP VALIDATION');
    console.log('-'.repeat(30));
    
    const currentStateResult = results[0];
    if (currentStateResult && currentStateResult.passed) {
      console.log('✅ Current architecture handles expected 100-user load');
    } else {
      console.log('❌ URGENT: Current architecture failing at 100 users - immediate optimization needed');
    }

    const bottleneckResult = results[results.length - 1];
    if (bottleneckResult && bottleneckResult.config.concurrent_users >= 500) {
      if (bottleneckResult.passed) {
        console.log('✅ System ready for 500+ users - first bottleneck threshold passed');
      } else {
        console.log('⚠️  500-user bottleneck confirmed - implement database optimizations before reaching this scale');
      }
    }

    console.log('\n🔮 NEXT STEPS BASED ON RESULTS:');
    const allRecommendations = results.flatMap(r => r.recommendations);
    const uniqueRecommendations = [...new Set(allRecommendations)];
    uniqueRecommendations.forEach(rec => console.log(`   • ${rec}`));

    console.log('\n📈 Performance test suite completed successfully!');
  }

  private getTestName(index: number): string {
    const names = [
      'Current State Load Test (100 users)',
      'Cache Performance Test (300 users)', 
      'Database Stress Test (200 users)',
      'AI Service Load Test (50 users)',
      'First Bottleneck Test (500 users)'
    ];
    return names[index] || `Test ${index + 1}`;
  }
}

export { PerformanceTestSuite, LoadTestConfig, PerformanceMetrics, LoadTestResult };