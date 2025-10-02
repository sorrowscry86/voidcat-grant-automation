// Real-World Production Scenarios - Phase 2 Testing
// VoidCat Grant Automation Platform - Intelligent Discovery Engine
// Week 2: Complete user workflows simulating production use cases

import { test, expect } from '@playwright/test';

const API_BASE_URL = 'http://localhost:8787';

/**
 * SCENARIO A: Small Business SBIR Application (DOD)
 * Company: 10 employees, $2M revenue, tech startup
 * Grant: DOD SBIR Phase I ($150K)
 * Workflow: Complete application from search to proposal generation
 */
test.describe('Scenario A: Small Business SBIR (DOD)', () => {
  const companyProfile = {
    name: 'TechNova Systems Inc.',
    employees: 10,
    annual_revenue: 2000000,
    years_in_business: 3,
    ownership: {
      us_citizen_owned: 85,
      foreign_owned: 0
    },
    expertise: ['Artificial Intelligence', 'Cybersecurity', 'Defense Technology'],
    technologies: ['Machine Learning', 'Neural Networks', 'Threat Detection'],
    past_projects: ['DoD Contract 2023', 'Army Research Lab Collaboration'],
    certifications: ['ISO 9001', 'CMMI Level 3']
  };

  test('Step 1: Search for DOD SBIR opportunities', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/grants/search`, {
      params: {
        query: 'artificial intelligence defense',
        agency: 'Department of Defense',
        program: 'SBIR Phase I'
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data.success).toBe(true);
    expect(data.grants).toBeDefined();
    expect(data.grants.length).toBeGreaterThan(0);
    
    // Find DOD SBIR grant around $150K
    const targetGrant = data.grants.find(g => 
      g.agency === 'Department of Defense' && 
      g.program === 'SBIR Phase I'
    );
    expect(targetGrant).toBeDefined();
    
    // Performance check
    expect(response.headers()['x-response-time'] || '0').toBeLessThan('2000');
  });

  test('Step 2: Calculate matching score for company', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/grants/analyze-match`, {
      data: {
        grant_id: 'SBIR-25-001',
        company_profile: companyProfile
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data.success).toBe(true);
    expect(data.matching_analysis.overall_score).toBeGreaterThan(70); // High match expected
    expect(data.matching_analysis.confidence_level).toBe('high');
    expect(data.matching_analysis.recommendations).toBeDefined();
    
    // Validate scoring breakdown
    expect(data.matching_analysis.breakdown).toBeDefined();
    expect(data.matching_analysis.breakdown.technical_alignment).toBeGreaterThan(0);
    expect(data.matching_analysis.breakdown.capability_match).toBeGreaterThan(0);
  });

  test('Step 3: Validate eligibility requirements', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/grants/validate-eligibility`, {
      data: {
        grant_id: 'SBIR-25-001',
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

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data.success).toBe(true);
    expect(data.eligible).toBe(true);
    expect(data.validation_results.ownership).toBe('pass');
    expect(data.validation_results.size_standard).toBe('pass');
    expect(data.validation_results.citizenship).toBe('pass');
  });

  test('Step 4: Generate application timeline', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/grants/application-timeline`, {
      data: {
        grant_id: 'SBIR-25-001',
        buffer_days: 5
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data.success).toBe(true);
    expect(data.timeline.milestones).toHaveLength(5);
    expect(data.timeline.urgency_level).toBeDefined();
    
    // Verify phase structure
    const phases = data.timeline.milestones.map(m => m.phase);
    expect(phases).toContain('Initial Review');
    expect(phases).toContain('Technical Development');
  });

  test('Step 5: Generate FAR-compliant budget', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/grants/generate-budget-justification`, {
      data: {
        grant_id: 'SBIR-25-001',
        budget_categories: {
          personnel: 97500,
          equipment: 22500,
          travel: 12000,
          other: 18000
        }
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data.success).toBe(true);
    expect(data.budget.total_budget).toBe(150000);
    expect(data.budget.justifications).toBeDefined();
    expect(data.budget.justifications.personnel).toBeDefined();
    
    // Verify FAR compliance
    expect(data.compliance_notes).toBeDefined();
    expect(data.variance_warnings).toBeDefined();
  });

  test('Step 6: Generate complete proposal', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/grants/generate-ai-proposal`, {
      data: {
        grant_id: 'SBIR-25-001',
        company_profile: companyProfile
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data.success).toBe(true);
    expect(data.proposal).toBeDefined();
    
    // Verify all required sections
    expect(data.proposal.sections.executive_summary).toBeDefined();
    expect(data.proposal.sections.technical_approach).toBeDefined();
    expect(data.proposal.sections.innovation).toBeDefined();
    expect(data.proposal.sections.commercial_potential).toBeDefined();
    expect(data.proposal.sections.budget_narrative).toBeDefined();
    
    // Word count validation
    expect(data.word_count).toBeGreaterThan(500);
    
    // Performance check (AI generation allowed up to 30s)
    const responseTime = parseInt(response.headers()['x-response-time'] || '0');
    expect(responseTime).toBeLessThan(30000);
  });

  test('Step 7: Pre-submission review', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/grants/pre-submission-review`, {
      data: {
        grant_id: 'SBIR-25-001',
        company_profile: companyProfile,
        proposal_sections: ['executive_summary', 'technical_approach', 'budget_narrative']
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data.success).toBe(true);
    expect(data.review_results).toBeDefined();
    expect(data.review_results.eligibility_check).toBe('pass');
    expect(data.compliance_score).toBeGreaterThan(80);
    expect(data.ready_for_submission).toBeDefined();
  });
});

/**
 * SCENARIO B: Academic Research Grant (NSF)
 * Company: University research lab, 5 researchers
 * Grant: NSF Small Business Grant ($500K)
 * Focus: Technical proposal with academic research methodology
 */
test.describe('Scenario B: Academic Research Grant (NSF)', () => {
  const researchProfile = {
    name: 'Quantum Computing Research Lab',
    employees: 5,
    annual_revenue: 500000,
    years_in_business: 7,
    ownership: {
      us_citizen_owned: 100,
      foreign_owned: 0
    },
    expertise: ['Quantum Computing', 'Algorithm Design', 'Theoretical Physics'],
    technologies: ['Quantum Algorithms', 'Superconducting Qubits', 'Error Correction'],
    past_projects: ['NSF CAREER Award', '3 Peer-Reviewed Publications', 'University Partnership'],
    certifications: ['Academic Research Compliance']
  };

  test('Complete workflow: Search → Match → Generate', async ({ request }) => {
    // Step 1: Search for NSF opportunities
    const searchResponse = await request.get(`${API_BASE_URL}/api/grants/search`, {
      params: {
        query: 'quantum computing research',
        agency: 'National Science Foundation'
      }
    });
    expect(searchResponse.ok()).toBeTruthy();
    const searchData = await searchResponse.json();
    expect(searchData.grants.length).toBeGreaterThan(0);

    // Step 2: Calculate match
    const matchResponse = await request.post(`${API_BASE_URL}/api/grants/analyze-match`, {
      data: {
        grant_id: 'NSF-25-002',
        company_profile: researchProfile
      }
    });
    expect(matchResponse.ok()).toBeTruthy();
    const matchData = await matchResponse.json();
    expect(matchData.matching_analysis.overall_score).toBeGreaterThan(75); // High academic match

    // Step 3: Generate proposal with academic focus
    const proposalResponse = await request.post(`${API_BASE_URL}/api/grants/generate-ai-proposal`, {
      data: {
        grant_id: 'NSF-25-002',
        company_profile: researchProfile
      }
    });
    expect(proposalResponse.ok()).toBeTruthy();
    const proposalData = await proposalResponse.json();
    
    // Verify academic terminology in sections
    expect(proposalData.proposal.sections.technical_approach).toContain('research');
    expect(proposalData.proposal.metadata.agency).toBe('National Science Foundation');
  });
});

/**
 * SCENARIO C: Multi-Phase Application (NASA)
 * Company: Established contractor, previous Phase I winner
 * Grant: NASA SBIR Phase II ($750K)
 * Focus: Advanced proposal with Phase I reference, transition plan
 */
test.describe('Scenario C: Multi-Phase Application (NASA)', () => {
  const contractorProfile = {
    name: 'AeroSpace Innovations LLC',
    employees: 45,
    annual_revenue: 8000000,
    years_in_business: 12,
    ownership: {
      us_citizen_owned: 90,
      foreign_owned: 0
    },
    expertise: ['Aerospace Engineering', 'Propulsion Systems', 'Materials Science'],
    technologies: ['Advanced Propulsion', 'Composite Materials', 'Thermal Protection'],
    past_projects: ['NASA SBIR Phase I Award 2023', 'ISS Component Development', '5 NASA Contracts'],
    certifications: ['AS9100', 'ITAR Registered', 'Security Clearance']
  };

  test('Phase II application with Phase I reference', async ({ request }) => {
    // Search for Phase II opportunities
    const response = await request.get(`${API_BASE_URL}/api/grants/search`, {
      params: {
        query: 'aerospace propulsion',
        agency: 'NASA',
        program: 'SBIR Phase II'
      }
    });
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.grants).toBeDefined();
    
    // Verify Phase II specific requirements in search results
    const phaseIIGrants = data.grants.filter(g => g.program?.includes('Phase II'));
    expect(phaseIIGrants.length).toBeGreaterThan(0);
  });

  test('Generate Phase II proposal with transition plan', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/grants/generate-ai-proposal`, {
      data: {
        grant_id: 'NASA-25-003',
        company_profile: contractorProfile,
        phase_i_reference: {
          grant_id: 'NASA-23-001',
          accomplishments: ['Prototype developed', 'TRL 4 achieved', 'Lab validation complete'],
          transition_plan: true
        }
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data.success).toBe(true);
    expect(data.proposal.sections).toBeDefined();
    
    // Phase II proposals should reference Phase I work
    const technicalApproach = data.proposal.sections.technical_approach;
    expect(technicalApproach.length).toBeGreaterThan(200);
  });

  test('Validate higher budget for Phase II', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/grants/generate-budget-justification`, {
      data: {
        grant_id: 'NASA-25-003',
        budget_categories: {
          personnel: 450000,
          equipment: 150000,
          travel: 60000,
          other: 90000
        }
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data.success).toBe(true);
    expect(data.budget.total_budget).toBe(750000);
    expect(data.budget.justifications.equipment).toBeDefined();
  });
});

/**
 * SCENARIO D: STTR Collaboration (NIH)
 * Company: Small business + university partnership
 * Grant: NIH STTR Phase I ($300K)
 * Focus: Multi-organization proposal with collaboration agreements
 */
test.describe('Scenario D: STTR Collaboration (NIH)', () => {
  const sttrProfile = {
    name: 'BioMed Therapeutics Inc.',
    employees: 8,
    annual_revenue: 1500000,
    years_in_business: 5,
    ownership: {
      us_citizen_owned: 80,
      foreign_owned: 0
    },
    expertise: ['Biomedical Research', 'Drug Development', 'Clinical Trials'],
    technologies: ['mRNA Technology', 'Gene Therapy', 'Immunology'],
    past_projects: ['NIH Grant 2022', 'FDA Phase I Trial'],
    certifications: ['GLP Certified', 'CLIA Certified'],
    research_partner: {
      name: 'Stanford University',
      department: 'School of Medicine',
      pi_name: 'Dr. Jane Smith',
      collaboration_history: '3 years'
    }
  };

  test('Search for STTR opportunities', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/grants/search`, {
      params: {
        query: 'biomedical therapeutics',
        agency: 'National Institutes of Health',
        program: 'STTR'
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.grants).toBeDefined();
    
    // Filter for STTR programs
    const sttrGrants = data.grants.filter(g => g.program?.includes('STTR'));
    expect(sttrGrants.length).toBeGreaterThan(0);
  });

  test('Validate STTR eligibility with partnership', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/grants/validate-eligibility`, {
      data: {
        grant_id: 'NIH-25-007',
        company_profile: {
          employees: sttrProfile.employees,
          us_citizen_ownership: sttrProfile.ownership.us_citizen_owned,
          annual_revenue: sttrProfile.annual_revenue,
          pi_citizenship: 'US Citizen',
          research_location: 'United States',
          sam_registered: true,
          duns_number: '987654321',
          research_partner_type: 'University',
          collaboration_agreement: true
        }
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data.success).toBe(true);
    expect(data.eligible).toBe(true);
    
    // STTR should have partnership validation
    expect(data.validation_results).toBeDefined();
  });

  test('Generate STTR proposal with partnership details', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/grants/generate-ai-proposal`, {
      data: {
        grant_id: 'NIH-25-007',
        company_profile: sttrProfile
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data.success).toBe(true);
    expect(data.proposal.sections.team_qualifications).toBeDefined();
    
    // STTR proposals should mention collaboration
    const teamSection = data.proposal.sections.team_qualifications;
    expect(teamSection.length).toBeGreaterThan(100);
  });

  test('Get STTR-specific certifications', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/grants/certifications-checklist`, {
      params: {
        grant_id: 'NIH-25-007'
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data.success).toBe(true);
    expect(data.certifications.common).toBeDefined();
    expect(data.certifications.sbir_sttr).toBeDefined();
    
    // STTR should have partnership-specific certifications
    const sttrCerts = data.certifications.sbir_sttr;
    expect(sttrCerts.length).toBeGreaterThan(0);
  });
});

/**
 * SCENARIO E: High-Value Application (DOE)
 * Company: Clean energy startup, 50 employees
 * Grant: DOE Advanced Research ($2M)
 * Focus: Complex technical proposal with multiple work packages
 */
test.describe('Scenario E: High-Value Application (DOE)', () => {
  const energyProfile = {
    name: 'CleanTech Energy Solutions',
    employees: 50,
    annual_revenue: 12000000,
    years_in_business: 8,
    ownership: {
      us_citizen_owned: 95,
      foreign_owned: 0
    },
    expertise: ['Renewable Energy', 'Energy Storage', 'Grid Integration'],
    technologies: ['Battery Technology', 'Solar Panels', 'Smart Grid Systems'],
    past_projects: ['DOE Grant 2021', '10 Commercial Installations', 'Patent Portfolio: 8 patents'],
    certifications: ['ISO 14001', 'OSHA Certified', 'EPA Compliance']
  };

  test('Search for high-value DOE opportunities', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/grants/search`, {
      params: {
        query: 'renewable energy storage',
        agency: 'Department of Energy',
        amount: '$1,000,000+'
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.grants).toBeDefined();
    
    // High-value grants should be in results
    const highValueGrants = data.grants.filter(g => {
      const amount = g.amount.replace(/[^0-9]/g, '');
      return parseInt(amount) >= 1000000;
    });
    expect(highValueGrants.length).toBeGreaterThan(0);
  });

  test('Generate complex multi-phase timeline', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/grants/application-timeline`, {
      data: {
        grant_id: 'DOE-25-008',
        buffer_days: 10
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data.success).toBe(true);
    expect(data.timeline.total_duration_days).toBeGreaterThan(30);
    expect(data.timeline.milestones).toHaveLength(5);
    
    // High-value grants need longer timelines
    expect(data.timeline.complexity).toBe('high');
  });

  test('Generate detailed $2M budget justification', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/grants/generate-budget-justification`, {
      data: {
        grant_id: 'DOE-25-008',
        budget_categories: {
          personnel: 1200000,
          equipment: 400000,
          materials: 150000,
          travel: 100000,
          consultants: 100000,
          other: 50000
        }
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data.success).toBe(true);
    expect(data.budget.total_budget).toBe(2000000);
    
    // Large budgets require detailed justifications
    expect(data.budget.justifications.personnel).toBeDefined();
    expect(data.budget.justifications.equipment).toBeDefined();
    
    // Verify comprehensive documentation requirements
    expect(data.documentation_requirements).toBeDefined();
    expect(data.documentation_requirements.length).toBeGreaterThan(5);
  });

  test('Generate comprehensive proposal for high-value grant', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/grants/generate-ai-proposal`, {
      data: {
        grant_id: 'DOE-25-008',
        company_profile: energyProfile
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data.success).toBe(true);
    expect(data.word_count).toBeGreaterThan(1000); // More comprehensive for $2M grant
    
    // Verify all critical sections for high-value proposals
    expect(data.proposal.sections.executive_summary).toBeDefined();
    expect(data.proposal.sections.technical_approach).toBeDefined();
    expect(data.proposal.sections.innovation).toBeDefined();
    expect(data.proposal.sections.commercial_potential).toBeDefined();
    expect(data.proposal.sections.team_qualifications).toBeDefined();
    expect(data.proposal.sections.budget_narrative).toBeDefined();
    expect(data.proposal.sections.timeline).toBeDefined();
  });

  test('Comprehensive pre-submission review', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/grants/pre-submission-review`, {
      data: {
        grant_id: 'DOE-25-008',
        company_profile: energyProfile,
        proposal_sections: [
          'executive_summary',
          'technical_approach',
          'innovation',
          'commercial_potential',
          'team_qualifications',
          'budget_narrative',
          'timeline'
        ]
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data.success).toBe(true);
    expect(data.compliance_score).toBeGreaterThan(85); // High standard for $2M
    expect(data.review_results.budget_check).toBe('pass');
    expect(data.review_results.format_check).toBe('pass');
    expect(data.recommendations).toBeDefined();
    
    // High-value grants need comprehensive review
    expect(data.review_results.content_check).toBeDefined();
  });
});

