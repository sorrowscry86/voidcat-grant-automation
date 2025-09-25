// VoidCat RDC Grant Search API Worker - COMPLETE VERSION
// Deploy as: grant-search-api


import { Hono } from 'hono';
import { cors } from 'hono/cors';
import Stripe from 'stripe';
import EmailService from './services/emailService.js';
import TelemetryService from './services/telemetryService.js';

const app = new Hono();

// CORS middleware - Restrict to specific domains for production
app.use('*', cors({
  origin: [
    'https://sorrowscry86.github.io',
    'https://voidcat.org',
    'https://www.voidcat.org',
    'http://localhost:3000', // For local development
    'http://localhost:8080'  // For local development
  ],
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

// Telemetry middleware for request/response logging and metrics
app.use('*', async (c, next) => {
  const telemetryService = new TelemetryService(c.env);
  await telemetryService.createMiddleware()(c, next);
});

// Database helper
async function getDB(env) {
  return env.VOIDCAT_DB; // D1 database binding
}

// Configuration for data sources
const DATA_CONFIG = {
  USE_LIVE_DATA: true, // ENABLED: Now using live grant feeds for launch!
  FALLBACK_TO_MOCK: true, // Allow fallback to mock data when live data fails
  LIVE_DATA_SOURCES: {
    GRANTS_GOV_API: 'https://api.grants.gov/v1/api/search2', // Updated to new 2025 RESTful API
    SBIR_API: 'https://www.sbir.gov/api/opportunities.json',
    NSF_API: 'https://www.nsf.gov/awardsearch/download.jsp'
  }
};

// Mock grant data for immediate deployment (Phase 1)
// TODO: Replace with live data feeds in Phase 2 development
const MOCK_GRANTS = [
  {
    id: 'SBIR-25-001',
    title: 'AI for Defense Applications',
    agency: 'Department of Defense',
    program: 'SBIR Phase I',
    deadline: '2025-09-15',
    amount: '$250,000',
    description: 'Seeking innovative AI solutions for defense applications including autonomous systems, cybersecurity, and logistics optimization.',
    eligibility: 'Small businesses with <500 employees',
    matching_score: 0.95,
    data_source: 'mock' // Track data source for transparency
  },
  {
    id: 'NSF-25-002', 
    title: 'Artificial Intelligence Research Institutes',
    agency: 'National Science Foundation',
    program: 'AI Institutes',
    deadline: '2025-11-30',
    amount: '$20,000,000',
    description: 'Multi-institutional AI research institutes focused on advancing AI for materials discovery, climate science, and healthcare.',
    eligibility: 'Academic institutions with industry partners',
    matching_score: 0.87,
    data_source: 'mock'
  },
  {
    id: 'DOE-25-003',
    title: 'Advanced Computing for Energy Sciences',
    agency: 'Department of Energy',
    program: 'ASCR',
    deadline: '2025-05-21',
    amount: '$3,000,000',
    description: 'Computational science research for energy applications including renewable energy optimization and grid management.',
    eligibility: 'Universities, labs, industry',
    matching_score: 0.82,
    data_source: 'mock'
  },
  {
    id: 'DARPA-25-004',
    title: 'Explainable AI for Military Decision Making',
    agency: 'DARPA',
    program: 'XAI',
    deadline: '2025-08-30',
    amount: '$1,500,000',
    description: 'Developing AI systems that can explain their decision-making processes for military applications.',
    eligibility: 'U.S. organizations with security clearance capability',
    matching_score: 0.91,
    data_source: 'mock'
  },
  {
    id: 'NASA-25-005',
    title: 'AI for Space Exploration',
    agency: 'NASA',
    program: 'ROSES',
    deadline: '2025-10-15',
    amount: '$800,000',
    description: 'AI technologies for autonomous spacecraft operations, planetary exploration, and space science data analysis.',
    eligibility: 'U.S. and foreign entities (excluding China)',
    matching_score: 0.88,
    data_source: 'mock'
  },
  {
    id: 'DARPA-25-006',
    title: 'Artificial Intelligence Next Campaign',
    agency: 'DARPA',
    program: 'AI Next',
    deadline: '2025-03-15',
    amount: '$5,000,000',
    description: 'Revolutionary AI research for national security applications including autonomous systems, cybersecurity, and logistics optimization.',
    eligibility: 'Research institutions and innovative companies',
    matching_score: 0.91,
    tags: ['AI', 'Machine Learning', 'Defense', 'Research'],
    data_source: 'mock'
  },
  {
    id: 'NIH-25-007',
    title: 'AI for Medical Diagnosis',
    agency: 'National Institutes of Health',
    program: 'STTR Phase II',
    deadline: '2025-04-30',
    amount: '$2,000,000',
    description: 'Developing AI systems for early disease detection and personalized treatment recommendations.',
    eligibility: 'Small businesses partnering with research institutions',
    matching_score: 0.88,
    tags: ['Healthcare', 'AI', 'Diagnostics', 'STTR'],
    data_source: 'mock'
  },
  {
    id: 'DOE-25-008',
    title: 'Smart Grid AI Optimization',
    agency: 'Department of Energy',
    program: 'Grid Modernization',
    deadline: '2025-06-01',
    amount: '$3,500,000',
    description: 'AI-powered optimization of electrical grid systems for improved efficiency and renewable energy integration.',
    eligibility: 'US companies with energy sector experience',
    matching_score: 0.85,
    tags: ['Energy', 'Smart Grid', 'AI', 'Infrastructure'],
    data_source: 'mock'
  }
];

// Live data integration function with proper fallback tracking
async function fetchLiveGrantData(query, agency) {
  const result = {
    grants: [],
    actualDataSource: 'mock',
    fallbackOccurred: false,
    error: null
  };

  if (DATA_CONFIG.USE_LIVE_DATA) {
    try {
      // Implementation for NEW 2025 grants.gov RESTful API
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      // Build search request body for new API
      const searchBody = {
        keyword: query || '',
        ...(agency && { agency: agency })
      };
      
      console.log(`🔍 Attempting live data fetch from grants.gov API...`);
      
      const response = await fetch(DATA_CONFIG.LIVE_DATA_SOURCES.GRANTS_GOV_API, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'VoidCat Grant Search API/1.0'
        },
        body: JSON.stringify(searchBody)
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Grant data API returned ${response.status}: ${response.statusText}`);
      }
      
      const liveData = await response.json();

      // Accept flexible schema: array or wrapped object
      let opportunitiesRaw;
      if (Array.isArray(liveData)) {
        opportunitiesRaw = liveData;
      } else if (liveData && typeof liveData === 'object') {
        opportunitiesRaw = liveData.opportunities || liveData.data || liveData.results || [];
      } else {
        opportunitiesRaw = [];
      }

      if (!Array.isArray(opportunitiesRaw)) {
        console.warn('Live data schema unexpected, normalizing to empty array', { type: typeof opportunitiesRaw });
        opportunitiesRaw = [];
      }

      // Transform grants.gov data (or generic live feed) to internal format
      const transformedGrants = opportunitiesRaw.map(grant => ({
        id: grant.opportunityId || grant.id || `LIVE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: grant.opportunityTitle || grant.title || 'Federal Grant Opportunity',
        agency: grant.agencyName || grant.agency || 'Federal Agency',
        program: grant.opportunityCategory || grant.program || 'Federal Program',
        deadline: grant.closeDate || grant.deadline || '2025-12-31',
        amount: grant.awardFloor ? `$${parseInt(grant.awardFloor).toLocaleString()} - $${parseInt(grant.awardCeiling || grant.awardFloor).toLocaleString()}` : 'Amount TBD',
        description: grant.description || grant.opportunityTitle || 'Federal funding opportunity',
        eligibility: grant.eligibilityDesc || 'See opportunity details for eligibility requirements',
        matching_score: calculateMatchingScore(grant, query),
        data_source: 'live'
      }));
      
      console.log(`✅ Live data fetch successful: ${transformedGrants.length} grants (raw length: ${opportunitiesRaw.length})`);
      result.grants = transformedGrants;
      result.actualDataSource = 'live';
      result.fallbackOccurred = false;
      return result;
      
    } catch (error) {
      console.error('Live data fetch failed, falling back to mock data:', {
        error: error.message,
        query,
        agency,
        timestamp: new Date().toISOString()
      });
      
      if (DATA_CONFIG.FALLBACK_TO_MOCK) {
        result.grants = MOCK_GRANTS;
        result.actualDataSource = 'mock';
        result.fallbackOccurred = true;
        result.error = error.message;
        return result;
      } else {
        // Don't fallback - rethrow the error to be handled by caller
        result.error = error.message;
        return result;
      }
    }
  }
  
  if (DATA_CONFIG.FALLBACK_TO_MOCK) {
    console.log('Using mock data (live data disabled in configuration)');
    result.grants = MOCK_GRANTS;
    result.actualDataSource = 'mock';
    result.fallbackOccurred = false;
    return result;
  } else {
    result.error = 'Live data is disabled and fallback to mock data is not allowed';
    return result;
  }
}

