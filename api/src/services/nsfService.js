// NSF Service - real awards API integration (NO SIMULATIONS)
// Fetches from https://api.nsf.gov/services/v1/awards.json and transforms to internal grant format

export default class NsfService {
  constructor() {}

  async searchAwards(query, agencyFilter, telemetry = null) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const url = `https://api.nsf.gov/services/v1/awards.json?keyword=${encodeURIComponent(query || "")}\u0026printFields=award\u005BawardID,title,abstractText,agency,awardEffectiveDate,expirationDate,fundsObligatedAmt,programElement\u005D`;

    const started = Date.now();
    try {
      const res = await fetch(url, { method: 'GET', signal: controller.signal, headers: { 'User-Agent': 'VoidCat Grant Search API/1.0', 'Accept': 'application/json' } });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`NSF API returned ${res.status}: ${res.statusText}`);
      }

      const json = await res.json();
      const items = (json.response && json.response.award) ? json.response.award : [];
      if (!Array.isArray(items)) {
        return { grants: [], source: 'nsf.gov-awards', raw_count: 0 };
      }

      const transformed = this.transform(items, query, agencyFilter);

      if (telemetry && typeof telemetry.trackDataSourceFetch === 'function') {
        telemetry.trackDataSourceFetch('nsf.gov-awards', true, Date.now() - started, transformed.length);
      }

      return { grants: transformed, source: 'nsf.gov-awards', raw_count: items.length };
    } catch (error) {
      clearTimeout(timeoutId);
      if (telemetry && typeof telemetry.trackDataSourceFetch === 'function') {
        telemetry.trackDataSourceFetch('nsf.gov-awards', false, Date.now() - started, 0, error.message);
      }
      throw new Error(`NSF awards fetch failed: ${error.message}`);
    }
  }

  transform(awards, query, agencyFilter) {
    const agencyFilterLc = (agencyFilter || '').toLowerCase();
    return awards
      .filter(a => {
        // Basic validation
        if (!a || (!a.title && !a.awardID)) return false;
        // Optional agency filter: NSF only; allow if filter includes nsf
        if (agencyFilterLc && !'national science foundation'.includes(agencyFilterLc) && !'nsf'.includes(agencyFilterLc)) {
          return false;
        }
        return true;
      })
      .map(a => {
        const title = a.title || 'NSF Award';
        const abstractText = a.abstractText || title;
        const programTags = this.extractProgramTags(a);
        const amountStr = this.formatAmount(a.fundsObligatedAmt);
        const deadline = a.expirationDate || a.awardEffectiveDate || '2025-12-31';
        const grantObj = {
          id: a.awardID || `NSF-${Date.now()}-${Math.random().toString(36).slice(2,10)}`,
          title,
          agency: 'National Science Foundation',
          program: programTags[0] || 'NSF Program',
          deadline,
          amount: amountStr,
          description: abstractText,
          eligibility: 'See NSF opportunity details',
          matching_score: this.calculateMatchingScore({ title, description: abstractText, agency: 'National Science Foundation', program: programTags.join(' ') }, query),
          tags: programTags,
          data_source: 'nsf.gov-awards',
          opportunity_type: 'Award (historical)',
          funding_agency_code: 'NSF',
          cfda_number: '47.070'
        };
        return grantObj;
      });
  }

  extractProgramTags(a) {
    const tags = [];
    const pe = a.programElement;
    if (Array.isArray(pe)) {
      for (const el of pe) {
        const t = (el && (el.text || el.programElementText)) || '';
        if (t) tags.push(String(t));
      }
    } else if (pe) {
      const t = (pe.text || pe.programElementText);
      if (t) tags.push(String(t));
    }
    return tags.filter(Boolean);
  }

  formatAmount(v) {
    if (!v && v !== 0) return 'Amount TBD';
    const n = Number(v);
    if (!isNaN(n)) return `$${n.toLocaleString()}`;
    return String(v);
  }

  calculateMatchingScore(grantLike, query) {
    if (!query || !query.trim()) return 0.6;
    const searchTerms = query.toLowerCase().split(' ').filter(Boolean);
    const text = `${grantLike.title || ''} ${grantLike.description || ''} ${grantLike.agency || ''} ${grantLike.program || ''}`.toLowerCase();
    let matches = 0; let totalScore = 0;
    for (const term of searchTerms) {
      if ((grantLike.title || '').toLowerCase().includes(term)) { matches++; totalScore += 0.4; }
      else if ((grantLike.description || '').toLowerCase().includes(term)) { matches++; totalScore += 0.3; }
      else if (text.includes(term)) { matches++; totalScore += 0.2; }
    }
    const base = matches / searchTerms.length;
    const weighted = totalScore / searchTerms.length;
    const finalScore = (base * 0.6) + (weighted * 0.4);
    return Math.min(0.9, Math.max(0.1, finalScore));
  }
}