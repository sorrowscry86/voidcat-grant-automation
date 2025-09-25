// A/B Testing Service for VoidCat Grant Automation Platform
// Provides feature flag management and experiment tracking

export class ABTestService {
  constructor(env) {
    this.env = env;
    this.experiments = this.initializeExperiments();
  }

  /**
   * Initialize active experiments
   */
  initializeExperiments() {
    return {
      'search_ui_variant': {
        id: 'search_ui_variant',
        name: 'Search Interface Optimization',
        description: 'Test different search UI layouts for better user engagement',
        status: 'active',
        traffic_allocation: 50, // 50% traffic
        variants: {
          'control': {
            name: 'Current Search UI',
            description: 'Existing search interface',
            weight: 50
          },
          'enhanced': {
            name: 'Enhanced Search UI',
            description: 'New search interface with advanced filters prominently displayed',
            weight: 50
          }
        },
        metrics: ['conversion_rate', 'search_success_rate', 'time_on_page'],
        start_date: '2025-01-01',
        end_date: '2025-02-01',
        results: {
          control: { users: 234, conversions: 18, search_success: 156 },
          enhanced: { users: 241, conversions: 23, search_success: 178 }
        }
      },
      'proposal_generation_flow': {
        id: 'proposal_generation_flow',
        name: 'Proposal Generation UX',
        description: 'Test different proposal generation workflows',
        status: 'active',
        traffic_allocation: 30,
        variants: {
          'step_by_step': {
            name: 'Step-by-Step Flow',
            description: 'Guided multi-step proposal generation',
            weight: 50
          },
          'single_page': {
            name: 'Single Page Flow',
            description: 'All-in-one proposal generation interface',
            weight: 50
          }
        },
        metrics: ['completion_rate', 'proposal_quality_score', 'user_satisfaction'],
        start_date: '2025-01-10',
        end_date: '2025-02-10',
        results: {
          step_by_step: { users: 89, completions: 67, avg_quality: 8.2 },
          single_page: { users: 92, completions: 58, avg_quality: 7.8 }
        }
      },
      'pricing_display': {
        id: 'pricing_display',
        name: 'Pricing Page Optimization',
        description: 'Test different pricing presentation strategies',
        status: 'planning',
        traffic_allocation: 25,
        variants: {
          'monthly_focus': {
            name: 'Monthly Pricing Focus',
            description: 'Emphasize monthly pricing with annual discount',
            weight: 50
          },
          'annual_focus': {
            name: 'Annual Pricing Focus',
            description: 'Emphasize annual savings upfront',
            weight: 50
          }
        },
        metrics: ['conversion_rate', 'upgrade_rate', 'revenue_per_user'],
        start_date: '2025-02-01',
        end_date: '2025-03-01'
      }
    };
  }

  /**
   * Get user's experiment variant
   */
  getUserVariant(userId, experimentId) {
    const experiment = this.experiments[experimentId];
    
    if (!experiment || experiment.status !== 'active') {
      return { variant: 'control', reason: 'experiment_inactive' };
    }

    // Check if user should be included in experiment
    const userHash = this.hashUserId(userId);
    const trafficThreshold = experiment.traffic_allocation / 100;
    
    if (userHash > trafficThreshold) {
      return { variant: 'control', reason: 'traffic_allocation' };
    }

    // Determine variant based on user hash
    const variants = Object.keys(experiment.variants);
    const variantIndex = Math.floor(userHash * variants.length / trafficThreshold);
    const selectedVariant = variants[Math.min(variantIndex, variants.length - 1)];

    return { 
      variant: selectedVariant, 
      experiment_id: experimentId,
      experiment_name: experiment.name
    };
  }

  /**
   * Get all experiments for a user
   */
  getUserExperiments(userId) {
    const userExperiments = {};
    
    Object.keys(this.experiments).forEach(experimentId => {
      const result = this.getUserVariant(userId, experimentId);
      userExperiments[experimentId] = result;
    });

    return userExperiments;
  }

  /**
   * Track experiment event
   */
  trackEvent(userId, experimentId, eventType, eventData = {}) {
    const variant = this.getUserVariant(userId, experimentId);
    
    if (variant.variant === 'control' && variant.reason !== 'experiment_inactive') {
      return; // User not in experiment
    }

    const eventRecord = {
      user_id: userId,
      experiment_id: experimentId,
      variant: variant.variant,
      event_type: eventType,
      event_data: eventData,
      timestamp: new Date().toISOString()
    };

    console.log('A/B Test Event:', eventRecord);
    
    // In production, this would be sent to analytics service
    return eventRecord;
  }

