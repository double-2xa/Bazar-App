# MVP Order-to-Delivery Flow — Technical Plan

**Status:** Plan only — no implementation yet  
**Date:** 2026-07-11  
**Scope:** Close gaps in the existing flow without rewriting the app or inventing fake geo features.

---

## Goal

Complete this end-to-end flow using what already exists:

```
Customer places order
  → Admin sees order in dashboard
  → Admin assigns order to a delivery agent
  → Delivery agent sees assigned orders
  → Delivery agent accepts/rejects OR starts delivery
  → Delivery agent marks picked up / on the way / delivered
  → Admin and customer see updated status
```

---

## 1. Current Order Statuses and Delivery Statuses

### Single status model (no separate delivery status)

Orders use one `OrderStatus` enum everywhere — in Prisma, shared types, and all UIs.

| Status | Meaning today |
|--------|---------------|
| `pending` | Customer placed order (default on `POST /orders`) |
| `confirmed` | Order acknowledged / ready for assignment (manual admin change today) |
| `assigned` | Admin assigned a delivery agent (`deliveryAgentId` set) |
| `picked_up` | Agent collected the order |
| `on_the_way` | Agent en route to customer |
| `delivered` | Delivery completed (`DeliveryProof` may exist) |
| `cancelled` | Customer cancelled (only from `pending`) |

**Source of truth:**
- `apps/api/prisma/schema.prisma` — `enum OrderStatus`
- `packages/shared/src/constants/index.ts` — `ORDER_STATUSES`
- `packages/shared/src/types/index.ts` — `OrderStatus` type

### Delivery-specific grouping (API only)

`GET /delivery/orders` groups the agent's orders into:

- `assigned`
- `picked_up`
- `on_the_way`
- `delivered`

There is **no** separate delivery-status field in the database.

---

## 2. Current Database Fields (Delivery-Related)

### `Order` model

| Field | Type | Notes |
|-------|------|-------|
| `deliveryAgentId` | `String?` | Set when admin assigns agent; cleared on unassign (not implemented yet) |
| `status` | `OrderStatus` | Drives entire customer + delivery lifecycle |
| `paymentStatus` | `PaymentStatus` | Set to `paid` on COD delivery completion |

Relations: `deliveryAgent`, `statusHistory[]`, `deliveryProof?`

### `OrderStatusHistory` model

| Field | Purpose |
|-------|---------|
| `status` | Status at that point in time |
| `note` | Human-readable note (e.g. "Assigned to …") |
| `changedByUserId` | Who changed it (customer, admin, or agent) |
| `createdAt` | Timestamp |

**Already written** on: order create, cancel, admin status update, assign agent, agent delivery steps.

### `DeliveryProof` model

| Field | Type | Notes |
|-------|------|-------|
| `orderId` | unique | One proof per order |
| `deliveryAgentId` | required | Agent who delivered |
| `deliveredToName` | optional | From mobile form |
| `deliveryNote` | optional | From mobile form |
| `deliveredAt` | auto | Set on create |
| `latitude` / `longitude` | optional | Supported in API DTO; **not sent from mobile UI today** |

Created only in `DeliveryService.markDelivered()`.

### `Address` model (coordinates)

| Field | Type | Notes |
|-------|------|-------|
| `latitude` | `Float?` | Optional |
| `longitude` | `Float?` | Optional |

**Seed data:** demo addresses include coordinates (`40.7128`, `40.758`).  
**Mobile add-address:** may not always capture coords — map screens already handle missing coords with empty states (per geo rules).

### What does NOT exist in schema

- No `acceptedAt` / `rejectedAt` fields
- No `rejectionReason` field
- No separate delivery sub-status
- No driver live GPS location table
- No delivery zones / ETA fields

---

## 3. Existing Admin Endpoints

All under `/api/admin`, `@Roles('admin')`:

| Method | Endpoint | Status |
|--------|----------|--------|
| `GET` | `/admin/dashboard` | ✅ Exists |
| `GET` | `/admin/orders` | ✅ Exists — paginated list, optional `?status=` filter |
| `PATCH` | `/admin/orders/:id/status` | ✅ Exists — **no transition validation** |
| `PATCH` | `/admin/orders/:id/assign-delivery-agent` | ✅ Exists — sets `deliveryAgentId` + `status: assigned` |
| `POST` | `/admin/delivery-agents` | ✅ Exists — create agent only |
| `GET` | `/admin/delivery-agents` | ❌ **Missing** — no list endpoint |
| `GET` | `/admin/orders/:id` | ❌ **Missing** — admin detail page uses `GET /orders/:id` instead (works for admin role) |

