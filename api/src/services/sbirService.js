// SBIR.gov Service - Small Business Innovation Research opportunities integration
// Fetches from SBIR.gov public APIs and transforms to internal grant format
// NO SIMULATIONS LAW: Real data from live APIs only

export class SbirService {
  constructor() {
    // SBIR.gov API endpoint (public access)
    this.apiBaseUrl = 'https://api.www.sbir.gov/public/api/solicitations';
  }

  /**
   * Search for SBIR/STTR opportunities
   * @param {string} query - Search query
   * @param {Object} telemetry - Telemetry service for tracking
   * @returns {Promise<Array>} Array of SBIR/STTR opportunities
   */
  async searchOpportunities(query, telemetry = null) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    // SBIR.gov public API with search parameters
    const searchUrl = `${this.apiBaseUrl}?keyword=${encodeURIComponent(query || 'technology')}&rows=50`;

    const started = Date.now();
    try {
      const res = await fetch(searchUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'VoidCat Grant Search API/1.0',
          'Accept': 'application/json'
        }
      });
      
      clearTimeout(timeoutId);

      if (!res.ok) {
        // SBIR API may return 404 or 503, return empty results
        console.warn(`SBIR.gov API returned ${res.status}: ${res.statusText}`);
        return [];
      }

      const data = await res.json();
      // SBIR API returns {result: [...], total: N} structure
      const opportunities = Array.isArray(data) ? data : (data.result || data.opportunities || []);

      if (!Array.isArray(opportunities)) {
        return [];
      }

      const transformed = this.transform(opportunities, query);

      if (telemetry && typeof telemetry.trackDataSourceFetch === 'function') {
        telemetry.trackDataSourceFetch('sbir.gov', true, Date.now() - started, transformed.length);
      }

      return transformed;

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (telemetry && typeof telemetry.trackDataSourceFetch === 'function') {
        telemetry.trackDataSourceFetch('sbir.gov', false, Date.now() - started, 0, error.message);
      }

      // Return empty array on error instead of throwing
      console.error(`SBIR.gov fetch failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Transform SBIR opportunities to internal grant format
   * @param {Array} opportunities - Raw opportunities from SBIR.gov
   * @param {string} query - Original search query
   * @returns {Array} Transformed grants
   */
  transform(opportunities, query) {
    return opportunities
      .filter(opp => opp && (opp.title || opp.solicitation_number || opp.solicitation_id))
      .map(opp => {
        const title = opp.title || opp.topic_title || 'SBIR/STTR Opportunity';
        const description = opp.description || opp.abstract || opp.topic_description || title;
        const agency = opp.agency || opp.agency_name || 'Federal Agency';
        const program = opp.program || opp.program_name || 'SBIR/STTR';

        // Determine opportunity type
        const opportunityType = this.determineOpportunityType(opp);

        return {
          id: opp.solicitation_number || opp.solicitation_id || opp.topic_id || `SBIR-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
          external_id: opp.solicitation_id || opp.topic_id,
          title,
          description,
          agency,
          agency_code: opp.agency_code || this.extractAgencyCode(agency),
          program,
          cfda_number: opp.cfda_number || null,
          opportunity_number: opp.solicitation_number || opp.topic_number,
          opportunity_type: opportunityType,
          status: this.mapStatus(opp.status || opp.solicitation_status),
          award_floor: opp.award_floor || opp.phase_1_award_amount || null,
          award_ceiling: opp.award_ceiling || opp.phase_2_award_amount || null,
          estimated_funding: opp.estimated_funding || null,
          post_date: opp.post_date || opp.open_date || new Date().toISOString(),
          deadline: opp.close_date || opp.deadline || null,
          close_date: opp.close_date || opp.deadline || null,
          archive_date: opp.archive_date || null,
          eligibility: this.formatEligibility(opp),
          applicant_types: ['Small Business'],
          funding_categories: this.extractCategories(opp),
          matching_score: this.calculateMatchingScore({ title, description, agency, program }, query),
          tags: this.extractTags(opp),
          keywords: this.extractKeywords(title, description),
          data_source: 'sbir.gov',
          funding_agency: agency,
          funding_agency_code: opp.agency_code || this.extractAgencyCode(agency)
        };
      });
  }

  /**
   * Determine if opportunity is SBIR or STTR
   */
  determineOpportunityType(opp) {
    const text = `${opp.title || ''} ${opp.program || ''} ${opp.topic_title || ''}`.toLowerCase();
    
    if (text.includes('sttr')) {
      return 'STTR';
    } else if (text.includes('sbir')) {
      return 'SBIR';
    }
    
    // Check program type field
    if (opp.program_type) {
      const programType = opp.program_type.toUpperCase();
      if (programType === 'STTR') return 'STTR';
      if (programType === 'SBIR') return 'SBIR';
    }
    
    return 'SBIR'; // Default to SBIR
  }

  /**
   * Map SBIR status to internal status
   */
  mapStatus(status) {
    if (!status) return 'active';
    const statusLower = status.toLowerCase();
    if (statusLower.includes('open') || statusLower.includes('active') || statusLower.includes('posted')) {
      return 'active';
    }
    if (statusLower.includes('closed') || statusLower.includes('archived')) {
      return 'closed';
    }
    return 'active';
  }

  /**
   * Format eligibility information for SBIR/STTR
   */
  formatEligibility(opp) {
    const type = this.determineOpportunityType(opp);
    if (type === 'STTR') {
      return 'Small businesses in partnership with research institutions (STTR requirements)';
    }
    return 'Small businesses with fewer than 500 employees (SBIR requirements)';
  }

  /**
   * Extract funding categories
   */
  extractCategories(opp) {
    const categories = [];
    
    if (opp.technical_area) categories.push(opp.technical_area);
    if (opp.topic_area) categories.push(opp.topic_area);
    if (opp.research_area) categories.push(opp.research_area);
    
    const type = this.determineOpportunityType(opp);
    categories.push(type);
    
    return categories.filter(Boolean);
  }

  /**
   * Extract tags from opportunity
   */
  extractTags(opp) {
    const tags = [];
    
    const type = this.determineOpportunityType(opp);
    tags.push(type);
    
    if (opp.agency_code) tags.push(opp.agency_code);
    if (opp.phase) tags.push(`Phase ${opp.phase}`);
    if (opp.technical_area) tags.push(opp.technical_area);
    
    return tags.filter(Boolean);
  }

  /**
   * Extract agency code from agency name
   */
  extractAgencyCode(agencyName) {
    if (!agencyName) return null;
    
    const agencyLower = agencyName.toLowerCase();
    
    // Common SBIR agencies
    if (agencyLower.includes('defense') || agencyLower.includes('dod')) return 'DOD';
    if (agencyLower.includes('energy') || agencyLower.includes('doe')) return 'DOE';
    if (agencyLower.includes('nasa')) return 'NASA';
    if (agencyLower.includes('nsf') || agencyLower.includes('science foundation')) return 'NSF';
    if (agencyLower.includes('nih') || agencyLower.includes('health')) return 'NIH';
    if (agencyLower.includes('agriculture') || agencyLower.includes('usda')) return 'USDA';
    if (agencyLower.includes('commerce') || agencyLower.includes('doc')) return 'DOC';
    if (agencyLower.includes('education') || agencyLower.includes('ed')) return 'ED';
    if (agencyLower.includes('homeland') || agencyLower.includes('dhs')) return 'DHS';
    if (agencyLower.includes('transportation') || agencyLower.includes('dot')) return 'DOT';
    if (agencyLower.includes('epa') || agencyLower.includes('environmental')) return 'EPA';
    
    return null;
  }

  /**
   * Extract keywords from text
   */
  extractKeywords(title, description) {
    const text = `${title} ${description}`.toLowerCase();
    const keywords = [];
    
    // SBIR/STTR relevant keywords
    const relevantTerms = [
      'sbir', 'sttr', 'small business', 'innovation', 'research',
      'technology', 'development', 'phase 1', 'phase 2', 'phase i', 'phase ii',
      'commercialization', 'prototype', 'advanced technology'
    ];

    for (const term of relevantTerms) {
      if (text.includes(term)) {
        keywords.push(term);
      }
    }

    return keywords;
  }

  /**
   * Calculate matching score for grant
   */
  calculateMatchingScore(grantLike, query) {
    if (!query || !query.trim()) return 0.6;
    
    const searchTerms = query.toLowerCase().split(' ').filter(Boolean);
    const text = `${grantLike.title || ''} ${grantLike.description || ''} ${grantLike.agency || ''} ${grantLike.program || ''}`.toLowerCase();
    
    let matches = 0;
    let totalScore = 0;
    
    for (const term of searchTerms) {
      if ((grantLike.title || '').toLowerCase().includes(term)) {
        matches++;
        totalScore += 0.4;
      } else if ((grantLike.description || '').toLowerCase().includes(term)) {
        matches++;
        totalScore += 0.3;
      } else if (text.includes(term)) {
        matches++;
        totalScore += 0.2;
      }
    }
    
    const base = matches / searchTerms.length;
    const weighted = totalScore / searchTerms.length;
    const finalScore = (base * 0.6) + (weighted * 0.4);
    
    return Math.min(0.9, Math.max(0.1, finalScore));
  }
}

export default SbirService;
