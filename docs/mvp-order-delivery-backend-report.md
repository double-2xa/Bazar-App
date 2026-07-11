# MVP Order-to-Delivery — Backend Implementation Report

**Date:** 2026-07-11  
**Scope:** Backend API only (NestJS + Prisma + shared package)

---

## 1. Lifecycle Used

```
pending
  → confirmed          (admin manual)
  → assigned           (admin assign / auto-confirm from pending)
  → accepted           (driver explicit accept)
  → picked_up
  → on_the_way
  → delivered          (driver + DeliveryProof; COD → paid)

Reject / unassign:
  assigned | accepted → confirmed
  - clears deliveryAgentId
  - writes status history (optional reason on driver reject)

Terminal:
  delivered | cancelled
```

### Product decisions applied

| Decision | Implementation |
|----------|----------------|
| Explicit `accepted` status | Added to Prisma enum + shared types |
| Reject → `confirmed` | `rejectAssignment()` + `PATCH /delivery/.../reject` |
| Auto-confirm on assign | Pending orders assign directly to `assigned` with note |
| Admin status restricted | `ADMIN_ORDER_TRANSITIONS`; blocks `delivered` |
| No fake GPS | DeliveryProof lat/lng optional only; no live tracking |

---

## 2. Prisma Changes

### Schema (`apps/api/prisma/schema.prisma`)

```prisma
enum OrderStatus {
  pending
  confirmed
  assigned
  accepted      // NEW
  picked_up
  on_the_way
  delivered
  cancelled
}
```

No new columns (`acceptedAt`, `rejectedAt`) — MVP uses status + `OrderStatusHistory` only.

### Migration

| Name | File |
|------|------|
| `20240702000000_add_accepted_status` | `prisma/migrations/20240702000000_add_accepted_status/migration.sql` |

```sql
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'accepted';
```

---

## 3. Shared Package Updates

### `packages/shared/src/constants/index.ts`

- `ORDER_STATUSES` — includes `accepted`
- `ADMIN_ORDER_TRANSITIONS` — admin-safe manual changes only
- `ORDER_TRACKING_STEPS` — customer progress steps
- `ORDER_STATUS_LABELS` — display labels
- `DRIVER_ORDER_GROUPS` — driver dashboard groups

### `packages/shared/src/types/index.ts`

- `OrderStatus` includes `accepted`
- `Order` extended: `deliveryAgentId`, `deliveryAgent`, `statusHistory`, `deliveryProof`
- `DeliveryAgentSummary` — admin agent list
- `DeliveryOrdersGrouped` — driver grouped response

### `packages/shared/src/validators/index.ts`

- `deliveryRejectSchema` — optional `reason` (max 500 chars)

---

## 4. Status Transition Rules

### Central validator (`apps/api/src/common/utils/order-status.ts`)

| Action | Allowed from | Result |
|--------|--------------|--------|
| Admin manual status | `pending` | `confirmed`, `cancelled` |
| Admin manual status | `confirmed` | `cancelled` |
| Admin manual status | any | **blocked:** `delivered` |
| Admin assign | `pending`, `confirmed`, `assigned`, `accepted` | `assigned` |
| Admin unassign | `assigned`, `accepted` | `confirmed`, agent cleared |
| Driver accept | `assigned` | `accepted` |
| Driver reject | `assigned`, `accepted` | `confirmed`, agent cleared |
| Driver picked up | `accepted` | `picked_up` |
| Driver on the way | `picked_up` | `on_the_way` |
| Driver delivered | `on_the_way` | `delivered` + proof + COD paid |

### Assignment notes

- **Pending → assigned:** history note `"Order confirmed and assigned to {driver}."`
- **Confirmed → assigned:** `"Assigned to {driver}"`
- **Reassign (assigned/accepted):** status reset to `assigned`, note `"Reassigned to {driver}"`
- **Blocked:** assign on `delivered`, `cancelled`, `picked_up`, `on_the_way`

---

## 5. Endpoints Added / Changed

### Admin (`@Roles('admin')`)