  /**
   * Get experiment results and analysis
   */
  getExperimentResults(experimentId) {
    const experiment = this.experiments[experimentId];
    
    if (!experiment) {
      throw new Error(`Experiment '${experimentId}' not found`);
    }

    const results = experiment.results || {};
    const analysis = this.calculateStatisticalSignificance(results);

    return {
      experiment: {
        id: experiment.id,
        name: experiment.name,
        description: experiment.description,
        status: experiment.status,
        start_date: experiment.start_date,
        end_date: experiment.end_date
      },
      variants: experiment.variants,
      metrics: experiment.metrics,
      results: results,
      analysis: analysis,
      recommendation: this.getRecommendation(results, analysis)
    };
  }

  /**
   * List all experiments
   */
  listExperiments(status = null) {
    let experiments = Object.values(this.experiments);
    
    if (status) {
      experiments = experiments.filter(exp => exp.status === status);
    }

    return experiments.map(exp => ({
      id: exp.id,
      name: exp.name,
      description: exp.description,
      status: exp.status,
      traffic_allocation: exp.traffic_allocation,
      variants: Object.keys(exp.variants),
      start_date: exp.start_date,
      end_date: exp.end_date
    }));
  }

  /**
   * Create feature flags response for frontend
   */
  getFeatureFlags(userId) {
    const experiments = this.getUserExperiments(userId);
    const featureFlags = {};

    // Convert experiments to feature flags
    Object.entries(experiments).forEach(([experimentId, result]) => {
      if (result.variant !== 'control') {
        featureFlags[experimentId] = result.variant;
      }
    });

    // Add static feature flags
    featureFlags['advanced_search'] = true;
    featureFlags['template_recommendations'] = true;
    featureFlags['dashboard_analytics'] = true;
    featureFlags['email_notifications'] = true;

    return {
      user_id: userId,
      feature_flags: featureFlags,
      experiments: experiments,
      generated_at: new Date().toISOString()
    };
  }

  // Helper methods

  /**
   * Hash user ID to get consistent random value between 0 and 1
   */
  hashUserId(userId) {
    let hash = 0;
    if (userId.length === 0) return hash;
    
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash) / 2147483647; // Normalize to 0-1
  }

  /**
   * Calculate statistical significance (simplified)
   */
  calculateStatisticalSignificance(results) {
    const variants = Object.keys(results);
    if (variants.length < 2) return { significant: false, confidence: 0 };

    const control = results[variants[0]];
    const variant = results[variants[1]];

    if (!control || !variant) return { significant: false, confidence: 0 };

    // Simplified statistical test (in production, use proper statistical methods)
    const controlRate = control.conversions / control.users;
    const variantRate = variant.conversions / variant.users;
    const improvement = ((variantRate - controlRate) / controlRate) * 100;

    // Mock confidence calculation (in production, calculate proper p-values)
    const totalUsers = control.users + variant.users;
    const confidence = Math.min(95, Math.max(50, 60 + (totalUsers / 20)));

    return {
      significant: confidence > 90 && Math.abs(improvement) > 5,
      confidence: Math.round(confidence),
      improvement: Math.round(improvement * 100) / 100,
      control_rate: Math.round(controlRate * 10000) / 100,
      variant_rate: Math.round(variantRate * 10000) / 100
    };
  }

  /**
   * Get experiment recommendation
   */
  getRecommendation(results, analysis) {
    if (!analysis.significant) {
      return {
        action: 'continue',
        reason: 'Insufficient data or no significant difference detected',
        confidence: analysis.confidence
      };
    }

    if (analysis.improvement > 0) {
      return {
        action: 'implement_variant',
        reason: `Variant shows ${analysis.improvement}% improvement with ${analysis.confidence}% confidence`,
        confidence: analysis.confidence
      };
    } else {
      return {
        action: 'keep_control',
        reason: `Control performs better by ${Math.abs(analysis.improvement)}% with ${analysis.confidence}% confidence`,
        confidence: analysis.confidence
      };
    }
  }
}

export default ABTestService;