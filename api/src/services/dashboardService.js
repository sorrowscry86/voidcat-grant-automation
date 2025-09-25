// Dashboard Service for VoidCat Grant Automation Platform
// Provides user dashboard functionality, application tracking, and analytics

export class DashboardService {
  constructor(env) {
    this.env = env;
  }

  /**
   * Get user dashboard data
   */
  async getUserDashboard(userId, apiKey) {
    try {
      // For demo purposes, we'll create mock dashboard data
      // In production, this would query the database for real user data
      
      const dashboardData = {
        user_id: userId,
        overview: {
          total_searches: this.generateRandomStat(15, 45),
          saved_grants: this.generateRandomStat(3, 12),
          applications_submitted: this.generateRandomStat(1, 5),
          success_rate: this.generateRandomPercentage(15, 35),
          last_activity: this.getRecentDate(7)
        },
        recent_activity: this.generateRecentActivity(),
        application_pipeline: this.generateApplicationPipeline(),
        upcoming_deadlines: this.generateUpcomingDeadlines(),
        success_metrics: {
          applications_won: this.generateRandomStat(0, 2),
          total_funding_awarded: this.generateRandomAmount(0, 500000),
          average_proposal_score: this.generateRandomPercentage(70, 88),
          time_saved_with_ai: this.generateRandomStat(20, 60) + ' hours'
        },
        recommendations: this.generateRecommendations(),
        quick_stats: {
          grants_viewed_today: this.generateRandomStat(2, 8),
          proposals_generated: this.generateRandomStat(1, 4),
          templates_used: this.generateRandomStat(2, 6),
          searches_this_week: this.generateRandomStat(8, 25)
        }
      };

      return dashboardData;
    } catch (error) {
      console.error('Dashboard data generation error:', error);
      throw new Error('Unable to generate dashboard data');
    }
  }

  /**
   * Generate recent activity feed
   */
  generateRecentActivity() {
    const activities = [
      { type: 'search', description: 'Searched for AI grants', timestamp: this.getRecentDate(1) },
      { type: 'proposal', description: 'Generated SBIR Phase I proposal', timestamp: this.getRecentDate(2) },
      { type: 'grant_view', description: 'Viewed DoD AI Research opportunity', timestamp: this.getRecentDate(3) },
      { type: 'template', description: 'Used NSF Research template', timestamp: this.getRecentDate(4) },
      { type: 'application', description: 'Submitted application for NASA STTR', timestamp: this.getRecentDate(5) }
    ];

    return activities.slice(0, this.generateRandomStat(3, 5));
  }

  /**
   * Generate application pipeline data
   */
  generateApplicationPipeline() {
    const statuses = ['researching', 'drafting', 'reviewing', 'submitted', 'under_review', 'awarded', 'rejected'];
    const pipeline = [];

    // Generate 3-8 applications in various stages
    const applicationCount = this.generateRandomStat(3, 8);
    
    for (let i = 0; i < applicationCount; i++) {
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      pipeline.push({
        id: `app-${i + 1}`,
        grant_title: this.getRandomGrantTitle(),
        agency: this.getRandomAgency(),
        status: status,
        deadline: this.getFutureDate(30, 120),
        amount: this.generateRandomAmount(100000, 1500000),
        progress: this.getProgressForStatus(status),
        last_updated: this.getRecentDate(Math.floor(Math.random() * 10) + 1)
      });
    }

    return pipeline.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
  }

  /**
   * Generate upcoming deadlines
   */
  generateUpcomingDeadlines() {
    const deadlines = [];
    
    // Generate 2-5 upcoming deadlines
    const deadlineCount = this.generateRandomStat(2, 5);
    
    for (let i = 0; i < deadlineCount; i++) {
      deadlines.push({
        grant_id: `grant-${i + 1}`,
        title: this.getRandomGrantTitle(),
        agency: this.getRandomAgency(),
        deadline: this.getFutureDate(7, 90),
        days_remaining: this.generateRandomStat(7, 90),
        amount: this.generateRandomAmount(150000, 2000000),
        match_score: this.generateRandomPercentage(65, 95),
        status: Math.random() > 0.5 ? 'interested' : 'researching'
      });
    }

    return deadlines.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
  }

  /**
   * Generate recommendations for user
   */
  generateRecommendations() {
    const recommendations = [
      {
        type: 'grant_opportunity',
        title: 'New DARPA AI Initiative',
        description: 'Perfect match for your AI expertise profile',
        priority: 'high',
        action: 'View Details'
      },
      {
        type: 'proposal_improvement',
        title: 'Enhance Technical Approach Section',
        description: 'Add more quantitative metrics to strengthen your proposal',
        priority: 'medium',
        action: 'Improve Proposal'
      },
      {
        type: 'deadline_alert',
        title: 'NSF Deadline Approaching',
        description: '7 days remaining for NSF Cyber-Physical Systems',
        priority: 'urgent',
        action: 'Complete Application'
      }
    ];

    return recommendations.slice(0, this.generateRandomStat(2, 3));
  }

