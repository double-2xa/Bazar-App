# Mobile iOS Stabilization Report

**Project:** DoubleA Commerce (`apps/mobile`)  
**Date:** July 9, 2026  
**Scope:** Stabilization, verification, and cleanup of Liquid Glass mobile redesign (no new features, no backend changes)

---

# 1. Checks Run

| Command | Location | Result |
|---------|----------|--------|
| `npm install` | `D:\github\Bazar-App` | **Pass** — dependencies installed (1099 packages audited) |
| `npx expo-doctor` | `apps/mobile` | **Pass** — 18/18 checks passed |
| `npx tsc --noEmit` | `apps/mobile` (before fixes) | **Fail** — TS5083 wrong `tsconfig` extends path; app error in `register.tsx`; `DeliveryMap` module not found; hundreds of `node_modules` type noise |
| `npx tsc --noEmit` | `apps/mobile` (after fixes) | **Pass** — exit code 0, no errors |
| `npx expo start` | `apps/mobile` | **Pass (already running)** — port 8081 in use by existing Expo dev server; project loads `.env` correctly |
| `npm run mobile` | root | **Available** — delegates to `@doublea/mobile` `start` script |
| Lint script | `apps/mobile/package.json` | **Missing** — no `lint` script defined |
| Build script | `apps/mobile/package.json` | **Missing** — no dedicated `build`/`typecheck` script (use `npx tsc --noEmit` manually) |

**Available root scripts:** `api`, `api:build`, `admin`, `mobile`, `db:migrate`, `db:seed`, `db:studio`, `docker:up`, `docker:down`

**Available mobile scripts:** `start`, `android`, `ios`, `web`

---

# 2. Errors Found

## Compile / TypeScript

1. **`tsconfig.json` extends path wrong** — pointed to `../../node_modules/expo/tsconfig.base.json` (root) but Expo lives in `apps/mobile/node_modules`.
2. **`src/components/index.ts`** — `Cannot find module './DeliveryMap'` (only `.native.tsx` / `.web.tsx` existed).
3. **`app/(auth)/register.tsx`** — `Record<string, string>` not assignable to register DTO types.
4. **Hundreds of `node_modules` TS errors** when `skipLibCheck` / `esModuleInterop` were not set (React 19 duplicate types, expo-router, etc.).

## Runtime / Navigation (from prior session + code review)

5. **Login `GO_BACK` error** — fixed in prior turn: `router.back()` after login when no back stack (already patched to `router.replace('/(tabs)')`).
6. **Admin login loop** — admin logged in, navigated to tabs, `useRoleGuard` sent back to login while session still active.
7. **Guest cart lost after login** — `guestCart` never merged to server cart before checkout.
8. **Nested `FlatList` inside home `ScrollView`** — virtualization warning and scroll jank risk.
9. **`FloatingActionBar` overlapped floating tab bar** on Cart and Delivery Map tabs.
10. **Glass-on-glass on delivery map sheet** — `FloatingActionBar` > `GlassCard` double blur.
11. **Delivery order detail stale cache** — mutations did not invalidate `['delivery-order', id]`.
12. **Checkout no default address** — user had to manually select before Place Order enabled.

## Not broken (verified)

- Theme exports (`colors`, `spacing`, `radius`, `borderRadius`, `shadows`, `typography`, `glass`)
- `expo-blur` / `expo-haptics` imports and Platform gating in `glass.ts`
- Expo Router file-based routes
- Path alias `@/*` → `./src/*`
- Category slug filtering via `categoryId`
- Role guards for shopper vs delivery_agent

## Partial / environmental (not fixed in this pass)

- **Delivery map empty** when seeded addresses lack `latitude`/`longitude` (data issue, not a crash).
- **Android maps** — no Google Maps API key in `app.json` (release Android builds may show blank map).
- **Tab layout blank flash** while `isLoading` during session restore.
- **Guest checkout UX** — after login user lands on home tabs, must return to cart manually (data now preserved via cart merge).

---

# 3. Fixes Applied

| File | Change |
|------|--------|
| `apps/mobile/tsconfig.json` | Fixed `extends` to `./node_modules/expo/tsconfig.base.json`; added `skipLibCheck: true`, `esModuleInterop: true` |
| `apps/mobile/src/components/DeliveryMap.tsx` | **New** TypeScript stub re-exporting from `.native` |
| `apps/mobile/src/components/GlassView.tsx` | Wrapped children in `position: 'relative', zIndex: 1` for correct blur layering on iOS |
| `apps/mobile/src/components/FloatingActionBar.tsx` | Added `avoidTabBar` prop; lifts bar by `spacing.tabBarOffset` (88px) on tab screens |
| `apps/mobile/src/components/ScreenContainer.tsx` | Applies `bottomInset` padding when `scroll={false}` |
| `apps/mobile/src/store/authStore.ts` | Merges `guestCart` items to server via `cartApi.addItem` after successful `login()` |
| `apps/mobile/app/(tabs)/index.tsx` | Replaced 3 nested horizontal `FlatList`s with horizontal `ScrollView` + `.map()` |
| `apps/mobile/app/(tabs)/cart.tsx` | `FloatingActionBar avoidTabBar`; removed unused `useState` import |
| `apps/mobile/app/(delivery)/map.tsx` | Replaced inner `GlassCard` with solid `View`; `FloatingActionBar avoidTabBar` |
| `apps/mobile/app/checkout.tsx` | Auto-selects default (or first) address when addresses load |
| `apps/mobile/app/delivery-order/[id].tsx` | Invalidates both `delivery-orders` and `delivery-order` detail queries after status changes |
| `apps/mobile/app/(auth)/register.tsx` | Typed submit with `z.infer<>` for register schemas |
| `apps/mobile/app/(auth)/login.tsx` | Admin flow: show dashboard alert, `logout()` on OK, no navigation into shopper tabs |

