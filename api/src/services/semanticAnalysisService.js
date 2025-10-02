// Semantic Analysis Service for VoidCat Grant Automation Platform
// Analyzes company capabilities vs. solicitation requirements with real-time matching scores

export class SemanticAnalysisService {
  constructor(config = {}) {
    this.config = config;
    this.technicalDomains = this.initializeTechnicalDomains();
  }

  /**
   * Initialize technical domain mappings for semantic analysis
   * @returns {Object} Technical domain keywords and relationships
   */
  initializeTechnicalDomains() {
    return {
      'artificial_intelligence': {
        keywords: ['ai', 'artificial intelligence', 'machine learning', 'ml', 'deep learning', 'neural networks', 
                   'natural language processing', 'nlp', 'computer vision', 'reinforcement learning'],
        related_domains: ['data_science', 'robotics', 'automation'],
        weight: 1.0
      },
      'cybersecurity': {
        keywords: ['cybersecurity', 'security', 'encryption', 'cryptography', 'threat detection', 
                   'vulnerability', 'intrusion detection', 'malware', 'zero-trust'],
        related_domains: ['networking', 'data_protection'],
        weight: 1.0
      },
      'autonomous_systems': {
        keywords: ['autonomous', 'self-driving', 'unmanned', 'uav', 'robotics', 'autonomous vehicles',
                   'drone', 'automated systems', 'autonomous navigation'],
        related_domains: ['artificial_intelligence', 'sensors'],
        weight: 0.95
      },
      'quantum_computing': {
        keywords: ['quantum', 'quantum computing', 'quantum algorithms', 'quantum cryptography',
                   'quantum sensing', 'qubit', 'superposition'],
        related_domains: ['cryptography', 'advanced_computing'],
        weight: 0.95
      },
      'biotechnology': {
        keywords: ['biotech', 'biotechnology', 'genomics', 'crispr', 'gene editing', 'synthetic biology',
                   'bioinformatics', 'personalized medicine', 'drug discovery'],
        related_domains: ['healthcare', 'data_science'],
        weight: 0.9
      },
      'space_technology': {
        keywords: ['space', 'satellite', 'orbital', 'spacecraft', 'rocket', 'propulsion',
                   'space exploration', 'extraterrestrial', 'astrophysics'],
        related_domains: ['aerospace', 'communications'],
        weight: 0.9
      },
      'renewable_energy': {
        keywords: ['renewable', 'solar', 'wind', 'energy storage', 'battery', 'grid modernization',
                   'clean energy', 'sustainable', 'photovoltaic', 'hydrogen'],
        related_domains: ['energy', 'climate'],
        weight: 0.85
      },
      'advanced_materials': {
        keywords: ['materials science', 'nanotechnology', 'composites', 'metamaterials',
                   'graphene', 'advanced manufacturing', '3d printing', 'additive manufacturing'],
        related_domains: ['manufacturing', 'chemistry'],
        weight: 0.85
      },
      'healthcare_technology': {
        keywords: ['medical devices', 'diagnostic', 'telemedicine', 'health monitoring',
                   'medical imaging', 'wearable', 'digital health', 'precision medicine'],
        related_domains: ['biotechnology', 'artificial_intelligence'],
        weight: 0.85
      },
      'networking': {
        keywords: ['5g', '6g', 'network', 'telecommunications', 'wireless', 'fiber optic',
                   'edge computing', 'cloud', 'distributed systems'],
        related_domains: ['communications', 'cybersecurity'],
        weight: 0.8
      }
    };
  }

