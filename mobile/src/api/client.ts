import { API_BASE_URL } from '../config';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string | null;

  constructor(message: string, status: number, code: string | null = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }

  /** True when the session is gone and the user has to sign in again. */
  get isAuthError() {
    return this.status === 401 || this.status === 403;
  }
}

type TokenProvider = () => string | null;
type UnauthorizedHandler = () => void | Promise<void>;

let getAccessToken: TokenProvider = () => null;
let onUnauthorized: UnauthorizedHandler = () => {};

/** Wired up once by the auth store so requests can attach the current token. */
export function configureApiAuth(provider: TokenProvider, handler: UnauthorizedHandler) {
  getAccessToken = provider;
  onUnauthorized = handler;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  /** Attach the stored access token. */
  auth?: boolean;
  signal?: AbortSignal;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 30_000;
/** Proposal generation calls a model and is legitimately slow. */
export const LONG_TIMEOUT_MS = 120_000;

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = false, signal, timeoutMs = DEFAULT_TIMEOUT_MS } = options;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  if (auth) {
    const token = getAccessToken();
    if (!token) {
      throw new ApiError('You need to sign in to do that.', 401, 'NO_TOKEN');
    }
    headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const abortFromCaller = () => controller.abort();
  signal?.addEventListener('abort', abortFromCaller);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    if (signal?.aborted) throw err;
    if (controller.signal.aborted) {
      throw new ApiError('That request took too long. Please try again.', 408, 'TIMEOUT');
    }
    throw new ApiError(
      'Cannot reach the VoidCat service. Check your connection and try again.',
      0,
      'NETWORK_ERROR',
    );
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abortFromCaller);
  }

  const raw = await response.text();
  let payload: any = null;
  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      // Non-JSON body (a proxy or edge error page) — fall through to the status check.
    }
  }

  if (!response.ok || payload?.success === false) {
    const message =
      payload?.error ?? payload?.message ?? `Request failed (${response.status}).`;
    const error = new ApiError(message, response.status, payload?.code ?? null);
    if (error.isAuthError && auth) await onUnauthorized();
    throw error;
  }

  return payload as T;
}
