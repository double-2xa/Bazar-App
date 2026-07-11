import { BadRequestException } from '@nestjs/common';
import { ADMIN_ORDER_TRANSITIONS } from '@doublea/shared';

const TERMINAL_STATUSES = ['delivered', 'cancelled'] as const;

/** Statuses from which admin may assign or reassign a driver */
export const ASSIGNABLE_STATUSES = ['pending', 'confirmed', 'assigned', 'accepted'] as const;

/** Statuses from which driver or admin may unassign/reject back to confirmed */
export const UNASSIGNABLE_STATUSES = ['assigned', 'accepted'] as const;

export function assertNotTerminal(status: string, action: string) {
  if (TERMINAL_STATUSES.includes(status as (typeof TERMINAL_STATUSES)[number])) {
    throw new BadRequestException(`Cannot ${action} on ${status} orders`);
  }
}

export function assertAdminStatusTransition(current: string, next: string) {
  if (next === 'delivered') {
    throw new BadRequestException(
      'Delivered status requires driver completion with delivery proof',
    );
  }

  const allowed = ADMIN_ORDER_TRANSITIONS[current] ?? [];
  if (!allowed.includes(next)) {
    throw new BadRequestException(
      `Cannot change order status from '${current}' to '${next}'`,
    );
  }
}

export function assertAssignFromStatus(status: string) {
  if (!ASSIGNABLE_STATUSES.includes(status as (typeof ASSIGNABLE_STATUSES)[number])) {
    throw new BadRequestException(
      `Orders can only be assigned from pending, confirmed, assigned, or accepted (current: ${status})`,
    );
  }
}

export function assertUnassignFromStatus(status: string) {
  if (!UNASSIGNABLE_STATUSES.includes(status as (typeof UNASSIGNABLE_STATUSES)[number])) {
    throw new BadRequestException(
      `Orders can only be unassigned from assigned or accepted (current: ${status})`,
    );
  }
}

export function assertRejectFromStatus(status: string) {
  assertUnassignFromStatus(status);
}

export function assertDriverAccept(status: string) {
  if (status !== 'assigned') {
    throw new BadRequestException('Order must be assigned before it can be accepted');
  }
}

export function assertDriverPickedUp(status: string) {
  if (status !== 'accepted') {
    throw new BadRequestException('Order must be accepted before pickup');
  }
}

export function assertDriverOnTheWay(status: string) {
  if (status !== 'picked_up') {
    throw new BadRequestException('Order must be picked up first');
  }
}

export function assertDriverDelivered(status: string) {
  if (status !== 'on_the_way') {
    throw new BadRequestException('Order must be on the way before delivery');
  }
}

export function isReassignment(status: string) {
  return status === 'assigned' || status === 'accepted';
}
