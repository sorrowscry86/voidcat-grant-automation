// Deadline Tracking Service for VoidCat Grant Automation Platform
// Automated deadline tracking with strategic application calendars

export class DeadlineTrackingService {
  constructor(config = {}) {
    this.config = config;
  }

  /**
   * Calculate strategic application timeline for a grant
   * @param {Object} grant - Grant opportunity details
   * @param {Object} options - Configuration options
   * @returns {Object} Application timeline and milestones
   */
  generateApplicationTimeline(grant, options = {}) {
    const deadline = new Date(grant.deadline);
    const today = new Date();
    const daysUntilDeadline = Math.floor((deadline - today) / (1000 * 60 * 60 * 24));

    const timeline = {
      grant_id: grant.id,
      deadline: grant.deadline,
      days_remaining: daysUntilDeadline,
      urgency_level: this.calculateUrgencyLevel(daysUntilDeadline),
      milestones: [],
      recommended_start_date: null,
      buffer_days: options.buffer_days || 5,
      warnings: []
    };

    // Determine if grant is still actionable
    if (daysUntilDeadline < 0) {
      timeline.status = 'expired';
      timeline.warnings.push('Grant deadline has passed');
      return timeline;
    }

    if (daysUntilDeadline === 0) {
      timeline.status = 'due_today';
      timeline.urgency_level = 'critical';
      timeline.warnings.push('Grant deadline is TODAY!');
      return timeline;
    }

    // Calculate recommended timeline based on grant complexity
    const estimatedDuration = this.estimateProposalDuration(grant);
    const recommendedStartDaysFromNow = Math.max(0, daysUntilDeadline - estimatedDuration - timeline.buffer_days);

    timeline.status = recommendedStartDaysFromNow === 0 ? 'should_start_now' : 'planning';
    timeline.recommended_start_date = this.addDays(today, recommendedStartDaysFromNow);
    timeline.estimated_proposal_duration = estimatedDuration;

    // Generate milestones
    timeline.milestones = this.generateMilestones(
      timeline.recommended_start_date,
      deadline,
      grant,
      timeline.buffer_days
    );

    // Add warnings based on timeline analysis
    if (daysUntilDeadline < estimatedDuration) {
      timeline.warnings.push('Insufficient time for typical proposal development. Consider expedited process or skip.');
    }

    if (daysUntilDeadline < 7) {
      timeline.warnings.push('Less than one week remaining. High-priority focus required.');
    }

    return timeline;
  }

  /**
   * Estimate proposal duration based on grant characteristics
   * @param {Object} grant - Grant details
   * @returns {number} Estimated days needed
   */
  estimateProposalDuration(grant) {
    let baseDuration = 14; // Default 2 weeks

    // Adjust based on funding amount
    const amount = this.parseAmount(grant.amount);
    if (amount > 5000000) {
      baseDuration += 21; // Large grants need more time
    } else if (amount > 1000000) {
      baseDuration += 14;
    } else if (amount > 500000) {
      baseDuration += 7;
    }

    // Adjust based on program type
    if (grant.program && grant.program.includes('Phase II')) {
      baseDuration += 14; // Phase II more complex
    }

    // Adjust based on agency
    if (grant.agency && (grant.agency.includes('DARPA') || grant.agency.includes('NASA'))) {
      baseDuration += 7; // More rigorous requirements
    }

    return baseDuration;
  }

