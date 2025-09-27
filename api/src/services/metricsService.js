// Metrics Service for VoidCat Grant Automation Platform - Tier 4.2
// Provides comprehensive metrics collection and dashboard data

/**
 * Metrics Service for tracking platform usage and performance
 * Collects and aggregates metrics for dashboard and analytics
 */
export class MetricsService {
  constructor(env) {
    this.env = env;
    this.metricsEnabled = env.ENABLE_METRICS !== 'false';
    this.retentionDays = parseInt(env.METRICS_RETENTION_DAYS || '30');
  }

  /**
   * Record user registration metric
   */
  async recordUserRegistration(email, subscriptionTier = 'free', source = 'web') {
    if (!this.metricsEnabled) return;

    try {
      const metric = {
        type: 'user_registration',
        timestamp: new Date().toISOString(),
        email_domain: email.split('@')[1],
        subscription_tier: subscriptionTier,
        source: source,
        date: new Date().toISOString().split('T')[0] // YYYY-MM-DD
      };

      await this.storeMetric(metric);
      console.log(`📊 Metric recorded: User registration from ${metric.email_domain}`);
    } catch (error) {
      console.error('Failed to record registration metric:', error);
    }
  }

  /**
   * Record grant search metric
   */
  async recordGrantSearch(query, agency, resultsCount, dataSource, userId = null) {
    if (!this.metricsEnabled) return;

    try {
      const metric = {
        type: 'grant_search',
        timestamp: new Date().toISOString(),
        query_length: query ? query.length : 0,
        agency: agency || 'all',
        results_count: resultsCount,
        data_source: dataSource,
        user_id: userId,
        search_successful: resultsCount > 0,
        date: new Date().toISOString().split('T')[0]
      };

      await this.storeMetric(metric);
      console.log(`📊 Metric recorded: Grant search (${resultsCount} results)`);
    } catch (error) {
      console.error('Failed to record search metric:', error);
    }
  }

  /**
   * Record proposal generation metric
   */
  async recordProposalGeneration(grantId, userId, success, processingTime = null) {
    if (!this.metricsEnabled) return;

    try {
      const metric = {
        type: 'proposal_generation',
        timestamp: new Date().toISOString(),
        grant_id: grantId,
        user_id: userId,
        success: success,
        processing_time_ms: processingTime,
        date: new Date().toISOString().split('T')[0]
      };

      await this.storeMetric(metric);
      console.log(`📊 Metric recorded: Proposal generation ${success ? 'successful' : 'failed'}`);
    } catch (error) {
      console.error('Failed to record proposal metric:', error);
    }
  }

  /**
   * Record rate limiting metric
   */
  async recordRateLimit(userId, endpoint, apiKey = null) {
    if (!this.metricsEnabled) return;

    try {
      const metric = {
        type: 'rate_limit_hit',
        timestamp: new Date().toISOString(),
        user_id: userId,
        endpoint: endpoint,
        api_key_hash: apiKey ? await this.hashApiKey(apiKey) : null,
        date: new Date().toISOString().split('T')[0]
      };

      await this.storeMetric(metric);
      console.log(`📊 Metric recorded: Rate limit hit on ${endpoint}`);
    } catch (error) {
      console.error('Failed to record rate limit metric:', error);
    }
  }

  /**
   * Record subscription upgrade metric
   */
  async recordSubscriptionUpgrade(userId, fromTier, toTier, amount = null) {
    if (!this.metricsEnabled) return;

    try {
      const metric = {
        type: 'subscription_upgrade',
        timestamp: new Date().toISOString(),
        user_id: userId,
        from_tier: fromTier,
        to_tier: toTier,
        amount: amount,
        date: new Date().toISOString().split('T')[0]
      };

      await this.storeMetric(metric);
      console.log(`📊 Metric recorded: Subscription upgrade ${fromTier} → ${toTier}`);
    } catch (error) {
      console.error('Failed to record upgrade metric:', error);
    }
  }

  /**
   * Record email delivery metric
   */
  async recordEmailDelivery(email, type, success, provider = null) {
    if (!this.metricsEnabled) return;

    try {
      const metric = {
        type: 'email_delivery',
        timestamp: new Date().toISOString(),
        email_domain: email.split('@')[1],
        email_type: type,
        success: success,
        provider: provider,
        date: new Date().toISOString().split('T')[0]
      };

      await this.storeMetric(metric);
      console.log(`📊 Metric recorded: Email ${type} ${success ? 'delivered' : 'failed'}`);
    } catch (error) {
      console.error('Failed to record email metric:', error);
    }
  }