  /**
   * Calculate comprehensive matching score between company and grant
   * @param {Object} companyProfile - Company capabilities and expertise
   * @param {Object} grantDetails - Grant solicitation details
   * @returns {Object} Detailed matching analysis with score 0-100
   */
  calculateMatchingScore(companyProfile, grantDetails) {
    const analysis = {
      overall_score: 0,
      technical_alignment: 0,
      domain_match: 0,
      capability_match: 0,
      experience_match: 0,
      detailed_breakdown: {},
      recommendations: []
    };

    // Extract and normalize text for comparison
    const companyText = this.normalizeText([
      companyProfile.description || '',
      companyProfile.expertise || '',
      (companyProfile.capabilities || []).join(' '),
      (companyProfile.technologies || []).join(' '),
      (companyProfile.past_projects || []).join(' ')
    ].join(' '));

    const grantText = this.normalizeText([
      grantDetails.title || '',
      grantDetails.description || '',
      (grantDetails.focus_areas || []).join(' '),
      (grantDetails.technical_requirements || []).join(' ')
    ].join(' '));

    // 1. Technical Domain Alignment (40% weight)
    const domainAnalysis = this.analyzeDomainAlignment(companyText, grantText);
    analysis.technical_alignment = domainAnalysis.score;
    analysis.detailed_breakdown.domain_alignment = domainAnalysis.details;

    // 2. Capability Matching (30% weight)
    const capabilityAnalysis = this.analyzeCapabilityMatch(companyProfile, grantDetails);
    analysis.capability_match = capabilityAnalysis.score;
    analysis.detailed_breakdown.capability_match = capabilityAnalysis.details;

    // 3. Experience Level (20% weight)
    const experienceAnalysis = this.analyzeExperienceLevel(companyProfile, grantDetails);
    analysis.experience_match = experienceAnalysis.score;
    analysis.detailed_breakdown.experience_level = experienceAnalysis.details;

    // 4. Domain-specific keywords (10% weight)
    const keywordAnalysis = this.analyzeKeywordAlignment(companyText, grantText);
    analysis.detailed_breakdown.keyword_alignment = keywordAnalysis.details;

    // Calculate weighted overall score (0-100 scale)
    analysis.overall_score = Math.round(
      (analysis.technical_alignment * 0.40) +
      (analysis.capability_match * 0.30) +
      (analysis.experience_match * 0.20) +
      (keywordAnalysis.score * 0.10)
    );

    // Generate recommendations
    analysis.recommendations = this.generateRecommendations(analysis, companyProfile, grantDetails);

    // Add confidence level
    analysis.confidence_level = this.calculateConfidenceLevel(analysis);

    return analysis;
  }

  /**
   * Analyze domain alignment between company and grant
   * @param {string} companyText - Normalized company text
   * @param {string} grantText - Normalized grant text
   * @returns {Object} Domain alignment analysis
   */
  analyzeDomainAlignment(companyText, grantText) {
    const matches = [];
    let totalScore = 0;
    let maxPossibleScore = 0;

    Object.entries(this.technicalDomains).forEach(([domain, config]) => {
      const companyDomainScore = this.calculateDomainPresence(companyText, config.keywords);
      const grantDomainScore = this.calculateDomainPresence(grantText, config.keywords);
      
      maxPossibleScore += 100 * config.weight;

      if (companyDomainScore > 0 && grantDomainScore > 0) {
        const alignmentScore = Math.min(companyDomainScore, grantDomainScore) * config.weight;
        totalScore += alignmentScore;
        matches.push({
          domain,
          company_strength: companyDomainScore,
          grant_requirement: grantDomainScore,
          alignment_score: alignmentScore
        });
      }
    });

    const normalizedScore = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;

    return {
      score: Math.min(100, normalizedScore),
      details: {
        matched_domains: matches.length,
        top_matches: matches.sort((a, b) => b.alignment_score - a.alignment_score).slice(0, 5),
        total_domains_analyzed: Object.keys(this.technicalDomains).length
      }
    };
  }

  /**
   * Calculate domain presence in text
   * @param {string} text - Text to analyze
   * @param {Array} keywords - Keywords to search for
   * @returns {number} Presence score 0-100
   */
  calculateDomainPresence(text, keywords) {
    let matches = 0;
    keywords.forEach(keyword => {
      if (text.includes(keyword.toLowerCase())) {
        matches++;
      }
    });
    return Math.min(100, (matches / keywords.length) * 100);
  }