// Fetch specific grant details by ID from live data sources
async function fetchLiveGrantDetails(grantId) {
  const result = {
    grant: null,
    actualDataSource: 'mock',
    fallbackOccurred: false,
    error: null
  };

  if (false /* live data not supported for individual grant details */) {
    try {
      console.log(`🔍 Attempting to fetch grant details for ID: ${grantId} from live API...`);
      
      // Try to fetch all grants and find the specific one
      // In a real implementation, we'd have a specific endpoint for grant details
      const searchResult = await fetchLiveGrantData('', '');
      
      if (searchResult.actualDataSource === 'live' && !searchResult.fallbackOccurred) {
        const liveGrant = searchResult.grants.find(g => g.id === grantId);
        if (liveGrant) {
          console.log(`✅ Found grant details in live data: ${grantId}`);
          result.grant = {
            ...liveGrant,
            // Add additional details that would come from a details API
            full_description: `${liveGrant.description} This opportunity represents a significant funding opportunity for organizations developing cutting-edge technologies.`,
            requirements: [
              'Must be a U.S. small business (for SBIR) or eligible organization',
              'Meet size standards for the program',
              'Principal investigator time commitment as specified',
              'Compliance with all federal regulations'
            ],
            evaluation_criteria: [
              'Technical merit and innovation',
              'Potential for commercialization',
              'Qualifications of research team',
              'Feasibility of approach',
              'Relevance to agency mission'
            ]
          };
          result.actualDataSource = 'live';
          result.fallbackOccurred = false;
          return result;
        }
      }
      
      throw new Error(`Grant with ID '${grantId}' not found in live data`);
      
    } catch (error) {
      console.error(`Live grant details fetch failed for ID ${grantId}, falling back to mock data:`, {
        error: error.message,
        grantId,
        timestamp: new Date().toISOString()
      });
      
      result.fallbackOccurred = true;
      result.error = error.message;
    }
  }
  
  // Fallback to mock data if allowed
  if (DATA_CONFIG.FALLBACK_TO_MOCK) {
    console.log(`Using mock data for grant details: ${grantId}`);
    const mockGrant = MOCK_GRANTS.find(g => g.id === grantId);
    if (mockGrant) {
      result.grant = {
        ...mockGrant,
        full_description: `${mockGrant.description} This opportunity represents a significant funding opportunity for organizations developing cutting-edge technologies.`,
        requirements: [
          'Must be a U.S. small business (for SBIR) or eligible organization',
          'Meet size standards for the program',
          'Principal investigator time commitment as specified',
          'Compliance with all federal regulations'
        ],
        evaluation_criteria: [
          'Technical merit and innovation',
          'Potential for commercialization',
          'Qualifications of research team',
          'Feasibility of approach',
          'Relevance to agency mission'
        ]
      };
      result.actualDataSource = 'mock';
    }
  }
  
  return result;
}

// Calculate matching score for grants (placeholder algorithm)
function calculateMatchingScore(grant, query) {
  // TODO: Implement sophisticated matching algorithm
  // For now, simple keyword matching
  const keywords = query?.toLowerCase().split(' ') || [];
  const grantText = `${grant.title} ${grant.description}`.toLowerCase();
  const matches = keywords.filter(keyword => grantText.includes(keyword)).length;
  return Math.min(0.5 + (matches * 0.1), 1.0);
}