  /**
   * Generate milestone schedule
   * @param {Date} startDate - Start date
   * @param {Date} deadline - Deadline date
   * @param {Object} grant - Grant details
   * @param {number} bufferDays - Buffer before deadline
   * @returns {Array} Milestones
   */
  generateMilestones(startDate, deadline, grant, bufferDays) {
    const milestones = [];
    const totalDuration = Math.floor((deadline - startDate) / (1000 * 60 * 60 * 24));
    
    if (totalDuration <= 0) {
      return milestones;
    }

    // Milestone 1: Initial Review & Team Assembly (5% of timeline)
    milestones.push({
      name: 'Initial Review & Team Assembly',
      start_date: startDate,
      end_date: this.addDays(startDate, Math.max(1, Math.floor(totalDuration * 0.05))),
      duration_days: Math.max(1, Math.floor(totalDuration * 0.05)),
      tasks: [
        'Review solicitation requirements thoroughly',
        'Assemble proposal team',
        'Identify key personnel and roles',
        'Establish communication channels'
      ],
      completion_criteria: 'Team assembled, roles assigned, kickoff meeting completed'
    });

    // Milestone 2: Technical Approach Development (25% of timeline)
    const m2Start = this.addDays(startDate, Math.max(1, Math.floor(totalDuration * 0.05)));
    milestones.push({
      name: 'Technical Approach Development',
      start_date: m2Start,
      end_date: this.addDays(m2Start, Math.max(2, Math.floor(totalDuration * 0.25))),
      duration_days: Math.max(2, Math.floor(totalDuration * 0.25)),
      tasks: [
        'Develop technical solution architecture',
        'Identify innovation areas',
        'Define methodology and approach',
        'Create preliminary work breakdown structure'
      ],
      completion_criteria: 'Technical approach documented, validated by technical lead'
    });

    // Milestone 3: Draft Proposal Writing (30% of timeline)
    const m3Start = this.addDays(m2Start, Math.max(2, Math.floor(totalDuration * 0.25)));
    milestones.push({
      name: 'Draft Proposal Writing',
      start_date: m3Start,
      end_date: this.addDays(m3Start, Math.max(3, Math.floor(totalDuration * 0.30))),
      duration_days: Math.max(3, Math.floor(totalDuration * 0.30)),
      tasks: [
        'Write executive summary',
        'Document technical approach',
        'Develop budget and budget justification',
        'Create project timeline and milestones',
        'Write management approach',
        'Compile past performance documentation'
      ],
      completion_criteria: 'Complete first draft of all sections'
    });

    // Milestone 4: Review & Refinement (20% of timeline)
    const m4Start = this.addDays(m3Start, Math.max(3, Math.floor(totalDuration * 0.30)));
    milestones.push({
      name: 'Review & Refinement',
      start_date: m4Start,
      end_date: this.addDays(m4Start, Math.max(2, Math.floor(totalDuration * 0.20))),
      duration_days: Math.max(2, Math.floor(totalDuration * 0.20)),
      tasks: [
        'Internal review by technical experts',
        'Compliance check against requirements',
        'Revise based on feedback',
        'Polish technical content',
        'Refine budget justification'
      ],
      completion_criteria: 'All sections reviewed, major revisions complete'
    });

    // Milestone 5: Final Preparation & Submission (remaining time minus buffer)
    const m5Start = this.addDays(m4Start, Math.max(2, Math.floor(totalDuration * 0.20)));
    const submissionDate = this.addDays(deadline, -bufferDays);
    milestones.push({
      name: 'Final Preparation & Submission',
      start_date: m5Start,
      end_date: submissionDate,
      duration_days: Math.max(1, Math.floor((submissionDate - m5Start) / (1000 * 60 * 60 * 24))),
      tasks: [
        'Final formatting and compliance check',
        'Collect all required certifications',
        'Compile supporting documents',
        'Obtain necessary signatures',
        'Upload to submission portal',
        'Submit proposal'
      ],
      completion_criteria: 'Proposal submitted successfully'
    });

    return milestones;
  }

  /**
   * Calculate urgency level based on days remaining
   * @param {number} daysRemaining - Days until deadline
   * @returns {string} Urgency level
   */
  calculateUrgencyLevel(daysRemaining) {
    if (daysRemaining <= 0) {
      return 'expired';
    } else if (daysRemaining <= 3) {
      return 'critical';
    } else if (daysRemaining <= 7) {
      return 'urgent';
    } else if (daysRemaining <= 14) {
      return 'high';
    } else if (daysRemaining <= 30) {
      return 'moderate';
    } else {
      return 'low';
    }
  }

  /**
   * Get upcoming deadlines sorted by urgency
   * @param {Array} grants - Array of grant opportunities
   * @param {number} daysAhead - Look ahead this many days
   * @returns {Array} Sorted grants with deadline info
   */
  getUpcomingDeadlines(grants, daysAhead = 90) {
    const today = new Date();
    const futureDate = this.addDays(today, daysAhead);

    return grants
      .filter(grant => {
        const deadline = new Date(grant.deadline);
        return deadline >= today && deadline <= futureDate;
      })
      .map(grant => {
        const deadline = new Date(grant.deadline);
        const daysRemaining = Math.floor((deadline - today) / (1000 * 60 * 60 * 24));
        return {
          ...grant,
          days_remaining: daysRemaining,
          urgency_level: this.calculateUrgencyLevel(daysRemaining),
          deadline_formatted: this.formatDate(deadline)
        };
      })
      .sort((a, b) => a.days_remaining - b.days_remaining);
  }

