import { getApiUrl } from './getApiUrl';

function isLoopbackHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '0.0.0.0';
}

/**
 * Resolve product/category image paths for the current client.
 * Relative `/api/uploads/...` paths are joined to the active API origin.
 * Loopback absolute URLs (saved from local admin) are rewritten to that origin
 * so a physical phone does not try to load images from itself.
 */
export function resolveApiAssetUrl(value?: string | null): string {
  if (!value) return '';

  try {
    const apiOrigin = new URL(getApiUrl()).origin;

    if (value.startsWith('/')) {
      return new URL(value, apiOrigin).toString();
    }

    const absolute = new URL(value);
    if (isLoopbackHost(absolute.hostname)) {
      return new URL(`${absolute.pathname}${absolute.search}${absolute.hash}`, apiOrigin).toString();
    }

    return absolute.toString();
  } catch {
    return value;
  }
}
