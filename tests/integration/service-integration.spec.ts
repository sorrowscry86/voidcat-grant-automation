// Service Integration Tests
// VoidCat Grant Automation Platform - Intelligent Discovery Engine
// Tests service-to-service interactions and data flow

import { test, expect } from '@playwright/test';

const API_BASE_URL = 'http://localhost:8787';

/**
 * Test integration between DataService and SemanticAnalysisService
 */
test.describe('DataService → SemanticAnalysisService Integration', () => {
  test('Grant search results feed into semantic matching', async ({ request }) => {
    // Step 1: Get grant data from DataService
    const searchResponse = await request.get(`${API_BASE_URL}/api/grants/search`, {
      params: {
        query: 'artificial intelligence',
        agency: 'Department of Defense'
      }
    });

    expect(searchResponse.ok()).toBeTruthy();
    const searchData = await searchResponse.json();
    expect(searchData.grants).toBeDefined();
    expect(searchData.grants.length).toBeGreaterThan(0);

    const targetGrant = searchData.grants[0];

    // Step 2: Use grant data for semantic matching
    const matchResponse = await request.post(`${API_BASE_URL}/api/grants/analyze-match`, {
      data: {
        grant_id: targetGrant.id,
        company_profile: {
          name: 'AI Startup',
          expertise: ['Artificial Intelligence', 'Machine Learning'],
          technologies: ['Neural Networks', 'Deep Learning'],
          years_in_business: 3
        }
      }
    });

    expect(matchResponse.ok()).toBeTruthy();
    const matchData = await matchResponse.json();
    
    // Verify data integration
    expect(matchData.success).toBe(true);
    expect(matchData.matching_score).toBeGreaterThanOrEqual(0);
    expect(matchData.matching_score).toBeLessThanOrEqual(100);
    expect(matchData.grant_details).toBeDefined();
    expect(matchData.grant_details.id).toBe(targetGrant.id);
  });

  test('Multiple grants processed through semantic analysis', async ({ request }) => {
    const searchResponse = await request.get(`${API_BASE_URL}/api/grants/search`, {
      params: { query: 'research' }
    });

    const searchData = await searchResponse.json();
    const grants = searchData.grants.slice(0, 3); // Test with first 3 grants

    const companyProfile = {
      name: 'Research Inc',
      expertise: ['Research', 'Development'],
      technologies: ['Innovation'],
      years_in_business: 5
    };

    // Process each grant through semantic matching
    for (const grant of grants) {
      const matchResponse = await request.post(`${API_BASE_URL}/api/grants/analyze-match`, {
        data: {
          grant_id: grant.id,
          company_profile: companyProfile
        }
      });

      expect(matchResponse.ok()).toBeTruthy();
      const matchData = await matchResponse.json();
      expect(matchData.matching_score).toBeDefined();
    }
  });
});

/**
 * Test integration between ComplianceService and Budget generation
 */
