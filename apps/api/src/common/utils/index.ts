import { User, CompanyProfile } from '@prisma/client';
import { ForbiddenException } from '@nestjs/common';

type UserWithCompany = User & { companyProfile?: CompanyProfile | null };

export function sanitizeUser(user: UserWithCompany) {
  const { passwordHash: _passwordHash, googleId: _googleId, ...rest } = user as UserWithCompany & {
    googleId?: string | null;
  };
  return rest;
}

/** Blocks shopping for company accounts that are still pending or were rejected. */
export function assertCompanyCanShop(user: UserWithCompany | null | undefined) {
  if (!user || user.role !== 'company') return;
  const status = user.companyProfile?.status;
  if (status === 'approved') return;
  if (status === 'rejected') {
    throw new ForbiddenException(
      'Your wholesale application was not approved. Contact the store for help.',
    );
  }
  throw new ForbiddenException(
    'Your wholesale account is pending admin approval. You can shop once it is approved.',
  );
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
