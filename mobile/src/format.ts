import type { Grant } from './api/types';

/** The API sends a pre-formatted `amount`; fall back to the numeric ceiling. */
export function formatAmount(grant: Pick<Grant, 'amount' | 'award_ceiling'>): string | null {
  if (grant.amount) return grant.amount;
  if (typeof grant.award_ceiling === 'number') {
    return `$${grant.award_ceiling.toLocaleString('en-US')}`;
  }
  return null;
}

export function formatDeadline(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Negative when the deadline has passed. */
export function daysUntil(value?: string | null): number | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.ceil((date.getTime() - Date.now()) / msPerDay);
}

export function deadlineLabel(value?: string | null): { text: string; tone: 'normal' | 'warning' | 'danger' } | null {
  const formatted = formatDeadline(value);
  if (!formatted) return null;
  const days = daysUntil(value);
  if (days === null) return { text: formatted, tone: 'normal' };
  if (days < 0) return { text: `Closed ${formatted}`, tone: 'danger' };
  if (days === 0) return { text: 'Closes today', tone: 'danger' };
  if (days <= 14) return { text: `${days} day${days === 1 ? '' : 's'} left`, tone: 'warning' };
  return { text: `Due ${formatted}`, tone: 'normal' };
}