  /**
   * Generate strategic application calendar
   * @param {Array} grants - Array of grant opportunities
   * @param {Object} companyProfile - Company profile for workload estimation
   * @returns {Object} Strategic calendar with recommendations
   */
  generateStrategicCalendar(grants, companyProfile = {}) {
    const calendar = {
      generated_date: new Date().toISOString(),
      total_opportunities: grants.length,
      calendar_weeks: [],
      recommendations: [],
      workload_analysis: {}
    };

    // Get upcoming deadlines
    const upcomingGrants = this.getUpcomingDeadlines(grants, 180); // 6 months ahead

    // Group by weeks
    const weekMap = new Map();
    upcomingGrants.forEach(grant => {
      const weekKey = this.getWeekKey(new Date(grant.deadline));
      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, {
          week_start: this.getWeekStart(new Date(grant.deadline)),
          week_end: this.getWeekEnd(new Date(grant.deadline)),
          grants: [],
          total_grants: 0,
          urgency_levels: { critical: 0, urgent: 0, high: 0, moderate: 0, low: 0 }
        });
      }
      
      const weekData = weekMap.get(weekKey);
      weekData.grants.push(grant);
      weekData.total_grants++;
      weekData.urgency_levels[grant.urgency_level]++;
    });

    // Convert to array and sort
    calendar.calendar_weeks = Array.from(weekMap.values())
      .sort((a, b) => new Date(a.week_start) - new Date(b.week_start));

    // Analyze workload
    const maxConcurrentProposals = companyProfile.max_concurrent_proposals || 3;
    calendar.workload_analysis = this.analyzeWorkload(upcomingGrants, maxConcurrentProposals);

    // Generate recommendations
    calendar.recommendations = this.generateCalendarRecommendations(
      calendar.calendar_weeks,
      calendar.workload_analysis
    );

    return calendar;
  }

  /**
   * Analyze workload based on grant timelines
   * @param {Array} grants - Grants with deadline info
   * @param {number} maxConcurrent - Max concurrent proposals
   * @returns {Object} Workload analysis
   */
  analyzeWorkload(grants, maxConcurrent) {
    const analysis = {
      max_concurrent_capacity: maxConcurrent,
      peak_weeks: [],
      overloaded_periods: [],
      recommended_focus: []
    };

    // Sort by recommended start date
    const grantsWithTimelines = grants.map(grant => {
      const timeline = this.generateApplicationTimeline(grant);
      return { ...grant, timeline };
    });

    // Group by week and check for overlaps
    const weeklyLoad = new Map();
    grantsWithTimelines.forEach(grant => {
      if (grant.timeline.recommended_start_date) {
        const weekKey = this.getWeekKey(new Date(grant.timeline.recommended_start_date));
        if (!weeklyLoad.has(weekKey)) {
          weeklyLoad.set(weekKey, []);
        }
        weeklyLoad.get(weekKey).push(grant);
      }
    });

    // Identify peak and overloaded weeks
    weeklyLoad.forEach((grantsInWeek, weekKey) => {
      if (grantsInWeek.length >= maxConcurrent) {
        analysis.overloaded_periods.push({
          week: weekKey,
          grant_count: grantsInWeek.length,
          grants: grantsInWeek.map(g => g.id)
        });
      }
      if (grantsInWeek.length > 0) {
        analysis.peak_weeks.push({
          week: weekKey,
          grant_count: grantsInWeek.length
        });
      }
    });

    // Sort peak weeks by load
    analysis.peak_weeks.sort((a, b) => b.grant_count - a.grant_count);

    return analysis;
  }

  /**
   * Generate calendar recommendations
   * @param {Array} calendarWeeks - Weekly grant data
   * @param {Object} workloadAnalysis - Workload analysis
   * @returns {Array} Recommendations
   */
  generateCalendarRecommendations(calendarWeeks, workloadAnalysis) {
    const recommendations = [];

    if (workloadAnalysis.overloaded_periods.length > 0) {
      recommendations.push({
        priority: 'high',
        type: 'workload',
        message: `${workloadAnalysis.overloaded_periods.length} weeks have workload exceeding capacity. Consider prioritizing highest-value grants.`
      });
    }

    // Identify weeks with critical deadlines
    const criticalWeeks = calendarWeeks.filter(week => week.urgency_levels.critical > 0);
    if (criticalWeeks.length > 0) {
      recommendations.push({
        priority: 'critical',
        type: 'deadline',
        message: `${criticalWeeks.length} weeks contain critical deadlines. Immediate action required.`
      });
    }

    // Suggest optimal application windows
    const lowLoadWeeks = calendarWeeks.filter(week => week.total_grants <= 2);
    if (lowLoadWeeks.length > 0) {
      recommendations.push({
        priority: 'medium',
        type: 'planning',
        message: `${lowLoadWeeks.length} weeks have lower activity. Good windows for starting new proposals.`
      });
    }

    return recommendations;
  }

  /**
   * Parse amount string to number
   * @param {string} amountStr - Amount string
   * @returns {number} Numeric amount
   */
  parseAmount(amountStr) {
    if (typeof amountStr === 'number') return amountStr;
    const cleaned = String(amountStr).replace(/[$,]/g, '');
    return parseInt(cleaned, 10) || 0;
  }

  /**
   * Add days to a date
   * @param {Date} date - Starting date
   * @param {number} days - Days to add
   * @returns {Date} New date
   */
  addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * Format date for display
   * @param {Date} date - Date to format
   * @returns {string} Formatted date
   */
  formatDate(date) {
    return date.toISOString().split('T')[0];
  }

  /**
   * Get week key for grouping
   * @param {Date} date - Date
   * @returns {string} Week key
   */
  getWeekKey(date) {
    const weekStart = this.getWeekStart(date);
    return this.formatDate(weekStart);
  }

  /**
   * Get start of week (Monday)
   * @param {Date} date - Date
   * @returns {Date} Week start
   */
  getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  /**
   * Get end of week (Sunday)
   * @param {Date} date - Date
   * @returns {Date} Week end
   */
  getWeekEnd(date) {
    const weekStart = this.getWeekStart(date);
    return this.addDays(weekStart, 6);
  }
}

export default DeadlineTrackingService;
