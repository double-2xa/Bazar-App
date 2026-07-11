# MVP Order-to-Delivery — Mobile Driver Report

**Date:** July 2026  
**Scope:** `apps/mobile` delivery agent screens and API services only  
**Design:** Liquid Glass / Nice Price Bazar (DoubleA driver console)

---

## Summary

The mobile delivery agent MVP implements the full driver workflow from assignment through delivery. Drivers see grouped active orders, progress each order through valid status transitions, view completed deliveries, and use a map tab for orders with saved coordinates. No fake live GPS tracking, no new native libraries, and Expo Go remains supported.

---

## Screens Changed

| Screen | Path | Changes |
|--------|------|---------|
| Active dashboard | `app/(delivery)/index.tsx` | Grouped sections (New assigned, Accepted, Picked up, On the way), section count badges, pull-to-refresh, empty state, 30s poll + refetch on focus |
| Map tab | `app/(delivery)/map.tsx` | Active delivery pins when coordinates exist; safe empty state when missing; pull-to-refresh on empty view; bottom sheet with quick links |
| Completed tab | `app/(delivery)/completed.tsx` | Delivered order list, pull-to-refresh, empty state, cards open detail |
| Order detail | `app/delivery-order/[id].tsx` | Workflow bar, customer/phone, address, payment, items, status actions, haptics, cache invalidation, delivery proof fields, role guard |
| Delivery success | `app/delivery-completed.tsx` | Unchanged — shown after mark delivered |

### New / updated shared mobile code

| File | Purpose |
|------|---------|
| `src/services/endpoints.ts` | Typed `deliveryApi` with `DeliveryOrdersGrouped`, optional proof payload |
| `src/hooks/useDeliveryOrders.ts` | Shared query + focus refetch for all delivery tabs |
| `src/utils/deliveryStatus.ts` | Driver section labels, workflow steps, status formatting |
| `src/components/DeliveryWorkflowBar.tsx` | Visual progress: Assigned → Accepted → Picked up → On the way → Delivered |
| `src/components/OrderCard.tsx` | Optional `useDriverStatusLabel` for human-readable badges |

### Role / security

- `app/(delivery)/_layout.tsx` — `useRoleGuard({ allowed: 'delivery_agent' })` on tab navigator
- `app/delivery-order/[id].tsx` — same guard on detail route
- Non-drivers and admins are redirected to shopper tabs or login

---

## API Calls Used

| Action | Method | Endpoint |
|--------|--------|----------|
| List grouped orders | `GET` | `/delivery/orders` |
| Order detail | `GET` | `/delivery/orders/:id` |
| Accept assignment | `PATCH` | `/delivery/orders/:id/accept` |
| Reject assignment | `PATCH` | `/delivery/orders/:id/reject` |
| Mark picked up | `PATCH` | `/delivery/orders/:id/picked-up` |
| Mark on the way | `PATCH` | `/delivery/orders/:id/on-the-way` |
| Mark delivered | `PATCH` | `/delivery/orders/:id/delivered` |

**Delivered payload (optional):**

```json
{
  "deliveredToName": "Jane Doe",
  "deliveryNote": "Left with reception"
}
```

React Query keys invalidated after each mutation:

- `['delivery-orders']`
- `['delivery-order', id]`

---

## Driver Flow

```
Admin assigns order
        ↓
   [assigned]  — Driver sees under "New assigned"
        ↓ Accept (or Reject → back to admin queue)
   [accepted]
        ↓ Mark picked up
   [picked_up]
        ↓ Mark on the way
   [on_the_way]
        ↓ Mark delivered (+ optional name/note)
   [delivered]  — Moves to Completed tab
```

**Reject:** Available from `assigned` or `accepted`. Order returns to `confirmed` and is unassigned.

**Payment:** COD orders show collect amount on detail; marking delivered sets COD to `paid` on the backend.

---

## Limitations (MVP)

| Item | Status |
|------|--------|
| Live GPS / driver tracking | Not implemented (by design) |
| Push notifications for new assignments | Not implemented |
| Proof photo upload | Not implemented — TODO in `delivery-order/[id].tsx` |
| Signature capture | Not implemented — TODO in `delivery-order/[id].tsx` |
| Map pins without saved lat/lng | Empty state; external navigation uses address text |
| Offline mode | Not supported |

---

## Manual Test Checklist

### Setup

- [ ] `npm run docker:up` (PostgreSQL)
- [ ] `npm run api` (API on :3001)
- [ ] `cd apps/mobile && npx expo start --clear`
- [ ] iPhone on same Wi‑Fi as dev machine; scan QR in Expo Go
- [ ] Seed data present (`npm run db:seed` if needed)

### Auth & role

- [ ] Log in as `delivery@doublea.com` / `Delivery123!` → lands on delivery tabs
- [ ] Log in as `user@doublea.com` → shopper tabs only; cannot stay on `/(delivery)`
- [ ] Deep link to `/delivery-order/:id` as shopper → redirected away

### Active dashboard

- [ ] Pull-to-refresh updates list
- [ ] Empty state: "No assigned deliveries yet." when no active orders
- [ ] Assigned seed order (`DA-SEED-001`) appears under **New assigned**
- [ ] Section badge shows correct count
- [ ] Tapping card opens order detail

### Order detail — full workflow

- [ ] Workflow bar highlights current step
- [ ] Customer name and phone visible; Call opens dialer
- [ ] Address and payment method/status shown
- [ ] **Accept order** only when `assigned`
- [ ] **Mark picked up** only when `accepted`
- [ ] **Mark on the way** only when `picked_up`
- [ ] **Mark delivered** only when `on_the_way`
- [ ] Optional delivered-to name and note submit successfully
- [ ] Haptic feedback on accept/deliver (iOS)
- [ ] Success screen after deliver; order in Completed tab
- [ ] Reject from assigned/accepted returns to dashboard without order

### Map tab

- [ ] Orders with coordinates show as pins
- [ ] Orders without coordinates → "No map locations available yet." (no crash)
- [ ] Bottom sheet links open order detail

### Completed tab

- [ ] Delivered orders listed (`DA-SEED-002` from seed)
- [ ] Empty state when none
- [ ] Card opens read-only detail with proof section if present

### Cross-app

- [ ] Admin assigns new order → driver refresh sees it under New assigned
- [ ] Customer order detail stepper updates after driver progress

---

## Quality Checks

Run from `apps/mobile`:

```bash
npx tsc --noEmit
npx expo-doctor
npx expo start --clear
```

---

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Driver | `delivery@doublea.com` | `Delivery123!` |
| Admin | `admin@doublea.com` | `Admin123!` |
| Shopper | `user@doublea.com` | `User123!` |

Seed orders: `DA-SEED-001` (assigned to driver), `DA-SEED-002` (delivered), `DA-SEED-004` (confirmed, for admin assign test).
