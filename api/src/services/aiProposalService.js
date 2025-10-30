// AI Proposal Service for VoidCat Grant Automation Platform
// Natural language processing and AI-powered proposal generation using Claude 3.7 Sonnet and GPT-4

export class AIProposalService {
  constructor(config = {}) {
    this.config = config;
    this.templateLibrary = this.initializeTemplateLibrary();
    this.totalCost = 0;
    this.apiCallLog = [];
  }

  /**
   * Phase 2A: Generate proposal with real AI integration
   * @param {Object} grantDetails - Grant information
   * @param {Object} companyProfile - Company profile
   * @param {Object} env - Cloudflare environment with API keys
   * @param {Object} telemetry - Telemetry service
   * @returns {Object} AI-enhanced proposal
   */
  async generateProposalWithAI(grantDetails, companyProfile, env, telemetry = null) {
    // Feature flag check
    if (!env.FEATURE_REAL_AI) {
      console.log('🔄 AIProposalService: FEATURE_REAL_AI disabled - using template generation');
      if (telemetry) {
        telemetry.logInfo('AI Feature Disabled - Using Template Generation', {
          grant_id: grantDetails.id,
          execution: 'template', // ← Explicit marking per NO SIMULATIONS LAW
          ai_enabled: false,
          timestamp: new Date().toISOString()
        });
      }
      const templateProposal = this.generateProposal(grantDetails, companyProfile);
      // Mark as template-generated, not AI-generated
      templateProposal.metadata = templateProposal.metadata || {};
      templateProposal.metadata.ai_enhanced = false;
      templateProposal.metadata.generation_method = 'template';
      templateProposal.metadata.execution_type = 'template';
      return templateProposal;
    }

    // MAJOR FIX: Validate API keys before attempting AI calls
    if (!env.ANTHROPIC_API_KEY) {
      const error = new Error('ANTHROPIC_API_KEY not configured. See API_KEYS_CONFIGURATION.md for setup instructions.');
      if (telemetry) {
        telemetry.logError('API key validation failed', error, {
          grant_id: grantDetails.id,
          execution: 'failed',
          reason: 'missing_api_key'
        });
      }
      throw error;
    }

    try {
      console.log('🤖 AIProposalService: Starting AI-enhanced proposal generation...');
      if (telemetry) {
        telemetry.logInfo('AI proposal generation started', {
          grant_id: grantDetails.id,
          agency: grantDetails.agency,
          ai_enabled: true
        });
      }

      // Reset cost tracking for this proposal
      this.totalCost = 0;
      this.apiCallLog = [];

      // Get agency template
      const agencyKey = this.determineAgencyKey(grantDetails.agency);
      const template = this.templateLibrary[agencyKey] || this.templateLibrary['DOD'];
      
      // Process requirements
      const requirements = this.processGrantRequirements(grantDetails);
      
      // Initialize proposal structure
      const proposal = {
        metadata: {
          grant_id: grantDetails.id,
          agency: grantDetails.agency,
          template_used: agencyKey,
          generated_at: new Date().toISOString(),
          ai_enhanced: true,
          total_ai_cost: 0,
          api_calls: []
        },
        sections: {},
        formatting: template.format,
        compliance: {}
      };

      // Generate sections with AI
      if (template.required_sections.includes('Executive Summary') || 
          template.required_sections.includes('Project Summary')) {
        proposal.sections.executive_summary = await this.generateExecutiveSummaryWithAI(
          grantDetails, companyProfile, requirements, template, env
        );
      }

      if (template.required_sections.includes('Technical Volume') ||
          template.required_sections.includes('Technical Approach') ||
          template.required_sections.includes('Project Description')) {
        proposal.sections.technical_approach = await this.generateTechnicalApproachWithAI(
          grantDetails, companyProfile, requirements, template, env
        );
      }

      if (template.required_sections.includes('Innovation')) {
        proposal.sections.innovation = await this.generateInnovationSectionWithAI(
          grantDetails, companyProfile, requirements, env
        );
      }

      proposal.sections.commercial_potential = await this.generateCommercialPotentialWithAI(
        grantDetails, companyProfile, template, env
      );

      proposal.sections.budget_narrative = await this.generateBudgetNarrativeWithAI(
        grantDetails, companyProfile, env
      );

      // Template-based sections (no AI enhancement needed)
      proposal.sections.team_qualifications = this.generateTeamQualifications(
        grantDetails, companyProfile, template
      );

      proposal.sections.timeline = this.generateProjectTimeline(
        grantDetails, companyProfile
      );

      // Metadata
      proposal.metadata.word_count = this.calculateWordCount(proposal.sections);
      proposal.metadata.compliance_check = this.checkTemplateCompliance(proposal, template);
      proposal.metadata.total_ai_cost = this.totalCost;
      proposal.metadata.api_calls = this.apiCallLog;

      if (telemetry) {
        telemetry.logInfo('AI proposal generation completed', {
          grant_id: grantDetails.id,
          total_cost: this.totalCost,
          api_calls: this.apiCallLog.length,
          word_count: proposal.metadata.word_count
        });
      }

      console.log(`✅ AIProposalService: AI proposal completed. Cost: $${this.totalCost.toFixed(4)}`);
      
      if (telemetry) {
        telemetry.logInfo('AI proposal generation completed - REAL execution', {
          grant_id: grantDetails.id,
          execution: 'real', // ← REQUIRED marker per NO SIMULATIONS LAW
          total_cost: this.totalCost,
          api_calls: this.apiCallLog.length,
          word_count: proposal.metadata.word_count,
          timestamp: new Date().toISOString()
        });
      }
      
      return proposal;

    } catch (error) {
      console.error('AIProposalService: AI generation failed:', error);
      
      // NO SIMULATIONS LAW: Record FAILURE and THROW - do not fall back to template in production
      if (telemetry) {
        telemetry.logError('AI proposal generation FAILED - NO fallback in production', error, {
          grant_id: grantDetails.id,
          execution: 'failed', // ← REQUIRED marker per NO SIMULATIONS LAW
          ai_enabled: env.FEATURE_REAL_AI,
          error_type: error.name,
          timestamp: new Date().toISOString()
        });
      }
      
      // Throw the error - caller must handle appropriately
      throw new Error(`AI proposal generation failed: ${error.message}`);
    }
  }

