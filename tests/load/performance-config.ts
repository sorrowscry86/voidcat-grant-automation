/**
 * Performance Testing Configuration
 * Week 3: Load Testing Infrastructure
 * 
 * Defines performance thresholds, monitoring configuration,
 * and alerting rules for VoidCat Grant Automation Platform
 */

export const PERFORMANCE_CONFIG = {
  // Response time thresholds (milliseconds)
  thresholds: {
    grantSearch: {
      p50: 500,
      p95: 2000,
      p99: 3000,
      timeout: 5000,
    },
    grantDetails: {
      p50: 300,
      p95: 1000,
      p99: 1500,
      timeout: 3000,
    },
    semanticMatching: {
      p50: 800,
      p95: 2500,
      p99: 4000,
      timeout: 6000,
    },
    eligibilityValidation: {
      p50: 1000,
      p95: 3000,
      p99: 4500,
      timeout: 8000,
    },
    budgetGeneration: {
      p50: 800,
      p95: 2000,
      p99: 3000,
      timeout: 5000,
    },
    aiProposalGeneration: {
      p50: 10000,
      p95: 30000,
      p99: 45000,
      timeout: 60000,
    },
    timelineGeneration: {
      p50: 600,
      p95: 1800,
      p99: 2500,
      timeout: 5000,
    },
    strategicCalendar: {
      p50: 700,
      p95: 2000,
      p99: 3000,
      timeout: 5000,
    },
  },

  // Load testing scenarios
  loadScenarios: {
    baseline: {
      concurrentUsers: 10,
      duration: 60000, // 1 minute
      rampUpTime: 5000, // 5 seconds
      requestsPerSecond: 10,
    },
    peak: {
      concurrentUsers: 100,
      duration: 300000, // 5 minutes
      rampUpTime: 30000, // 30 seconds
      requestsPerSecond: 100,
    },
    stress: {
      concurrentUsers: 500,
      duration: 600000, // 10 minutes
      rampUpTime: 60000, // 1 minute
      requestsPerSecond: 250,
    },
    soak: {
      concurrentUsers: 50,
      duration: 1800000, // 30 minutes (simulated 24-hour)
      rampUpTime: 10000, // 10 seconds
      requestsPerSecond: 50,
    },
    spike: {
      baselineUsers: 10,
      spikeUsers: 200,
      spikeDuration: 60000, // 1 minute spike
      recoveryTime: 30000, // 30 seconds
    },
  },

  // Success rate thresholds
  successRates: {
    baseline: 99, // 99% success rate minimum
    peak: 95,     // 95% success rate minimum
    stress: 85,   // 85% success rate minimum under stress
    soak: 95,     // 95% success rate over extended period
  },

  // Resource utilization limits
  resourceLimits: {
    cpu: {
      warning: 70,  // 70% CPU usage
      critical: 85, // 85% CPU usage
    },
    memory: {
      warning: 75,  // 75% memory usage
      critical: 90, // 90% memory usage
    },
    responseTime: {
      warning: 1.5,  // 1.5x normal response time
      critical: 3.0, // 3x normal response time
    },
  },

  // Monitoring and alerting
  monitoring: {
    samplingInterval: 1000, // 1 second
    metricsRetention: 86400000, // 24 hours
    alertChannels: ['console', 'log', 'email'],
    alertThresholds: {
      errorRate: 5, // 5% error rate triggers alert
      slowRequests: 10, // 10% slow requests triggers alert
      consecutiveFailures: 3, // 3 consecutive failures triggers alert
    },
  },

  // Workload distribution for mixed load testing
  workloadMix: {
    grantSearch: 0.40,         // 40%
    federalAgencies: 0.15,     // 15%
    semanticMatching: 0.15,    // 15%
    eligibilityValidation: 0.10, // 10%
    budgetGeneration: 0.08,    // 8%
    timelineGeneration: 0.07,  // 7%
    strategicCalendar: 0.05,   // 5%
  },

  // Test data sets
  testData: {
    searchQueries: [
      'artificial intelligence',
      'cybersecurity',
      'quantum computing',
      'renewable energy',
      'biotechnology',
      'space exploration',
      'clean water',
      'autonomous vehicles',
      'machine learning',
      'blockchain',
      'nanotechnology',
      'robotics',
      'data science',
      'cloud computing',
      'Internet of Things',
    ],
    grantIds: [
      'SBIR-25-001',
      'NSF-25-002',
      'NASA-25-003',
      'DARPA-25-006',
      'DOE-25-008',
    ],
    agencies: [
      'Department of Defense',
      'National Science Foundation',
      'NASA',
      'DARPA',
      'Department of Energy',
      'National Institutes of Health',
    ],
  },

  // Performance baselines (for regression testing)
  baselines: {
    grantSearch: 1200,     // 1.2 seconds average
    semanticMatch: 1500,   // 1.5 seconds average
    eligibility: 2000,     // 2 seconds average
    budget: 1300,          // 1.3 seconds average
    timeline: 1000,        // 1 second average
    calendar: 1200,        // 1.2 seconds average
  },

  // Regression detection
  regression: {
    threshold: 0.20, // 20% degradation triggers regression alert
    consecutiveRuns: 3, // Must fail 3 consecutive runs
  },
};

/**
 * Performance metrics collector
 */
export class PerformanceMetricsCollector {
  private metrics: Map<string, number[]> = new Map();
  private startTime: number = Date.now();

  recordMetric(endpoint: string, responseTime: number): void {
    if (!this.metrics.has(endpoint)) {
      this.metrics.set(endpoint, []);
    }
    this.metrics.get(endpoint)!.push(responseTime);
  }

  getStats(endpoint: string): any {
    const times = this.metrics.get(endpoint) || [];
    if (times.length === 0) {
      return null;
    }

    const sorted = [...times].sort((a, b) => a - b);
    const sum = times.reduce((a, b) => a + b, 0);

    return {
      count: times.length,
      min: Math.min(...times),
      max: Math.max(...times),
      avg: sum / times.length,
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }

  getAllStats(): Record<string, any> {
    const allStats: Record<string, any> = {};
    for (const [endpoint, _] of this.metrics) {
      allStats[endpoint] = this.getStats(endpoint);
    }
    return allStats;
  }

  getElapsedTime(): number {
    return Date.now() - this.startTime;
  }

  reset(): void {
    this.metrics.clear();
    this.startTime = Date.now();
  }
}

/**
 * Alert manager for performance monitoring
 */
export class PerformanceAlertManager {
  private alerts: any[] = [];

  checkThreshold(metric: string, value: number, threshold: number, type: 'warning' | 'critical'): void {
    if (value > threshold) {
      this.alerts.push({
        timestamp: new Date().toISOString(),
        type,
        metric,
        value,
        threshold,
        message: `${type.toUpperCase()}: ${metric} exceeded threshold (${value} > ${threshold})`,
      });
    }
  }

  getAlerts(): any[] {
    return this.alerts;
  }

  clearAlerts(): void {
    this.alerts = [];
  }

  hasAlerts(): boolean {
    return this.alerts.length > 0;
  }

  getCriticalAlerts(): any[] {
    return this.alerts.filter(a => a.type === 'critical');
  }
}

export default PERFORMANCE_CONFIG;
