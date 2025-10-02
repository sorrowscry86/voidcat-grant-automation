import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Compliance Automation
 * Tests eligibility validation, budget justification,
 * certifications, and pre-submission review
 */

const API_BASE_URL = process.env.API_URL || 'https://grant-search-api.sorrowscry86.workers.dev';

test.describe('Compliance - Eligibility Validation', () => {
  const mockCompanyProfile = {
    employee_count: 45,
    annual_revenue: 5000000,
    us_citizen_ownership_percentage: 75,
    foreign_controlled: false,
    primary_research_location_us: true,
    registrations: {
      SAM: { status: 'active', expiration: '2026-01-01' },
      DUNS: { status: 'active' }
    }
  };

  const mockGrantRequirements = {
    ownership: {
      us_ownership_percentage: 51,
      no_foreign_control: true
    },
    size_standard: {
      max_employees: 500
    },
    citizenship: {
      us_location_required: true
    },
    registrations: [
      { type: 'SAM', critical: true },
      { type: 'DUNS', critical: true }
    ]
  };

  test('should validate eligible company', async ({ request }) => {
    const startTime = Date.now();
    
    const response = await request.post(`${API_BASE_URL}/api/grants/validate-eligibility`, {
      data: {
        company_profile: mockCompanyProfile,
        grant_requirements: mockGrantRequirements
      }
    });
    
    const duration = Date.now() - startTime;
    
    // Verify response time < 3 seconds
    expect(duration).toBeLessThan(3000);
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    // Verify structure
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('validation');
    
    // Verify validation result
    const validation = data.validation;
    expect(validation).toHaveProperty('eligible', true);
    expect(validation).toHaveProperty('requirements_met');
    expect(validation).toHaveProperty('requirements_failed');
    expect(validation).toHaveProperty('details');
    
    // Should pass all requirements
    expect(validation.requirements_met.length).toBeGreaterThan(0);
    expect(validation.requirements_failed.length).toBe(0);
  });

  test('should detect ownership violations', async ({ request }) => {
    const ineligibleCompany = {
      ...mockCompanyProfile,
      us_citizen_ownership_percentage: 40, // Below 51% requirement
      foreign_controlled: true
    };

    const response = await request.post(`${API_BASE_URL}/api/grants/validate-eligibility`, {
      data: {
        company_profile: ineligibleCompany,
        grant_requirements: mockGrantRequirements
      }
    });
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data.validation.eligible).toBe(false);
    expect(data.validation.requirements_failed).toContain('Ownership requirements');
  });

  test('should detect size standard violations', async ({ request }) => {
    const oversizedCompany = {
      ...mockCompanyProfile,
      employee_count: 600 // Exceeds 500 limit
    };

    const response = await request.post(`${API_BASE_URL}/api/grants/validate-eligibility`, {
      data: {
        company_profile: oversizedCompany,
        grant_requirements: mockGrantRequirements
      }
    });
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data.validation.eligible).toBe(false);
    expect(data.validation.requirements_failed).toContain('Size standard');
  });

  test('should validate registration requirements', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/grants/validate-eligibility`, {
      data: {
        company_profile: mockCompanyProfile,
        grant_requirements: mockGrantRequirements
      }
    });
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data.validation.details).toHaveProperty('registrations');
    expect(data.validation.details.registrations.compliant).toBe(true);
  });

  test('should handle missing parameters', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/grants/validate-eligibility`, {
      data: {
        company_profile: mockCompanyProfile
        // Missing grant_requirements
      }
    });
    
    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.code).toBe('MISSING_PARAMETERS');
  });
});