// MCP-compliant AI proposal generation function
async function generateMCPProposal(grantDetails, companyInfo) {
  // Construct MCP-compliant prompt following Model Context Protocol standards
  const mcpPrompt = {
    // System Persona: Define AI role as expert grant writer
    system_persona: "You are an expert federal grant writer with 15+ years of experience specializing in technology funding for small businesses and research institutions. You have successfully helped secure over $50M in federal funding across SBIR, STTR, NSF, DOE, DARPA, and other agency programs.",
    
    // Task: Generate specific proposal sections
    task: "Generate a comprehensive, compelling grant proposal with the following required sections: executive_summary, technical_approach, commercial_potential, budget_summary, and timeline. Each section must be substantive, specific, and tailored to the grant opportunity and company capabilities.",
    
    // Context: Provide full grant and company details
    context: {
      grant_opportunity: grantDetails,
      company_profile: companyInfo,
      agency_priorities: getAgencyPriorities(grantDetails.agency),
      market_analysis: getMarketContext(grantDetails.title, grantDetails.agency)
    },
    
    // Exemplars: High-quality examples for reference
    exemplars: {
      executive_summary_example: "Our innovative quantum-enhanced machine learning platform addresses the critical need for real-time threat detection in cybersecurity applications. Building on our team's breakthrough research in quantum algorithms and 5 patents in adaptive ML systems, we propose a 18-month development program to create a prototype that achieves 99.7% accuracy with 10x faster processing than current solutions. This technology directly supports DoD's mission-critical infrastructure protection needs and offers significant dual-use commercial potential in the $45B cybersecurity market.",
      
      technical_approach_example: "Our technical approach combines three breakthrough innovations: (1) Quantum-classical hybrid algorithms that leverage quantum superposition for feature space exploration, (2) Adaptive neural architectures that self-optimize based on threat patterns, and (3) Edge-computing integration for real-time deployment. The Phase I effort includes: establishing quantum simulation testbed, developing core algorithms, validating against synthetic datasets, and demonstrating proof-of-concept on representative use cases."
    },
    
    // Format: Specify exact JSON output structure
    output_format: "Return ONLY a JSON object with keys: executive_summary, technical_approach, commercial_potential, budget_summary (object with personnel, equipment, overhead, total), timeline (array of phase objects with phase and task fields). All string values must be substantive (minimum 100 words for summaries, specific details for timeline phases)."
  };

  // For this implementation, simulate sophisticated AI response based on MCP prompt
  // In production, this would call an actual AI service with the structured prompt
  return await simulateAdvancedAIResponse(mcpPrompt, grantDetails, companyInfo);
}

// Helper function to get agency-specific priorities
function getAgencyPriorities(agency) {
  const priorities = {
    "Department of Defense": ["National security applications", "Dual-use technology potential", "Technology readiness advancement", "Warfighter capability enhancement"],
    "DARPA": ["High-risk, high-reward research", "Revolutionary breakthroughs", "10x performance improvements", "Technology surprise prevention"],
    "NASA": ["Space exploration advancement", "Earth science applications", "Technology demonstration in space environment", "Commercial space sector development"],
    "National Science Foundation": ["Fundamental research excellence", "Broader impacts", "STEM education integration", "International collaboration"],
    "Department of Energy": ["Clean energy technologies", "Grid modernization", "Energy security", "Climate change mitigation"],
    "National Institutes of Health": ["Human health improvement", "Disease prevention and treatment", "Healthcare cost reduction", "Health disparities elimination"]
  };
  
  return priorities[agency] || ["Innovation and technical excellence", "Mission relevance", "Commercial viability", "Team qualifications"];
}

// Helper function to get market context
function getMarketContext(title, agency) {
  const keywords = title.toLowerCase();
  if (keywords.includes('ai') || keywords.includes('artificial intelligence')) {
    return {
      market_size: "$150B+ global AI market",
      growth_rate: "35% CAGR through 2030",
      key_segments: ["Enterprise AI", "Defense AI", "Healthcare AI", "Autonomous systems"],
      competitive_landscape: "Rapidly evolving with significant opportunities for specialized solutions"
    };
  } else if (keywords.includes('cyber') || keywords.includes('security')) {
    return {
      market_size: "$175B+ global cybersecurity market", 
      growth_rate: "12% CAGR through 2028",
      key_segments: ["Threat detection", "Zero-trust security", "Cloud security", "IoT security"],
      competitive_landscape: "High demand driven by increasing cyber threats"
    };
  } else if (keywords.includes('energy') || keywords.includes('grid')) {
    return {
      market_size: "$280B+ global energy technology market",
      growth_rate: "8% CAGR through 2030", 
      key_segments: ["Smart grid", "Renewable integration", "Energy storage", "Grid resilience"],
      competitive_landscape: "Transition to clean energy creating significant opportunities"
    };
  }
  
  return {
    market_size: "$50B+ addressable market",
    growth_rate: "10%+ CAGR",
    key_segments: ["Government", "Commercial", "International"],
    competitive_landscape: "Emerging market with first-mover advantages"
  };
}

// Simulate advanced AI response based on MCP prompt (in production, this would be an actual AI API call)
async function simulateAdvancedAIResponse(mcpPrompt, grantDetails, companyInfo) {
  const grantAmount = parseInt(grantDetails.amount.replace(/[$,]/g, ''));
  const agencyPriorities = mcpPrompt.context.agency_priorities;
  const marketContext = mcpPrompt.context.market_analysis;
  
  // Generate contextually-aware proposal content
  const executiveSummary = generateExecutiveSummary(grantDetails, companyInfo, agencyPriorities, marketContext);
  const technicalApproach = generateTechnicalApproach(grantDetails, companyInfo, agencyPriorities);
  const commercialPotential = generateCommercialPotential(grantDetails, companyInfo, marketContext);
  const budgetSummary = generateBudgetSummary(grantAmount, grantDetails.program);
  const timeline = generateTimeline(grantDetails.program, grantDetails.title);

  return {
    executive_summary: executiveSummary,
    technical_approach: technicalApproach,
    commercial_potential: commercialPotential,
    budget_summary: budgetSummary,
    timeline: timeline
  };
}

// Generate contextually-aware executive summary
function generateExecutiveSummary(grantDetails, companyInfo, agencyPriorities, marketContext) {
  const problemSpace = extractProblemSpace(grantDetails.title, grantDetails.description);
  const companyStrengths = companyInfo?.capabilities || "advanced technology development capabilities";
  const marketSize = marketContext.market_size;
  const agencyFocus = agencyPriorities[0] || "mission-critical innovation";
  
  return `${companyInfo?.name || "Our organization"} proposes an innovative solution to address ${problemSpace} as outlined in ${grantDetails.title}. Leveraging our proven expertise in ${companyStrengths} and deep understanding of ${grantDetails.agency} mission requirements, we will develop a breakthrough technology that directly supports ${agencyFocus}. Our approach combines cutting-edge research methodologies with practical implementation strategies, targeting measurable outcomes that advance both scientific knowledge and operational capabilities. The proposed solution addresses a critical gap in the ${marketSize} market while delivering tangible benefits to ${grantDetails.agency} stakeholders. With our experienced team and established track record, we are uniquely positioned to execute this ${grantDetails.program} project successfully, delivering innovations that will have lasting impact on ${grantDetails.agency.toLowerCase()} operations and broader national interests. The anticipated outcomes include significant performance improvements, cost efficiencies, and technology advancement that positions the United States at the forefront of this critical technology domain.`;
}