  /**
   * Phase 2A: Call Claude API (Anthropic)
   * @param {string} prompt - AI prompt
   * @param {string} apiKey - Anthropic API key
   * @param {Object} options - API options
   * @returns {Object} Claude API response
   */
  async callClaudeAPI(prompt, apiKey, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: options.model || 'claude-3-5-sonnet-20241022',
          max_tokens: options.maxTokens || 4096,
          messages: [{ role: 'user', content: prompt }],
          temperature: options.temperature || 0.3
        })
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Claude API returned ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      
      // Extract usage and calculate cost
      const usage = data.usage || {};
      const cost = this.trackCost('claude', {
        input_tokens: usage.input_tokens || 0,
        output_tokens: usage.output_tokens || 0
      }, options.env);

      this.apiCallLog.push({
        model: 'claude-3-5-sonnet',
        timestamp: new Date().toISOString(),
        input_tokens: usage.input_tokens || 0,
        output_tokens: usage.output_tokens || 0,
        cost
      });

      return {
        content: data.content?.[0]?.text || '',
        usage,
        cost
      };

    } catch (error) {
      clearTimeout(timeoutId);
      throw new Error(`Claude API call failed: ${error.message}`);
    }
  }

  /**
   * Phase 2A: Call GPT-4 API (OpenAI)
   * @param {string} prompt - AI prompt
   * @param {string} apiKey - OpenAI API key
   * @param {Object} options - API options
   * @returns {Object} GPT-4 API response
   */
  async callGPT4API(prompt, apiKey, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: options.model || 'gpt-4-turbo',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: options.maxTokens || 4096,
          temperature: options.temperature || 0.3
        })
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`GPT-4 API returned ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      
      // Extract usage and calculate cost
      const usage = data.usage || {};
      const cost = this.trackCost('gpt4', {
        prompt_tokens: usage.prompt_tokens || 0,
        completion_tokens: usage.completion_tokens || 0
      }, options.env);

      this.apiCallLog.push({
        model: 'gpt-4-turbo',
        timestamp: new Date().toISOString(),
        prompt_tokens: usage.prompt_tokens || 0,
        completion_tokens: usage.completion_tokens || 0,
        cost
      });

      return {
        content: data.choices?.[0]?.message?.content || '',
        usage,
        cost
      };

    } catch (error) {
      clearTimeout(timeoutId);
      throw new Error(`GPT-4 API call failed: ${error.message}`);
    }
  }

  /**
   * Phase 2A: Track AI API costs
   * @param {string} model - Model used ('claude' or 'gpt4')
   * @param {Object} usage - Token usage data
   * @returns {number} Cost in USD
   */
  trackCost(model, usage, env = {}) {
    let cost = 0;
    
    if (model === 'claude') {
      // Claude 3.5 Sonnet pricing
      // Defaults reflect public pricing as of 2025-10; override via environment for agility
      // Sources:
      // - https://docs.anthropic.com/en/docs/about-claude/models#pricing
      const claudeInputPerMTok = parseFloat(env.CLAUDE_INPUT_USD_PER_MTOKEN || "3");
      const claudeOutputPerMTok = parseFloat(env.CLAUDE_OUTPUT_USD_PER_MTOKEN || "15");
      const inputCost = (usage.input_tokens || 0) * (claudeInputPerMTok / 1000_000);
      const outputCost = (usage.output_tokens || 0) * (claudeOutputPerMTok / 1000_000);
      cost = inputCost + outputCost;
    } else if (model === 'gpt4') {
      // GPT-4 Turbo pricing
      // Defaults reflect public pricing as of 2025-10; override via environment
      // Source: https://openai.com/api/pricing
      const gpt4PromptPerMTok = parseFloat(env.GPT4_PROMPT_USD_PER_MTOKEN || "10");
      const gpt4CompletionPerMTok = parseFloat(env.GPT4_COMPLETION_USD_PER_MTOKEN || "30");
      const promptCost = (usage.prompt_tokens || 0) * (gpt4PromptPerMTok / 1000_000);
      const completionCost = (usage.completion_tokens || 0) * (gpt4CompletionPerMTok / 1000_000);
      cost = promptCost + completionCost;
    }
    
    this.totalCost += cost;
    return cost;
  }

  /**
   * Phase 2A: Generate executive summary with Claude AI
   */
  async generateExecutiveSummaryWithAI(grant, company, requirements, template, env) {
    const prompt = `Generate a compelling executive summary for a ${grant.agency} ${grant.program} proposal.

Grant Details:
- Title: ${grant.title}
- Agency: ${grant.agency}
- Amount: ${grant.amount}
- Description: ${grant.description}
- Deadline: ${grant.deadline}

Company Profile:
- Name: ${company.name || 'Innovative Technology Company'}
- Core Expertise: ${company.core_expertise || 'Advanced Technology Solutions'}
- Years in Business: ${company.years_in_business || '5+'}
- Past Achievements: ${company.past_achievements || 'Successful project delivery'}

