import { LEBANON_MAP, LOW_STOCK_THRESHOLD } from '@doublea/shared';

const TZ = LEBANON_MAP.timezone;

/** Calendar date in Asia/Beirut (YYYY-MM-DD) */
export function getBeirutDateKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** Start of today in Asia/Beirut as a UTC Date */
export function getBeirutStartOfDay(reference = new Date()): Date {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });
  const parts = formatter.formatToParts(reference);
  const hour = parseInt(parts.find((p) => p.type === 'hour')!.value, 10);
  const minute = parseInt(parts.find((p) => p.type === 'minute')!.value, 10);
  const second = parseInt(parts.find((p) => p.type === 'second')!.value, 10);
  return new Date(
    reference.getTime() -
      ((hour * 3600 + minute * 60 + second) * 1000 + reference.getMilliseconds()),
  );
}

export function getBeirutDaysAgoStart(daysAgo: number, reference = new Date()): Date {
  const start = getBeirutStartOfDay(reference);
  return new Date(start.getTime() - daysAgo * 24 * 60 * 60 * 1000);
}

export function emptyStatusBreakdown() {
  return {
    pending: 0,
    confirmed: 0,
    assigned: 0,
    accepted: 0,
    picked_up: 0,
    on_the_way: 0,
    delivered: 0,
    cancelled: 0,
  };
}

export { LOW_STOCK_THRESHOLD };
