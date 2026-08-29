import { request } from './client';
import type { AuthResponse, AuthTokens, User } from './types';

export function login(email: string, password: string) {
  return request<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  });
}

export function register(input: {
  email: string;
  password: string;
  name: string;
  company?: string;
}) {
  return request<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: input,
  });
}

export function refresh(refreshToken: string) {
  return request<AuthTokens & { success: true }>('/api/auth/refresh', {
    method: 'POST',
    body: { refresh_token: refreshToken },
  });
}

export function me() {
  return request<{ success: true; user: User }>('/api/auth/me', { auth: true });
}

/**
 * Permanently deletes the signed-in user's account.
 * App Store Review Guideline 5.1.1(v) requires this to be reachable in-app.
 */
export function deleteAccount(confirmEmail: string) {
  return request<{ success: true; message: string }>('/api/auth/delete-account', {
    method: 'POST',
    auth: true,
    body: { confirm_email: confirmEmail },
  });
}