  /**
   * Track application status update
   */
  async updateApplicationStatus(userId, applicationId, newStatus, notes = '') {
    try {
      // In production, this would update the database
      const updateData = {
        application_id: applicationId,
        user_id: userId,
        status: newStatus,
        updated_at: new Date().toISOString(),
        notes: notes
      };

      console.log('Application status updated:', updateData);
      
      return {
        success: true,
        message: 'Application status updated successfully',
        application_id: applicationId,
        new_status: newStatus
      };
    } catch (error) {
      console.error('Application status update error:', error);
      throw new Error('Unable to update application status');
    }
  }

  /**
   * Add new application to tracking
   */
  async addApplication(userId, grantId, applicationData) {
    try {
      const applicationId = `app-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const newApplication = {
        id: applicationId,
        user_id: userId,
        grant_id: grantId,
        status: 'researching',
        created_at: new Date().toISOString(),
        ...applicationData
      };

      // console.log removed to avoid logging sensitive user/application data
      
      return {
        success: true,
        message: 'Application added to tracking',
        application: newApplication
      };
    } catch (error) {
      console.error('Add application error:', error);
      throw new Error('Unable to add application to tracking');
    }
  }

  /**
   * Get analytics data for admin/business intelligence
   */
  async getAnalytics(timeframe = '30d') {
    try {
      const analytics = {
        timeframe: timeframe,
        user_metrics: {
          total_users: this.generateRandomStat(150, 350),
          active_users: this.generateRandomStat(45, 85),
          new_registrations: this.generateRandomStat(8, 25),
          premium_conversions: this.generateRandomStat(2, 8)
        },
        usage_metrics: {
          total_searches: this.generateRandomStat(800, 1500),
          proposals_generated: this.generateRandomStat(120, 280),
          templates_used: this.generateRandomStat(200, 450),
          success_rate: this.generateRandomPercentage(18, 32)
        },
        popular_grants: [
          { agency: 'DoD', program: 'SBIR Phase I', searches: this.generateRandomStat(45, 85) },
          { agency: 'NASA', program: 'STTR Phase I', searches: this.generateRandomStat(35, 65) },
          { agency: 'NSF', program: 'Research Grants', searches: this.generateRandomStat(25, 55) },
          { agency: 'DOE', program: 'Energy Innovation', searches: this.generateRandomStat(20, 45) }
        ],
        revenue_metrics: {
          total_revenue: this.generateRandomAmount(5000, 15000),
          mrr: this.generateRandomAmount(2000, 6000),
          conversion_rate: this.generateRandomPercentage(8, 18),
          churn_rate: this.generateRandomPercentage(3, 8)
        }
      };

      return analytics;
    } catch (error) {
      console.error('Analytics generation error:', error);
      throw new Error('Unable to generate analytics data');
    }
  }

  // Helper methods for generating realistic mock data

  generateRandomStat(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  generateRandomPercentage(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  generateRandomAmount(min, max) {
    const amount = Math.floor(Math.random() * (max - min + 1)) + min;
    return `$${amount.toLocaleString()}`;
  }

  getRecentDate(daysAgo) {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString();
  }

  getFutureDate(minDays, maxDays) {
    const date = new Date();
    const daysToAdd = this.generateRandomStat(minDays, maxDays);
    date.setDate(date.getDate() + daysToAdd);
    return date.toISOString().split('T')[0]; // Return YYYY-MM-DD format
  }

  getRandomGrantTitle() {
    const titles = [
      'AI for Defense Applications',
      'Quantum Computing Research',
      'Cybersecurity Innovation Initiative',
      'Clean Energy Technology Development',
      'Advanced Materials Research',
      'Biotechnology Medical Devices',
      'Space Technology Development',
      'Autonomous Systems Research'
    ];
    return titles[Math.floor(Math.random() * titles.length)];
  }

  getRandomAgency() {
    const agencies = ['DoD', 'NASA', 'NSF', 'DOE', 'NIH', 'DARPA', 'EPA', 'USDA'];
    return agencies[Math.floor(Math.random() * agencies.length)];
  }

  getProgressForStatus(status) {
    const progressMap = {
      'researching': 15,
      'drafting': 35,
      'reviewing': 65,
      'submitted': 80,
      'under_review': 90,
      'awarded': 100,
      'rejected': 100
    };
    return progressMap[status] || 0;
  }
}

export default DashboardService;