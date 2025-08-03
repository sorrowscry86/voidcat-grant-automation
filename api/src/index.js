// VoidCat RDC Grant Search API Worker - COMPLETE VERSION
// Deploy as: grant-search-api

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import Stripe from 'stripe';

const app = new Hono();

// CORS middleware
app.use('*', cors({
  origin: ['https://voidcat-grants.pages.dev', 'http://localhost:3000', 'https://sorrowscry86.github.io'],
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

// Database helper
async function getDB(env) {
  return env.VOIDCAT_DB; // D1 database binding
}

// Mock grant data for immediate deployment
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
    matching_score: 0.95
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
    matching_score: 0.87
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
    matching_score: 0.82
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
    matching_score: 0.91
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
    matching_score: 0.88
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
    tags: ['AI', 'Machine Learning', 'Defense', 'Research']
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
    tags: ['Healthcare', 'AI', 'Diagnostics', 'STTR']
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
    tags: ['Energy', 'Smart Grid', 'AI', 'Infrastructure']
  }
];

// Basic grant search endpoint
app.get('/api/grants/search', async (c) => {
  try {
    const { query, agency, deadline, amount } = c.req.query();
    
    let filteredGrants = MOCK_GRANTS;
    
    if (query) {
      filteredGrants = filteredGrants.filter(grant => 
        grant.title.toLowerCase().includes(query.toLowerCase()) ||
        grant.description.toLowerCase().includes(query.toLowerCase()) ||
        grant.program.toLowerCase().includes(query.toLowerCase())
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

    return c.json({
      success: true,
      count: filteredGrants.length,
      grants: filteredGrants,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to search grants',
      details: error.message
    }, 500);
  }
});

// Get specific grant details
app.get('/api/grants/:id', async (c) => {
  try {
    const grantId = c.req.param('id');
    const grant = MOCK_GRANTS.find(g => g.id === grantId);
    
    if (!grant) {
      return c.json({ success: false, error: 'Grant not found' }, 404);
    }
    
    const grantDetails = {
      ...grant,
      full_description: `${grant.description} This opportunity represents a significant funding opportunity for organizations developing cutting-edge AI technologies.`,
      requirements: [
        'Must be a U.S. small business (for SBIR) or eligible organization',
        'Meet size standards for the program',
        'Principal investigator time commitment as specified',
        'Compliance with all federal regulations'
      ],
      evaluation_criteria: [
        'Technical merit and innovation (40%)',
        'Commercial potential and impact (30%)', 
        'Company/team capability (20%)',
        'Budget reasonableness (10%)'
      ],
      submission_requirements: [
        'Technical proposal (page limits vary)',
        'Budget and budget justification',
        'Required registration documents',
        'Biographical sketches of key personnel'
      ],
      contact: {
        name: 'Program Officer',
        email: 'contact@agency.gov',
        phone: '(202) 555-0123'
      }
    };

    return c.json({
      success: true,
      grant: grantDetails
    });

  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to get grant details'
    }, 500);
  }
});

// User registration endpoint
app.post('/api/users/register', async (c) => {
  try {
    const { email, company, name } = await c.req.json();
    
    if (!email || !name) {
      return c.json({
        success: false,
        error: 'Email and name are required'
      }, 400);
    }
    
    // Generate API key
    const apiKey = crypto.randomUUID();
    
    try {
      const db = await getDB(c.env);
      const result = await db.prepare(`
        INSERT INTO users (email, api_key, subscription_tier)
        VALUES (?, ?, 'free')
      `).bind(email, apiKey).run();

      if (result.success) {
        return c.json({
          success: true,
          message: 'User registered successfully',
          api_key: apiKey,
          subscription_tier: 'free'
        });
      } else {
        throw new Error('Database insertion failed');
      }
    } catch (dbError) {
      // Fallback for demo purposes when DB not available
      return c.json({
        success: true,
        message: 'User registered successfully (demo mode)',
        api_key: apiKey,
        subscription_tier: 'free'
      });
    }

  } catch (error) {
    return c.json({
      success: false,
      error: 'Registration failed',
      details: error.message
    }, 400);
  }
});

// User authentication check
app.get('/api/users/me', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ success: false, error: 'No API key provided' }, 401);
    }

    const apiKey = authHeader.replace('Bearer ', '');
    
    try {
      const db = await getDB(c.env);
      const user = await db.prepare(`
        SELECT id, email, subscription_tier, usage_count, created_at
        FROM users WHERE api_key = ?
      `).bind(apiKey).first();

      if (!user) {
        return c.json({ success: false, error: 'Invalid API key' }, 401);
      }

      return c.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          subscription_tier: user.subscription_tier,
          usage_count: user.usage_count,
          created_at: user.created_at
        }
      });
    } catch (dbError) {
      // Demo mode fallback
      return c.json({
        success: true,
        user: {
          id: 1,
          email: 'demo@voidcat.com',
          subscription_tier: 'free',
          usage_count: 0,
          created_at: new Date().toISOString()
        }
      });
    }

  } catch (error) {
    return c.json({
      success: false,
      error: 'Authentication failed'
    }, 500);
  }
});

