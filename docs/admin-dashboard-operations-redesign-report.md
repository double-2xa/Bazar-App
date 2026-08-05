# Admin Dashboard Operations Redesign Report

**Date:** 2026-07-18  
**Brand:** Nice Price Bazar  
**Scope:** Admin shell + dashboard operations board (no mobile changes)

---

## 1. Summary of dashboard changes

The admin home page is no longer a rainbow KPI grid. It is a **shop counter operations board** titled **“Today’s Operations”**.

Admins now see:

1. **Action queues** — Needs driver, To prepare, In delivery, Cash to collect, Waiting approval  
2. **Today metrics** — Today’s orders, today’s revenue, delivered today, active drivers, low stock, ready for driver  
3. **Operational lists** — recent orders needing action, low stock products, busy drivers, pending companies  

Cards link into Orders / Companies / Products / Delivery Agents with real query filters where applicable.

The admin shell was cleaned up: grouped sidebar (no emoji), sticky top bar with date, intentional sign-out placement, brand chrome (deep red / cream / yellow for attention only).

---

## 2. API fields added

`GET /admin/dashboard` (`AdminService.getDashboardStats`) now returns:

### Existing (kept)
- `totalOrders`
- `totalRevenue`
- `pendingOrders`
- `completedOrders`
- `totalUsers`
- `totalCompanyAccounts`
- `totalProducts`

### New counts / amounts
| Field | Definition |
|-------|------------|
| `todayOrders` | Orders with `createdAt` ≥ start of today |
| `todayRevenue` | Sum of delivered orders delivered today (via `deliveryProof.deliveredAt` or `updatedAt` fallback) |
| `unassignedOrdersCount` | `pending` or `confirmed` with no `deliveryAgentId` |
| `ordersToPrepareCount` | Status `pending` |
| `ordersReadyForDriverCount` | Status `confirmed` with no `deliveryAgentId` |
| `inDeliveryOrdersCount` | `assigned`, `accepted`, `picked_up`, `on_the_way` |
| `deliveredTodayCount` | Delivered today (same date logic as revenue) |
| `codUnpaidAmount` | Sum `totalAmount` where COD + unpaid + not cancelled |
| `pendingCompanyApprovalsCount` | Company profiles with status `pending` |
| `activeDeliveryAgentsCount` | Users with role `delivery_agent` and `isActive` |
| `lowStockProductsCount` | Products with `stockQuantity` ≤ **5** (TODO: settings) |

### New list payloads (max 5 each)
- `recentOrdersNeedingAction` — id, orderNumber, status, totalAmount, createdAt, customerName  
- `busyDeliveryAgents` — id, fullName, phone, activeOrderCount, isActive (sorted by load)  
- `lowStockProducts` — id, name, sku, stockQuantity  
- `pendingCompanies` — id, companyName, contactPerson, createdAt  

No fake metrics. No charts.

---

## 3. Components created

Under `apps/admin/src/components/`:

| Component | Purpose |
|-----------|---------|
| `AdminPageHeader.tsx` | Title / subtitle / actions |
| `MetricCard.tsx` | Stat card with tone + optional href |
| `ActionQueueCard.tsx` | Queue card with count, description, link |
| `StatusBadge.tsx` | Shop-floor status / payment / company badges |
| `LoadingState.tsx` | Loading message |
| `EmptyState.tsx` | Empty list message |
| `ErrorBanner.tsx` | Error + optional Retry |

Also: `apps/admin/src/utils/format.ts` — `formatCurrency` (EUR / nl-NL), `formatDate`, `formatDateTime`, `formatTodayLabel`.  
**TODO:** make currency/locale configurable from settings later.

---

## 4. Pages / files changed

### Shared
- `packages/shared/src/types/index.ts` — extended `DashboardStats` + list item types  
- `packages/shared/src/constants/index.ts` — `ADMIN_ORDER_STATUS_LABELS`, `ADMIN_PAYMENT_STATUS_LABELS`, `ADMIN_OPS_LABELS`, `LOW_STOCK_THRESHOLD`