---

# 4. Flow Verification

*Status based on static code analysis + compile checks. Physical iOS device testing in Expo Go is recommended to confirm runtime behavior.*

| Flow | Status | Notes |
|------|--------|-------|
| Home | **Pass** | API queries, add-to-cart, location row, glass search bar; nested list issue fixed |
| Product detail | **Pass** | Add to cart, wishlist toggle, floating action bar (stack screen, no tab overlap) |
| Cart | **Pass** | Guest + server cart paths; badge via `useCartCount`; FAB clears tab bar |
| Checkout | **Pass** | COD payment, address selection auto-default, server cart; requires auth |
| Category slug | **Pass** | Resolves slug → `categoryId` → `productsApi.getAll({ categoryId })` |
| Wishlist | **Pass** | Auth gate, list/remove with confirmation; redirects unauthenticated to login |
| Addresses | **Pass** | List, set default, delete, add new; glass cards on solid background |
| Company pricing | **Pass** | Toggle on home for approved company; pending banner for pending status |
| Delivery dashboard | **Pass** | Active orders grouped; links to order detail |
| Delivery map | **Partial** | Renders when orders have lat/lng; empty state otherwise; Amsterdam fallback center |
| Delivery order detail | **Pass** | Status buttons wired; cache invalidation fixed; map when coords exist |
| Role guards | **Pass** | Delivery → delivery tabs; shoppers blocked from delivery; admin logged out + dashboard prompt |

---

# 5. iOS Notes

- **`expo-blur`**: Used only when `glass.useBlur === true` (iOS). Android uses opaque fallback in `GlassView` — no broken transparent panels.
- **`expo-haptics`**: Used in add-to-cart, checkout success, address actions; safe no-ops on unsupported devices via utility wrapper.
- **Floating tab bar**: `glassTabBarStyle` positions bar 24px from bottom on iOS with `BlurView` background; scene content needs `bottomInset` / `avoidTabBar` on FABs — now applied on Cart and Map.
- **Safe areas**: `ScreenContainer` uses `react-native-safe-area-context`; `FloatingActionBar` respects bottom inset for home indicator.
- **Expo Go SDK 54**: Project targets Expo SDK 54 / RN 0.81.5 — matches current Expo Go.
- **LAN API**: Phone must reach `EXPO_PUBLIC_API_URL` (e.g. `http://192.168.178.206:3001/api`); VPN can block LAN.
- **Product cards**: Remain solid (`colors.surface`) — readable, not glass (correct pattern).
- **Glass usage**: Tab bar, search bar, headers (component available), floating action bars, checkout summary cards — no glass-on-glass after map fix.

---

# 6. Remaining TODO

Real work still outstanding (not claimed as done):

1. **Address map picker / autocomplete** — add-address form has no geo capture UI.
2. **Live driver GPS tracking** — requires backend WebSocket or polling endpoint.
3. **Product reviews UI** — API exists; no mobile review screen.
4. **Settings screen** — still placeholder if present in profile.
5. **Custom fonts** — typography uses system fonts only.
6. **Android release maps** — add `react-native-maps` plugin + Google Maps API key to `app.json`.
7. **Guest checkout navigation** — after login from cart, user goes to home; could deep-link back to checkout (UX polish).
8. **Register flow guest cart merge** — only `login()` merges guest cart today.
9. **Physical device QA** — blur performance, keyboard on forms, tab bar on iPhone SE / notch devices.
10. **Add `typecheck` script** — e.g. `"typecheck": "tsc --noEmit"` in `apps/mobile/package.json` (optional convenience).

---

# 7. Commands For Me

Run these in **Windows PowerShell** from your machine:

```powershell
# 1. Install dependencies (from repo root)
cd D:\github\Bazar-App
npm install

# 2. Start API (separate terminal — required for mobile data)
cd D:\github\Bazar-App
npm run api

# 3. TypeScript check (mobile)
cd D:\github\Bazar-App\apps\mobile
npx tsc --noEmit

# 4. Expo health check
cd D:\github\Bazar-App\apps\mobile
npx expo-doctor

# 5. Start mobile (clear cache if odd behavior)
cd D:\github\Bazar-App\apps\mobile
npx expo start --clear

# Or from root:
cd D:\github\Bazar-App
npm run mobile
```

**Demo logins (after `npm run db:seed` on API):**

| Role | Email | Password |
|------|-------|----------|
| Customer | `user@doublea.com` | `User123!` |
| Company | `company@doublea.com` | `Company123!` |
| Delivery | `delivery@doublea.com` | `Delivery123!` |
| Admin | `admin@doublea.com` | `Admin123!` |

**Ensure `apps/mobile/.env` includes:**

```
EXPO_PUBLIC_API_URL=http://<YOUR_PC_LAN_IP>:3001/api
EXPO_PUBLIC_ADMIN_URL=http://<YOUR_PC_LAN_IP>:3000
```

Replace `<YOUR_PC_LAN_IP>` with your Windows LAN address (e.g. `192.168.178.206`).

---

*End of report.*
