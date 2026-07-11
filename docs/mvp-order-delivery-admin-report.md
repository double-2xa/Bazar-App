# MVP Order-to-Delivery — Admin Dashboard Report

**Date:** 2026-07-11  
**Scope:** Admin UI for delivery assignment and order tracking

---

## 1. Pages Changed

| Page | Path | Changes |
|------|------|---------|
| Orders list | `apps/admin/src/app/(admin)/orders/page.tsx` | Delivery assignment column, filters, badges, assign CTA |
| Order detail | `apps/admin/src/app/(admin)/orders/[id]/page.tsx` | Full delivery panel, assign/unassign, loading/success/error |
| Delivery agents | `apps/admin/src/app/(admin)/delivery-agents/page.tsx` | Agent list, stats, active order counts |
| Global styles | `apps/admin/src/app/globals.css` | Brand badges, alerts, row highlight |

## 2. New Files

| File | Purpose |
|------|---------|
| `apps/admin/src/services/orders.ts` | Typed admin order + delivery agent API calls |
| `apps/admin/src/utils/orderDelivery.ts` | Delivery labels, filters, badge helpers, error formatting |

---

## 3. Admin Flow

```
1. Admin logs in → /login
2. Opens Orders → sees unassigned count badge
3. Filters "Unassigned" → yellow-highlighted rows
4. Clicks order number OR "Assign driver" → order detail
5. Delivery panel shows status, payment, current driver
6. Selects driver from dropdown → "Assign driver"
   - pending orders auto-confirm on backend → assigned
7. Driver accepts on mobile → status becomes accepted
8. Driver progresses → picked up → on the way → delivered
9. Admin can "Unassign driver" while assigned/accepted
10. Admin can "Reassign driver" while assigned/accepted
```

### Delivery assignment labels (orders list)

| State | Badge | Color |
|-------|-------|-------|
| Unassigned | `Unassigned` | Yellow (warning) |
| Assigned | `Assigned · {driver}` | Yellow accent |
| Accepted | `Accepted · {driver}` | Blue (info) |
| Picked up | `Picked up · {driver}` | Brand red tint |
| On the way | `On the way · {driver}` | Brand red tint |
| Delivered | `Delivered · {driver}` | Green (success) |

Unassigned rows use a yellow background highlight.

### Filters (client-side on loaded orders)

| Filter | Matches |
|--------|---------|
| All orders | Everything |
| Unassigned | `pending` or `confirmed` without driver |
| Assigned | `status === assigned` |
| In delivery | `accepted`, `picked_up`, `on_the_way` |
| Delivered | `status === delivered` |

---

## 4. How to Assign an Order

1. Start API: `npm run api`
2. Start admin: `npm run admin`
3. Login: `admin@doublea.com` / `Admin123!`
4. Go to **Orders**
5. Click filter **Unassigned** (or find `DA-SEED-003` / `DA-SEED-004` after seed)
6. Click order number → opens detail
7. In **Delivery management** panel:
   - Select driver from dropdown (shows active order count)
   - Click **Assign driver**
8. Success banner confirms assignment
9. Order moves to **Assigned** in list

### Reassign / unassign

- **Reassign:** On assigned/accepted orders, pick new driver → **Reassign driver**
- **Unassign:** Click **Unassign driver** → order returns to `confirmed`, ready for new assignment

---

## 5. API Client (`apps/admin/src/services/orders.ts`)

```typescript
adminOrdersApi.list(params?)
adminOrdersApi.getById(id)
adminOrdersApi.updateStatus(id, status, note?)
adminOrdersApi.assignAgent(id, deliveryAgentId)
adminOrdersApi.unassignAgent(id)

deliveryAgentsApi.list()
deliveryAgentsApi.create(data)
```

Uses existing `api.ts` axios instance with JWT interceptors.

---

## 6. Known Limitations

| Limitation | Notes |
|------------|-------|
| Filters are client-side | Loads up to 100 orders; no server-side delivery filter |
| No live refresh | Reload page or navigate back to refresh status |
| No driver map in admin | Per geo rules — no fake tracking |
| Inactive drivers hidden from assign dropdown | Must activate via Users page (if supported) |
| Admin cannot mark delivered | Must go through driver app + proof |
| No push notifications | Status changes require manual refresh |
| ESLint not installed | `next build` skips lint; TypeScript check passes |

---

## 7. Manual Test Checklist (Screenshots)

Use this checklist when verifying in the browser at `http://localhost:3000`.

- [ ] **Login page** — Nice Price Bazar branding visible
- [ ] **Orders list — All** — table shows delivery assignment column
- [ ] **Orders list — Unassigned** — yellow rows, badge says "Unassigned"
- [ ] **Orders list — badge** — top-right shows "X awaiting driver assignment"
- [ ] **Orders list — Assign driver button** — visible on unassigned rows
- [ ] **Order detail — loading** — brief loading state on navigation
- [ ] **Order detail — delivery panel** — status, payment, driver shown
- [ ] **Order detail — waiting message** — yellow border + "waiting for driver"
- [ ] **Order detail — assign** — dropdown + Assign driver button works
- [ ] **Order detail — success** — green banner after assign
- [ ] **Order detail — unassign** — button on assigned order works
- [ ] **Order detail — status history** — shows assignment note
- [ ] **Order detail — delivery proof** — visible on delivered orders
- [ ] **Delivery agents** — table with name, email, active orders, status
- [ ] **Delivery agents — stats** — total/active drivers, orders in flow
- [ ] **Delivery agents — create** — form creates new agent
- [ ] **Delivery agents — empty** — message when no agents exist
- [ ] **Error state** — invalid assign shows red alert (not console only)

### Suggested test orders (after `npm run db:seed`)

| Order | Use for |
|-------|---------|
| `DA-SEED-003` | Assign from pending |
| `DA-SEED-004` | Assign from confirmed |
| `DA-SEED-001` | Already assigned — test reassign/unassign |

---

## 8. Commands Run

```bash
npm run build --workspace=@doublea/shared   # OK
npm run build --workspace=@doublea/admin    # OK (TypeScript valid)
```

---

## 9. Branding

Uses existing Nice Price Bazar CSS variables:

- `--primary` / `--brand-red` for CTAs and delivery panel accent
- `--brand-yellow` for unassigned/warning highlights
- `--warm-cream` background
- `--deep-red` sidebar (unchanged)

No full redesign — focused delivery UX additions only.