  /**
   * Analyze capability matching
   * @param {Object} companyProfile - Company profile
   * @param {Object} grantDetails - Grant details
   * @returns {Object} Capability analysis
   */
  analyzeCapabilityMatch(companyProfile, grantDetails) {
    const companyCapabilities = companyProfile.capabilities || [];
    const requiredCapabilities = grantDetails.required_capabilities || [];
    const preferredCapabilities = grantDetails.preferred_capabilities || [];

    let score = 0;
    const matches = { required: [], preferred: [], missing: [] };

    // Check required capabilities (critical)
    requiredCapabilities.forEach(req => {
      const match = companyCapabilities.find(cap => 
        this.normalizeText(cap).includes(this.normalizeText(req)) ||
        this.normalizeText(req).includes(this.normalizeText(cap))
      );
      if (match) {
        matches.required.push({ requirement: req, capability: match });
        score += 60 / requiredCapabilities.length; // Required caps worth 60%
      } else {
        matches.missing.push(req);
      }
    });

    // Check preferred capabilities (bonus)
    preferredCapabilities.forEach(pref => {
      const match = companyCapabilities.find(cap => 
        this.normalizeText(cap).includes(this.normalizeText(pref)) ||
        this.normalizeText(pref).includes(this.normalizeText(cap))
      );
      if (match) {
        matches.preferred.push({ preference: pref, capability: match });
        score += 40 / (preferredCapabilities.length || 1); // Preferred caps worth 40%
      }
    });

    return {
      score: Math.min(100, score),
      details: {
        required_matches: matches.required,
        preferred_matches: matches.preferred,
        missing_capabilities: matches.missing,
        match_rate: requiredCapabilities.length > 0 
          ? (matches.required.length / requiredCapabilities.length) * 100 
          : 100
      }
    };
  }

  /**
   * Analyze experience level alignment
   * @param {Object} companyProfile - Company profile
   * @param {Object} grantDetails - Grant details
   * @returns {Object} Experience analysis
   */
  analyzeExperienceLevel(companyProfile, grantDetails) {
    let score = 0;
    const details = {};

    // Check company size alignment
    const companySize = companyProfile.employee_count || 0;
    const requiredSize = grantDetails.size_requirements || {};
    
    if (requiredSize.max && companySize <= requiredSize.max) {
      score += 25;
      details.size_compliant = true;
    } else if (requiredSize.max && companySize > requiredSize.max) {
      details.size_compliant = false;
      details.size_issue = `Company size ${companySize} exceeds maximum ${requiredSize.max}`;
    } else {
      score += 25;
      details.size_compliant = true;
    }

    // Check years of experience
    const yearsInBusiness = companyProfile.years_in_business || 0;
    const requiredExperience = grantDetails.minimum_experience_years || 0;
    
    if (yearsInBusiness >= requiredExperience) {
      score += 25;
      details.experience_sufficient = true;
    } else {
      details.experience_sufficient = false;
      details.experience_gap = requiredExperience - yearsInBusiness;
    }

    // Check past project relevance
    const pastProjects = companyProfile.past_projects || [];
    const relevantProjects = pastProjects.filter(project => {
      const projectText = this.normalizeText(project);
      const grantText = this.normalizeText(grantDetails.title + ' ' + grantDetails.description);
      return this.calculateTextSimilarity(projectText, grantText) > 0.3;
    });

    score += Math.min(25, (relevantProjects.length / Math.max(pastProjects.length, 1)) * 25);
    details.relevant_past_projects = relevantProjects.length;

    // Check certifications and credentials
    const certifications = companyProfile.certifications || [];
    const requiredCerts = grantDetails.required_certifications || [];
    const matchedCerts = certifications.filter(cert => 
      requiredCerts.some(req => this.normalizeText(cert).includes(this.normalizeText(req)))
    );

    score += Math.min(25, (matchedCerts.length / Math.max(requiredCerts.length, 1)) * 25);
    details.certification_match_rate = requiredCerts.length > 0 
      ? (matchedCerts.length / requiredCerts.length) * 100 
      : 100;

    return {
      score: Math.round(score),
      details
    };
  }

