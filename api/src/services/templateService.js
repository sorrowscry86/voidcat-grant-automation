// Proposal Template Service for VoidCat Grant Automation Platform
// Provides pre-built templates for different grant types and agencies

export class TemplateService {
  constructor() {
    this.templates = this.initializeTemplates();
  }

  /**
   * Initialize the template database
   */
  initializeTemplates() {
    return {
      'sbir-phase-1': {
        id: 'sbir-phase-1',
        name: 'SBIR Phase I Template',
        description: 'Standard template for Small Business Innovation Research Phase I proposals',
        category: 'sbir',
        agencies: ['defense', 'nasa', 'nsf', 'energy', 'nih'],
        sections: [
          {
            id: 'executive_summary',
            title: 'Executive Summary',
            required: true,
            max_words: 200,
            template: `## Executive Summary

**Innovation Overview**: [Company Name] proposes to develop [brief description of innovation] to address the critical need for [problem statement] in [relevant domain/application area].

**Technical Approach**: Our approach leverages [key technology/methodology] to achieve [specific objectives]. The anticipated innovation will [describe expected outcomes and benefits].

**Commercial Potential**: The proposed technology addresses a market opportunity valued at $[market size] with applications in [target markets]. Our commercialization strategy includes [brief commercialization plan].

**Team Qualifications**: Our team combines expertise in [relevant expertise areas] with a proven track record of [relevant accomplishments].

**Phase I Objectives**: 
- Demonstrate technical feasibility of [key technical objective]
- Develop prototype/proof-of-concept for [specific deliverable]
- Validate performance against [specific metrics/benchmarks]
- Establish commercialization pathway for Phase II

**Expected Impact**: Successful completion will advance the state-of-the-art in [technology area] and provide [specific benefits to the agency/mission].`
          },
          {
            id: 'technical_approach',
            title: 'Technical Approach',
            required: true,
            max_words: 1500,
            template: `## Technical Approach

### Background and Problem Statement
[Describe the current state of technology and the specific problem your innovation addresses. Include relevant technical challenges and limitations of existing solutions.]

### Proposed Innovation
[Detail your innovative approach, including the underlying scientific principles, novel aspects, and how it differs from existing solutions.]

### Technical Objectives
**Primary Objectives:**
1. [Objective 1]: [Specific, measurable goal]
2. [Objective 2]: [Specific, measurable goal]
3. [Objective 3]: [Specific, measurable goal]

**Success Metrics:**
- [Metric 1]: [Quantifiable success criterion]
- [Metric 2]: [Quantifiable success criterion]
- [Metric 3]: [Quantifiable success criterion]

### Methodology and Work Plan
**Task 1: [Task Name]** (Months 1-3)
- [Subtask 1.1]: [Description and deliverable]
- [Subtask 1.2]: [Description and deliverable]
- [Subtask 1.3]: [Description and deliverable]

**Task 2: [Task Name]** (Months 4-6)
- [Subtask 2.1]: [Description and deliverable]
- [Subtask 2.2]: [Description and deliverable]
- [Subtask 2.3]: [Description and deliverable]

**Task 3: [Task Name]** (Months 7-9)
- [Subtask 3.1]: [Description and deliverable]
- [Subtask 3.2]: [Description and deliverable]

### Risk Assessment and Mitigation
**Technical Risks:**
- **Risk 1**: [Description] → **Mitigation**: [Strategy]
- **Risk 2**: [Description] → **Mitigation**: [Strategy]
- **Risk 3**: [Description] → **Mitigation**: [Strategy]

### Expected Outcomes
[Describe anticipated results, deliverables, and how success will be measured]`
          },
          {
            id: 'commercial_potential',
            title: 'Commercial Potential',
            required: true,
            max_words: 1000,
            template: `## Commercial Potential

### Market Analysis
**Target Market**: [Define primary market segment and size]
- Total Addressable Market (TAM): $[X] billion
- Serviceable Addressable Market (SAM): $[X] million
- Serviceable Obtainable Market (SOM): $[X] million

**Market Drivers**:
- [Driver 1]: [Explanation of market need/trend]
- [Driver 2]: [Explanation of market need/trend]
- [Driver 3]: [Explanation of market need/trend]

### Competitive Analysis
**Direct Competitors**:
- [Competitor 1]: [Strengths and limitations]
- [Competitor 2]: [Strengths and limitations]

**Competitive Advantages**:
- [Advantage 1]: [How your solution is superior]
- [Advantage 2]: [How your solution is superior]
- [Advantage 3]: [How your solution is superior]

### Business Model
**Revenue Streams**:
- [Revenue stream 1]: [Description and projected revenue]
- [Revenue stream 2]: [Description and projected revenue]

**Pricing Strategy**: [Describe pricing model and rationale]

### Commercialization Plan
**Phase II Development** (Months 10-24):
- [Milestone 1]: [Description and timeline]
- [Milestone 2]: [Description and timeline]
- [Milestone 3]: [Description and timeline]

**Go-to-Market Strategy**:
- [Strategy component 1]: [Description]
- [Strategy component 2]: [Description]
- [Strategy component 3]: [Description]

**Partnerships**: [Describe potential strategic partnerships and their value]

### Intellectual Property
[Describe IP strategy, existing patents, and plans for protection]

### Financial Projections
**5-Year Revenue Projection**:
- Year 1: $[X]
- Year 2: $[X]
- Year 3: $[X]
- Year 4: $[X]
- Year 5: $[X]`
          },
          {
            id: 'team_qualifications',
            title: 'Team Qualifications',
            required: true,
            max_words: 800,
            template: `## Team Qualifications

### Principal Investigator
**[Name], [Title]**
- **Education**: [Degree(s) and institutions]
- **Experience**: [Years] years in [relevant field]
- **Expertise**: [Key areas of expertise]
- **Relevant Accomplishments**:
  - [Accomplishment 1]
  - [Accomplishment 2]
  - [Accomplishment 3]

### Key Personnel
**[Name], [Title]**
- **Role**: [Specific role in project]
- **Expertise**: [Relevant expertise]
- **Contribution**: [How they will contribute to project success]

**[Name], [Title]**
- **Role**: [Specific role in project]
- **Expertise**: [Relevant expertise]
- **Contribution**: [How they will contribute to project success]

### Company Qualifications
**[Company Name]** was founded in [year] and specializes in [core competencies]. Our company has:
- [Company strength 1]
- [Company strength 2]
- [Company strength 3]

**Relevant Experience**:
- [Project/contract 1]: [Description and outcomes]
- [Project/contract 2]: [Description and outcomes]
- [Project/contract 3]: [Description and outcomes]

### Facilities and Resources
**Research Facilities**: [Description of facilities and capabilities]
**Equipment**: [Key equipment and instrumentation available]
**Partnerships**: [Academic or industry partnerships that enhance capabilities]

### Previous SBIR Experience
[If applicable, describe previous SBIR awards and outcomes]`
          },
          {
            id: 'budget_summary',
            title: 'Budget Summary',
            required: true,
            max_words: 300,
            template: `## Budget Summary

### Phase I Budget Breakdown
**Total Phase I Request**: $[Total Amount]

**Personnel** ($[Amount] - [%]% of total):
- Principal Investigator ([X]% effort): $[Amount]
- [Key Personnel 1] ([X]% effort): $[Amount]
- [Key Personnel 2] ([X]% effort): $[Amount]

**Equipment** ($[Amount] - [%]% of total):
- [Equipment item 1]: $[Amount]
- [Equipment item 2]: $[Amount]

**Materials and Supplies** ($[Amount] - [%]% of total):
- [Material category 1]: $[Amount]
- [Material category 2]: $[Amount]

**Consultants** ($[Amount] - [%]% of total):
- [Consultant expertise]: $[Amount]

**Travel** ($[Amount] - [%]% of total):
- [Travel purpose]: $[Amount]

**Other Direct Costs** ($[Amount] - [%]% of total):
- [Other cost item]: $[Amount]

**Indirect Costs** ($[Amount] - [%]% rate):
- Applied to direct costs excluding equipment

### Cost Sharing
[If applicable, describe any cost sharing commitments]

### Budget Justification
[Brief explanation of major budget items and their necessity for project success]`
          }
        ],
        metadata: {
          typical_duration: '6-9 months',
          typical_amount: '$150,000 - $300,000',
          success_rate: '15-20%',
          next_phase: 'sbir-phase-2'
        }
      },
      'sbir-phase-2': {
        id: 'sbir-phase-2',
        name: 'SBIR Phase II Template',
        description: 'Template for SBIR Phase II proposals (continued development)',
        category: 'sbir',
        agencies: ['defense', 'nasa', 'nsf', 'energy', 'nih'],
        sections: [
          {
            id: 'executive_summary',
            title: 'Executive Summary',
            required: true,
            max_words: 300,
            template: `## Executive Summary

**Phase I Achievements**: During Phase I, [Company Name] successfully [summarize key Phase I accomplishments and how they met objectives].

**Phase II Objectives**: Building on Phase I success, we propose to [describe Phase II goals] through [development approach]. This phase will advance the technology from [current TRL] to [target TRL].

**Technical Innovation**: Our Phase II work will focus on [key technical developments] to achieve [specific performance targets] and address [remaining technical challenges].

**Commercialization Strategy**: We have identified [number] potential customers and secured [type of commitment] from [customer/partner names]. Our go-to-market strategy includes [key commercialization activities].

**Expected Impact**: Phase II completion will result in [specific deliverables] ready for [target application/market] with projected revenues of $[amount] within [timeframe].`
          }
          // Additional Phase II specific sections would go here
        ],
        metadata: {
          typical_duration: '18-24 months',
          typical_amount: '$750,000 - $1,500,000',
          success_rate: '40-50%',
          prerequisites: ['sbir-phase-1']
        }
      },
      'sttr-phase-1': {
        id: 'sttr-phase-1',
        name: 'STTR Phase I Template',
        description: 'Small Business Technology Transfer Phase I template',
        category: 'sttr',
        agencies: ['defense', 'nasa', 'nsf', 'energy', 'nih'],
        sections: [
          {
            id: 'research_partnership',
            title: 'Research Institution Partnership',
            required: true,
            max_words: 500,
            template: `## Research Institution Partnership

**Partner Institution**: [University/Research Institution Name]

**Partnership Agreement**: [Describe the formal agreement and collaboration structure]

**Principal Investigator (Academic)**: [Name, Title, Department]
- **Expertise**: [Relevant research expertise]
- **Role**: [Specific role in the project]
- **Contribution**: [Percentage of research effort]

**Principal Investigator (Small Business)**: [Name, Title, Company]
- **Expertise**: [Business and technical expertise]
- **Role**: [Specific role in the project]
- **Contribution**: [Percentage of research effort]

**Collaborative Framework**:
- **Small Business Role**: [Describe business responsibilities - minimum 40%]
- **Academic Role**: [Describe research institution responsibilities - minimum 30%]
- **Technology Transfer Plan**: [How technology will be transferred from academia to business]

**Intellectual Property Agreement**: [Describe IP sharing and commercialization rights]`
          }
        ],
        metadata: {
          typical_duration: '12 months',
          typical_amount: '$150,000 - $300,000',
          required_partnership: true
        }
      },
      'nsf-general': {
        id: 'nsf-general',
        name: 'NSF General Research Template',
        description: 'Template for general NSF research proposals',
        category: 'research',
        agencies: ['nsf'],
        sections: [
          {
            id: 'project_description',
            title: 'Project Description',
            required: true,
            max_words: 2500,
            template: `## Project Description

### Overview
[Provide a clear, concise overview of the proposed research]

### Intellectual Merit
**Research Questions**: [Articulate the fundamental research questions]

**Approach**: [Describe your research methodology and approach]

**Innovation**: [Explain what is novel about your approach]

**Expected Contributions**: [Describe anticipated contributions to the field]

### Broader Impacts
**Educational Impact**: [How will this research enhance education and training?]

**Societal Benefits**: [What are the potential benefits to society?]

**Diversity and Inclusion**: [How will this project promote diversity in STEM?]

**Dissemination**: [How will results be shared with the broader community?]`
          }
        ],
        metadata: {
          typical_duration: '12-36 months',
          typical_amount: '$100,000 - $500,000'
        }
      }
    };
  }

