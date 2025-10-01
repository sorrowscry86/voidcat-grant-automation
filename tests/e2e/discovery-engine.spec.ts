import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Intelligent Discovery Engine
 * Tests the new API endpoints for federal agency management,
 * semantic matching, and timeline generation
 */

const API_BASE_URL = process.env.API_URL || 'https://grant-search-api.sorrowscry86.workers.dev';

test.describe('Discovery Engine - Federal Agencies', () => {
  test('should list all 11 federal agencies', async ({ request }) => {
    const startTime = Date.now();
    
    const response = await request.get(`${API_BASE_URL}/api/grants/federal-agencies`);
    
    const duration = Date.now() - startTime;
    
    // Verify response time < 2 seconds
    expect(duration).toBeLessThan(2000);
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    // Verify structure
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('total_agencies', 11);
    expect(data).toHaveProperty('agencies');
    expect(data).toHaveProperty('statistics');
    
    // Verify agencies array
    expect(data.agencies).toHaveLength(11);
    
    // Verify first agency structure
    const firstAgency = data.agencies[0];
    expect(firstAgency).toHaveProperty('id');
    expect(firstAgency).toHaveProperty('name');
    expect(firstAgency).toHaveProperty('acronym');
    expect(firstAgency).toHaveProperty('portal_url');
    expect(firstAgency).toHaveProperty('program_types');
    expect(firstAgency).toHaveProperty('solicitation_schedule');
  });

  test('should return correct SBIR/STTR counts', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/grants/federal-agencies`);
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    
    // Verify statistics
    expect(data.statistics.by_program_type.SBIR).toBe(11);
    expect(data.statistics.by_program_type.STTR).toBe(6);
  });

  test('should include scanning schedule data', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/grants/federal-agencies`);
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    
    // Verify scanning schedule exists
    expect(data.scanning_schedule).toBeDefined();
    expect(data.scanning_schedule).toHaveProperty('continuous');
    expect(data.scanning_schedule).toHaveProperty('quarterly');
    expect(data.scanning_schedule).toHaveProperty('annual');
  });

  test('should validate all agencies have required fields', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/grants/federal-agencies`);
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    
    // Verify each agency has all required fields
    data.agencies.forEach((agency: any) => {
      expect(agency.id).toBeTruthy();
      expect(agency.name).toBeTruthy();
      expect(agency.acronym).toBeTruthy();
      expect(agency.portal_url).toMatch(/^https?:\/\//);
      expect(Array.isArray(agency.program_types)).toBeTruthy();
      expect(agency.solicitation_schedule).toBeTruthy();
    });
  });
});

test.describe('Discovery Engine - Semantic Matching', () => {
  const mockCompanyProfile = {
    name: 'TechCorp Inc.',
    description: 'AI and machine learning solutions for defense applications',
    capabilities: ['artificial intelligence', 'deep learning', 'computer vision'],
    technologies: ['TensorFlow', 'PyTorch', 'CUDA'],
    years_in_business: 5,
    employee_count: 45,
    past_projects: ['DoD AI contract', 'NSF research grant']
  };

  test('should calculate matching score for grant', async ({ request }) => {
    const startTime = Date.now();
    
    const response = await request.post(`${API_BASE_URL}/api/grants/analyze-match`, {
      data: {
        company_profile: mockCompanyProfile,
        grant_id: 'SBIR-25-001'
      }
    });
    
    const duration = Date.now() - startTime;
    
    // Verify response time < 3 seconds
    expect(duration).toBeLessThan(3000);
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    // Verify structure
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('matching_analysis');
    expect(data).toHaveProperty('grant_details');
    
    // Verify matching analysis
    const analysis = data.matching_analysis;
    expect(analysis).toHaveProperty('overall_score');
    expect(analysis.overall_score).toBeGreaterThanOrEqual(0);
    expect(analysis.overall_score).toBeLessThanOrEqual(100);
    
    expect(analysis).toHaveProperty('technical_alignment');
    expect(analysis).toHaveProperty('capability_match');
    expect(analysis).toHaveProperty('experience_match');
    expect(analysis).toHaveProperty('confidence_level');
  });

  test('should return proper confidence levels', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/grants/analyze-match`, {
      data: {
        company_profile: mockCompanyProfile,
        grant_id: 'SBIR-25-001'
      }
    });
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    const confidenceLevel = data.matching_analysis.confidence_level;
    expect(['high', 'medium', 'low']).toContain(confidenceLevel);
  });

  test('should provide recommendations', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/grants/analyze-match`, {
      data: {
        company_profile: mockCompanyProfile,
        grant_id: 'SBIR-25-001'
      }
    });
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data.matching_analysis).toHaveProperty('recommendations');
    expect(Array.isArray(data.matching_analysis.recommendations)).toBeTruthy();
  });

  test('should handle missing parameters', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/grants/analyze-match`, {
      data: {
        company_profile: mockCompanyProfile
        // Missing grant_id
      }
    });
    
    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.code).toBe('MISSING_PARAMETERS');
  });

  test('should handle invalid grant ID', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/grants/analyze-match`, {
      data: {
        company_profile: mockCompanyProfile,
        grant_id: 'INVALID-GRANT-ID'
      }
    });
    
    expect(response.status()).toBe(404);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.code).toBe('GRANT_NOT_FOUND');
  });
});

test.describe('Discovery Engine - Timeline Generation', () => {
  test('should generate application timeline', async ({ request }) => {
    const startTime = Date.now();
    
    const response = await request.post(`${API_BASE_URL}/api/grants/application-timeline`, {
      data: {
        grant_id: 'SBIR-25-001',
        buffer_days: 5
      }
    });
    
    const duration = Date.now() - startTime;
    
    // Verify response time < 2 seconds
    expect(duration).toBeLessThan(2000);
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    // Verify structure
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('timeline');
    expect(data).toHaveProperty('grant_details');
    
    // Verify timeline
    const timeline = data.timeline;
    expect(timeline).toHaveProperty('grant_id');
    expect(timeline).toHaveProperty('deadline');
    expect(timeline).toHaveProperty('days_remaining');
    expect(timeline).toHaveProperty('urgency_level');
    expect(timeline).toHaveProperty('status');
    expect(timeline).toHaveProperty('milestones');
  });

  test('should include 5-phase milestone structure', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/grants/application-timeline`, {
      data: {
        grant_id: 'SBIR-25-001'
      }
    });
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    const milestones = data.timeline.milestones;
    expect(milestones).toHaveLength(5);
    
    // Verify first milestone structure
    const firstMilestone = milestones[0];
    expect(firstMilestone).toHaveProperty('name');
    expect(firstMilestone).toHaveProperty('start_date');
    expect(firstMilestone).toHaveProperty('end_date');
    expect(firstMilestone).toHaveProperty('duration_days');
    expect(firstMilestone).toHaveProperty('tasks');
    expect(Array.isArray(firstMilestone.tasks)).toBeTruthy();
  });

  test('should calculate proper urgency levels', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/grants/application-timeline`, {
      data: {
        grant_id: 'SBIR-25-001'
      }
    });
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    const urgencyLevel = data.timeline.urgency_level;
    expect(['expired', 'critical', 'urgent', 'high', 'moderate', 'low']).toContain(urgencyLevel);
  });

  test('should handle buffer days parameter', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/grants/application-timeline`, {
      data: {
        grant_id: 'SBIR-25-001',
        buffer_days: 10
      }
    });
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data.timeline.buffer_days).toBe(10);
  });
});

