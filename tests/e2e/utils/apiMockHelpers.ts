import { Page, Route } from '@playwright/test';

/**
 * Mock grant data for testing
 */
export const mockGrants = [
  {
    id: 'test-grant-1',
    title: 'AI Research Grant',
    agency: 'National Science Foundation',
    program: 'Computer and Information Science and Engineering',
    amount: '$500,000',
    deadline: '2025-12-31',
    description: 'Funding for artificial intelligence research projects',
    matching_score: 0.95,
    eligibility: 'Universities and research institutions',
    full_description: 'This grant supports cutting-edge artificial intelligence research.',
    requirements: ['Research proposal', 'Budget justification', 'Letter of support'],
    evaluation_criteria: ['Innovation', 'Feasibility', 'Impact'],
    submission_requirements: ['Online submission', 'PDF format'],
    contact: {
      name: 'Dr. Jane Smith',
      email: 'jsmith@nsf.gov',
      phone: '555-0100'
    }
  },
  {
    id: 'test-grant-2',
    title: 'Defense Technology Innovation',
    agency: 'Department of Defense',
    program: 'SBIR Phase I',
    amount: '$250,000',
    deadline: '2025-11-30',
    description: 'Small business innovation research in defense technology',
    matching_score: 0.88,
    eligibility: 'Small businesses with fewer than 500 employees',
    full_description: 'This program supports innovative defense technology development.',
    requirements: ['Technical proposal', 'Company background', 'Cost proposal'],
    evaluation_criteria: ['Technical merit', 'Commercial potential', 'Team qualifications'],
    submission_requirements: ['SBIR.gov portal', 'Required forms'],
    contact: {
      name: 'John Doe',
      email: 'john.doe@dod.gov',
      phone: '555-0200'
    }
  },
  {
    id: 'test-grant-3',
    title: 'Clean Energy Research',
    agency: 'Department of Energy',
    program: 'Advanced Research Projects Agency-Energy',
    amount: '$1,000,000',
    deadline: '2026-01-15',
    description: 'Breakthrough energy technologies research',
    matching_score: 0.82,
    eligibility: 'Universities, national labs, and private companies',
    full_description: 'ARPA-E funds high-risk, high-reward energy research.',
    requirements: ['Concept paper', 'Full proposal', 'Letters of intent'],
    evaluation_criteria: ['Innovation', 'Team', 'Impact potential'],
    submission_requirements: ['ARPA-E eXCHANGE system'],
    contact: {
      name: 'Dr. Emily Chen',
      email: 'emily.chen@energy.gov',
      phone: '555-0300'
    }
  }
];

/**
 * Setup API route mocking for grant search
 */
export async function mockGrantSearchAPI(page: Page, grants = mockGrants) {
  await page.route('**/api/grants/search**', async (route: Route) => {
    console.log('Mock intercepted grants/search request:', route.request().url());
    const url = new URL(route.request().url());
    const query = url.searchParams.get('query') || '';
    const agency = url.searchParams.get('agency') || '';
    
    // Filter grants based on query parameters
    let filteredGrants = [...grants];
    
    if (query) {
      const queryLower = query.toLowerCase();
      filteredGrants = filteredGrants.filter(grant => 
        grant.title.toLowerCase().includes(queryLower) ||
        grant.description.toLowerCase().includes(queryLower) ||
        grant.agency.toLowerCase().includes(queryLower)
      );
    }
    
    if (agency) {
      filteredGrants = filteredGrants.filter(grant => 
        grant.agency.toLowerCase().includes(agency.toLowerCase())
      );
    }
    
    console.log(`Mock returning ${filteredGrants.length} grants for query: "${query}", agency: "${agency}"`);
    
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        count: filteredGrants.length,
        grants: filteredGrants,
        execution_type: 'mock',
        timestamp: new Date().toISOString()
      })
    });
  });
}

/**
 * Setup API route mocking for grant details
 */
export async function mockGrantDetailsAPI(page: Page, grants = mockGrants) {
  await page.route('**/api/grants/*', async (route: Route) => {
    console.log('Mock intercepted grants/details request:', route.request().url());
    const url = route.request().url();
    const grantId = url.split('/').pop();
    
    const grant = grants.find(g => g.id === grantId);
    
    if (grant) {
      console.log(`Mock returning grant details for ID: ${grantId}`);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          grant: grant
        })
      });
    } else {
      console.log(`Mock: Grant not found for ID: ${grantId}`);
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Grant not found'
        })
      });
    }
  });
}

/**
 * Setup API route mocking for failed searches
 */
export async function mockGrantSearchAPIFailure(page: Page, errorCode = 503) {
  await page.route('**/api/grants/search**', async (route: Route) => {
    await route.fulfill({
      status: errorCode,
      contentType: 'application/json',
      body: JSON.stringify({
        success: false,
        error: 'Live grant data is temporarily unavailable. Please try again later.',
        code: 'LIVE_DATA_UNAVAILABLE',
        execution_type: 'failed'
      })
    });
  });
}

/**
 * Setup API route mocking to return empty results
 */
export async function mockGrantSearchAPIEmpty(page: Page) {
  await page.route('**/api/grants/search**', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        count: 0,
        grants: [],
        execution_type: 'mock',
        timestamp: new Date().toISOString()
      })
    });
  });
}

/**
 * Clear all API mocks
 */
export async function clearAPIMocks(page: Page) {
  await page.unroute('**/api/grants/**');
}