### Admin API response today

`GET /admin/orders` already includes:
- `user` (customer)
- `items`
- `address`
- `deliveryAgent` (`id`, `fullName`)

**Admin UI does not display `deliveryAgent`.**

---

## 4. Existing Delivery Agent Endpoints

All under `/api/delivery`, `@Roles('delivery_agent')`:

| Method | Endpoint | Status |
|--------|----------|--------|
| `GET` | `/delivery/orders` | ✅ Exists — grouped by status for logged-in agent |
| `GET` | `/delivery/orders/:id` | ✅ Exists — only if assigned to this agent |
| `PATCH` | `/delivery/orders/:id/picked-up` | ✅ Exists — from `assigned` or `confirmed` |
| `PATCH` | `/delivery/orders/:id/on-the-way` | ✅ Exists — requires `picked_up` |
| `PATCH` | `/delivery/orders/:id/delivered` | ✅ Exists — requires `picked_up` or `on_the_way`; creates `DeliveryProof` |
| `PATCH` | `/delivery/orders/:id/accept` | ❌ **Missing** |
| `PATCH` | `/delivery/orders/:id/reject` | ❌ **Missing** |

### Transition rules (delivery service only)

| Action | Allowed from |
|--------|--------------|
| Picked up | `assigned`, `confirmed` |
| On the way | `picked_up` |
| Delivered | `picked_up`, `on_the_way` |

**Gap:** `updateStatus()` used by admin has **zero** transition validation — admin can jump to any status.

---

## 5. Existing Customer Order Endpoints

| Method | Endpoint | Status |
|--------|----------|--------|
| `POST` | `/orders` | ✅ Creates order as `pending` |
| `GET` | `/orders/my-orders` | ✅ Customer order list |
| `GET` | `/orders/:id` | ✅ Includes `statusHistory`, `deliveryProof`, `address` for owner/admin/agent |
| `PATCH` | `/orders/:id/cancel` | ✅ Only when `pending` |

---

## 6. Existing Mobile Delivery Screens

| Screen | File | What it does today |
|--------|------|-------------------|
| Active deliveries | `app/(delivery)/index.tsx` | Lists `assigned`, `picked_up`, `on_the_way` sections; polls every 30s |
| Map | `app/(delivery)/map.tsx` | Shows pins for active orders **with address coordinates**; external nav via detail screen |
| Completed | `app/(delivery)/completed.tsx` | Lists `delivered` orders |
| Order detail | `app/delivery-order/[id].tsx` | Map (if coords), customer/address, items, action buttons by status |
| Completion splash | `app/delivery-completed.tsx` | Success screen after mark delivered |

### Delivery detail actions (already wired)

| Order status | Buttons shown |
|--------------|---------------|
| `assigned` | "Mark as Picked Up" |
| `picked_up` | "Mark as On The Way" + "Mark as Delivered" |
| `on_the_way` | "Mark as Delivered" |
| `delivered` | Completed message |

### Mobile endpoints wrapper (`src/services/endpoints.ts`)

`deliveryApi` already wraps all four delivery endpoints. **No accept/reject wrappers.**

---

## 7. Existing Admin Dashboard Screens

| Screen | File | What it does today |
|--------|------|-------------------|
| Orders list | `orders/page.tsx` | Filter by status, inline status dropdown, clickable order number |
| Order detail | `orders/[id]/page.tsx` | Customer, address, items, summary, status history, status dropdown |
| Delivery agents | `delivery-agents/page.tsx` | **Create agent form only** — no list, no assignment UI |

### Admin gaps (UI)

- ❌ No "Assign delivery agent" control on list or detail
- ❌ No delivery agent column on orders list
- ❌ No agent list to pick from
- ❌ Status dropdown allows invalid jumps (e.g. `pending` → `delivered`)
- ❌ No auto-refresh; manual page load / filter change only

---

## 8. Existing Customer Order Screens

| Screen | File | What it does today |
|--------|------|-------------------|
| Orders list | `app/(tabs)/orders.tsx` | List with pull-to-refresh + refetch on tab focus |
| Order detail | `app/order/[id].tsx` | Status badge, items, price summary, cancel if `pending` |

