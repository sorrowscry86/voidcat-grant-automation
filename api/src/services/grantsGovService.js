// Grants.gov Service - Federal grant opportunities integration
// Fetches from Grants.gov public APIs and transforms to internal grant format
// NO SIMULATIONS LAW: Real data from live APIs only

export class GrantsGovService {
  constructor() {
    // Grants.gov API endpoint (public access)
    this.apiBaseUrl = 'https://www.grants.gov/grantsws/rest/opportunities/search';
  }

  /**
   * Search for grants on Grants.gov
   * @param {string} query - Search query
   * @param {Object} telemetry - Telemetry service for tracking
   * @returns {Promise<Array>} Array of grant opportunities
   */
  async searchGrants(query, telemetry = null) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    // Grants.gov public search endpoint
    const searchUrl = `${this.apiBaseUrl}?keyword=${encodeURIComponent(query || 'technology')}`;

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
        // Grants.gov API may return 404 or 503, return empty results
        console.warn(`Grants.gov API returned ${res.status}: ${res.statusText}`);
        return [];
      }

      const data = await res.json();
      const opportunities = data.opportunitySearchResult?.opportunities || [];
      
      if (!Array.isArray(opportunities)) {
        return [];
      }

      const transformed = this.transform(opportunities, query);

      if (telemetry && typeof telemetry.trackDataSourceFetch === 'function') {
        telemetry.trackDataSourceFetch('grants.gov', true, Date.now() - started, transformed.length);
      }

      return transformed;

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (telemetry && typeof telemetry.trackDataSourceFetch === 'function') {
        telemetry.trackDataSourceFetch('grants.gov', false, Date.now() - started, 0, error.message);
      }

      // Return empty array on error instead of throwing
      console.error(`Grants.gov fetch failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Transform Grants.gov opportunities to internal grant format
   * @param {Array} opportunities - Raw opportunities from Grants.gov
   * @param {string} query - Original search query
   * @returns {Array} Transformed grants
   */
  transform(opportunities, query) {
    return opportunities
      .filter(opp => opp && (opp.opportunityTitle || opp.opportunityNumber))
      .map(opp => {
        const title = opp.opportunityTitle || 'Grant Opportunity';
        const description = opp.synopsis || opp.description || title;
        const agency = opp.agencyName || opp.fundingInstrumentType || 'Federal Agency';
        const program = opp.programName || opp.opportunityCategory || null;

        return {
          id: opp.opportunityNumber || `GRANTS-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
          external_id: opp.opportunityNumber,
          title,
          description,
          agency,
          agency_code: opp.agencyCode || null,
          program,
          cfda_number: opp.cfdaNumber || opp.cfdaNumbers?.[0] || null,
          opportunity_number: opp.opportunityNumber,
          opportunity_type: opp.opportunityType || 'Grant',
          status: this.mapStatus(opp.opportunityStatus),
          award_floor: opp.awardFloor ? Math.round(opp.awardFloor) : null,
          award_ceiling: opp.awardCeiling ? Math.round(opp.awardCeiling) : null,
          estimated_funding: opp.estimatedTotalProgramFunding ? Math.round(opp.estimatedTotalProgramFunding) : null,
          post_date: opp.postDate || new Date().toISOString(),
          deadline: opp.closeDate || opp.applicationDeadline || null,
          close_date: opp.closeDate || opp.applicationDeadline || null,
          archive_date: opp.archiveDate || null,
          eligibility: this.formatEligibility(opp.eligibleApplicants),
          applicant_types: opp.eligibleApplicants || [],
          funding_categories: opp.categories || [],
          matching_score: this.calculateMatchingScore({ title, description, agency, program }, query),
          tags: this.extractTags(opp),
          keywords: this.extractKeywords(title, description),
          data_source: 'grants.gov',
          funding_agency: agency,
          funding_agency_code: opp.agencyCode || null
        };
      });
  }

  /**
   * Map Grants.gov status to internal status
   */
  mapStatus(status) {
    if (!status) return 'active';
    const statusLower = status.toLowerCase();
    if (statusLower.includes('posted') || statusLower.includes('open')) return 'active';
    if (statusLower.includes('closed') || statusLower.includes('archived')) return 'closed';
    return 'active';
  }

  /**
   * Format eligibility information
   */
  formatEligibility(eligibleApplicants) {
    if (!eligibleApplicants || !Array.isArray(eligibleApplicants)) {
      return 'See opportunity details for eligibility requirements';
    }
    return `Eligible applicants: ${eligibleApplicants.join(', ')}`;
  }

  /**
   * Extract tags from opportunity
   */
  extractTags(opp) {
    const tags = [];
    if (opp.opportunityCategory) tags.push(opp.opportunityCategory);
    if (opp.fundingInstrumentType) tags.push(opp.fundingInstrumentType);
    if (opp.agencyCode) tags.push(opp.agencyCode);
    return tags.filter(Boolean);
  }

  /**
   * Extract keywords from text
   */
  extractKeywords(title, description) {
    const text = `${title} ${description}`.toLowerCase();
    const keywords = [];
    
    // Common federal grant keywords
    const relevantTerms = [
      'research', 'technology', 'innovation', 'development', 'education',
      'health', 'science', 'environment', 'energy', 'infrastructure',
      'small business', 'sbir', 'sttr', 'cooperative agreement'
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

export default GrantsGovService;