Template Requirements:
- Page Limit: ${template.format.page_limit} pages
- Key Focus: ${template.key_focus}
- Evaluation Criteria: ${template.evaluation_criteria.join(', ')}

Please generate a concise, compelling executive summary (300-500 words) that:
1. Clearly states the problem being addressed
2. Presents our innovative solution approach
3. Highlights the expected impact and benefits
4. Emphasizes our team's qualifications
5. Aligns with ${grant.agency}'s mission and priorities

Use professional, confident language appropriate for federal grant proposals.`;

    try {
      const result = await this.callClaudeAPI(prompt, env.ANTHROPIC_API_KEY, { env });
      return result.content;
    } catch (error) {
      console.warn('Claude API failed for executive summary, using template fallback:', error);
      return this.generateExecutiveSummary(grant, company, requirements, template);
    }
  }

  /**
   * Phase 2A: Generate technical approach with Claude AI
   */
  async generateTechnicalApproachWithAI(grant, company, requirements, template, env) {
    const prompt = `Generate a detailed technical approach section for a ${grant.agency} ${grant.program} proposal.

Grant Details:
- Title: ${grant.title}
- Agency: ${grant.agency}
- Description: ${grant.description}
- Technical Domain: ${grant.technical_domain || 'Advanced Technology'}

Company Capabilities:
- Core Technologies: ${company.core_technologies || 'Cutting-edge solutions'}
- Technical Capabilities: ${company.technical_capabilities || 'Advanced engineering'}
- Development Methodology: ${company.development_methodology || 'Agile development'}
- Key Innovations: ${company.key_innovations?.join(', ') || 'Proprietary innovations'}

Technical Requirements:
- Challenges: ${requirements.technical_challenges?.slice(0, 3).join(', ') || 'Complex technical challenges'}
- Expected Outcomes: ${grant.expected_outcomes || 'Breakthrough technical capabilities'}
- Performance Targets: ${grant.performance_target || 'Superior performance metrics'}

Template Focus: ${template.key_focus}

Generate a comprehensive technical approach (800-1200 words) that includes:
1. **Technical Overview** - High-level approach and methodology
2. **Phase-Based Development Plan** - 3 phases with clear objectives
3. **Technical Methodology** - Specific methods and technologies
4. **Challenge Mitigation** - How you'll address key technical risks
5. **Innovation Highlights** - Novel aspects of your approach
6. **Performance Validation** - Testing and validation strategy

Use technical language appropriate for ${grant.agency} evaluators while remaining clear and compelling.`;

    try {
      const result = await this.callClaudeAPI(prompt, env.ANTHROPIC_API_KEY, { maxTokens: 6144, env });
      return result.content;
    } catch (error) {
      console.warn('Claude API failed for technical approach, using template fallback:', error);
      return this.generateTechnicalApproach(grant, company, requirements, template);
    }
  }

  /**
   * Phase 2A: Generate innovation section with Claude AI
   */
  async generateInnovationSectionWithAI(grant, company, requirements, env) {
    const prompt = `Generate an innovation section for a federal grant proposal that demonstrates breakthrough potential.

Grant Context:
- Title: ${grant.title}
- Agency: ${grant.agency}
- Technical Domain: ${grant.technical_domain || 'Advanced Technology'}
- Application Area: ${grant.application_area || 'Broad applications'}

Company Innovation Profile:
- Key Innovations: ${company.key_innovations?.join(', ') || 'Proprietary breakthrough technologies'}
- Technologies: ${company.technologies || 'Advanced technology stack'}
- Core Expertise: ${company.core_expertise || 'Deep technical expertise'}
- Competitive Advantages: ${company.competitive_advantages?.join(', ') || 'Market-leading capabilities'}

Generate a compelling innovation section (400-600 words) that:
1. **Technical Innovation** - 3 specific breakthrough innovations
2. **Competitive Advantage** - How this surpasses existing solutions
3. **Impact Potential** - Transformative effects on the field
4. **Intellectual Property** - Innovation protection strategy
5. **Scalability** - Path from prototype to widespread adoption

Emphasize breakthrough potential and transformative impact. Use confident, forward-looking language.`;

    try {
      const result = await this.callClaudeAPI(prompt, env.ANTHROPIC_API_KEY, { env });
      return result.content;
    } catch (error) {
      console.warn('Claude API failed for innovation section, using template fallback:', error);
      return this.generateInnovationSection(grant, company, requirements);
    }
  }

  /**
   * Phase 2A: Generate commercial potential with GPT-4
   */
  async generateCommercialPotentialWithAI(grant, company, template, env) {
    const prompt = `Generate a commercial potential section for a ${grant.agency} grant proposal focusing on market opportunity and business impact.

Grant Information:
- Title: ${grant.title}
- Agency: ${grant.agency}
- Program: ${grant.program}
- Amount: ${grant.amount}
- Application Domain: ${grant.application_domain || grant.technical_domain}

Company Business Profile:
- Market Focus: ${company.market_focus || 'Technology solutions'}
- Target Markets: ${company.target_markets?.join(', ') || 'Government and commercial sectors'}
- Business Model: ${company.business_model || 'Technology licensing and products'}
- Revenue Model: ${company.revenue_model || 'Product sales and licensing'}

Template Requirements:
- Key Focus: ${template.key_focus}
- Commercialization Timeline: ${grant.commercialization_timeline || '3-5 years'}

Generate a business-focused commercial potential section (600-800 words) covering:
1. **Market Opportunity** - Market size, growth, and segments
2. **Commercialization Strategy** - Phase I, II, III progression
3. **Revenue Projections** - Realistic financial forecasts
4. **Customer Validation** - Target customers and adoption path
5. **Competitive Positioning** - Market differentiation
6. **Risk Mitigation** - Business and technical risk management

