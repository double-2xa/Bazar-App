import type { UserPublic } from '@doublea/shared';

/** Company accounts that are not yet approved cannot use the shop. */
export function isCompanyAwaitingAccess(user: UserPublic | null | undefined): boolean {
  if (!user || user.role !== 'company') return false;
  return user.companyProfile?.status !== 'approved';
}

export function isCompanyApproved(user: UserPublic | null | undefined): boolean {
  return user?.role === 'company' && user.companyProfile?.status === 'approved';
}
