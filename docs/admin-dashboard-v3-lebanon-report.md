# Admin Dashboard V3 — Lebanon Operations Control Center

**Date:** 2026-07-18  
**Brand:** Nice Price Bazar (Lebanon)  
**Scope:** Admin dashboard + shell only (no mobile)

---

## 1. Summary

Dashboard V3 replaces the V2 “operations board” card grid with a **scrollable Lebanon operations control center**:

- **Hero** with today’s KPIs (orders, revenue, in delivery, COD)
- **8 quick-action widgets** linking to filtered ops pages
- **Lebanon map** with clustered order markers (address lat/lng)
- **Real charts**: 7/30-day sales trend, order status breakdown, delivery pipeline
- **Operational panels**: recent orders, busy drivers, top products + low stock, pending companies
- **Deep section**: attention alerts, COD summary, orders by city

All data comes from `GET /admin/dashboard` — no fake metrics or placeholder charts.

Timezone: **Asia/Beirut**. Map centered on Lebanon (33.8547, 35.8623, zoom 8, bounded).

---

## 2. What was wrong with previous versions

| Version | Problem |
|---------|---------|
| V1 | Generic rainbow KPI grid; no operational queues |
| V2 | Better queues/lists but still flat, card-heavy, no map/charts, felt like AI scaffold |
| Both | No Lebanon context, no geo view, no sales trend, limited scroll depth |

V3 adds hierarchy, map + analytics, and a premium hero while keeping order/delivery MVP intact.

---

## 3. New dashboard sections

| Section | Content |
|---------|---------|
| **A — Hero** | “Lebanon Operations Dashboard”, Beirut date, refresh, 4 priority KPIs |
| **B — Quick widgets** | Needs driver, To prepare, Ready for driver, In delivery, Delivered today, Companies, Low stock, Active drivers |
| **C — Map + analytics** | Lebanon map (left), sales trend + status chart + pipeline (right) |
| **D — Operational panels** | Recent orders table, busy drivers, top products / low stock, pending companies |
| **E — Deep ops** | Needs attention now, COD cash summary, orders by city |

---

## 4. API fields added

`GET /admin/dashboard` now returns nested **`DashboardData`**:

### `summary`
All counts from spec: totals, today metrics, pipeline counts, COD amount, drivers, companies, stock.

### `salesTrend.days7` / `days30`
Per day (Beirut calendar): `date`, `ordersCount`, `revenue`, `deliveredCount`, `codAmount`.

### `orderStatusBreakdown`
Counts for all 8 order statuses.

### `deliveryPipeline`
`toPrepare`, `readyForDriver`, `assigned`, `accepted`, `pickedUp`, `outForDelivery`, `deliveredToday`.

### `mapOrders`
Active orders with address coordinates (up to 150).

### `mapOrdersWithoutCoordinates`
Count of active orders missing lat/lng.

### `recentOrders` (8), `topProducts` (5), `busyDrivers` (5), `pendingCompanies` (5), `lowStockProducts` (5)

### `attentionItems`
`needsDriver`, `toPrepare`, `lowStock`, `pendingCompanies`, `cashToCollect` (COD order count).

### `ordersByCity`
Top cities for active orders in Lebanon.

**Backend helper:** `apps/api/src/admin/dashboard.helpers.ts` — Beirut start-of-day and date keys.

---

## 5. Geo / map library used and why

**Chosen: React Leaflet + Leaflet + react-leaflet-markercluster**

| Option | Decision |
|--------|----------|
| MapLibre GL JS | Powerful but heavier Next.js SSR/webpack setup; more risk for this pass |
| **React Leaflet** | Stable with Next 14 via dynamic import (`ssr: false`); OpenStreetMap tiles; clustering supported |

Map loads client-only through `LebanonOrdersMapPanel` → avoids SSR window errors.

Tiles: OpenStreetMap (no API key). Bounds restricted to Lebanon. Status-colored markers + popups linking to order detail.

---

## 6. Chart library used and why

**Recharts**

- Lightweight, React-native, works well with Next client components
- Area + bar charts for real `salesTrend` and `orderStatusBreakdown`
- No fake comparison/growth percentages