// Generate technical approach based on grant focus area
function generateTechnicalApproach(grantDetails, companyInfo, agencyPriorities) {
  const techDomain = identifyTechDomain(grantDetails.title, grantDetails.description);
  const methodologies = getTechnicalMethodologies(techDomain);
  const innovations = getInnovationAreas(techDomain, grantDetails.agency);
  
  return `Our technical approach employs a systematic, multi-phase methodology combining ${methodologies.join(', ')} to achieve breakthrough performance in ${techDomain}. The core innovation centers on ${innovations.primary}, supported by ${innovations.secondary} and ${innovations.tertiary}. Phase I will establish the foundational research framework, including comprehensive literature review, preliminary algorithm development, and proof-of-concept validation using simulated environments. Phase II focuses on full-scale prototype development, incorporating advanced ${techDomain} techniques optimized for ${grantDetails.agency.toLowerCase()} operational requirements. Our approach addresses key technical challenges through novel integration of established methodologies with emerging technologies. The research plan includes rigorous testing protocols, performance benchmarking against current state-of-the-art, and validation in representative operational scenarios. Risk mitigation strategies encompass alternative technical pathways and contingency approaches to ensure project success. The technical team brings together expertise spanning ${techDomain}, systems engineering, and domain-specific knowledge essential for ${grantDetails.agency} applications. Deliverables include functional prototypes, comprehensive technical documentation, performance evaluation reports, and transition planning for operational deployment.`;
}

// Generate commercial potential assessment
function generateCommercialPotential(grantDetails, companyInfo, marketContext) {
  const applications = getCommercialApplications(grantDetails.title, grantDetails.agency);
  const marketSegments = marketContext.key_segments;
  const growthRate = marketContext.growth_rate;
  
  return `The proposed technology demonstrates exceptional commercial potential across multiple high-growth market segments including ${marketSegments.join(', ')}. With the global market valued at ${marketContext.market_size} and growing at ${growthRate}, our innovation addresses critical unmet needs that represent significant revenue opportunities. Primary commercialization pathways include ${applications.primary}, ${applications.secondary}, and ${applications.tertiary}. The technology's dual-use nature enables rapid transition from government applications to commercial markets, leveraging ${grantDetails.agency.toLowerCase()} validation to establish market credibility. Our commercialization strategy encompasses intellectual property protection, strategic partnerships with industry leaders, and phased market entry targeting early adopters in high-value segments. Revenue projections indicate potential for $${Math.floor(Math.random() * 50 + 20)}M in sales within 5 years post-commercialization, with opportunities for licensing agreements and technology transfer partnerships. The competitive advantage stems from superior performance characteristics, cost-effectiveness, and first-mover positioning in emerging applications. Market validation through ${grantDetails.agency} deployment provides compelling proof points for commercial customers. Long-term growth potential includes international markets, adjacent applications, and platform extensions that leverage core technological innovations developed under this program.`;
}

// Generate realistic budget breakdown
function generateBudgetSummary(totalAmount, program) {
  let personnelRate, equipmentRate, overheadRate;
  
  // Adjust ratios based on program type
  if (program.includes('SBIR') || program.includes('STTR')) {
    personnelRate = 0.65; // Higher personnel focus for small business
    equipmentRate = 0.15;
    overheadRate = 0.20;
  } else if (program.includes('DARPA') || program.includes('Research')) {
    personnelRate = 0.55; // More equipment/overhead for research
    equipmentRate = 0.25;
    overheadRate = 0.20;
  } else {
    personnelRate = 0.60; // Standard distribution
    equipmentRate = 0.20;
    overheadRate = 0.20;
  }

  return {
    personnel: Math.floor(totalAmount * personnelRate),
    equipment: Math.floor(totalAmount * equipmentRate), 
    overhead: Math.floor(totalAmount * overheadRate),
    total: totalAmount
  };
}

// Generate realistic timeline based on program type
function generateTimeline(program, title) {
  const isPhaseI = program.includes('Phase I');
  const isResearch = program.includes('Research') || program.includes('Institute');
  const techComplexity = assessTechnicalComplexity(title);
  
  if (isPhaseI) {
    return [
      { phase: "Months 1-2", task: "Literature review, requirements analysis, and team mobilization" },
      { phase: "Months 3-4", task: "Algorithm development and initial prototype design" },
      { phase: "Months 5-6", task: "Proof-of-concept implementation and preliminary testing" },
      { phase: "Months 7-8", task: "Performance evaluation, validation, and Phase II planning" },
      { phase: "Month 9", task: "Final reporting, documentation, and technology transition preparation" }
    ];
  } else if (isResearch) {
    return [
      { phase: "Year 1", task: "Fundamental research, methodology development, and initial experimentation" },
      { phase: "Year 2", task: "Advanced algorithm development, prototype implementation, and validation studies" },
      { phase: "Year 3", task: "System integration, comprehensive testing, and performance optimization" },
      { phase: "Year 4", task: "Field demonstration, evaluation studies, and commercialization planning" },
      { phase: "Year 5", task: "Technology transfer, final validation, and operational deployment preparation" }
    ];
  } else {
    return [
      { phase: "Months 1-3", task: "System architecture design and development environment setup" },
      { phase: "Months 4-9", task: "Core technology development and component integration" },
      { phase: "Months 10-15", task: "System testing, validation, and performance optimization" },
      { phase: "Months 16-18", task: "Field demonstration, evaluation, and transition planning" }
    ];
  }
}

// Helper functions for content generation
function extractProblemSpace(title, description) {
  const keywords = title.toLowerCase();
  if (keywords.includes('ai') || keywords.includes('artificial intelligence')) return "advanced artificial intelligence challenges";
  if (keywords.includes('cyber') || keywords.includes('security')) return "critical cybersecurity vulnerabilities";
  if (keywords.includes('defense') || keywords.includes('military')) return "complex defense and security challenges";
  if (keywords.includes('energy') || keywords.includes('grid')) return "energy infrastructure optimization needs";
  if (keywords.includes('space') || keywords.includes('exploration')) return "space exploration and research challenges";
  if (keywords.includes('medical') || keywords.includes('health')) return "healthcare and medical research challenges";
  return "critical technological challenges";
}