${template.key_focus.includes('Dual-use') ? 'Emphasize dual-use applications for both government and commercial markets.' : 'Focus on broad market applicability and societal benefit.'}

Use business-oriented language with specific, quantifiable projections where possible.`;

    try {
      const result = await this.callGPT4API(prompt, env.OPENAI_API_KEY, { maxTokens: 5120, env });
      return result.content;
    } catch (error) {
      console.warn('GPT-4 API failed for commercial potential, using template fallback:', error);
      return this.generateCommercialPotential(grant, company, template);
    }
  }

  /**
   * Phase 2A: Generate budget narrative with GPT-4
   */
  async generateBudgetNarrativeWithAI(grant, company, env) {
    const amount = (typeof grant.amount === 'string' 
      ? parseInt(grant.amount.replace(/[$,]/g, '')) 
      : grant.amount) || 250000;

    const prompt = `Generate a detailed budget narrative for a ${grant.program} proposal with total funding of ${grant.amount}.

Project Context:
- Grant Title: ${grant.title}
- Agency: ${grant.agency}
- Total Amount: $${amount.toLocaleString()}
- Duration: ${grant.duration || '24 months'}

Company Profile:
- Team Size: ${company.team_size || '5-10 engineers'}
- Key Personnel: ${company.key_personnel?.join(', ') || 'Senior engineers and project manager'}
- Overhead Rate: ${company.overhead_rate || '15-20%'}

Generate a comprehensive budget narrative (400-600 words) that includes:

1. **Personnel Costs** (60% of budget)
   - Principal Investigator
   - Technical team members
   - Project management
   - Hourly rates and time allocation

2. **Equipment and Materials** (15% of budget)
   - Specialized equipment needs
   - Software licenses
   - Materials and supplies

3. **Indirect Costs** (15% of budget)
   - Facilities
   - Administrative overhead
   - Utilities and support

4. **Other Direct Costs** (10% of budget)
   - Travel (if applicable)
   - Consultants
   - Subcontractors