/**
 * Edge Cases & Boundary Conditions
 */
test.describe('Edge Cases for Real-World Scenarios', () => {
  test('Handle zero search results gracefully', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/grants/search`, {
      params: {
        query: 'nonexistentXYZ123impossible'
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.grants).toHaveLength(0);
    expect(data.message).toBeDefined();
  });

  test('Handle incomplete company profile', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/grants/analyze-match`, {
      data: {
        grant_id: 'SBIR-25-001',
        company_profile: {
          name: 'Incomplete Co',
          employees: 5
          // Missing most required fields
        }
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    // Should return lower confidence with incomplete data
    expect(data.success).toBe(true);
    expect(data.confidence_level).toMatch(/low|medium/);
  });

  test('Handle expired grant deadline', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/grants/application-timeline`, {
      data: {
        grant_id: 'EXPIRED-GRANT',
        buffer_days: 5
      }
    });

    // Should handle gracefully even for expired grants
    expect(response.ok()).toBeTruthy();
  });

  test('Handle very large budget amounts', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/grants/generate-budget-justification`, {
      data: {
        grant_id: 'DOE-25-008',
        budget_categories: {
          personnel: 5000000,
          equipment: 2000000,
          other: 3000000
        }
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.budget.total_budget).toBe(10000000);
  });

  test('Handle special characters in search query', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/grants/search`, {
      params: {
        query: 'AI & ML: "deep learning" (neural networks) $100K+'
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);
  });
});

/**
 * Performance Validation for Real-World Scenarios
 */
test.describe('Performance Tests for Complex Workflows', () => {
  test('Complete workflow should execute within time limits', async ({ request }) => {
    const startTime = Date.now();

    // Step 1: Search (< 2s)
    await request.get(`${API_BASE_URL}/api/grants/search`, {
      params: { query: 'AI research' }
    });

    // Step 2: Match analysis (< 3s)
    await request.post(`${API_BASE_URL}/api/grants/analyze-match`, {
      data: {
        grant_id: 'NSF-25-002',
        company_profile: { name: 'Test', employees: 10, expertise: ['AI'] }
      }
    });

    // Step 3: Eligibility (< 3s)
    await request.post(`${API_BASE_URL}/api/grants/validate-eligibility`, {
      data: {
        grant_id: 'NSF-25-002',
        company_profile: { employees: 10, us_citizen_ownership: 90 }
      }
    });

    // Step 4: Timeline (< 2s)
    await request.post(`${API_BASE_URL}/api/grants/application-timeline`, {
      data: { grant_id: 'NSF-25-002', buffer_days: 5 }
    });

    const totalTime = Date.now() - startTime;
    
    // Total workflow without AI proposal should be < 15 seconds
    expect(totalTime).toBeLessThan(15000);
  });

  test('AI proposal generation within acceptable time', async ({ request }) => {
    const startTime = Date.now();

    const response = await request.post(`${API_BASE_URL}/api/grants/generate-ai-proposal`, {
      data: {
        grant_id: 'SBIR-25-001',
        company_profile: {
          name: 'Test Company',
          employees: 10,
          expertise: ['AI', 'ML'],
          technologies: ['Neural Networks']
        }
      }
    });

    const totalTime = Date.now() - startTime;
    
    expect(response.ok()).toBeTruthy();
    // AI generation allowed up to 30 seconds
    expect(totalTime).toBeLessThan(30000);
  });
});