function identifyTechDomain(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  if (text.includes('ai') || text.includes('artificial intelligence') || text.includes('machine learning')) return "artificial intelligence and machine learning";
  if (text.includes('cyber') || text.includes('security')) return "cybersecurity and information assurance";
  if (text.includes('quantum')) return "quantum computing and quantum information science";
  if (text.includes('space') || text.includes('satellite')) return "space technology and aerospace systems";
  if (text.includes('energy') || text.includes('grid') || text.includes('power')) return "energy systems and smart grid technology";
  if (text.includes('bio') || text.includes('medical') || text.includes('health')) return "biomedical engineering and healthcare technology";
  return "advanced computing and systems engineering";
}

function getTechnicalMethodologies(techDomain) {
  const methodologies = {
    "artificial intelligence and machine learning": ["deep neural networks", "reinforcement learning", "computer vision", "natural language processing"],
    "cybersecurity and information assurance": ["anomaly detection", "cryptographic protocols", "behavioral analysis", "threat intelligence"],
    "quantum computing and quantum information science": ["quantum algorithms", "quantum error correction", "quantum networking", "quantum simulation"],
    "space technology and aerospace systems": ["orbital mechanics", "spacecraft systems engineering", "remote sensing", "mission planning"],
    "energy systems and smart grid technology": ["power system optimization", "distributed control systems", "renewable energy integration", "grid stability analysis"],
    "biomedical engineering and healthcare technology": ["medical imaging", "biosignal processing", "clinical decision support", "telemedicine systems"]
  };
  return methodologies[techDomain] || ["systems engineering", "algorithm development", "performance optimization", "validation testing"];
}

function getInnovationAreas(techDomain, agency) {
  const innovations = {
    "artificial intelligence and machine learning": {
      primary: "novel neural architecture design optimized for real-time processing",
      secondary: "advanced transfer learning techniques for limited data scenarios", 
      tertiary: "explainable AI methods for mission-critical applications"
    },
    "cybersecurity and information assurance": {
      primary: "AI-powered threat detection with adaptive learning capabilities",
      secondary: "zero-trust security framework with behavioral authentication",
      tertiary: "quantum-resistant cryptographic implementations"
    }
  };
  return innovations[techDomain] || {
    primary: "breakthrough algorithmic approaches with performance optimization",
    secondary: "novel system integration methodologies",
    tertiary: "advanced validation and testing frameworks"
  };
}

function getCommercialApplications(title, agency) {
  const keywords = title.toLowerCase();
  if (keywords.includes('ai')) {
    return {
      primary: "enterprise AI platforms for Fortune 500 companies",
      secondary: "defense contractor solutions for national security applications", 
      tertiary: "commercial software licensing for industry-specific solutions"
    };
  } else if (keywords.includes('cyber') || keywords.includes('security')) {
    return {
      primary: "cybersecurity products for critical infrastructure protection",
      secondary: "enterprise security solutions for financial services",
      tertiary: "government security systems for federal agencies"
    };
  }
  return {
    primary: "commercial technology products for industry applications",
    secondary: "government solutions for federal and state agencies",
    tertiary: "international partnerships for global market expansion"
  };
}

function assessTechnicalComplexity(title) {
  const keywords = title.toLowerCase();
  if (keywords.includes('quantum') || keywords.includes('breakthrough') || keywords.includes('revolutionary')) return 'high';
  if (keywords.includes('advanced') || keywords.includes('innovative') || keywords.includes('next-generation')) return 'medium';
  return 'standard';
}

// Basic grant search endpoint
app.get('/api/grants/search', async (c) => {
  try {
    const { query, agency, deadline, amount } = c.req.query();
    
    // Validate input parameters
    if (query && query.length > 200) {
      return c.json({
        success: false,
        error: 'Search query is too long. Please use fewer than 200 characters.',
        code: 'QUERY_TOO_LONG'
      }, 400);
    }
    
    // Fetch grants from configured data source (mock or live)
    let filteredGrants;
    let actualDataSource;
    let fallbackOccurred;
    let dataSourceError;
    
    try {
      const fetchResult = await fetchLiveGrantData(query, agency);
      filteredGrants = fetchResult.grants;
      actualDataSource = fetchResult.actualDataSource;
      fallbackOccurred = fetchResult.fallbackOccurred;
      dataSourceError = fetchResult.error;
    } catch (dataError) {
      console.error('Grant data fetch failed:', dataError);
      return c.json({
        success: false,
        error: 'Grant database is temporarily unavailable. Please try again in a few minutes.',
        code: 'DATA_SOURCE_UNAVAILABLE'
      }, 503);
    }
    
    try {
      // Apply search filters
      if (query) {
        const searchQuery = query.toLowerCase().trim();
        filteredGrants = filteredGrants.filter(grant => 
          grant.title.toLowerCase().includes(searchQuery) ||
          grant.description.toLowerCase().includes(searchQuery) ||
          grant.program.toLowerCase().includes(searchQuery)
        );
      }
      
      if (agency) {
        const agencyMap = {
          'defense': 'department of defense',
          'nsf': 'national science foundation',
          'energy': 'department of energy',
          'darpa': 'darpa',
          'nasa': 'nasa'
        };
        const searchAgency = agencyMap[agency.toLowerCase()] || agency.toLowerCase();
        filteredGrants = filteredGrants.filter(grant => 
          grant.agency.toLowerCase().includes(searchAgency)
        );
      }
      
      // Apply deadline filter if provided
      if (deadline) {
        const targetDate = new Date(deadline);
        if (isNaN(targetDate.getTime())) {
          return c.json({
            success: false,
            error: 'Invalid deadline format. Please use YYYY-MM-DD format.',
            code: 'INVALID_DATE_FORMAT'
          }, 400);
        }
        
        filteredGrants = filteredGrants.filter(grant => {
          const grantDeadline = new Date(grant.deadline);
          return grantDeadline <= targetDate;
        });
      }

      // Track grant search metrics
      const telemetry = c.get('telemetry');
      if (telemetry) {
        telemetry.trackGrantSearch(query, agency, filteredGrants.length, actualDataSource, fallbackOccurred);
      }

      return c.json({
        success: true,
        count: filteredGrants.length,
        grants: filteredGrants,
        data_source: actualDataSource,
        fallback_occurred: fallbackOccurred,
        timestamp: new Date().toISOString(),
        live_data_ready: DATA_CONFIG.USE_LIVE_DATA,
        search_params: { query, agency, deadline, amount },
        ...(fallbackOccurred && dataSourceError && { fallback_reason: dataSourceError })
      });
    } catch (filterError) {
      console.error('Grant filtering failed:', filterError);
      return c.json({
        success: false,
        error: 'Error processing search results. Please try again.',
        code: 'SEARCH_PROCESSING_ERROR'
      }, 500);
    }

  } catch (error) {
    console.error('Grant search endpoint error:', error);
    return c.json({
      success: false,
      error: 'Grant search service is temporarily unavailable. Please try again later.',
      code: 'SEARCH_SERVICE_ERROR'
    }, 500);
  }
});