  /**
   * Analyze keyword alignment
   * @param {string} companyText - Company text
   * @param {string} grantText - Grant text
   * @returns {Object} Keyword analysis
   */
  analyzeKeywordAlignment(companyText, grantText) {
    const grantWords = grantText.split(/\s+/).filter(word => word.length > 4);
    const uniqueGrantWords = [...new Set(grantWords)];
    
    let matches = 0;
    uniqueGrantWords.forEach(word => {
      if (companyText.includes(word)) {
        matches++;
      }
    });

    const score = uniqueGrantWords.length > 0 
      ? (matches / uniqueGrantWords.length) * 100 
      : 0;

    return {
      score: Math.round(score),
      details: {
        total_keywords: uniqueGrantWords.length,
        matched_keywords: matches,
        match_rate: score
      }
    };
  }

  /**
   * Calculate text similarity using simple word overlap
   * @param {string} text1 - First text
   * @param {string} text2 - Second text
   * @returns {number} Similarity score 0-1
   */
  calculateTextSimilarity(text1, text2) {
    const words1 = new Set(text1.split(/\s+/).filter(w => w.length > 3));
    const words2 = new Set(text2.split(/\s+/).filter(w => w.length > 3));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Normalize text for comparison
   * @param {string} text - Text to normalize
   * @returns {string} Normalized text
   */
  normalizeText(text) {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Generate recommendations based on analysis
   * @param {Object} analysis - Analysis results
   * @param {Object} companyProfile - Company profile
   * @param {Object} grantDetails - Grant details
   * @returns {Array} Recommendations
   */
  generateRecommendations(analysis, companyProfile, grantDetails) {
    const recommendations = [];

    if (analysis.overall_score >= 80) {
      recommendations.push({
        priority: 'high',
        type: 'action',
        message: 'Excellent match! Strong alignment across all criteria. Recommend immediate application.'
      });
    } else if (analysis.overall_score >= 60) {
      recommendations.push({
        priority: 'medium',
        type: 'action',
        message: 'Good match. Consider strengthening proposal in areas with lower alignment.'
      });
    } else if (analysis.overall_score >= 40) {
      recommendations.push({
        priority: 'low',
        type: 'consideration',
        message: 'Moderate match. Evaluate if partnership or capability building could improve alignment.'
      });
    } else {
      recommendations.push({
        priority: 'low',
        type: 'review',
        message: 'Low match. Consider focusing on better-aligned opportunities.'
      });
    }

    // Specific recommendations based on gaps
    if (analysis.capability_match < 50) {
      recommendations.push({
        priority: 'high',
        type: 'improvement',
        message: 'Critical capability gaps identified. Consider partnerships or subcontractors.'
      });
    }

    if (analysis.experience_match < 50) {
      recommendations.push({
        priority: 'medium',
        type: 'improvement',
        message: 'Experience requirements may be challenging. Highlight relevant achievements and expertise.'
      });
    }

    if (analysis.technical_alignment > 80) {
      recommendations.push({
        priority: 'high',
        type: 'strength',
        message: 'Excellent technical alignment. Emphasize technical capabilities in proposal.'
      });
    }

    return recommendations;
  }

  /**
   * Calculate confidence level for the matching score
   * @param {Object} analysis - Analysis results
   * @returns {string} Confidence level (high/medium/low)
   */
  calculateConfidenceLevel(analysis) {
    const factors = [
      analysis.technical_alignment,
      analysis.capability_match,
      analysis.experience_match
    ];

    const variance = this.calculateVariance(factors);
    
    if (variance < 100 && analysis.overall_score > 50) {
      return 'high';
    } else if (variance < 400) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Calculate variance of scores
   * @param {Array} values - Array of numeric values
   * @returns {number} Variance
   */
  calculateVariance(values) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  }
}

export default SemanticAnalysisService;
