# MVP Order-to-Delivery — Customer Mobile Report

**Date:** July 2026  
**Scope:** `apps/mobile` shopper order visibility + `packages/shared` customer labels  
**Design:** Nice Price Bazar / Liquid Glass

---

## Summary

Customers can now follow their order from placement through delivery with clear status badges, payment visibility, a progress stepper, status timeline, and a delivery section showing driver and address details. Live GPS tracking is **not** faked — a professional notice explains when tracking will be available.

---

## Customer Flow

```
Place order (checkout)
        ↓
   Order placed (pending)
        ↓ Admin confirms
   Preparing your order (confirmed)
        ↓ Admin assigns driver
   Assigned to delivery (assigned)
        ↓ Driver accepts
   Accepted by driver (accepted)
        ↓ Driver picks up
   Picked up (picked_up)
        ↓ Driver en route
   On the way (on_the_way)
        ↓ Driver delivers
   Delivered (delivered)
```

**Cancel:** Customer can cancel only while status is `pending` (before admin confirms).

**Payment:** COD shows “Pay on arrival” until delivered; card/COD marked paid per backend rules.

---

## Statuses Displayed

| Backend status | Customer label (list & detail) |
|----------------|-------------------------------|
| `pending` | Order placed |
| `confirmed` | Preparing your order |
| `assigned` | Assigned to delivery |
| `accepted` | Accepted by driver |
| `picked_up` | Picked up |
| `on_the_way` | On the way |
| `delivered` | Delivered |
| `cancelled` | Cancelled |

Payment badges: **Unpaid**, **Paid**, **Refunded**

---

## Screens Changed

| Screen | Path | Changes |
|--------|------|---------|
| Orders list | `app/(tabs)/orders.tsx` | Customer status badges, payment badge, pull-to-refresh, focus refetch, improved empty state |
| Order detail | `app/order/[id].tsx` | Glass cards, progress stepper, delivery section (driver, address, static map pin), live-tracking notice, payment, items/totals, timeline, delivery proof, cancel with confirm |
| Order card | `src/components/OrderCard.tsx` | Customer labels, `showPaymentStatus` prop |
| Status stepper | `src/components/OrderStatusStepper.tsx` | Customer step labels from shared |
| Order timeline | `src/components/OrderTimeline.tsx` | **New** — vertical history with customer labels |
| Customer utils | `src/utils/customerOrder.ts` | **New** — labels, variants, cancel/tracking helpers |

### Shared package

| File | Changes |
|------|---------|
| `packages/shared/src/constants/index.ts` | `CUSTOMER_ORDER_STATUS_LABELS`, `CUSTOMER_ORDER_STEP_LABELS`, payment labels |

---

## API Calls Used

| Action | Method | Endpoint |
|--------|--------|----------|
| List my orders | `GET` | `/orders/my-orders` |
| Order detail | `GET` | `/orders/:id` |
| Cancel order | `PATCH` | `/orders/:id/cancel` |

Detail response includes: `items`, `address`, `deliveryAgent`, `statusHistory`, `deliveryProof`, `paymentMethod`, `paymentStatus`.

---

## Limitations (MVP)

| Item | Status |
|------|--------|
| Live driver GPS tracking | Not implemented — notice shown instead |
| Moving driver on map | Not shown (static delivery address pin only) |
| Push notifications | Not implemented |
| Cancel after confirmed | Not allowed (backend rule) |
| Driver phone | Shown only when API returns it |

---

## How to Test

### Setup

```powershell
npm run docker:up
npm run api
cd apps/mobile; npx expo start --clear
```

Log in as **`user@doublea.com`** / **`User123!`** on iPhone (Expo Go, same Wi‑Fi).

### Orders list

1. Open **Orders** tab.
2. Confirm each order shows a **customer-friendly status badge** and **payment badge**.
3. Pull down to refresh — list updates without full-screen loading spinner on first load.
4. Tap an order to open detail.

### Order detail — placed order

1. Place a new order from the shop (or use an existing seed order).
2. Verify **Delivery progress** stepper highlights the current step.
3. Verify **Payment** section shows method and status.
4. If `pending`, **Cancel order** appears with confirmation dialog.

### Order detail — in delivery

1. In admin, assign an order to `delivery@doublea.com`.
2. As customer, refresh order detail.
3. Verify **Driver** name appears; call button if phone exists.
4. Verify **Address** and **Open in Maps** work.
5. If address has coordinates, static map pin shows with caption “not live driver tracking”.
6. Verify notice: *“Live tracking will be available when the driver is on the way.”*
7. **Order timeline** lists status changes with notes.

### Full E2E with driver

1. Driver accepts → picks up → on the way → delivers (mobile delivery app).
2. Customer pulls to refresh on order detail.
3. Stepper advances through all steps; final state **Delivered**.
4. **Delivery confirmation** shows proof name/note if driver entered them.
5. COD payment badge updates to **Paid** after delivery.

### Quality checks

```powershell
cd apps/mobile
npx tsc --noEmit
npx expo-doctor
```

---

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Shopper | `user@doublea.com` | `User123!` |
| Driver | `delivery@doublea.com` | `Delivery123!` |
| Admin | `admin@doublea.com` | `Admin123!` |
