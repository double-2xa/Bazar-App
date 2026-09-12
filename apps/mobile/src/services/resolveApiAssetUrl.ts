import { getApiUrl } from './getApiUrl';

export function resolveApiAssetUrl(value?: string | null): string {
  if (!value) return '';
  if (!value.startsWith('/')) return value;
  try { return new URL(value, new URL(getApiUrl()).origin).toString(); } catch { return value; }
}