  /**
   * Get dashboard metrics for date range
   */
  async getDashboardMetrics(days = 7) {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));
      
      const metrics = await this.getMetrics(startDate, endDate);
      
      return {
        summary: await this.calculateSummaryMetrics(metrics),
        daily: await this.calculateDailyMetrics(metrics, days),
        charts: await this.generateChartData(metrics),
        realtime: await this.getRealtimeMetrics()
      };
    } catch (error) {
      console.error('Failed to get dashboard metrics:', error);
      return this.getEmptyDashboard();
    }
  }

  /**
   * Calculate summary metrics
   */
  async calculateSummaryMetrics(metrics) {
    const summary = {
      total_users: new Set(metrics.filter(m => m.type === 'user_registration').map(m => m.email_domain)).size,
      total_searches: metrics.filter(m => m.type === 'grant_search').length,
      total_proposals: metrics.filter(m => m.type === 'proposal_generation').length,
      success_rate: 0,
      revenue_estimate: 0,
      rate_limit_hits: metrics.filter(m => m.type === 'rate_limit_hit').length,
      email_delivery_rate: 0
    };

    // Calculate success rate for proposals
    const proposalMetrics = metrics.filter(m => m.type === 'proposal_generation');
    if (proposalMetrics.length > 0) {
      const successful = proposalMetrics.filter(m => m.success).length;
      summary.success_rate = (successful / proposalMetrics.length) * 100;
    }

    // Calculate email delivery rate
    const emailMetrics = metrics.filter(m => m.type === 'email_delivery');
    if (emailMetrics.length > 0) {
      const delivered = emailMetrics.filter(m => m.success).length;
      summary.email_delivery_rate = (delivered / emailMetrics.length) * 100;
    }

    // Estimate revenue from upgrades
    const upgradeMetrics = metrics.filter(m => m.type === 'subscription_upgrade');
    summary.revenue_estimate = upgradeMetrics.reduce((sum, m) => sum + (m.amount || 99), 0);

    return summary;
  }

  /**
   * Calculate daily metrics breakdown
   */
  async calculateDailyMetrics(metrics, days) {
    const daily = [];
    const endDate = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(endDate.getTime() - (i * 24 * 60 * 60 * 1000));
      const dateStr = date.toISOString().split('T')[0];
      
      const dayMetrics = metrics.filter(m => m.date === dateStr);
      
      daily.push({
        date: dateStr,
        users: new Set(dayMetrics.filter(m => m.type === 'user_registration').map(m => m.email_domain)).size,
        searches: dayMetrics.filter(m => m.type === 'grant_search').length,
        proposals: dayMetrics.filter(m => m.type === 'proposal_generation').length,
        rate_limits: dayMetrics.filter(m => m.type === 'rate_limit_hit').length,
        upgrades: dayMetrics.filter(m => m.type === 'subscription_upgrade').length
      });
    }
    
    return daily;
  }

  /**
   * Generate chart data for dashboard
   */
  async generateChartData(metrics) {
    return {
      user_growth: this.generateGrowthChart(metrics, 'user_registration'),
      search_volume: this.generateVolumeChart(metrics, 'grant_search'),
      proposal_success: this.generateSuccessChart(metrics, 'proposal_generation'),
      agency_distribution: this.generateAgencyChart(metrics),
      subscription_tiers: this.generateTierChart(metrics)
    };
  }

  /**
   * Generate growth chart data
   */
  generateGrowthChart(metrics, type) {
    const data = metrics.filter(m => m.type === type)
      .reduce((acc, m) => {
        const date = m.date;
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {});

    return Object.entries(data).map(([date, count]) => ({ date, count }));
  }

  /**
   * Generate volume chart data
   */
  generateVolumeChart(metrics, type) {
    const hourlyData = metrics.filter(m => m.type === type)
      .reduce((acc, m) => {
        const hour = new Date(m.timestamp).getHours();
        acc[hour] = (acc[hour] || 0) + 1;
        return acc;
      }, {});

    return Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      count: hourlyData[i] || 0
    }));
  }

  /**
   * Generate success rate chart
   */
  generateSuccessChart(metrics, type) {
    const data = metrics.filter(m => m.type === type);
    const successful = data.filter(m => m.success).length;
    const total = data.length;
    
    return {
      successful,
      failed: total - successful,
      rate: total > 0 ? (successful / total) * 100 : 0
    };
  }

  /**
   * Generate agency distribution chart
   */
  generateAgencyChart(metrics) {
    const searchMetrics = metrics.filter(m => m.type === 'grant_search' && m.agency !== 'all');
    const distribution = searchMetrics.reduce((acc, m) => {
      acc[m.agency] = (acc[m.agency] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(distribution)
      .map(([agency, count]) => ({ agency, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Generate subscription tier chart
   */
  generateTierChart(metrics) {
    const registrationMetrics = metrics.filter(m => m.type === 'user_registration');
    const tiers = registrationMetrics.reduce((acc, m) => {
      acc[m.subscription_tier] = (acc[m.subscription_tier] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(tiers).map(([tier, count]) => ({ tier, count }));
  }

  /**
   * Get real-time metrics (last hour)
   */
  async getRealtimeMetrics() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const metrics = await this.getMetrics(oneHourAgo, new Date());

    return {
      active_searches: metrics.filter(m => m.type === 'grant_search').length,
      active_proposals: metrics.filter(m => m.type === 'proposal_generation').length,
      new_registrations: metrics.filter(m => m.type === 'user_registration').length,
      system_health: {
        search_success_rate: this.calculateSearchSuccessRate(metrics),
        avg_response_time: this.calculateAvgResponseTime(metrics),
        error_rate: this.calculateErrorRate(metrics)
      }
    };
  }

  /**
   * Store metric (implementation depends on storage backend)
   */
  async storeMetric(metric) {
    // In a real implementation, you would store this in:
    // - Cloudflare KV for simple storage
    // - D1 database for complex queries
    // - External analytics service (e.g., PostHog, Mixpanel)
    
    // For now, just log structured metrics
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'INFO',
      service: 'voidcat-metrics',
      type: 'metric_recorded',
      metric: metric
    }));
  }

  /**
   * Get metrics from storage for date range
   */
  async getMetrics(startDate, endDate) {
    // In a real implementation, retrieve from storage
    // For now, return empty array (metrics would be collected over time)
    return [];
  }

  /**
   * Get empty dashboard for error states
   */
  getEmptyDashboard() {
    return {
      summary: {
        total_users: 0,
        total_searches: 0,
        total_proposals: 0,
        success_rate: 0,
        revenue_estimate: 0,
        rate_limit_hits: 0,
        email_delivery_rate: 0
      },
      daily: [],
      charts: {
        user_growth: [],
        search_volume: [],
        proposal_success: { successful: 0, failed: 0, rate: 0 },
        agency_distribution: [],
        subscription_tiers: []
      },
      realtime: {
        active_searches: 0,
        active_proposals: 0,
        new_registrations: 0,
        system_health: {
          search_success_rate: 0,
          avg_response_time: 0,
          error_rate: 0
        }
      }
    };
  }

  /**
   * Hash API key for privacy
   */
  async hashApiKey(apiKey) {
    const encoder = new TextEncoder();
    const data = encoder.encode(apiKey);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = new Uint8Array(hashBuffer);
    return Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Calculate search success rate
   */
  calculateSearchSuccessRate(metrics) {
    const searches = metrics.filter(m => m.type === 'grant_search');
    if (searches.length === 0) return 100;
    
    const successful = searches.filter(m => m.search_successful).length;
    return (successful / searches.length) * 100;
  }

  /**
   * Calculate average response time
   */
  calculateAvgResponseTime(metrics) {
    const proposalMetrics = metrics.filter(m => m.type === 'proposal_generation' && m.processing_time_ms);
    if (proposalMetrics.length === 0) return 0;
    
    const totalTime = proposalMetrics.reduce((sum, m) => sum + m.processing_time_ms, 0);
    return totalTime / proposalMetrics.length;
  }

  /**
   * Calculate error rate
   */
  calculateErrorRate(metrics) {
    const totalOperations = metrics.filter(m => 
      ['grant_search', 'proposal_generation', 'email_delivery'].includes(m.type)
    ).length;
    
    if (totalOperations === 0) return 0;
    
    const errors = metrics.filter(m => 
      (m.type === 'proposal_generation' && !m.success) ||
      (m.type === 'email_delivery' && !m.success) ||
      m.type === 'rate_limit_hit'
    ).length;
    
    return (errors / totalOperations) * 100;
  }
}

export default MetricsService;