test.describe('Discovery Engine - Strategic Calendar', () => {
  test('should generate strategic calendar', async ({ request }) => {
    const startTime = Date.now();
    
    const response = await request.get(`${API_BASE_URL}/api/grants/strategic-calendar?max_concurrent=3`);
    
    const duration = Date.now() - startTime;
    
    // Verify response time < 3 seconds
    expect(duration).toBeLessThan(3000);
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    // Verify structure
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('calendar');
    
    // Verify calendar structure
    const calendar = data.calendar;
    expect(calendar).toHaveProperty('total_opportunities');
    expect(calendar).toHaveProperty('calendar_weeks');
    expect(calendar).toHaveProperty('workload_analysis');
    expect(calendar).toHaveProperty('recommendations');
  });

  test('should include workload analysis', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/grants/strategic-calendar?max_concurrent=3`);
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    const workload = data.calendar.workload_analysis;
    expect(workload).toHaveProperty('max_concurrent_capacity');
    expect(workload).toHaveProperty('peak_weeks');
    expect(workload).toHaveProperty('overloaded_periods');
  });

  test('should provide planning recommendations', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/grants/strategic-calendar`);
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data.calendar.recommendations).toBeDefined();
    expect(Array.isArray(data.calendar.recommendations)).toBeTruthy();
  });

  test('should respect max_concurrent parameter', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/grants/strategic-calendar?max_concurrent=5`);
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data.calendar.workload_analysis.max_concurrent_capacity).toBe(5);
  });
});

test.describe('Discovery Engine - Performance', () => {
  test('all endpoints should meet performance requirements', async ({ request }) => {
    const endpoints = [
      { url: '/api/grants/federal-agencies', method: 'GET', maxTime: 2000 },
      { 
        url: '/api/grants/analyze-match', 
        method: 'POST', 
        maxTime: 3000,
        body: {
          company_profile: {
            description: 'AI company',
            capabilities: ['AI']
          },
          grant_id: 'SBIR-25-001'
        }
      },
      { 
        url: '/api/grants/application-timeline', 
        method: 'POST', 
        maxTime: 2000,
        body: {
          grant_id: 'SBIR-25-001'
        }
      }
    ];

    for (const endpoint of endpoints) {
      const startTime = Date.now();
      
      let response;
      if (endpoint.method === 'GET') {
        response = await request.get(`${API_BASE_URL}${endpoint.url}`);
      } else {
        response = await request.post(`${API_BASE_URL}${endpoint.url}`, {
          data: endpoint.body
        });
      }
      
      const duration = Date.now() - startTime;
      
      expect(response.ok()).toBeTruthy();
      expect(duration).toBeLessThan(endpoint.maxTime);
    }
  });
});
