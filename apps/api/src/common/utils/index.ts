import { User, CompanyProfile } from '@prisma/client';

type UserWithCompany = User & { companyProfile?: CompanyProfile | null };

export function sanitizeUser(user: UserWithCompany) {
  const { passwordHash, ...rest } = user;
  return rest;
}

export function decimalToNumber(value: { toNumber?: () => number } | number | string): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseFloat(value);
  if (value && typeof value.toNumber === 'function') return value.toNumber();
  return Number(value);
}

export function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `DA-${timestamp}-${random}`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