| Method | Endpoint | Status |
|--------|----------|--------|
| `GET` | `/api/admin/orders` | ✅ Includes `deliveryAgent`, items, address, user |
| `GET` | `/api/admin/orders/:id` | ✅ **Added** — full detail |
| `GET` | `/api/admin/delivery-agents` | ✅ List + `activeOrderCount` |
| `PATCH` | `/api/admin/orders/:id/assign-delivery-agent` | ✅ Hardened (reassign, auto-confirm) |
| `PATCH` | `/api/admin/orders/:id/unassign-delivery-agent` | ✅ **Added** |
| `PATCH` | `/api/admin/orders/:id/status` | ✅ Validates transitions |

### Delivery (`@Roles('delivery_agent')`)

| Method | Endpoint | Status |
|--------|----------|--------|
| `GET` | `/api/delivery/orders` | ✅ Grouped: assigned, accepted, picked_up, on_the_way, delivered |
| `GET` | `/api/delivery/orders/:id` | ✅ Assigned driver only |
| `PATCH` | `/api/delivery/orders/:id/accept` | ✅ assigned → accepted |
| `PATCH` | `/api/delivery/orders/:id/reject` | ✅ assigned/accepted → confirmed |
| `PATCH` | `/api/delivery/orders/:id/picked-up` | ✅ accepted → picked_up |
| `PATCH` | `/api/delivery/orders/:id/on-the-way` | ✅ picked_up → on_the_way |
| `PATCH` | `/api/delivery/orders/:id/delivered` | ✅ on_the_way → delivered + proof |

### Customer orders (unchanged routes, enriched responses)

| Method | Endpoint | Notes |
|--------|----------|-------|
| `POST` | `/api/orders` | Creates `pending` order |
| `GET` | `/api/orders/my-orders` | Includes `deliveryAgent` |
| `GET` | `/api/orders/:id` | Includes history, proof, agent |
| `PATCH` | `/api/orders/:id/cancel` | Only from `pending` |

---

## 6. Security Checks

| Rule | Enforcement |
|------|-------------|
| Admin endpoints | `@Roles('admin')` on `AdminController` |
| Delivery endpoints | `@Roles('delivery_agent')` on `DeliveryController` |
| Driver order access | `deliveryAgentId === agentId` in service layer |
| Customer order access | `order.userId === userId` in `getOrder()` |
| Company users | Same as customers — own orders only |
| UUID params | `ParseUUIDPipe` on order `:id` params |
| JWT | Global `JwtAuthGuard` + role decorator |

---

## 7. Seed Changes

| Order | Status | Agent | Purpose |
|-------|--------|-------|---------|
| `DA-SEED-001` | `assigned` | delivery@doublea.com | Test driver accept flow |
| `DA-SEED-002` | `delivered` | delivery@doublea.com | Completed example |
| `DA-SEED-003` | `pending` | none | **New** — unassigned new order |
| `DA-SEED-004` | `confirmed` | none | **New** — ready for assignment |

Demo accounts unchanged.

Re-seed: `npm run db:seed` from repo root.

---

## 8. Manual Backend Test Steps

### 1. Login and save tokens

```bash
# Admin
curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@doublea.com","password":"Admin123!"}'

# Driver
curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"delivery@doublea.com","password":"Delivery123!"}'

# Customer
curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@doublea.com","password":"User123!"}'
```

Use `tokens.accessToken` as `Authorization: Bearer <token>`.

### 2. Admin — list orders and agents

```bash
curl -s http://localhost:3001/api/admin/orders?limit=10 \
  -H "Authorization: Bearer $ADMIN_TOKEN"

curl -s http://localhost:3001/api/admin/delivery-agents \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### 3. Admin — assign driver to confirmed order (DA-SEED-004)

```bash
# Get order id and agent id from previous responses, then:
curl -s -X PATCH http://localhost:3001/api/admin/orders/{ORDER_ID}/assign-delivery-agent \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"deliveryAgentId":"{AGENT_ID}"}'
```

### 4. Driver — list, accept, progress delivery

```bash
curl -s http://localhost:3001/api/delivery/orders \
  -H "Authorization: Bearer $DRIVER_TOKEN"