Provide specific dollar amounts, justify major expenses, and demonstrate cost-effectiveness. Use professional financial language appropriate for federal contracting.`;

    try {
      const result = await this.callGPT4API(prompt, env.OPENAI_API_KEY, { env });
      return result.content;
    } catch (error) {
      console.warn('GPT-4 API failed for budget narrative, using template fallback:', error);
      return this.generateBudgetNarrative(grant, company);
    }
  }

  /**
   * Initialize agency-specific proposal templates
   * @returns {Object} Template library
   */
  initializeTemplateLibrary() {
    return {
      'DOD': {
        agency: 'Department of Defense',
        format: {
          page_limit: 15,
          font_size: 11,
          font_family: 'Times New Roman',
          margins: '1 inch all sides',
          line_spacing: 'single'
        },
        required_sections: [
          'Cover Page',
          'Technical Volume',
          'Business Volume',
          'Cost Volume'
        ],
        evaluation_criteria: [
          'Technical Merit (50%)',
          'Qualifications of Personnel (25%)',
          'Cost Realism (15%)',
          'Commercialization Potential (10%)'
        ],
        key_focus: 'Dual-use technology, transition to acquisition, military applications'
      },
      'NSF': {
        agency: 'National Science Foundation',
        format: {
          page_limit: 15,
          font_size: 11,
          font_family: 'Computer Modern, Palatino, Times',
          margins: '1 inch all sides',
          line_spacing: 'single'
        },
        required_sections: [
          'Project Summary',
          'Project Description',
          'References Cited',
          'Budget Justification',
          'Biographical Sketches'
        ],
        evaluation_criteria: [
          'Intellectual Merit (50%)',
          'Broader Impacts (30%)',
          'Qualifications (20%)'
        ],
        key_focus: 'Scientific innovation, broader societal impact, education integration'
      },
      'NIH': {
        agency: 'National Institutes of Health',
        format: {
          page_limit: 12,
          font_size: 11,
          font_family: 'Arial, Helvetica, Palatino Linotype',
          margins: '0.5 inch all sides',
          line_spacing: 'at least 0.5 line'
        },
        required_sections: [
          'Specific Aims',
          'Research Strategy',
          'Bibliography',
          'Budget Justification'
        ],
        evaluation_criteria: [
          'Significance (30%)',
          'Investigators (25%)',
          'Innovation (25%)',
          'Approach (20%)'
        ],
        key_focus: 'Health impact, clinical translation, patient outcomes'
      },
      'DARPA': {
        agency: 'Defense Advanced Research Projects Agency',
        format: {
          page_limit: 20,
          font_size: 11,
          font_family: 'Times New Roman',
          margins: '1 inch all sides',
          line_spacing: 'single'
        },
        required_sections: [
          'Executive Summary',
          'Technical Approach',
          'Innovation',
          'Team Qualifications',
          'Schedule and Milestones'
        ],
        evaluation_criteria: [
          'Technical Approach (40%)',
          'Innovation (30%)',
          'Team Capability (20%)',
          'Cost Realism (10%)'
        ],
        key_focus: 'High-risk high-reward, revolutionary breakthroughs, national security impact'
      },
      'DOE': {
        agency: 'Department of Energy',
        format: {
          page_limit: 15,
          font_size: 11,
          font_family: 'Times New Roman, Computer Modern',
          margins: '1 inch all sides',
          line_spacing: 'single'
        },
        required_sections: [
          'Project Narrative',
          'Work Plan',
          'Technical Approach',
          'Budget Justification'
        ],
        evaluation_criteria: [
          'Scientific Merit (35%)',
          'Appropriateness (25%)',
          'Team Competence (25%)',
          'Resources (15%)'
        ],
        key_focus: 'Energy innovation, sustainability, national energy goals'
      }
    };
  }

  /**
   * Process solicitation requirements using NLP
   * @param {Object} solicitation - Grant solicitation details
   * @returns {Object} Processed requirements
   */
  processRequirements(solicitation) {
    const processed = {
      key_requirements: [],
      technical_challenges: [],
      evaluation_focus: [],
      mandatory_elements: [],
      competitive_factors: []
    };

    const text = `${solicitation.title} ${solicitation.description} ${solicitation.technical_requirements || ''}`;

    // Extract key requirements
    processed.key_requirements = this.extractKeyRequirements(text);

    // Identify technical challenges
    processed.technical_challenges = this.extractTechnicalChallenges(text);

    // Determine evaluation focus
    const template = this.templateLibrary[solicitation.agency] || this.templateLibrary['DOD'];
    processed.evaluation_focus = template.evaluation_criteria;

    // Extract mandatory elements
    processed.mandatory_elements = this.extractMandatoryElements(text, solicitation);

    // Identify competitive factors
    processed.competitive_factors = this.extractCompetitiveFactors(text);

    return processed;
  }

  /**
   * Extract key requirements from text
   * @param {string} text - Solicitation text
   * @returns {Array} Key requirements
   */
  extractKeyRequirements(text) {
    const requirements = [];
    const lowerText = text.toLowerCase();

    // Look for requirement indicators
    const indicators = [
      'must', 'shall', 'required', 'mandatory', 'necessary',
      'applicants must', 'proposals shall', 'is required to'
    ];

    indicators.forEach(indicator => {
      const regex = new RegExp(`${indicator}[^.!?]*[.!?]`, 'gi');
      const matches = text.match(regex);
      if (matches) {
        requirements.push(...matches.map(m => m.trim()).slice(0, 3)); // Top 3 per indicator
      }
    });

    return [...new Set(requirements)].slice(0, 10); // Top 10 unique requirements
  }

  /**
   * Extract technical challenges
   * @param {string} text - Solicitation text
   * @returns {Array} Technical challenges
   */
  extractTechnicalChallenges(text) {
    const challenges = [];
    const challengeIndicators = [
      'challenge', 'problem', 'issue', 'gap', 'limitation',
      'difficulty', 'barrier', 'obstacle', 'constraint'
    ];

    challengeIndicators.forEach(indicator => {
      if (text.toLowerCase().includes(indicator)) {
        const sentences = text.split(/[.!?]/);
        const relevant = sentences.filter(s => 
          s.toLowerCase().includes(indicator)
        ).slice(0, 2);
        challenges.push(...relevant);
      }
    });

    return [...new Set(challenges)].slice(0, 5);
  }

  /**
   * Extract mandatory elements
   * @param {string} text - Solicitation text
   * @param {Object} solicitation - Full solicitation
   * @returns {Array} Mandatory elements
   */
  extractMandatoryElements(text, solicitation) {
    const elements = [];

    // Page limits
    if (solicitation.page_limit) {
      elements.push(`Page limit: ${solicitation.page_limit} pages`);
    }

    // Deliverables
    const deliverableMatch = text.match(/deliverable[s]?:([^.!?]*)/i);
    if (deliverableMatch) {
      elements.push(`Deliverables: ${deliverableMatch[1].trim()}`);
    }

    // Timeline requirements
    const timelineMatch = text.match(/timeline|duration|period[:]?\s*(\d+\s*(?:months|years))/i);
    if (timelineMatch) {
      elements.push(`Duration: ${timelineMatch[1]}`);
    }

    // Team requirements
    if (text.toLowerCase().includes('pi must') || text.toLowerCase().includes('principal investigator')) {
      elements.push('Principal Investigator requirements specified');
    }

    return elements;
  }

  /**
   * Extract competitive factors
   * @param {string} text - Solicitation text
   * @returns {Array} Competitive factors
   */
  extractCompetitiveFactors(text) {
    const factors = [];
    const competitiveTerms = [
      'innovative', 'novel', 'breakthrough', 'state-of-the-art',
      'cutting-edge', 'revolutionary', 'transformative', 'disruptive'
    ];

    competitiveTerms.forEach(term => {
      if (text.toLowerCase().includes(term)) {
        factors.push(term.charAt(0).toUpperCase() + term.slice(1) + ' approach expected');
      }
    });

    return factors.slice(0, 5);
  }

  /**
   * Generate proposal content with AI models
   * @param {Object} grantDetails - Grant opportunity details
   * @param {Object} companyProfile - Company capabilities
   * @param {Object} options - Generation options
   * @returns {Object} Generated proposal sections
   */
  async generateProposal(grantDetails, companyProfile, options = {}) {
    const proposal = {
      grant_id: grantDetails.id,
      company: companyProfile.name,
      generated_at: new Date().toISOString(),
      model_used: options.model || 'hybrid', // claude, gpt4, or hybrid
      sections: {},
      metadata: {}
    };

    // Get agency-specific template
    const template = this.templateLibrary[grantDetails.agency] || this.templateLibrary['DOD'];
    proposal.metadata.template = template;

    // Process requirements
    const requirements = this.processRequirements(grantDetails);
    proposal.metadata.requirements = requirements;

    // Generate each required section
    if (template.required_sections.includes('Executive Summary') || 
        template.required_sections.includes('Project Summary')) {
      proposal.sections.executive_summary = this.generateExecutiveSummary(
        grantDetails, companyProfile, requirements, template
      );
    }

    if (template.required_sections.includes('Technical Volume') ||
        template.required_sections.includes('Technical Approach') ||
        template.required_sections.includes('Project Description')) {
      proposal.sections.technical_approach = this.generateTechnicalApproach(
        grantDetails, companyProfile, requirements, template
      );
    }

    if (template.required_sections.includes('Innovation')) {
      proposal.sections.innovation = this.generateInnovationSection(
        grantDetails, companyProfile, requirements
      );
    }

    proposal.sections.commercial_potential = this.generateCommercialPotential(
      grantDetails, companyProfile, template
    );

    proposal.sections.team_qualifications = this.generateTeamQualifications(
      grantDetails, companyProfile, template
    );

    proposal.sections.budget_narrative = this.generateBudgetNarrative(
      grantDetails, companyProfile
    );

    proposal.sections.timeline = this.generateProjectTimeline(
      grantDetails, companyProfile
    );

    // Metadata
    proposal.metadata.word_count = this.calculateWordCount(proposal.sections);
    proposal.metadata.compliance_check = this.checkTemplateCompliance(proposal, template);

    return proposal;
  }

  /**
   * Generate executive summary using template (fallback method)
   * @param {Object} grant - Grant details
   * @param {Object} company - Company profile
   * @param {Object} requirements - Processed requirements
   * @param {Object} template - Agency template
   * @returns {string} Executive summary
   */
  generateExecutiveSummary(grant, company, requirements, template) {
    // Simulate AI generation with sophisticated template
    const problemStatement = this.extractProblemStatement(grant);
    const solution = this.formulateSolution(grant, company);
    const impact = this.formulateImpact(grant, template.key_focus);

    return `${problemStatement}\n\n${solution}\n\n${impact}\n\nOur team brings ${company.years_in_business || 'extensive'} years of experience in ${company.core_expertise || grant.technical_domain || 'this domain'}, with a proven track record of ${company.past_achievements || 'successful project delivery'}. This ${grant.program || 'SBIR'} project directly addresses ${grant.agency}'s mission priorities and offers significant potential for ${template.key_focus}.`;
  }

  /**
   * Generate technical approach section
   * @param {Object} grant - Grant details
   * @param {Object} company - Company profile
   * @param {Object} requirements - Processed requirements
   * @param {Object} template - Agency template
   * @returns {string} Technical approach
   */
  generateTechnicalApproach(grant, company, requirements, template) {
    const challenges = requirements.technical_challenges.slice(0, 3);
    const innovations = company.key_innovations || [];

    let approach = `## Technical Approach\n\n`;
    approach += `### Overview\n`;
    approach += `Our technical approach addresses the key challenges identified in the solicitation through a systematic, innovation-driven methodology. `;
    approach += `We propose a multi-phase development strategy that leverages ${company.core_technologies || 'advanced technologies'} to deliver ${grant.expected_outcomes || 'breakthrough solutions'}.\n\n`;

    approach += `### Technical Methodology\n`;
    approach += `**Phase 1: Requirements Analysis and Architecture Design** - We will conduct comprehensive analysis of ${grant.title.toLowerCase()} requirements and develop a robust system architecture incorporating ${company.technical_capabilities || 'state-of-the-art approaches'}.\n\n`;
    
    approach += `**Phase 2: Core Development and Integration** - Implementation of critical components using ${company.development_methodology || 'agile methodology'}, with continuous integration and validation against performance metrics.\n\n`;
    
    approach += `**Phase 3: Validation and Optimization** - Rigorous testing, performance optimization, and validation against ${grant.agency} requirements and industry standards.\n\n`;

    if (challenges.length > 0) {
      approach += `### Technical Challenges and Solutions\n`;
      challenges.forEach((challenge, i) => {
        approach += `**Challenge ${i + 1}**: ${challenge}\n`;
        approach += `**Solution**: Leveraging our expertise in ${company.core_expertise || 'this area'}, we will apply ${innovations[i] || 'innovative techniques'} to overcome this challenge.\n\n`;
      });
    }

    approach += `### Innovation and Technical Merit\n`;
    approach += `Our approach represents a significant advancement over current state-of-the-art through ${innovations.join(', ') || 'novel methodologies'}. `;
    approach += `The proposed solution offers ${this.generateInnovationClaims(grant, company)}.\n`;

    return approach;
  }

  /**
   * Generate innovation section
   * @param {Object} grant - Grant details
   * @param {Object} company - Company profile
   * @param {Object} requirements - Processed requirements
   * @returns {string} Innovation section
   */
  generateInnovationSection(grant, company, requirements) {
    let innovation = `## Innovation\n\n`;
    
    innovation += `### Technical Innovation\n`;
    innovation += `This project introduces breakthrough innovations in ${grant.technical_domain || 'the field'} through:\n\n`;
    innovation += `1. **${company.innovation_1 || 'Novel Algorithmic Approach'}**: Advanced ${grant.technical_domain || 'methodology'} that achieves ${grant.performance_target || 'superior performance'}.\n\n`;
    innovation += `2. **${company.innovation_2 || 'Integrated System Architecture'}**: Unique integration of ${company.technologies || 'cutting-edge technologies'} for enhanced capabilities.\n\n`;
    innovation += `3. **${company.innovation_3 || 'Scalable Implementation'}**: Innovative deployment strategy enabling ${grant.application_area || 'broad applicability'}.\n\n`;

    innovation += `### Competitive Advantage\n`;
    innovation += `Our approach surpasses existing solutions by ${this.generateCompetitiveAdvantage(grant, company)}. `;
    innovation += `This provides ${grant.agency} with a transformative capability that ${grant.impact_statement || 'significantly advances the state-of-the-art'}.\n`;

    return innovation;
  }

  /**
   * Generate commercial potential section
   * @param {Object} grant - Grant details
   * @param {Object} company - Company profile
   * @param {Object} template - Agency template
   * @returns {string} Commercial potential
   */
  generateCommercialPotential(grant, company, template) {
    let commercial = `## Commercial Potential\n\n`;
    
    commercial += `### Market Opportunity\n`;
    commercial += `The proposed technology addresses a ${this.estimateMarketSize(grant)} market opportunity in ${grant.application_domain || grant.technical_domain}. `;
    commercial += `Key market segments include ${this.identifyMarketSegments(grant, company).join(', ')}.\n\n`;

    commercial += `### Commercialization Strategy\n`;
    commercial += `**Phase I Objectives**: Demonstrate technical feasibility and establish proof-of-concept with ${grant.phase_1_goals || 'key performance metrics'}.\n\n`;
    commercial += `**Phase II Transition**: Scale prototype to production-ready system, secure pilot customers, and initiate strategic partnerships.\n\n`;
    commercial += `**Phase III & Beyond**: Full commercial deployment with revenue targets of ${this.estimateRevenue(grant)} within ${grant.commercialization_timeline || '3-5 years'}.\n\n`;

    commercial += `### Dual-Use Applications\n`;
    if (template.key_focus.includes('Dual-use')) {
      commercial += `This technology offers significant dual-use potential, serving both government and commercial markets. `;
      commercial += `Government applications include ${this.identifyGovApplications(grant)}, while commercial applications span ${this.identifyCommercialApplications(grant)}.\n`;
    } else {
      commercial += `Beyond the immediate application, this technology enables ${this.identifyAdditionalApplications(grant)}.\n`;
    }

    return commercial;
  }

  /**
   * Generate team qualifications section
   * @param {Object} grant - Grant details
   * @param {Object} company - Company profile
   * @param {Object} template - Agency template
   * @returns {string} Team qualifications
   */
  generateTeamQualifications(grant, company, template) {
    let team = `## Team Qualifications\n\n`;
    
    team += `### Principal Investigator\n`;
    team += `${company.pi_name || 'Our Principal Investigator'} brings ${company.pi_experience || '15+'} years of experience in ${grant.technical_domain || 'the field'}, with expertise in ${company.pi_expertise || 'relevant areas'}. `;
    team += `Key qualifications include ${company.pi_achievements || 'significant achievements in research and development'}.\n\n`;

    team += `### Core Team\n`;
    team += `Our multidisciplinary team combines expertise in:\n`;
    team += `- **Technical Leadership**: ${company.tech_lead_background || 'Experienced technical leaders with proven track records'}\n`;
    team += `- **Research & Development**: ${company.rd_capabilities || 'Advanced R&D capabilities in target domains'}\n`;
    team += `- **Systems Integration**: ${company.integration_experience || 'Extensive systems integration experience'}\n`;
    team += `- **Project Management**: ${company.pm_credentials || 'Professional project management credentials'}\n\n`;

    team += `### Past Performance\n`;
    team += `Relevant prior projects include:\n`;
    const pastProjects = company.past_projects || [
      `Similar ${grant.program || 'SBIR'} projects for ${grant.agency}`,
      `Commercial development in ${grant.technical_domain || 'related technologies'}`,
      `Research collaborations with leading institutions`
    ];
    pastProjects.slice(0, 3).forEach(project => {
      team += `- ${project}\n`;
    });

    return team;
  }

  /**
   * Generate budget narrative
   * @param {Object} grant - Grant details
   * @param {Object} company - Company profile
   * @returns {string} Budget narrative
   */
  generateBudgetNarrative(grant, company) {
    const budget = grant.sample_budget || this.generateSampleBudget(grant);
    
    let narrative = `## Budget Narrative\n\n`;
    narrative += `The total project budget of ${grant.amount} is allocated to ensure successful completion of all technical objectives while maintaining cost efficiency.\n\n`;

    Object.entries(budget).forEach(([category, details]) => {
      if (category === 'total') return;
      narrative += `### ${category.replace(/_/g, ' ').toUpperCase()}\n`;
      narrative += `${details.amount || details}: ${details.justification || 'Allocated for project requirements'}\n\n`;
    });

    return narrative;
  }

  /**
   * Generate project timeline
   * @param {Object} grant - Grant details
   * @param {Object} company - Company profile
   * @returns {string} Project timeline
   */
  generateProjectTimeline(grant, company) {
    const duration = this.extractDuration(grant.program || 'Phase I');
    
    let timeline = `## Project Timeline\n\n`;
    timeline += `This ${duration}-month project is organized into distinct phases with clear milestones:\n\n`;

    const phases = this.generatePhaseBreakdown(duration);
    phases.forEach(phase => {
      timeline += `**${phase.name} (${phase.duration})**\n`;
      timeline += `${phase.activities}\n`;
      timeline += `*Milestone*: ${phase.milestone}\n\n`;
    });

    return timeline;
  }

  // Helper methods

  extractProblemStatement(grant) {
    return `${grant.agency} seeks innovative solutions to address critical challenges in ${grant.technical_domain || grant.title.toLowerCase()}. Current approaches face limitations in ${grant.key_challenge || 'performance, scalability, and efficiency'}.`;
  }

  formulateSolution(grant, company) {
    return `We propose a breakthrough ${grant.solution_type || 'technology'} that leverages ${company.core_technologies || 'advanced methodologies'} to overcome these limitations. Our solution delivers ${grant.key_benefits || 'superior performance, reduced costs, and enhanced capabilities'}.`;
  }

  formulateImpact(grant, keyFocus) {
    return `This innovation will ${grant.expected_impact || 'significantly advance the state-of-the-art'}, directly supporting ${keyFocus} with measurable improvements in ${grant.performance_metrics || 'key performance indicators'}.`;
  }

  generateInnovationClaims(grant, company) {
    return `${grant.performance_improvement || '10x improvement'} in ${grant.performance_metric || 'key metrics'} compared to existing solutions`;
  }

  generateCompetitiveAdvantage(grant, company) {
    return `delivering ${grant.competitive_edge || 'superior performance at reduced cost with enhanced reliability'}`;
  }

  estimateMarketSize(grant) {
    const markets = {
      'AI': '$500 billion',
      'cybersecurity': '$300 billion',
      'quantum': '$50 billion',
      'biotech': '$200 billion'
    };
    
    for (const [key, size] of Object.entries(markets)) {
      if (grant.title.toLowerCase().includes(key) || grant.description?.toLowerCase().includes(key)) {
        return size;
      }
    }
    return '$100 billion+';
  }

  identifyMarketSegments(grant, company) {
    return ['government/defense', 'commercial enterprise', 'research institutions'];
  }

  estimateRevenue(grant) {
    const amount = (typeof grant.amount === 'string' 
      ? parseInt(grant.amount.replace(/[$,]/g, '')) 
      : grant.amount) || 0;
    return `$${Math.floor(amount * 20 / 1000000)}M-${Math.floor(amount * 50 / 1000000)}M`;
  }

  identifyGovApplications(grant) {
    return `${grant.agency} mission-critical systems, defense applications, and federal research initiatives`;
  }

  identifyCommercialApplications(grant) {
    return `enterprise solutions, consumer products, and industrial applications`;
  }

  identifyAdditionalApplications(grant) {
    return `broader applications in related technical domains and adjacent markets`;
  }

  extractDuration(program) {
    if (program.includes('Phase I')) return 6;
    if (program.includes('Phase II')) return 24;
    return 12;
  }

  generatePhaseBreakdown(duration) {
    const monthsPerPhase = Math.ceil(duration / 3);
    return [
      {
        name: 'Phase 1: Foundation',
        duration: `Months 1-${monthsPerPhase}`,
        activities: 'Requirements analysis, architecture design, initial development',
        milestone: 'Design review and architecture validation complete'
      },
      {
        name: 'Phase 2: Development',
        duration: `Months ${monthsPerPhase + 1}-${monthsPerPhase * 2}`,
        activities: 'Core implementation, integration, initial testing',
        milestone: 'Functional prototype demonstrated'
      },
      {
        name: 'Phase 3: Validation',
        duration: `Months ${monthsPerPhase * 2 + 1}-${duration}`,
        activities: 'Performance optimization, validation testing, documentation',
        milestone: 'Final deliverables and transition plan complete'
      }
    ];
  }

  generateSampleBudget(grant) {
    const amount = (typeof grant.amount === 'string' 
      ? parseInt(grant.amount.replace(/[$,]/g, '')) 
      : grant.amount) || 250000;
    
    return {
      personnel: { amount: Math.floor(amount * 0.60), justification: 'Direct labor for technical team' },
      equipment: { amount: Math.floor(amount * 0.15), justification: 'Specialized equipment and tools' },
      materials: { amount: Math.floor(amount * 0.10), justification: 'Materials and supplies' },
      overhead: { amount: Math.floor(amount * 0.15), justification: 'Indirect costs and overhead' }
    };
  }

  calculateWordCount(sections) {
    let total = 0;
    Object.values(sections).forEach(section => {
      if (typeof section === 'string') {
        total += section.split(/\s+/).length;
      }
    });
    return total;
  }

  checkTemplateCompliance(proposal, template) {
    const compliance = {
      sections_complete: true,
      format_compliant: true,
      issues: []
    };

    // Mapping from template section names to actual proposal section keys
    const sectionMapping = {
      'Cover Page': 'cover_page',
      'Technical Volume': 'technical_approach',
      'Business Volume': 'commercial_potential',
      'Cost Volume': 'budget_narrative',
      'Project Summary': 'executive_summary',
      'Project Description': 'technical_approach',
      'References Cited': 'references',
      'Budget Justification': 'budget_narrative',
      'Biographical Sketches': 'team_qualifications',
      'Specific Aims': 'executive_summary',
      'Research Strategy': 'technical_approach',
      'Bibliography': 'references',
      'Executive Summary': 'executive_summary',
      'Technical Approach': 'technical_approach',
      'Innovation': 'innovation',
      'Team Qualifications': 'team_qualifications',
      'Schedule and Milestones': 'timeline',
      'Project Narrative': 'technical_approach',
      'Work Plan': 'timeline'
    };

    // Check required sections
    template.required_sections.forEach(section => {
      const sectionKey = sectionMapping[section] || section.toLowerCase().replace(/\s+/g, '_');
      if (!proposal.sections[sectionKey]) {
        compliance.sections_complete = false;
        compliance.issues.push(`Missing required section: ${section}`);
      }
    });

    // Check word count (approximate page limit)
    const wordsPerPage = 500;
    const estimatedPages = proposal.metadata.word_count / wordsPerPage;
    if (estimatedPages > template.format.page_limit) {
      compliance.format_compliant = false;
      compliance.issues.push(`Content may exceed ${template.format.page_limit} page limit`);
    }

    return compliance;
  }
}

export default AIProposalService;