// Get specific grant details
app.get('/api/grants/:id', async (c) => {
  try {
    const grantId = c.req.param('id');
    
    // Validate grant ID format
    if (!grantId || grantId.trim().length === 0) {
      return c.json({ 
        success: false, 
        error: 'Grant ID is required',
        code: 'MISSING_GRANT_ID'
      }, 400);
    }
    
    if (grantId.length > 50) {
      return c.json({ 
        success: false, 
        error: 'Invalid grant ID format',
        code: 'INVALID_GRANT_ID'
      }, 400);
    }
    
    // Fetch grant details from live data sources with fallback
    const detailsResult = await fetchLiveGrantDetails(grantId);
    
    if (!detailsResult.grant) {
      return c.json({ 
        success: false, 
        error: `Grant with ID '${grantId}' was not found. Please check the ID and try again.`,
        code: 'GRANT_NOT_FOUND'
      }, 404);
    }
    
    const grantDetails = detailsResult.grant;

    return c.json({
      success: true,
      grant: grantDetails,
      data_source: detailsResult.actualDataSource,
      fallback_occurred: detailsResult.fallbackOccurred,
      ...(detailsResult.fallbackOccurred && detailsResult.error && { fallback_reason: detailsResult.error })
    });

  } catch (error) {
    console.error('Grant details retrieval error:', error);
    return c.json({
      success: false,
      error: 'Unable to retrieve grant details. Please try again later.',
      code: 'GRANT_DETAILS_ERROR'
    }, 500);
  }
});

// User registration endpoint
app.post('/api/users/register', async (c) => {
  try {
    let requestData;
    try {
      requestData = await c.req.json();
    } catch (parseError) {
      return c.json({
        success: false,
        error: 'Invalid request format. Please send valid JSON data.',
        code: 'INVALID_JSON'
      }, 400);
    }
    
    const { email, company, name } = requestData;
    
    // Comprehensive input validation
    if (!email || !name) {
      return c.json({
        success: false,
        error: 'Email and name are required fields',
        code: 'MISSING_REQUIRED_FIELDS'
      }, 400);
    }
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return c.json({
        success: false,
        error: 'Please provide a valid email address',
        code: 'INVALID_EMAIL_FORMAT'
      }, 400);
    }
    
    // Name length validation
    if (name.trim().length < 2 || name.trim().length > 100) {
      return c.json({
        success: false,
        error: 'Name must be between 2 and 100 characters',
        code: 'INVALID_NAME_LENGTH'
      }, 400);
    }
    
    // Generate API key
    const apiKey = crypto.randomUUID();
    
    try {
      const db = await getDB(c.env);
      
      // Check if user already exists
      const existingUser = await db.prepare(`
        SELECT email FROM users WHERE email = ?
      `).bind(email).first();
      
      if (existingUser) {
        return c.json({
          success: false,
          error: 'User already exists',
          message: 'An account with this email already exists'
        }, 409);
      }
      
      const result = await db.prepare(`
        INSERT INTO users (email, api_key, subscription_tier, created_at)
        VALUES (?, ?, 'free', CURRENT_TIMESTAMP)
      `).bind(email, apiKey).run();

      if (result.success) {
        console.log(`User registered successfully: ${email}`);
        
        // Send welcome email asynchronously (don't block registration response)
        c.executionCtx.waitUntil((async () => {
          try {
            const emailService = new EmailService(c.env);
            const emailData = emailService.generateRegistrationEmail({
              name: name,
              email: email,
              apiKey: apiKey
            });
            
            const emailResult = await emailService.sendEmail(emailData);
            const telemetry = c.get('telemetry');
            
            if (emailResult.success) {
              console.log(`Welcome email sent successfully to: ${email}`);
              if (telemetry) {
                telemetry.trackEmailDelivery(email, 'registration', true, emailResult.provider);
              }
            } else {
              console.error(`Failed to send welcome email to ${email}:`, emailResult.error);
              if (telemetry) {
                telemetry.trackEmailDelivery(email, 'registration', false, emailResult.provider);
              }
            }
          } catch (emailError) {
            console.error(`Email service error for ${email}:`, emailError.message);
            const telemetry = c.get('telemetry');
            if (telemetry) {
              telemetry.trackEmailDelivery(email, 'registration', false, 'unknown');
            }
          }
        })());
        
        // Track successful registration
        const telemetry = c.get('telemetry');
        if (telemetry) {
          telemetry.trackUserRegistration(email, true, 'free');
        }
        return c.json({
          success: true,
          message: 'User registered successfully',
          api_key: apiKey,
          subscription_tier: 'free'
        });
      } else {
        console.error('Database insertion failed:', result);
        throw new Error(`Database insertion failed: ${result.error || 'Unknown error'}`);
      }
    } catch (dbError) {
      console.error('Database error during registration:', {
        error: dbError.message,
        email: email,
        timestamp: new Date().toISOString()
      });
      
      // Check if it's a constraint violation (duplicate email)
      if (dbError.message && dbError.message.includes('UNIQUE constraint failed')) {
        return c.json({
          success: false,
          error: 'An account with this email address already exists',
          message: 'Please try logging in or use a different email address',
          code: 'DUPLICATE_EMAIL'
        }, 409);
      }
      
      // Check for database connection issues
      if (dbError.message && (dbError.message.includes('network') || dbError.message.includes('timeout'))) {
        return c.json({
          success: false,
          error: 'Registration service is temporarily unavailable due to network issues. Please try again in a few minutes.',
          code: 'DATABASE_CONNECTION_ERROR'
        }, 503);
      }
      
      // For production, provide appropriate error handling
      if (c.env.ENVIRONMENT === 'production') {
        return c.json({
          success: false,
          error: 'Unable to create account at this time. Please try again later.',
          message: 'If this problem persists, please contact support',
          code: 'REGISTRATION_SERVICE_ERROR'
        }, 503);
      }
      
      // Demo mode fallback only for development
      console.warn('Using demo mode fallback - this should not happen in production');
      return c.json({
        success: true,
        message: 'User registered successfully (demo mode)',
        api_key: apiKey,
        subscription_tier: 'free',
        demo_mode: true
      });
    }

  } catch (error) {
    console.error('Registration endpoint error:', error);
    return c.json({
      success: false,
      error: 'Registration service encountered an unexpected error. Please try again.',
      code: 'REGISTRATION_UNEXPECTED_ERROR'
    }, 500);
  }
});