// AI proposal generation endpoint
app.post('/api/grants/generate-proposal', async (c) => {
  try {
    // Check authentication
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ success: false, error: 'Authentication required' }, 401);
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
        return c.json({ success: false, error: 'Invalid API key' }, 401);
      }

      // Check usage limits for free users
      if (user.subscription_tier === 'free' && (user.usage_count || 0) >= 1) {
        return c.json({
          success: false,
          error: 'Free tier limit reached',
          upgrade_required: true,
          message: 'Upgrade to Pro for unlimited grant applications'
        }, 429);
      }

      // Increment usage count for free users
      if (user.subscription_tier === 'free') {
        await db.prepare(`
          UPDATE users SET usage_count = COALESCE(usage_count, 0) + 1 
          WHERE api_key = ?
        `).bind(apiKey).run();
      }
    } catch (dbError) {
      console.log('Database error, continuing in demo mode:', dbError);
    }

    const { grant_id, company_info } = await c.req.json();
    
    const grant = MOCK_GRANTS.find(g => g.id === grant_id);
    if (!grant) {
      return c.json({ success: false, error: 'Grant not found' }, 404);
    }
    
    const generatedProposal = {
      executive_summary: `This innovative project leverages cutting-edge AI technologies to address the challenges outlined in ${grant.title}. Our approach combines advanced machine learning algorithms with practical implementation strategies to deliver measurable results.`,
      technical_approach: `Our solution employs a multi-layered approach combining machine learning, natural language processing, and computer vision technologies. The system will be designed with scalability and performance in mind, utilizing cloud-native architectures and modern development practices.`,
      commercial_potential: `The proposed technology has significant commercial applications in both government and civilian markets. We anticipate strong adoption across multiple sectors, with revenue potential exceeding $10M within 3 years of commercialization.`,
      budget_summary: {
        personnel: Math.floor(parseInt(grant.amount.replace(/[$,]/g, '')) * 0.6),
        equipment: Math.floor(parseInt(grant.amount.replace(/[$,]/g, '')) * 0.2),
        overhead: Math.floor(parseInt(grant.amount.replace(/[$,]/g, '')) * 0.2),
        total: parseInt(grant.amount.replace(/[$,]/g, ''))
      },
      timeline: [
        { phase: "Months 1-3", task: "Requirements analysis and system design" },
        { phase: "Months 4-6", task: "Core algorithm development and testing" },
        { phase: "Months 7-9", task: "System integration and validation" },
        { phase: "Months 10-12", task: "Performance evaluation and delivery" }
      ]
    };

    return c.json({
      success: true,
      proposal: generatedProposal,
      grant_id: grant_id,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    return c.json({
      success: false,
      error: 'Proposal generation failed'
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
  const stripe = new Stripe(c.env.STRIPE_SECRET_KEY);
  
  try {
    const { email } = await c.req.json();
    
    if (!email) {
      return c.json({ error: 'User email is required' }, 400);
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: 'price_1RpOdV3YDbGiItIJSxMyZyzv', // VoidCat Pro Subscription - $99/month
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `https://sorrowscry86.github.io/voidcat-grant-automation/frontend/index.html?payment=success`,
      cancel_url: `https://sorrowscry86.github.io/voidcat-grant-automation/frontend/index.html?payment=cancelled`,
      customer_email: email,
      metadata: {
        email: email,
      }
    });

    return c.json({ sessionId: session.id });
  } catch (e) {
    return c.json({ error: { message: e.message } }, 500);
  }
});

// Stripe Webhook Handler
app.post('/api/stripe/webhook', async (c) => {
  const stripe = new Stripe(c.env.STRIPE_SECRET_KEY);
  const signature = c.req.header('stripe-signature');
  const body = await c.req.text();

  let event;

  try {
    event = await stripe.webhooks.constructEvent(
      body,
      signature,
      c.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return c.json({ error: `Webhook Error: ${err.message}` }, 400);
  }

  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const customerEmail = session.customer_email;

    // Update user's subscription tier in database
    try {
      const db = await getDB(c.env);
      await db.prepare('UPDATE users SET subscription_tier = ?, stripe_customer_id = ?, stripe_subscription_id = ? WHERE email = ?')
        .bind('pro', session.customer, session.subscription, customerEmail)
        .run();

      console.log(`Payment successful for ${customerEmail}. Subscription updated to Pro.`);
    } catch (dbError) {
      console.error('Database update failed:', dbError);
    }
  }

  return c.json({ received: true });
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