test.describe('Compliance - Budget Justification', () => {
  const mockBudget = {
    personnel: 125000,
    fringe_benefits: 37500,
    equipment: 25000,
    materials_supplies: 12500,
    travel: 12500,
    consultants: 12500,
    other_direct_costs: 12500,
    indirect_costs: 12500,
    total: 250000
  };

  const mockProjectDetails = {
    title: 'AI for Defense Applications',
    budget_period: '12 months',
    team_size: 5,
    technical_domain: 'artificial intelligence'
  };

  test('should generate FAR-compliant budget justification', async ({ request }) => {
    const startTime = Date.now();
    
    const response = await request.post(`${API_BASE_URL}/api/grants/generate-budget-justification`, {
      data: {
        budget: mockBudget,
        project_details: mockProjectDetails
      }
    });
    
    const duration = Date.now() - startTime;
    
    // Verify response time < 2 seconds
    expect(duration).toBeLessThan(2000);
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    // Verify structure
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('budget_justification');
    
    // Verify budget justification
    const justification = data.budget_justification;
    expect(justification).toHaveProperty('total_budget', 250000);
    expect(justification).toHaveProperty('budget_period', '12 months');
    expect(justification).toHaveProperty('categories');
    expect(justification).toHaveProperty('compliance_notes');
  });

  test('should validate percentages sum to 100%', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/grants/generate-budget-justification`, {
      data: {
        budget: mockBudget,
        project_details: mockProjectDetails
      }
    });
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    const categories = data.budget_justification.categories;
    const totalPercentage = categories.reduce((sum: number, cat: any) => sum + cat.percentage, 0);
    
    // Should be close to 100% (within rounding)
    expect(totalPercentage).toBeGreaterThan(99);
    expect(totalPercentage).toBeLessThan(101);
  });

  test('should include category justifications', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/grants/generate-budget-justification`, {
      data: {
        budget: mockBudget,
        project_details: mockProjectDetails
      }
    });
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    const categories = data.budget_justification.categories;
    categories.forEach((category: any) => {
      expect(category).toHaveProperty('justification');
      expect(category.justification.length).toBeGreaterThan(50); // Substantive justification
    });
  });

  test('should flag percentage variances', async ({ request }) => {
    const unevenBudget = {
      personnel: 200000, // 80% - way above typical 50%
      equipment: 25000,
      indirect_costs: 25000,
      total: 250000
    };

    const response = await request.post(`${API_BASE_URL}/api/grants/generate-budget-justification`, {
      data: {
        budget: unevenBudget,
        project_details: mockProjectDetails
      }
    });
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data.budget_justification.warnings.length).toBeGreaterThan(0);
  });

  test('should include FAR compliance notes', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/grants/generate-budget-justification`, {
      data: {
        budget: mockBudget,
        project_details: mockProjectDetails
      }
    });
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data.budget_justification.compliance_notes).toBeDefined();
    expect(data.budget_justification.compliance_notes.length).toBeGreaterThan(0);
    
    // Should mention FAR Part 31
    const notesText = data.budget_justification.compliance_notes.join(' ');
    expect(notesText).toContain('FAR');
  });
});

test.describe('Compliance - Certifications Checklist', () => {
  test('should generate SBIR certifications checklist', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/grants/certifications-checklist?grant_type=SBIR&agency=DOD`);
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    // Verify structure
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('grant_type', 'SBIR');
    expect(data).toHaveProperty('agency', 'DOD');
    expect(data).toHaveProperty('certifications');
    
    // Verify certifications array
    expect(Array.isArray(data.certifications)).toBeTruthy();
    expect(data.certifications.length).toBeGreaterThan(0);
  });

  test('should include required and optional certifications', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/grants/certifications-checklist?grant_type=SBIR&agency=DOD`);
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    const certifications = data.certifications;
    const required = certifications.filter((cert: any) => cert.required === true);
    
    expect(required.length).toBeGreaterThan(0);
    
    // Each certification should have proper structure
    certifications.forEach((cert: any) => {
      expect(cert).toHaveProperty('name');
      expect(cert).toHaveProperty('required');
      expect(cert).toHaveProperty('description');
    });
  });

  test('should handle STTR-specific certifications', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/grants/certifications-checklist?grant_type=STTR&agency=NIH`);
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data.grant_type).toBe('STTR');
    expect(data.certifications.length).toBeGreaterThan(0);
  });

  test('should require both grant_type and agency', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/grants/certifications-checklist?grant_type=SBIR`);
    
    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.code).toBe('MISSING_PARAMETERS');
  });
});

test.describe('Compliance - Pre-Submission Review', () => {
  const mockProposal = {
    company_profile: {
      employee_count: 45,
      annual_revenue: 5000000,
      us_citizen_ownership_percentage: 75,
      foreign_controlled: false
    },
    budget: {
      personnel: 125000,
      equipment: 25000,
      total: 250000
    },
    sections: {
      executive_summary: 'Executive summary content...',
      technical_approach: 'Technical approach content...',
      commercial_potential: 'Commercial potential content...'
    },
    certifications: [
      'Debarment Certification',
      'SBIR Eligibility'
    ],
    page_count: 14
  };

  const mockGrantRequirements = {
    program_type: 'SBIR',
    agency: 'DOD',
    page_limit: 15,
    required_sections: ['executive_summary', 'technical_approach'],
    required_certifications: [
      { name: 'Debarment Certification', required: true }
    ]
  };

  test('should perform comprehensive pre-submission review', async ({ request }) => {
    const startTime = Date.now();
    
    const response = await request.post(`${API_BASE_URL}/api/grants/pre-submission-review`, {
      data: {
        proposal: mockProposal,
        grant_requirements: mockGrantRequirements
      }
    });
    
    const duration = Date.now() - startTime;
    
    // Verify response time < 3 seconds
    expect(duration).toBeLessThan(3000);
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    // Verify structure
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('review');
    
    // Verify review structure
    const review = data.review;
    expect(review).toHaveProperty('ready_to_submit');
    expect(review).toHaveProperty('critical_issues');
    expect(review).toHaveProperty('warnings');
    expect(review).toHaveProperty('recommendations');
    expect(review).toHaveProperty('checklist');
  });

  test('should validate all compliance areas', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/grants/pre-submission-review`, {
      data: {
        proposal: mockProposal,
        grant_requirements: mockGrantRequirements
      }
    });
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    const checklist = data.review.checklist;
    expect(checklist).toHaveProperty('eligibility');
    expect(checklist).toHaveProperty('budget');
    expect(checklist).toHaveProperty('certifications');
    expect(checklist).toHaveProperty('format');
    expect(checklist).toHaveProperty('content');
  });

  test('should detect missing sections', async ({ request }) => {
    const incompleteProposal = {
      ...mockProposal,
      sections: {
        executive_summary: 'Content...'
        // Missing technical_approach
      }
    };

    const response = await request.post(`${API_BASE_URL}/api/grants/pre-submission-review`, {
      data: {
        proposal: incompleteProposal,
        grant_requirements: mockGrantRequirements
      }
    });
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data.review.ready_to_submit).toBe(false);
    expect(data.review.critical_issues.length).toBeGreaterThan(0);
  });

  test('should detect page limit violations', async ({ request }) => {
    const overlongProposal = {
      ...mockProposal,
      page_count: 20 // Exceeds 15 page limit
    };

    const response = await request.post(`${API_BASE_URL}/api/grants/pre-submission-review`, {
      data: {
        proposal: overlongProposal,
        grant_requirements: mockGrantRequirements
      }
    });
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    // Should flag format issue
    expect(data.review.checklist.format).toBe(false);
  });

  test('should provide actionable recommendations', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/grants/pre-submission-review`, {
      data: {
        proposal: mockProposal,
        grant_requirements: mockGrantRequirements
      }
    });
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(Array.isArray(data.review.recommendations)).toBeTruthy();
    // Should have at least one recommendation
    if (data.review.recommendations.length > 0) {
      expect(data.review.recommendations[0].length).toBeGreaterThan(10);
    }
  });
});

test.describe('Compliance - Performance', () => {
  test('all compliance endpoints should meet performance requirements', async ({ request }) => {
    const endpoints = [
      {
        url: '/api/grants/validate-eligibility',
        method: 'POST',
        maxTime: 3000,
        body: {
          company_profile: { employee_count: 45 },
          grant_requirements: { size_standard: { max_employees: 500 } }
        }
      },
      {
        url: '/api/grants/generate-budget-justification',
        method: 'POST',
        maxTime: 2000,
        body: {
          budget: { personnel: 150000, total: 250000 },
          project_details: { title: 'Test Project', budget_period: '12 months' }
        }
      },
      {
        url: '/api/grants/certifications-checklist?grant_type=SBIR&agency=DOD',
        method: 'GET',
        maxTime: 2000
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