  /**
   * Get all available templates
   */
  getTemplates(filters = {}) {
    let templates = Object.values(this.templates);

    // Apply filters
    if (filters.category) {
      templates = templates.filter(t => t.category === filters.category);
    }

    if (filters.agency) {
      templates = templates.filter(t => 
        t.agencies.includes(filters.agency.toLowerCase())
      );
    }

    return templates.map(template => ({
      id: template.id,
      name: template.name,
      description: template.description,
      category: template.category,
      agencies: template.agencies,
      sections: template.sections.length,
      metadata: template.metadata
    }));
  }

  /**
   * Get a specific template by ID
   */
  getTemplate(templateId) {
    const template = this.templates[templateId];
    if (!template) {
      throw new Error(`Template with ID '${templateId}' not found`);
    }
    return template;
  }

  /**
   * Generate a customized proposal from template
   */
  generateProposal(templateId, customizations = {}) {
    const template = this.getTemplate(templateId);
    
    // Create base proposal structure
    const proposal = {
      template_id: templateId,
      template_name: template.name,
      generated_at: new Date().toISOString(),
      sections: []
    };

    // Generate each section
    template.sections.forEach(section => {
      const customSection = customizations.sections?.[section.id] || {};
      
      proposal.sections.push({
        id: section.id,
        title: section.title,
        required: section.required,
        max_words: section.max_words,
        content: this.customizeSection(section.template, customizations),
        word_count: this.countWords(section.template),
        status: 'template', // 'template', 'customized', 'completed'
        ...customSection
      });
    });

    return proposal;
  }