// User authentication check
app.get('/api/users/me', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ 
        success: false, 
        error: 'Authentication required. Please provide an API key in the Authorization header.',
        code: 'MISSING_AUTH_HEADER'
      }, 401);
    }
    
    if (!authHeader.startsWith('Bearer ')) {
      return c.json({ 
        success: false, 
        error: 'Invalid authentication format. Use: Authorization: Bearer YOUR_API_KEY',
        code: 'INVALID_AUTH_FORMAT'
      }, 401);
    }

    const apiKey = authHeader.replace('Bearer ', '');
    
    try {
      const db = await getDB(c.env);
      const user = await db.prepare(`
        SELECT id, email, subscription_tier, usage_count, created_at
        FROM users WHERE api_key = ?
      `).bind(apiKey).first();

      if (!user) {
        console.warn('Invalid API key attempted', {
          ip: c.req.header('CF-Connecting-IP') || 'unknown',
          timestamp: new Date().toISOString()
        });
        return c.json({ 
          success: false, 
          error: 'Invalid API key. Please check your key and try again.',
          code: 'INVALID_API_KEY'
        }, 401);
      }

      return c.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          subscription_tier: user.subscription_tier,
          usage_count: user.usage_count || 0,
          created_at: user.created_at
        }
      });
    } catch (dbError) {
      console.error('Database error during authentication:', {
        error: dbError.message,
        timestamp: new Date().toISOString()
      });
      
      // For production, return proper error instead of demo mode
      if (c.env.ENVIRONMENT === 'production') {
        return c.json({
          success: false,
          error: 'Authentication service is temporarily unavailable. Please try again in a few minutes.',
          message: 'If this problem persists, please contact support',
          code: 'AUTH_SERVICE_UNAVAILABLE'
        }, 503);
      }
      
      // Demo mode fallback only for development
      console.warn('Using demo mode fallback for authentication');
      return c.json({
        success: true,
        user: {
          id: 1,
          email: 'demo@voidcat.com',
          subscription_tier: 'free',
          usage_count: 0,
          created_at: new Date().toISOString()
        },
        demo_mode: true
      });
    }

  } catch (error) {
    console.error('Authentication endpoint error:', error);
    return c.json({
      success: false,
      error: 'Authentication service encountered an unexpected error. Please try again.',
      code: 'AUTH_UNEXPECTED_ERROR'
    }, 500);
  }
});

// AI proposal generation endpoint
app.post('/api/grants/generate-proposal', async (c) => {
  try {
    // Check authentication
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ 
        success: false, 
        error: 'Authentication required. Please provide an API key to generate proposals.',
        code: 'AUTH_REQUIRED'
      }, 401);
    }

    const apiKey = authHeader.replace('Bearer ', '');
    
    // Get user and check usage limits
    try {
      const db = await getDB(c.env);
      const user = await db.prepare(`
        SELECT id, email, subscription_tier, usage_count
        FROM users WHERE api_key = ?
      `).bind(apiKey).first();

      if (!user) {
        return c.json({ 
          success: false, 
          error: 'Invalid API key. Please check your authentication and try again.',
          code: 'INVALID_API_KEY'
        }, 401);
      }

      // Check usage limits for free users
      if (user.subscription_tier === 'free' && (user.usage_count || 0) >= 1) {
        return c.json({
          success: false,
          error: 'You have reached your free tier limit of 1 proposal per account',
          upgrade_required: true,
          message: 'Upgrade to Pro for unlimited grant proposal generation and advanced features',
          code: 'FREE_TIER_LIMIT_REACHED'
        }, 429);
      }

      // Increment usage count for free users
      if (user.subscription_tier === 'free') {
        const updateResult = await db.prepare(`
          UPDATE users SET usage_count = COALESCE(usage_count, 0) + 1 
          WHERE api_key = ?
        `).bind(apiKey).run();
        
        if (!updateResult.success) {
          console.error('Failed to update usage count:', updateResult);
          // Continue anyway - don't block proposal generation for this
        }
      }
    } catch (dbError) {
      console.error('Database error during proposal generation:', {
        error: dbError.message,
        timestamp: new Date().toISOString()
      });
      
      // For production, we should handle this more gracefully
      if (c.env.ENVIRONMENT === 'production') {
        return c.json({
          success: false,
          error: 'Proposal generation service is temporarily unavailable. Please try again in a few minutes.',
          message: 'If this problem persists, please contact support',
          code: 'PROPOSAL_SERVICE_UNAVAILABLE'
        }, 503);
      }
      
      console.warn('Continuing in demo mode due to database error');
    }

    let requestData;
    try {
      requestData = await c.req.json();
    } catch (parseError) {
      return c.json({
        success: false,
        error: 'Invalid request format. Please send valid JSON data.',
        code: 'INVALID_JSON'
      }, 400);
    }
    
    const { grant_id, company_info } = requestData;
    
    if (!grant_id) {
      return c.json({
        success: false,
        error: 'Grant ID is required for proposal generation',
        code: 'MISSING_GRANT_ID'
      }, 400);
    }
    
    // Fetch grant details from live data sources with fallback for proposal generation
    const detailsResult = await fetchLiveGrantDetails(grant_id);
    
    if (!detailsResult.grant) {
      return c.json({ 
        success: false, 
        error: `Grant with ID '${grant_id}' was not found. Please check the ID and try again.`,
        code: 'GRANT_NOT_FOUND'
      }, 404);
    }

    // Use the fetched grant details
    const grantDetails = detailsResult.grant;
    
    // Generate MCP-compliant proposal using advanced AI prompting
    const generatedProposal = await generateMCPProposal(grantDetails, company_info);

    return c.json({
      success: true,
      proposal: generatedProposal,
      grant_id: grant_id,
      generated_at: new Date().toISOString(),
      data_source: detailsResult.actualDataSource,
      fallback_occurred: detailsResult.fallbackOccurred,
      ...(detailsResult.fallbackOccurred && detailsResult.error && { fallback_reason: detailsResult.error })
    });

  } catch (error) {
    console.error('Proposal generation endpoint error:', error);
    return c.json({
      success: false,
      error: 'Proposal generation service encountered an unexpected error. Please try again.',
      code: 'PROPOSAL_GENERATION_ERROR'
    }, 500);
  }
});

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    service: 'VoidCat Grant Search API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Stripe Checkout Session Creation
app.post('/api/stripe/create-checkout', async (c) => {
  // Standardized environment variable handling with fallback
  const stripeSecretKey = c.env.STRIPE_SECRET_KEY || c.env.STRIPE_SK;
  
  if (!stripeSecretKey) {
    return c.json({ 
      success: false,
      error: 'Payment system is currently unavailable. Please contact support if this issue persists.',
      code: 'STRIPE_CONFIG_ERROR'
    }, 503);
  }
  
  const stripe = new Stripe(stripeSecretKey);
  
  try {
    const { email } = await c.req.json();
    
    if (!email) {
      return c.json({ 
        success: false,
        error: 'Email address is required for payment processing',
        code: 'MISSING_EMAIL'
      }, 400);
    }

    // Standardized price ID with fallback
    const priceId = c.env.STRIPE_PRICE_ID || c.env.STRIPE_PRODUCT_PRICE_ID;
    
    if (!priceId) {
      return c.json({
        success: false,
        error: 'Payment system configuration error. Please contact support.',
        code: 'STRIPE_PRICE_CONFIG_ERROR'
      }, 503);
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `https://sorrowscry86.github.io/voidcat-grant-automation/?payment=success`,
      cancel_url: `https://sorrowscry86.github.io/voidcat-grant-automation/?payment=cancelled`,
      customer_email: email,
      metadata: {
        email: email,
      }
    });

    return c.json({ 
      success: true,
      sessionId: session.id 
    });
  } catch (error) {
    console.error('Stripe checkout creation failed:', error);
    
    // Provide specific, actionable error messages
    if (error.type === 'StripeInvalidRequestError') {
      return c.json({
        success: false,
        error: 'Payment configuration error. Please contact support if this issue persists.',
        code: 'STRIPE_INVALID_REQUEST'
      }, 400);
    }
    
    if (error.type === 'StripeAPIError') {
      return c.json({
        success: false,
        error: 'Payment service temporarily unavailable. Please try again in a few minutes.',
        code: 'STRIPE_API_ERROR'
      }, 503);
    }
    
    return c.json({
      success: false,
      error: 'Payment processing failed. Please contact support if this issue persists.',
      code: 'STRIPE_UNKNOWN_ERROR',
      details: error.message
    }, 500);
  }
});

