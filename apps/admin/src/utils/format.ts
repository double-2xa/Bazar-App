/** Lebanon admin formatting — TODO: make currency configurable via settings API */
export const ADMIN_LOCALE = 'en-LB';
export const ADMIN_TIMEZONE = 'Asia/Beirut';
/** USD is common in Lebanese retail; adapt to LBP when settings exist */
export const ADMIN_CURRENCY = 'USD';

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat(ADMIN_LOCALE, {
    style: 'currency',
    currency: ADMIN_CURRENCY,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(ADMIN_LOCALE, {
    timeZone: ADMIN_TIMEZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(ADMIN_LOCALE, {
    timeZone: ADMIN_TIMEZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function formatTodayLabel(date: Date = new Date()): string {
  return new Intl.DateTimeFormat(ADMIN_LOCALE, {
    timeZone: ADMIN_TIMEZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function formatShortDate(date: string): string {
  const d = new Date(`${date}T12:00:00`);
  return new Intl.DateTimeFormat(ADMIN_LOCALE, {
    timeZone: ADMIN_TIMEZONE,
    month: 'short',
    day: 'numeric',
  }).format(d);
}