  /**
   * Customize a section template with user data
   */
  customizeSection(template, customizations) {
    let customized = template;

    // Replace common placeholders
    const replacements = {
      '[Company Name]': customizations.company_name || '[Company Name]',
      '[Principal Investigator]': customizations.pi_name || '[Principal Investigator]',
      '[Project Title]': customizations.project_title || '[Project Title]',
      '[Year]': new Date().getFullYear().toString(),
      ...customizations.replacements
    };

    Object.entries(replacements).forEach(([placeholder, value]) => {
      customized = customized.replace(new RegExp(placeholder, 'g'), value);
    });

    return customized;
  }

  /**
   * Count words in text
   */
  countWords(text) {
    return text.trim().split(/\s+/).length;
  }

  /**
   * Get template recommendations based on grant details
   */
  getRecommendations(grantDetails) {
    const recommendations = [];

    // SBIR/STTR detection
    if (grantDetails.program?.toLowerCase().includes('sbir')) {
      if (grantDetails.program.toLowerCase().includes('phase i')) {
        recommendations.push({
          template_id: 'sbir-phase-1',
          confidence: 0.95,
          reason: 'Grant program matches SBIR Phase I'
        });
      } else if (grantDetails.program.toLowerCase().includes('phase ii')) {
        recommendations.push({
          template_id: 'sbir-phase-2',
          confidence: 0.95,
          reason: 'Grant program matches SBIR Phase II'
        });
      }
    }

    if (grantDetails.program?.toLowerCase().includes('sttr')) {
      recommendations.push({
        template_id: 'sttr-phase-1',
        confidence: 0.90,
        reason: 'Grant program matches STTR requirements'
      });
    }

    // Agency-based recommendations
    if (grantDetails.agency?.toLowerCase().includes('national science foundation') ||
        grantDetails.agency?.toLowerCase().includes('nsf')) {
      recommendations.push({
        template_id: 'nsf-general',
        confidence: 0.85,
        reason: 'Grant agency matches NSF requirements'
      });
    }

    // Sort by confidence
    return recommendations.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Validate proposal section against requirements
   */
  validateSection(sectionContent, requirements) {
    const validation = {
      valid: true,
      warnings: [],
      errors: []
    };

    if (requirements.max_words) {
      const wordCount = this.countWords(sectionContent);
      if (wordCount > requirements.max_words) {
        validation.errors.push(`Section exceeds word limit: ${wordCount}/${requirements.max_words} words`);
        validation.valid = false;
      } else if (wordCount > requirements.max_words * 0.9) {
        validation.warnings.push(`Section is close to word limit: ${wordCount}/${requirements.max_words} words`);
      }
    }

    if (requirements.required && sectionContent.trim().length === 0) {
      validation.errors.push('Required section is empty');
      validation.valid = false;
    }

    return validation;
  }
}

export default TemplateService;