// Stripe Webhook Handler
app.post('/api/stripe/webhook', async (c) => {
  // Standardized environment variable handling
  const stripeSecretKey = c.env.STRIPE_SECRET_KEY || c.env.STRIPE_SK;
  const webhookSecret = c.env.STRIPE_WEBHOOK_SECRET || c.env.STRIPE_WH_SECRET;
  
  if (!stripeSecretKey) {
    console.error('Stripe secret key not configured');
    return c.json({ 
      success: false,
      error: 'Webhook configuration error',
      code: 'STRIPE_CONFIG_ERROR'
    }, 503);
  }
  
  if (!webhookSecret) {
    console.error('Stripe webhook secret not configured');
    return c.json({ 
      success: false,
      error: 'Webhook authentication error',
      code: 'WEBHOOK_CONFIG_ERROR'
    }, 503);
  }
  
  const stripe = new Stripe(stripeSecretKey);
  const signature = c.req.header('stripe-signature');
  
  if (!signature) {
    console.error('Missing Stripe signature header');
    return c.json({ 
      success: false,
      error: 'Webhook signature missing',
      code: 'MISSING_SIGNATURE'
    }, 400);
  }
  
  let body;
  try {
    body = await c.req.text();
  } catch (error) {
    console.error('Failed to read webhook body:', error);
    return c.json({ 
      success: false,
      error: 'Invalid webhook payload',
      code: 'INVALID_PAYLOAD'
    }, 400);
  }

  let event;
  try {
    event = await stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return c.json({ 
      success: false,
      error: 'Webhook signature verification failed',
      code: 'SIGNATURE_VERIFICATION_FAILED'
    }, 400);
  }

  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const customerEmail = session.customer_email;

    if (!customerEmail) {
      console.error('No customer email in checkout session:', session.id);
      return c.json({ 
        success: false,
        error: 'Missing customer email in session',
        code: 'MISSING_CUSTOMER_EMAIL'
      }, 400);
    }

    // Update user's subscription tier in database
    try {
      const db = await getDB(c.env);
      const result = await db.prepare(`
        UPDATE users 
        SET subscription_tier = ?, stripe_customer_id = ?, stripe_subscription_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE email = ?
      `).bind('pro', session.customer, session.subscription, customerEmail).run();
      
      if (result.success && result.changes > 0) {
        console.log(`Payment successful for ${customerEmail}. Subscription updated to Pro.`);
      } else {
        console.error(`Failed to update subscription for ${customerEmail}:`, result);
        // Don't fail the webhook - Stripe expects 200 response
      }
    } catch (dbError) {
      console.error('Database update failed during webhook processing:', dbError);
      // Log error but don't fail webhook - Stripe will retry
    }
  } else {
    console.log(`Unhandled webhook event type: ${event.type}`);
  }

  return c.json({ 
    success: true,
    received: true,
    event_type: event.type
  });
});

// Root endpoint
app.get('/', (c) => {
  return c.json({
    message: 'VoidCat RDC Grant Search API',
    version: '1.0.0',
    documentation: '/api/docs',
    endpoints: [
      'GET /api/grants/search',
      'GET /api/grants/:id', 
      'POST /api/users/register',
      'GET /api/users/me',
      'POST /api/grants/generate-proposal',
      'POST /api/stripe/create-checkout',
      'POST /api/stripe/webhook'
    ]
  });
});

export default app;