curl -s -X PATCH http://localhost:3001/api/delivery/orders/{ORDER_ID}/accept \
  -H "Authorization: Bearer $DRIVER_TOKEN"

curl -s -X PATCH http://localhost:3001/api/delivery/orders/{ORDER_ID}/picked-up \
  -H "Authorization: Bearer $DRIVER_TOKEN"

curl -s -X PATCH http://localhost:3001/api/delivery/orders/{ORDER_ID}/on-the-way \
  -H "Authorization: Bearer $DRIVER_TOKEN"

curl -s -X PATCH http://localhost:3001/api/delivery/orders/{ORDER_ID}/delivered \
  -H "Authorization: Bearer $DRIVER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"deliveredToName":"John Customer","deliveryNote":"Handed to customer"}'
```

### 5. Driver — reject test (DA-SEED-001)

```bash
curl -s -X PATCH http://localhost:3001/api/delivery/orders/{ORDER_ID}/reject \
  -H "Authorization: Bearer $DRIVER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Too far"}'
```

### 6. Admin — unassign

```bash
curl -s -X PATCH http://localhost:3001/api/admin/orders/{ORDER_ID}/unassign-delivery-agent \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### 7. Verify invalid transition blocked

```bash
curl -s -X PATCH http://localhost:3001/api/admin/orders/{ORDER_ID}/status \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"delivered"}'
# Expected: 400 Bad Request
```

### 8. Customer — view order with history

```bash
curl -s http://localhost:3001/api/orders/{ORDER_ID} \
  -H "Authorization: Bearer $USER_TOKEN"
```

---

## 9. Commands Run

```bash
npm run build --workspace=@doublea/shared   # OK
npm run api:build                         # OK
npx prisma generate                       # EPERM if API process locks engine (restart API to refresh)
npx prisma migrate deploy                 # OK — no pending migrations
```

---

## 10. Files Changed

| File | Change |
|------|--------|
| `apps/api/prisma/schema.prisma` | `accepted` in OrderStatus |
| `apps/api/prisma/migrations/20240702000000_add_accepted_status/migration.sql` | Enum migration |
| `apps/api/prisma/seed.ts` | DA-SEED-003, DA-SEED-004 |
| `apps/api/src/common/utils/order-status.ts` | Centralized transition validators |
| `apps/api/src/orders/orders.service.ts` | Assign, unassign, reject, detail includes |
| `apps/api/src/orders/orders.controller.ts` | ParseUUIDPipe |
| `apps/api/src/orders/dto/order.dto.ts` | IsIn ORDER_STATUSES |
| `apps/api/src/admin/admin.controller.ts` | GET orders/:id, unassign, ParseUUIDPipe |
| `apps/api/src/admin/admin.service.ts` | getDeliveryAgents with activeOrderCount |
| `apps/api/src/delivery/delivery.service.ts` | Accept/reject/progress + validators |
| `apps/api/src/delivery/delivery.controller.ts` | Accept/reject routes, ParseUUIDPipe |
| `apps/api/src/delivery/dto/delivery.dto.ts` | DeliveryRejectDto |
| `packages/shared/src/constants/index.ts` | Labels, transitions, groups |
| `packages/shared/src/types/index.ts` | Order extensions, agent/group types |
| `packages/shared/src/validators/index.ts` | deliveryRejectSchema |

---

## 11. Remaining TODOs (Post-MVP)

| Item | Notes |
|------|-------|
| Live driver GPS | Per geo rules — do not fake |
| Customer live map tracking | Static status only for MVP |
| Push notifications | On status change |
| Admin cancel in-flight delivery | Requires business policy |
| Distance-based delivery fee | Schema + geo service |
| `GET /admin/orders/:id` pagination on history | Not needed yet |
| Webhook/event bus for status changes | Optional scale item |

---

## 12. Cash on Delivery

On `PATCH /delivery/orders/:id/delivered`:

```typescript
paymentStatus: order.paymentMethod === 'cash_on_delivery' ? 'paid' : order.paymentStatus
```

No payment gateway added. Card orders keep existing `paymentStatus`.