### Customer gaps (UI)

- ❌ No status timeline (`statusHistory` returned by API but not rendered)
- ❌ No delivery address shown
- ❌ No delivery agent name shown
- ❌ No delivery progress stepper
- ❌ No map / tracking (acceptable per geo rules — static status only for MVP)

---

## 9. What Is Missing for MVP

### Critical gaps (blocks the stated goal)

| Gap | Impact |
|-----|--------|
| Admin cannot assign agent from UI | API exists; UI missing — **biggest blocker** |
| No agent list endpoint / UI | Admin cannot pick an agent to assign |
| No reject flow | Agent cannot decline an assignment |
| Weak status transition rules | Admin can corrupt state; no shared contract |
| Customer order detail incomplete | Customer cannot see delivery progress meaningfully |
| Shared `Order` type incomplete | Missing `deliveryAgent`, `statusHistory`, `deliveryProof` on client types |

### Non-critical / already works

| Feature | Status |
|---------|--------|
| Customer places order | ✅ Works |
| Admin sees orders | ✅ Works |
| Agent sees assigned orders | ✅ Works (after assignment) |
| Agent marks picked up / on the way / delivered | ✅ Works |
| Admin sees status (on reload) | ✅ Works |
| Delivery map with address coords | ✅ Works when coords exist |
| Delivery proof on completion | ✅ Backend works; mobile sends name/note only |

### Explicitly out of MVP scope (per `.cursor/rules/07-geo-delivery-rules.mdc`)

- Live GPS driver tracking
- Fake "agent is 5 min away" UI
- In-app route optimization
- ETA calculations
- PostGIS / delivery zones
- Distance-based dynamic fees

---

## 10. Proposed MVP Flow

Use **existing statuses only**. No new enum values.

```
┌─────────────┐
│   pending   │  Customer places order (POST /orders)
└──────┬──────┘
       │ Admin confirms (PATCH status → confirmed)
       ▼
┌─────────────┐
│  confirmed  │  Ready for assignment
└──────┬──────┘
       │ Admin assigns agent (PATCH assign-delivery-agent)
       ▼
┌─────────────┐
│  assigned   │  Agent sees order in Active tab
└──────┬──────┘
       │
       ├── Agent rejects → back to confirmed, deliveryAgentId cleared
       │
       └── Agent accepts implicitly by starting delivery
              OR explicit "Accept" (optional — see below)
       ▼
┌─────────────┐
│  picked_up  │  PATCH /delivery/.../picked-up
└──────┬──────┘
       ▼
┌─────────────┐
│ on_the_way  │  PATCH /delivery/.../on-the-way
└──────┬──────┘
       ▼
┌─────────────┐
│  delivered  │  PATCH /delivery/.../delivered + DeliveryProof
└─────────────┘
```

### Accept / reject decision (MVP)

**Recommendation: lightweight, no schema migration**

| Action | MVP behavior |
|--------|--------------|
| **Accept** | **Implicit** — agent tapping "Mark as Picked Up" = acceptance. No extra endpoint required. |
| **Reject** | **New endpoint** — `PATCH /delivery/orders/:id/reject` with optional `reason`. Clears `deliveryAgentId`, sets `status: confirmed`, appends history note. Admin can reassign. |

**Why not a separate `accepted` status?** Would require enum migration, shared type updates, and UI changes across three apps. Not needed if "picked up" is the acceptance signal.

**Optional enhancement (still no migration):** Add explicit "Accept assignment" button that only records a history note and enables the delivery buttons — only worth it if product requires a distinct accept step before pickup.

---

## 11. Backend API Changes Needed

### 11.1 Shared package

- Extend `Order` type with optional:
  - `deliveryAgentId`
  - `deliveryAgent?: Pick<UserPublic, 'id' | 'fullName' | 'phone'>`
  - `statusHistory?: { status, note, createdAt }[]`
  - `deliveryProof?: { deliveredAt, deliveredToName, deliveryNote }`
- Add `ORDER_STATUS_TRANSITIONS` constant (allowed next statuses per role)
- Add `deliveryRejectSchema` in validators (optional `reason` string)

### 11.2 Orders service hardening