---

## 7. Components created

Under `apps/admin/src/components/dashboard/`:

| Component | Role |
|-----------|------|
| `DashboardHero.tsx` | Hero + `DashboardWidget` |
| `SectionHeader.tsx` | Panel headers |
| `ChartCard.tsx` | Chart wrapper |
| `SalesTrendChart.tsx` | 7d/30d area chart |
| `OrderStatusChart.tsx` | Horizontal bar chart |
| `DeliveryPipeline.tsx` | Pipeline bars |
| `LebanonOrdersMap.tsx` | Leaflet map + clusters |
| `LebanonOrdersMapPanel.tsx` | Dynamic import wrapper |
| `RecentOrdersPanel.tsx` | Orders table |
| `BusyDriversPanel.tsx` | Driver load list |
| `TopProductsPanel.tsx` | Top sellers + low stock |
| `PendingCompaniesPanel.tsx` | Wholesale approvals |
| `AttentionPanel.tsx` | Urgent alerts |
| `CodSummaryPanel.tsx` | COD + `OrdersByCityPanel` |

Also: `apps/admin/src/utils/dashboard.ts` (marker colors, pipeline labels).

---

## 8. Pages / files changed

### Shared
- `packages/shared/src/types/index.ts` — `DashboardData` and related types
- `packages/shared/src/constants/index.ts` — `LEBANON_MAP`

### API
- `apps/api/src/admin/admin.service.ts` — V3 dashboard aggregation
- `apps/api/src/admin/dashboard.helpers.ts` — Beirut timezone helpers

### Admin
- `apps/admin/src/app/(admin)/dashboard/page.tsx` — V3 layout
- `apps/admin/src/app/(admin)/layout.tsx` — Lebanon topbar badge
- `apps/admin/src/app/globals.css` — V3 + map + cluster styles
- `apps/admin/src/utils/format.ts` — `en-LB`, `Asia/Beirut`, USD (TODO: LBP/settings)
- `apps/admin/package.json` — new dependencies

**Not changed:** order detail, assign/unassign flow, mobile, catalog CRUD pages.

---

## 9. How to test manually

1. **Restart API** (picks up new dashboard response)
2. Login admin → `/dashboard`
3. Confirm hero shows today’s date (Beirut) and 4 KPIs
4. Click **Needs driver** → `/orders?deliveryFilter=unassigned`
5. Confirm **map** loads centered on Lebanon
6. If orders have address lat/lng in DB, markers appear; click popup → order detail
7. Toggle sales chart **7 days / 30 days**
8. Scroll: recent orders, drivers, products, companies, attention, COD, cities
9. Place order → refresh → counts update
10. Assign driver / complete delivery → refresh → pipeline + map metrics update

---

## 10. Remaining limitations

- Map points require **address latitude/longitude** on orders; many seed orders may lack coords
- Low-stock threshold still **5** (TODO: settings)
- Currency **USD** via `en-LB` (TODO: LBP / settings API)
- Top products = all-time from `OrderItem` aggregate (not “today only”)
- Map limited to 150 active geocoded orders
- ESLint not installed in admin workspace (build warning only)
- No live driver GPS (by design — uses delivery address only)

---

## 11. Commands run and build result

```bash
npm run build --workspace=@doublea/shared
npm run api:build
npm run build --workspace=@doublea/admin
```

| Package | Result |
|---------|--------|
| `@doublea/shared` | Pass |
| `@doublea/api` | Pass |
| `@doublea/admin` | Pass (exit 0) |

---

## Manual test checklist

- [ ] Login admin
- [ ] Open `/dashboard`
- [ ] Map loads, centered on Lebanon
- [ ] Order points appear when coordinates exist
- [ ] Click marker → open order detail
- [ ] Widgets show real counts
- [ ] Charts use real API data
- [ ] Panels link correctly
- [ ] Create order → refresh dashboard
- [ ] Assign driver → refresh
- [ ] Complete delivery → refresh
- [ ] Metrics update correctly

---

*Order-to-delivery MVP (assign / unassign / status rules) unchanged.*