### API
- `apps/api/src/admin/admin.service.ts` — enriched `getDashboardStats`  
- Controller unchanged (same `GET admin/dashboard` route)

### Admin
- `apps/admin/src/app/(admin)/layout.tsx` — shell / grouped nav / top bar  
- `apps/admin/src/app/(admin)/dashboard/page.tsx` — operations board  
- `apps/admin/src/app/(admin)/orders/page.tsx` — `deliveryFilter` + `status` query support  
- `apps/admin/src/app/login/page.tsx` — demo credentials only when `NODE_ENV !== 'production'`  
- `apps/admin/src/app/globals.css` — shell + metric/queue styles; attention yellow; no rainbow KPI palette on dashboard  

### Not rewritten
- Products, categories, coupons, users, reviews, settings, order detail (still work; shared CSS only)

---

## 5. How the dashboard is more useful

| Before | After |
|--------|--------|
| Lifetime vanity totals | Today + queues that need action |
| No link from stats | Cards open filtered Orders / Companies / Products / Agents |
| No COD rollup | `codUnpaidAmount` as “Cash to collect” |
| No unassigned signal on home | Yellow “Needs driver” queue + list |
| No company pending alert | Waiting approval card + list |
| No low stock | Count + top 5 products |
| No driver load | Busy drivers list with `activeOrderCount` |

Staff can open the dashboard and immediately know what to do next.

---

## 6. How the UI is less AI-generated

- Removed emoji sidebar icons  
- Grouped nav: Operations / Catalog / Accounts / Marketing / System  
- Sticky top bar with shop title + today’s date  
- Sign out in sidebar footer (ghost button on deep red)  
- Yellow reserved for **needs attention** (not rainbow numbers)  
- Charcoal values, deep red chrome, cream background  
- Shop-floor copy (“Needs driver”, “To prepare”, “Cash to collect”)  
- Shared components instead of one-off inline H1 patterns on dashboard  

---

## 7. Remaining limitations

- Low-stock threshold hardcoded at **5** (TODO: settings)  
- Currency/locale hardcoded EUR / nl-NL (TODO: settings)  
- “Cash to collect” links to `/orders` (no dedicated COD filter yet)  
- Order list still client-filters after fetching up to 100 orders  
- Product/category/coupon pages still scaffold-level (out of scope)  
- Settings page still placeholder  
- Logo mark still “NP” text square  
- ESLint not installed in admin workspace (Next warns during build; build still succeeds)  
- Top bar does not show signed-in admin name (token-only auth; no `/auth/me` wired in layout)

---

## 8. Exact commands run

```bash
npm run build --workspace=@doublea/shared
npm run api:build
npm run build --workspace=@doublea/admin
```

(API `prebuild` also rebuilds `@doublea/shared`.)

---

## 9. Build result

| Package | Result |
|---------|--------|
| `@doublea/shared` | **Pass** (`tsc`) |
| `@doublea/api` | **Pass** (`nest build`) |
| `@doublea/admin` | **Pass** (`next build`, exit 0) |

Note: Next.js printed `ESLint must be installed in order to run during builds` then continued and completed successfully.

---

## 10. Manual test checklist

- [ ] Login as admin (`admin@doublea.com` / `Admin123!` in non-production)  
- [ ] Open **Dashboard** — title “Today’s Operations”  
- [ ] Confirm action cards show **real** counts (not zeros if DB has data)  
- [ ] Click **Needs driver** → `/orders?deliveryFilter=unassigned`  
- [ ] Click **To prepare** → `/orders?status=pending`  
- [ ] Click **In delivery** → `/orders?deliveryFilter=in_delivery`  
- [ ] Click **Waiting approval** → `/companies`  
- [ ] Create a customer order → refresh dashboard → counts increase  
- [ ] Assign a driver → refresh → unassigned decreases / in delivery increases  
- [ ] Complete delivery → refresh → delivered today / revenue update; COD unpaid may drop if marked paid on deliver  
- [ ] Confirm sidebar has no emoji and grouped sections  
- [ ] Confirm yellow appears only on attention queues when count > 0  

---

*Order-to-delivery MVP flow (assign / unassign / status transitions) was not changed on order detail.*