- Add `validateStatusTransition(current, next, role)` helper
- Apply validation in:
  - `updateStatus()` (admin)
  - `assignDeliveryAgent()` — only allow when status in `['confirmed', 'pending']` (recommend `confirmed` only)
  - `assignDeliveryAgent()` — block if order already has agent unless reassigning
- Return `deliveryAgent` and `statusHistory` in `formatOrder()` consistently

### 11.3 New admin endpoint

```
GET /admin/delivery-agents
  → list active users where role = delivery_agent
  → fields: id, fullName, email, phone, isActive
  → optional: activeOrderCount per agent (nice-to-have)
```

### 11.4 New delivery endpoint

```
PATCH /delivery/orders/:id/reject
  Body: { reason?: string }
  Rules:
    - order must be assigned to this agent
    - status must be 'assigned'
    - clear deliveryAgentId
    - set status → 'confirmed'
    - append statusHistory with note
```

### 11.5 Tighten existing endpoints (no new routes)

| Endpoint | Change |
|----------|--------|
| `PATCH /admin/orders/:id/status` | Validate transitions; block manual `delivered` without proof (or auto-require agent flow) |
| `PATCH /admin/orders/:id/assign-delivery-agent` | Validate order status; support reassignment with history note |
| `GET /orders/:id` | Ensure `deliveryAgent` is included in response (currently may be missing from formatOrder) |
| `markPickedUp` | Restrict to `assigned` only (remove `confirmed` — agent shouldn't see unassigned confirmed orders) |

### 11.6 Auto-confirm on assign (optional, small)

When admin assigns agent, auto-set `confirmed` if still `pending` — reduces manual step. **Decision needed at implementation time.**

---

## 12. Admin Dashboard Changes Needed

### Orders list (`orders/page.tsx`)

- Add **Delivery Agent** column (name or "Unassigned")
- Add **Assign** action or link to detail assign panel
- Restrict status dropdown to **valid transitions** (from shared constants)
- Disable assign when status is `delivered` / `cancelled`

### Order detail (`orders/[id]/page.tsx`)

- Add **Assign Delivery Agent** section:
  - Dropdown populated from `GET /admin/delivery-agents`
  - Show current agent if assigned
  - "Assign" / "Reassign" button → `PATCH /admin/orders/:id/assign-delivery-agent`
- Show assigned agent name + phone
- Show `deliveryProof` when delivered
- After assign/status change, reload detail (already does)

### Delivery agents page (`delivery-agents/page.tsx`)

- Add **agent list table** (from new GET endpoint)
- Show name, email, phone, active status
- Keep existing create form

### No new admin routes required

All changes fit existing `/orders`, `/orders/[id]`, `/delivery-agents` pages.

---

## 13. Mobile Delivery App Changes Needed

### `delivery-order/[id].tsx`

- Add **Reject assignment** button when `status === 'assigned'`
  - Confirm dialog → `deliveryApi.reject(id, { reason })`
  - Navigate back to active list on success
- Improve error handling on mutations (use `getErrorMessage`)
- Optional: rename "Mark as Picked Up" → "Accept & Pick Up" for clarity

### `endpoints.ts`

- Add `deliveryApi.reject(id, data?)`

### `(delivery)/index.tsx`

- Add `refetchOnFocus` (match customer orders pattern)
- Pull-to-refresh on list

### `(delivery)/map.tsx` / `delivery-completed.tsx`

- No structural changes required for MVP
- Map already respects missing coordinates per geo rules

### Not in MVP

- Live agent GPS broadcasting
- In-app turn-by-turn routing

---

## 14. Customer Order Tracking Changes Needed

### `order/[id].tsx`

- Render **status timeline** from `order.statusHistory` (API already returns it)
- Show **delivery address** (street, city, phone)
- Show **assigned agent name** when `deliveryAgent` present (no live location)
- Add simple **progress stepper** using existing statuses:

  `pending → confirmed → assigned → picked_up → on_the_way → delivered`

  Highlight current step; grey out future steps.

### `OrderCard.tsx` (optional polish)

- No change required for MVP; already shows status badge.

### `(tabs)/orders.tsx`

- Already refetches on focus — sufficient for MVP.

### Not in MVP

- Customer-facing live map tracking
- Push notifications on status change

---

## 15. Prisma Migration Needed?

### Answer: **No migration required for recommended MVP**

All proposed changes use existing schema:

- `deliveryAgentId` — already nullable
- `OrderStatus` enum — already has all needed values
- `OrderStatusHistory` — already exists
- `DeliveryProof` — already exists
- `Address.latitude/longitude` — already optional

### Migration would only be needed if we later add

- `acceptedAt` / `rejectedAt` timestamps on `Order`
- `rejectionReason` column
- Driver location table
- New status enum values

**Defer these** until post-MVP.

---

## 16. Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Admin status dropdown can break delivery flow | High | Add backend transition validation + restrict admin UI options |
| No agent list blocks assignment UI | High | Add `GET /admin/delivery-agents` first |
| Addresses without coordinates | Medium | Keep existing empty states; external Maps nav still works with full address string |
| Agent reject without admin notification | Medium | Status history note + order returns to `confirmed`; admin sees on refresh |
| Race: two admins assign same order | Low | Backend check: warn if `deliveryAgentId` already set |
| Customer expects live tracking | Medium | Document as post-MVP; show static timeline only |
| `formatOrder()` may omit `deliveryAgent` / `statusHistory` on some paths | Medium | Audit all order return paths during implementation |
| Seed order `DA-SEED-001` is pre-assigned | Low | Useful for testing agent flow immediately |

---

## 17. Exact Implementation Order

Execute in this sequence to avoid broken intermediate states:

### Phase 1 — Shared contract (foundation)

1. Update `packages/shared` types: extend `Order`, add transition map constant
2. Add `deliveryRejectSchema` validator
3. Build shared package

### Phase 2 — Backend hardening

4. Add `validateStatusTransition()` in orders service
5. Apply validation to `updateStatus()` and `assignDeliveryAgent()`
6. Fix `formatOrder()` / `getOrder()` to always include `deliveryAgent`, `statusHistory`, `deliveryProof` where applicable
7. Add `GET /admin/delivery-agents`
8. Add `PATCH /delivery/orders/:id/reject`
9. Tighten `markPickedUp()` to `assigned` only
10. Manual API smoke test with demo accounts + seed data

### Phase 3 — Admin dashboard

11. Add agent list to `delivery-agents/page.tsx`
12. Add assign-agent UI to `orders/[id]/page.tsx`
13. Add agent column to `orders/page.tsx`
14. Restrict status dropdown to valid transitions
15. Test: place order → confirm → assign → verify list/detail

### Phase 4 — Mobile delivery app

16. Add `deliveryApi.reject` to `endpoints.ts`
17. Add reject button + error handling to `delivery-order/[id].tsx`
18. Add refetch on focus to `(delivery)/index.tsx`
19. Test full agent flow: assigned → picked up → on the way → delivered

### Phase 5 — Customer tracking

20. Add status timeline + address + agent info to `order/[id].tsx`
21. Add progress stepper component (small, reusable)
22. Test: customer sees updates after each agent/admin action

### Phase 6 — Verification

23. End-to-end test with all four demo accounts
24. Verify admin cannot skip to `delivered` without proof
25. Verify reject returns order to `confirmed` and admin can reassign
26. Check geo rules: no fake live tracking added

---

## Summary: Already Built vs Needs Work

| Step | Already built? | Work needed |
|------|----------------|-------------|
| Customer places order | ✅ Yes | Minor: none |
| Admin sees order | ✅ Yes | Polish: agent column |
| Admin assigns agent | ⚠️ API only | **UI + agent list endpoint** |
| Agent sees assigned orders | ✅ Yes | Polish: refetch on focus |
| Agent accept/reject | ❌ No | **Reject endpoint + button; accept = pick up** |
| Agent delivery steps | ✅ Yes | Tighten transitions |
| Admin sees updates | ⚠️ Partial | Transition validation |
| Customer sees updates | ⚠️ Partial | **Timeline + address + stepper UI** |

---

## Confirmation Required

**Do not implement until approved.**

Please confirm or adjust:

1. **Accept = implicit via "Mark as Picked Up"** — or do you want a separate Accept button?
2. **Reject returns to `confirmed`** — is that the right status, or should it go to `pending`?
3. **Auto-confirm on assign** — should assigning an agent auto-move `pending` → `confirmed`?
4. **Admin manual status changes** — should admin be able to force any status, or only forward transitions?

Once confirmed, implementation will follow Phase 1–6 above with minimal, focused diffs.