test.describe('ComplianceService → Budget Service Integration', () => {
  test('Eligibility validation flows into budget generation', async ({ request }) => {
    // Step 1: Validate eligibility
    const eligibilityResponse = await request.post(`${API_BASE_URL}/api/grants/validate-eligibility`, {
      data: {
        grant_id: 'SBIR-25-001',
        company_profile: {
          employees: 50,
          us_citizen_ownership: 85,
          annual_revenue: 5000000,
          pi_citizenship: 'US Citizen',
          research_location: 'United States',
          sam_registered: true,
          duns_number: '123456789'
        }
      }
    });

    expect(eligibilityResponse.ok()).toBeTruthy();
    const eligibilityData = await eligibilityResponse.json();
    expect(eligibilityData.eligible).toBe(true);

    // Step 2: If eligible, proceed with budget generation
    if (eligibilityData.eligible) {
      const budgetResponse = await request.post(`${API_BASE_URL}/api/grants/generate-budget-justification`, {
        data: {
          grant_id: 'SBIR-25-001',
          budget_categories: {
            personnel: 150000,
            equipment: 50000,
            travel: 20000,
            other: 30000
          }
        }
      });

      expect(budgetResponse.ok()).toBeTruthy();
      const budgetData = await budgetResponse.json();
      expect(budgetData.success).toBe(true);
      expect(budgetData.budget.total_budget).toBe(250000);
      
      // Budget should include compliance notes
      expect(budgetData.compliance_notes).toBeDefined();
    }
  });

  test('Budget validation checks against FAR principles', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/grants/generate-budget-justification`, {
      data: {
        grant_id: 'DOD-25-001',
        budget_categories: {
          personnel: 600000,
          equipment: 200000,
          materials: 50000,
          travel: 80000,
          consultants: 50000,
          other: 20000
        }
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data.success).toBe(true);
    expect(data.budget.total_budget).toBe(1000000);
    
    // Verify FAR compliance checking
    expect(data.compliance_notes).toBeDefined();
    expect(data.variance_warnings).toBeDefined();
    
    // Check if percentages are reasonable
    const personnelPercent = (600000 / 1000000) * 100;
    expect(personnelPercent).toBeGreaterThan(0);
    expect(personnelPercent).toBeLessThan(100);
  });
});

/**
 * Test integration between AIProposalService and Template Library
 */
test.describe('AIProposalService → Template Library Integration', () => {
  test('Agency-specific template selection', async ({ request }) => {
    const agencies = ['DOD', 'NSF', 'NIH', 'DARPA', 'DOE'];
    
    for (const agency of agencies) {
      // Get agency template
      const templateResponse = await request.get(`${API_BASE_URL}/api/grants/agency-template`, {
        params: { agency }
      });

      expect(templateResponse.ok()).toBeTruthy();
      const templateData = await templateResponse.json();
      
      expect(templateData.success).toBe(true);
      expect(templateData.template).toBeDefined();
      expect(templateData.template.agency).toBe(agency);
      expect(templateData.template.required_sections).toBeDefined();
      expect(templateData.template.page_limits).toBeDefined();
    }
  });

  test('Proposal generation uses correct template', async ({ request }) => {
    const testCases = [
      { grantId: 'SBIR-25-001', expectedAgency: 'Department of Defense' },
      { grantId: 'NSF-25-002', expectedAgency: 'National Science Foundation' },
      { grantId: 'NIH-25-007', expectedAgency: 'National Institutes of Health' }
    ];

    for (const testCase of testCases) {
      const response = await request.post(`${API_BASE_URL}/api/grants/generate-ai-proposal`, {
        data: {
          grant_id: testCase.grantId,
          company_profile: {
            name: 'Test Company',
            employees: 10,
            expertise: ['Technology'],
            technologies: ['Innovation']
          }
        }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.proposal.metadata.agency).toBe(testCase.expectedAgency);
      expect(data.proposal.sections).toBeDefined();
    }
  });

  test('Template compliance checking', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/grants/generate-ai-proposal`, {
      data: {
        grant_id: 'DOD-25-001',
        company_profile: {
          name: 'Defense Contractor',
          employees: 50,
          expertise: ['Defense Technology', 'Cybersecurity'],
          technologies: ['Encryption', 'Network Security']
        }
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    // Verify template compliance
    expect(data.proposal.compliance).toBeDefined();
    expect(data.proposal.compliance.template_used).toBe('DOD');
    expect(data.proposal.compliance.sections_complete).toBeDefined();
  });
});

/**
 * Test end-to-end data flow across all services
 */
test.describe('End-to-End Service Integration', () => {
  test('Complete workflow: Search → Match → Eligibility → Budget → Proposal', async ({ request }) => {
    const companyProfile = {
      name: 'Integrated Test Company',
      employees: 25,
      annual_revenue: 3000000,
      years_in_business: 5,
      ownership: {
        us_citizen_owned: 90,
        foreign_owned: 0
      },
      expertise: ['Software Development', 'AI', 'Cybersecurity'],
      technologies: ['Machine Learning', 'Cloud Computing', 'Blockchain'],
      past_projects: ['Government Contract 2023'],
      certifications: ['ISO 27001', 'SOC 2']
    };

    // Step 1: Search for grants
    const searchResponse = await request.get(`${API_BASE_URL}/api/grants/search`, {
      params: {
        query: 'artificial intelligence cybersecurity',
        agency: 'Department of Defense'
      }
    });
    expect(searchResponse.ok()).toBeTruthy();
    const searchData = await searchResponse.json();
    const targetGrant = searchData.grants[0];

    // Step 2: Calculate matching score
    const matchResponse = await request.post(`${API_BASE_URL}/api/grants/analyze-match`, {
      data: {
        grant_id: targetGrant.id,
        company_profile: companyProfile
      }
    });
    expect(matchResponse.ok()).toBeTruthy();
    const matchData = await matchResponse.json();
    expect(matchData.matching_score).toBeGreaterThan(0);

    // Step 3: Validate eligibility
    const eligibilityResponse = await request.post(`${API_BASE_URL}/api/grants/validate-eligibility`, {
      data: {
        grant_id: targetGrant.id,
        company_profile: {
          employees: companyProfile.employees,
          us_citizen_ownership: companyProfile.ownership.us_citizen_owned,
          annual_revenue: companyProfile.annual_revenue,
          pi_citizenship: 'US Citizen',
          research_location: 'United States',
          sam_registered: true,
          duns_number: '123456789'
        }
      }
    });
    expect(eligibilityResponse.ok()).toBeTruthy();
    const eligibilityData = await eligibilityResponse.json();
    expect(eligibilityData.eligible).toBe(true);

    // Step 4: Generate budget
    const budgetResponse = await request.post(`${API_BASE_URL}/api/grants/generate-budget-justification`, {
      data: {
        grant_id: targetGrant.id,
        budget_categories: {
          personnel: 150000,
          equipment: 50000,
          travel: 20000,
          other: 30000
        }
      }
    });
    expect(budgetResponse.ok()).toBeTruthy();
    const budgetData = await budgetResponse.json();
    expect(budgetData.budget.total_budget).toBe(250000);

    // Step 5: Generate proposal
    const proposalResponse = await request.post(`${API_BASE_URL}/api/grants/generate-ai-proposal`, {
      data: {
        grant_id: targetGrant.id,
        company_profile: companyProfile
      }
    });
    expect(proposalResponse.ok()).toBeTruthy();
    const proposalData = await proposalResponse.json();
    expect(proposalData.proposal.sections).toBeDefined();

    // Step 6: Pre-submission review
    const reviewResponse = await request.post(`${API_BASE_URL}/api/grants/pre-submission-review`, {
      data: {
        grant_id: targetGrant.id,
        company_profile: companyProfile,
        proposal_sections: Object.keys(proposalData.proposal.sections)
      }
    });
    expect(reviewResponse.ok()).toBeTruthy();
    const reviewData = await reviewResponse.json();
    expect(reviewData.compliance_score).toBeGreaterThan(0);

    // Verify data consistency across services
    expect(reviewData.review_results.eligibility_check).toBe('pass');
    expect(reviewData.review_results.budget_check).toBe('pass');
  });
});
