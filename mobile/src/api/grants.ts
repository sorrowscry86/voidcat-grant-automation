import { LONG_TIMEOUT_MS, request } from './client';
import type {
  CompanyProfile,
  Grant,
  GrantSearchResponse,
  ProposalResponse,
} from './types';

export interface SearchParams {
  query?: string;
  agency?: string;
}

/**
 * The API rejects queries containing anything outside this set, so trim the
 * input here rather than round-tripping to a 400.
 */
export function sanitizeQuery(query: string) {
  return query.replace(/[^a-zA-Z0-9\s,.-]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function searchGrants(params: SearchParams, signal?: AbortSignal) {
  const search = new URLSearchParams();
  if (params.query) search.set('query', params.query);
  if (params.agency) search.set('agency', params.agency);

  const qs = search.toString();
  return request<GrantSearchResponse>(`/api/grants/search${qs ? `?${qs}` : ''}`, { signal });
}

/**
 * Generates a proposal for a grant.
 *
 * The API has no grant-detail endpoint — `GET /api/grants/:id` deliberately
 * returns 404 — so the full grant record from the search result has to be sent
 * along with the request.
 */
export function generateProposal(grant: Grant, profile: CompanyProfile) {
  return request<ProposalResponse>('/api/grants/generate-ai-proposal', {
    method: 'POST',
    auth: true,
    timeoutMs: LONG_TIMEOUT_MS,
    body: {
      grant_id: grant.id,
      grant_title: grant.title,
      grant_agency: grant.agency,
      grant_program: grant.program,
      grant_description: grant.description,
      grant_amount: grant.amount,
      grant_deadline: grant.deadline,
      company_profile: profile,
    },
  });
}
