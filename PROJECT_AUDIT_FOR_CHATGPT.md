# PROJECT_AUDIT_FOR_CHATGPT.md

> **Audit date:** July 9, 2026  
> **Repository:** `d:\github\Bazar-App` (internal name: `doublea-commerce`)  
> **Method:** Read-only inspection of all source files. No code was modified during this audit.

---

# 1. Project Overview

This is a **mixed full-stack e-commerce monorepo** branded internally as **DoubleA Commerce**. It is not a single app — it consists of:

| App | Purpose |
|-----|---------|
| **Mobile app** (`apps/mobile`) | React Native + Expo customer shopping app AND delivery-agent app (role-based routing) |
| **Admin dashboard** (`apps/admin`) | Next.js web dashboard for platform administrators |
| **REST API** (`apps/api`) | NestJS backend with PostgreSQL via Prisma |
| **Shared package** (`packages/shared`) | TypeScript types, Zod validators, constants shared across frontends |

### Business purpose (from code)

The platform is an **Amazon-inspired B2C + B2B wholesale e-commerce system** with:

- Product catalog browsing and search
- Shopping cart and checkout (Cash on Delivery only in practice)
- Order management and status tracking
- **Company/wholesale accounts** with separate pricing (`companyPrice` vs `normalPrice`)
- **Delivery agent** role with order pickup → on-the-way → delivered workflow
- **Admin** operations: users, companies, products, orders, coupons, reviews

It is **not** a geo-specialized app today despite the owner's stated ambition. Geo features are minimal (lat/lng fields + a static map marker).

### Maturity assessment

**Functional MVP / prototype stage.** Core data models and API endpoints exist. Primary shopping and delivery flows are wired end-to-end. Many UI interactions are stubs, several admin features are incomplete, and there is no production-grade infrastructure (CI/CD, tests, K8s, payments, notifications).

---

# 2. Tech Stack

## Languages
- **TypeScript** — all apps and shared package
- **SQL** — Prisma migration (`apps/api/prisma/migrations/`)

## Mobile (`apps/mobile`)
| Technology | Version (from `package.json`) |
|------------|-------------------------------|
| Expo SDK | `~54.0.0` (installed: 54.0.35) |
| React Native | `0.81.5` |
| React | `19.1.0` |
| Expo Router | `~6.0.0` (file-based routing) |
| Zustand | `^4.5.2` (auth + guest cart) |
| TanStack React Query | `^5.36.0` (server state) |
| Axios | `^1.6.8` |
| React Hook Form + Zod | `^7.51.4` / `^3.23.8` |
| react-native-maps | `1.20.1` (static map only) |
| react-native-reanimated | `~4.1.0` |
| expo-secure-store | `~15.0.0` (token storage) |
| babel-preset-expo | `~54.0.0` |

## Admin (`apps/admin`)
| Technology | Version |
|------------|---------|
| Next.js | `^14.2.3` |
| React | `^18.2.0` (root overrides force 19.1.0) |
| Axios | `^1.6.8` |
| react-hook-form, zod | In `package.json` but **unused in admin code** |

## API (`apps/api`)
| Technology | Version |
|------------|---------|
| NestJS | `^10.3.8` |
| Prisma | `^5.14.0` |
| PostgreSQL | 16 (via Docker) |
| bcrypt | `^5.1.1` (cost factor 12) |
| @nestjs/jwt | `^10.2.0` |
| class-validator / class-transformer | Input validation |
| passport, passport-jwt, zod | In `package.json` but **unused in API source** |

## Shared (`packages/shared`)
- TypeScript types, Zod validators, constants
- No runtime framework

## Database
- **PostgreSQL 16** via Prisma ORM
- Single init migration: `20240701000000_init`
- Seed script: `apps/api/prisma/seed.ts`

## Auth system
- JWT access tokens (15m default) + opaque refresh tokens stored in DB
- Global `JwtAuthGuard` with `@Public()` and `@Roles()` decorators
- No OAuth, no email verification, no password reset

## State management
- **Mobile:** Zustand (auth/guest cart) + React Query (everything else)
- **Admin:** React `useState` + direct axios calls (no global store)

## Styling / UI
- **Mobile:** Custom theme in `apps/mobile/src/theme/index.ts` (Amazon-inspired orange/navy palette), `StyleSheet.create()` per screen
- **Admin:** Global CSS (`globals.css`) + heavy inline styles. No Tailwind, no component library
- **No design system shared between mobile and admin**

## Maps / geolocation
- `react-native-maps` — static marker on delivery order detail only
- `Linking.openURL` to Apple/Google Maps for external navigation
- Lat/lng stored on `Address` and `DeliveryProof` models
- **No:** Mapbox, Google Maps SDK, Leaflet, PostGIS, geocoding, live tracking, route optimization

## Payments
- Schema supports `cash_on_delivery` and `card`
- **Only COD implemented.** Card payment has no gateway (Stripe, etc.)

## Notifications
- **None.** No push, email, or SMS code exists anywhere.

## File uploads
- **None.** All images are URL strings (Unsplash URLs in seed data).

## Infrastructure
- `docker-compose.yml` — PostgreSQL, pgAdmin, API container
- `apps/api/Dockerfile` — multi-stage Node 20 Alpine build
- **No:** Kubernetes, Helm, CI/CD pipelines, reverse proxy config

---

# 3. Project Folder Structure

```
Bazar-App/
├── package.json                 # Root workspace config, scripts, React/RN overrides
├── package-lock.json
├── tsconfig.json
├── docker-compose.yml           # Postgres + pgAdmin + API services
├── .env.example                 # Root env template (has URL inconsistencies)
├── README.md
│
├── apps/
│   ├── api/                     # NestJS REST API
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── .env.example
│   │   ├── prisma/
│   │   │   ├── schema.prisma    # 17 models, 7 enums
│   │   │   ├── seed.ts          # Demo data seeder
│   │   │   └── migrations/
│   │   │       └── 20240701000000_init/
│   │   └── src/
│   │       ├── main.ts          # Entry: CORS, ValidationPipe, prefix /api
│   │       ├── app.module.ts    # Root module
│   │       ├── app.controller.ts
│   │       ├── auth/            # Login, register, JWT, refresh tokens
│   │       ├── products/        # Product CRUD + public listing
│   │       ├── categories/      # Category CRUD + public listing
│   │       ├── cart/            # Authenticated cart operations
│   │       ├── addresses/       # User address CRUD
│   │       ├── orders/          # Order create/list/cancel + admin ops
│   │       ├── delivery/        # Delivery agent order workflow
│   │       ├── reviews/         # Product reviews
│   │       ├── coupons/         # Admin coupon CRUD (no user-facing validate)
│   │       ├── admin/           # Dashboard, users, companies, agents
│   │       ├── banners/         # Public banner listing (read-only)
│   │       ├── wishlist/        # User wishlist CRUD
│   │       ├── users/           # EMPTY STUB MODULE
│   │       ├── prisma/          # PrismaService (global)
│   │       └── common/
│   │           ├── guards/      # JwtAuthGuard (global)
│   │           ├── decorators/  # @Public, @Roles, @CurrentUser, @OptionalAuth
│   │           └── utils/       # sanitizeUser, slugify (unused)
│   │
│   ├── admin/                   # Next.js 14 admin dashboard
│   │   ├── package.json
│   │   ├── .env.example
│   │   ├── next.config.js
│   │   └── src/
│   │       ├── app/
│   │       │   ├── layout.tsx
│   │       │   ├── page.tsx           # Redirect to dashboard or login
│   │       │   ├── login/page.tsx
│   │       │   ├── globals.css
│   │       │   └── (admin)/           # Authenticated admin pages
│   │       │       ├── layout.tsx       # Sidebar nav + localStorage auth guard
│   │       │       ├── dashboard/
│   │       │       ├── products/
│   │       │       ├── categories/
│   │       │       ├── orders/
│   │       │       ├── users/
│   │       │       ├── companies/
│   │       │       ├── delivery-agents/
│   │       │       ├── coupons/
│   │       │       ├── reviews/
│   │       │       └── settings/        # PLACEHOLDER — no functionality
│   │       ├── services/api.ts        # Axios client
│   │       └── theme/colors.ts        # UNUSED — never imported
│   │
│   └── mobile/                  # Expo React Native app
│       ├── package.json
│       ├── app.json             # Expo config (no icon/splash assets on disk)
│       ├── .env.example
│       ├── babel.config.js      # Monorepo workaround for expo-router plugin
│       ├── metro.config.js      # Web stub for react-native-maps
│       ├── tsconfig.json
│       ├── app/                 # Expo Router screens (27 route files)
│       │   ├── _layout.tsx      # Root layout + React Query provider
│       │   ├── index.tsx        # Splash + role-based redirect
│       │   ├── (tabs)/          # Customer bottom tabs
│       │   ├── (auth)/          # Login/register modal
│       │   ├── (delivery)/      # Delivery agent bottom tabs
│       │   ├── product/[id].tsx
│       │   ├── category/[slug].tsx
│       │   ├── checkout.tsx
│       │   ├── order-confirmation.tsx
│       │   ├── order/[id].tsx
│       │   ├── addresses.tsx
│       │   ├── add-address.tsx
│       │   ├── wishlist.tsx
│       │   ├── company-profile.tsx
│       │   ├── delivery-order/[id].tsx
│       │   └── delivery-completed.tsx
│       └── src/
│           ├── components/      # 13 reusable UI components
│           ├── services/        # api.ts, endpoints.ts, tokenStorage.ts
│           ├── store/           # authStore.ts (only Zustand store)
│           └── theme/           # colors, spacing, typography, shadows
│
└── packages/
    └── shared/
        ├── package.json
        └── src/
            ├── index.ts
            ├── types/index.ts       # Shared TypeScript interfaces
            ├── validators/index.ts  # Zod schemas
            └── constants/index.ts   # Roles, fees, demo accounts
```

### Folder purposes

| Folder | Role |
|--------|------|
| `apps/api` | Backend business logic, auth, database access |
| `apps/admin` | Web admin panel for platform management |
| `apps/mobile` | iOS/Android customer + delivery agent mobile app |
| `packages/shared` | Cross-app types and validation (underused by API and admin) |

### Notable absences
- No `tests/` directory anywhere
- No `.github/workflows/` or CI config
- No `kubernetes/` or `helm/` directories
- No `apps/mobile/assets/` — icon/splash images referenced in old config were removed; `app.json` no longer references missing files
- No dedicated `components/` folder in admin — all UI is inline in page files

---

# 4. Current Features Implemented

## Authentication / Login / Registration

| What works | Details |
|------------|---------|
| User registration (personal) | `POST /api/auth/register` — `apps/api/src/auth/`, mobile `(auth)/register.tsx` |
| Company registration | `POST /api/auth/register-company` — creates `CompanyProfile` with `pending` status |
| Login | `POST /api/auth/login` — returns JWT + refresh token |
| Token refresh | `POST /api/auth/refresh` — rotates refresh token |
| Logout | `POST /api/auth/logout` — deletes refresh token |
| Session restore | Mobile `loadSession()` → `GET /api/auth/me` |
| Secure token storage | `expo-secure-store` (native), `localStorage` (web) |

| Incomplete / missing |
|---------------------|
| No password reset, email verification, or 2FA |
| Pending company accounts can still log in and get tokens |
| Guest cart not merged to server cart on login |
| Admin users redirected to login on mobile but tokens may persist |
| No rate limiting on auth endpoints |

---

## User Roles

| What works | Details |
|------------|---------|
| 4 roles defined | `normal_user`, `company`, `admin`, `delivery_agent` in Prisma + shared constants |
| Backend role enforcement | `@Roles()` decorator on admin, delivery, product/category write endpoints |
| Mobile role routing | Splash screen routes `delivery_agent` → delivery tabs, others → customer tabs |
| Company approval flow | Admin can approve/reject; company pricing gated on `status === 'approved'` |

| Incomplete / missing |
|---------------------|
| No frontend route guards — any role can deep-link to any screen |
| `admin` role has no mobile app experience (redirected to login) |
| No seller/company-admin role separate from `company` buyer |
| Deactivating user does not invalidate existing access tokens |

---

## Products / Catalog

| What works | Details |
|------------|---------|
| Product listing with pagination, search, sort, filter | `GET /api/products` |
| Product detail by ID and slug | `GET /api/products/:id`, `/products/slug/:slug` |
| Category listing | `GET /api/categories` |
| Category product list screen | `apps/mobile/app/category/[slug].tsx` — **BROKEN: ignores slug param** |
| Featured products on home | `(tabs)/index.tsx` |
| Search with sort options | `(tabs)/search.tsx` — no debounce |
| Admin product create/delete | `apps/admin/.../products/page.tsx` |
| Dual pricing (normal + company) | `Product.normalPrice`, `Product.companyPrice` |
| Product images | `ProductImage` model; seed uses Unsplash URLs |
| Product reviews (read) | `GET /api/products/:id/reviews` |

| Incomplete / missing |
|---------------------|
| No product edit in admin (PATCH exists in API, unused in admin UI) |
| No image upload — URLs only |
| No inventory alerts, variants, or product attributes |
| Reviews cannot be submitted from mobile (API exists, UI missing) |
| Home "Add to Cart" buttons are no-ops (`onAddToCart={() => {}}`) |
| No product recommendations or recently viewed |

---

## Cart

| What works | Details |
|------------|---------|
| Server cart (authenticated) | Full CRUD via `/api/cart` |
| Guest cart (in-memory) | Zustand `guestCart` in `authStore.ts` |
| Add to cart from product detail | `product/[id].tsx` |
| Cart screen with quantity update/remove | `(tabs)/cart.tsx` |
| Company vs normal price selection | `selectedPriceType` on cart items |
| Stock validation on add | `cart.service.ts` |

| Incomplete / missing |
|---------------------|
| Guest cart lost on app restart (not persisted) |
| Guest cart not synced on login |
| Authenticated cart tab badge always shows 0 (`(tabs)/_layout.tsx`) |
| Cart not invalidated after checkout |
| No cart merge logic |

---

## Orders

| What works | Details |
|------------|---------|
| Order creation | `POST /api/orders` — calculates tax (8%), delivery fee ($5.99), applies coupons |
| Order history | `GET /api/orders/my-orders` |
| Order detail | `GET /api/orders/:id` with ownership checks |
| Order cancellation | `PATCH /api/orders/:id/cancel` (pending only) |
| Stock decrement on order | Transactional in `orders.service.ts` |
| Order status history | `OrderStatusHistory` model |
| Admin order management | List + status update |
| Order confirmation screen | `order-confirmation.tsx` |

| Incomplete / missing |
|---------------------|
| No order tracking map for customers |
| No push/email notifications on status change |
| Admin cannot assign delivery agent from UI (API endpoint exists) |
| Coupon applied silently at order time — no preview/validate endpoint for users |
| No order editing after placement |
| No refund flow |

---

## Delivery

| What works | Details |
|------------|---------|
| Delivery agent order list | `GET /api/delivery/orders` — grouped by status |
| Status workflow | picked-up → on-the-way → delivered |
| Delivery proof with geo coords | `DeliveryProof` model, optional lat/lng |
| COD auto-marked paid on delivery | `delivery.service.ts` |
| Agent order detail with map | `delivery-order/[id].tsx` + `DeliveryMap.native.tsx` |
| External map navigation | `Linking.openURL` to Apple/Google Maps |
| Agent dashboard with 30s polling | `(delivery)/index.tsx` |
| Admin can create delivery agents | `POST /api/admin/delivery-agents` |

| Incomplete / missing |
|---------------------|
| Delivery map tab is empty stub (`(delivery)/map.tsx`) |
| No live agent location tracking |
| No route optimization or ETA |
| Completed orders list has no-op `onPress` handlers |
| Agent profile reuses customer profile (not agent-specific) |
| No delivery agent list in admin (no GET endpoint) |
| No proof-of-delivery photo upload |

---

## Wholesale / B2B

| What works | Details |
|------------|---------|
| Company registration with business details | VAT, address, contact person |
| Admin approve/reject company accounts | `companies/page.tsx` |
| Company pricing toggle on mobile | `CompanyPriceToggle.tsx` for approved companies |
| Dual price display | `PriceDisplay.tsx`, `ProductCard.tsx` |
| Company profile view (read-only) | `company-profile.tsx` |
| Company price type on cart/order items | `PriceType` enum |

| Incomplete / missing |
|---------------------|
| No wholesale-specific flows (bulk order, PO, credit terms, minimum order qty) |
| Pending companies see normal prices only — no "pending approval" UX beyond registration message |
| No company admin sub-role for managing their own catalog/orders |
| No invoice generation |

---

## Admin Dashboard

| What works | Details |
|------------|---------|
| Login with admin role check | `login/page.tsx` |
| Dashboard stats | Total users, orders, revenue, products |
| Product create + delete + search | |
| Category create + list | |
| Order list + status filter + status update | |
| User list + activate/deactivate | |
| Company list + approve/reject | |
| Delivery agent creation form | |
| Coupon create + list | |
| Review list + delete | |

| Incomplete / missing |
|---------------------|
| Settings page is static placeholder — Save does nothing |
| No product/category/coupon edit or delete in admin UI |
| No delivery agent listing |
| No order → delivery agent assignment UI |
| No banner management (API read-only, no admin UI) |
| No pagination UI (API supports it) |
| No token refresh flow (tokens stored, never refreshed) |
| No error handling UX beyond console.error |

---

## Maps / Geo Features

| What works | Details |
|------------|---------|
| Static map with delivery marker | `DeliveryMap.native.tsx` on agent order detail |
| Lat/lng on addresses and delivery proof | Database fields exist |
| External navigation link | Opens Apple/Google Maps |

| Incomplete / missing |
|---------------------|
| Delivery map tab is empty |
| No live tracking, geofencing, route display |
| No address autocomplete or geocoding |
| No PostGIS, Mapbox, Google Maps SDK integration |
| No customer-facing delivery tracking map |

---

## Payments

| What works | Details |
|------------|---------|
| COD payment method | Hardcoded in `checkout.tsx` and order creation |
| Payment status tracking | `unpaid` → `paid` on COD delivery |

| Incomplete / missing |
|---------------------|
| Card payment enum exists but no gateway integration |
| No Stripe, PayPal, Apple Pay, Google Pay |
| No refund processing |
| No payment history screen |

---

## Notifications

**Not implemented.** No push notifications, email, or SMS anywhere in the codebase.

---

## File Uploads

**Not implemented.** No multer, S3, or cloud storage integration. All images are URL strings.

---

## Database / API

| What works | Details |
|------------|---------|
| 17 Prisma models with relations | See Section 8 |
| 52 API route handlers | See Section 7 |
| Global validation pipe | class-validator on all DTOs |
| Seed script with demo data | 4 accounts, 22 products, 5 categories, 2 orders |
| Docker Compose for local dev | Postgres + pgAdmin + API |
| Single migration deployed | `20240701000000_init` |

| Incomplete / missing |
|---------------------|
| `UsersModule` is empty stub |
| `@doublea/shared` not imported in API (duplicate validation logic) |
| Health endpoints require JWT (not publicly accessible) |
| No API versioning |
| No OpenAPI/Swagger documentation |
| Docker API container has OpenSSL/Prisma issues on Alpine |

---

## Other Features

| Feature | Status |
|---------|--------|
| Wishlist (API) | Full CRUD backend |
| Wishlist (mobile UI) | Read-only list — no add/remove buttons anywhere |
| Banners (API) | Public GET only |
| Banners (admin/mobile) | Mobile displays on home; no admin CRUD |
| Coupons (API) | Admin CRUD; applied at order creation if code matches |
| Coupons (mobile) | Text input on checkout only |
| Product reviews (API) | Create requires delivered order; admin delete |
| Product reviews (mobile) | **Not implemented in UI** |
| Address management (API) | Full CRUD + set default |
| Address management (mobile) | List + create only; edit/delete/default are no-ops |
| Dark mode | Not supported (`userInterfaceStyle: "light"`) |
| i18n / localization | Not supported; hardcoded `$` currency |
| Accessibility | No `accessibilityLabel` usage found |

---

# 5. User Roles and Permissions

## Roles defined

| Role | Enum value | Defined in |
|------|-----------|------------|
| Guest (implicit) | No account | Not a DB role — unauthenticated API access to public endpoints |
| Normal buyer | `normal_user` | `prisma/schema.prisma` → `UserRole`, `packages/shared/src/constants/index.ts` |
| Wholesale company | `company` | Same + `CompanyProfile` with `CompanyStatus` |
| Delivery driver | `delivery_agent` | Same |
| Platform admin | `admin` | Same |

**No `seller` or `company_admin` role exists.**

## Per-role access

### Guest (unauthenticated)
| Access | Enforcement |
|--------|-------------|
| Browse products, categories, banners | Backend: `@Public()` on GET endpoints |
| Search products | Same |
| Guest cart (in-memory) | Frontend only — Zustand |
| Cannot: cart API, orders, wishlist, addresses, checkout | Backend: JWT required → 401 |

**Frontend:** No hard block on checkout/wishlist screens — will fail at API level.

### `normal_user`
| Mobile screens | All customer tabs + checkout + orders + addresses + wishlist |
| API | Cart, orders, addresses, wishlist, reviews (authenticated endpoints) |
| Pricing | `normalPrice` only |

### `company`
| Mobile screens | Same as normal_user + `company-profile.tsx` + `CompanyPriceToggle` |
| API | Same endpoints; company pricing enforced in `orders.service.ts` at order time |
| Pricing | `companyPrice` when `companyProfile.status === 'approved'` and toggle on |
| Restrictions | Cannot get company prices if pending/rejected |

**Backend enforcement:** Order creation checks role + approval status.  
**Frontend enforcement:** Toggle visibility gated on approval status.  
**Gap:** Pending companies can log in and browse; only pricing is blocked.

### `delivery_agent`
| Mobile screens | `(delivery)/*` tabs: dashboard, map (stub), completed, profile |
| API | `/api/delivery/*` — class-level `@Roles('delivery_agent')` |
| Permissions | View assigned orders, update status, submit delivery proof |
| Order access | `orders.service.ts` checks agent is assigned to order |

**Frontend:** No layout-level guard — customer tabs accessible via deep link.  
**Backend:** Delivery endpoints properly role-gated.

### `admin`
| Mobile | Redirected to login screen with message to use admin dashboard |
| Admin dashboard | All `/api/admin/*` endpoints — class-level `@Roles('admin')` |
| API write access | Products, categories, coupons, users, companies, orders, reviews, delivery agent creation |

**Frontend (admin):** `localStorage` token check in `(admin)/layout.tsx` — no server-side session validation on page load.  
**Backend:** All admin endpoints properly role-gated.

---

# 6. App Screens / Pages

## Mobile screens (27 route files)

| Screen | Path | Purpose | Role | UI Status | Key components |
|--------|------|---------|------|-----------|----------------|
| Splash | `app/index.tsx` | Logo animation + role redirect | All | Complete | Animated logo |
| Home | `app/(tabs)/index.tsx` | Banners, categories, featured, products | Guest + all users | Mostly complete — **broken add-to-cart** | `ProductCard`, `CategoryCard`, `SectionHeader`, `CompanyPriceToggle` |
| Search | `app/(tabs)/search.tsx` | Product search + sort | Guest + all | Basic — no debounce | `ProductCard`, `AppInput` |
| Cart | `app/(tabs)/cart.tsx` | Guest or server cart | Guest + auth | Complete | `PriceDisplay`, `AppButton` |
| Orders | `app/(tabs)/orders.tsx` | Order history | Auth only (empty state for guest) | Complete | `OrderCard`, `EmptyState` |
| Profile | `app/(tabs)/profile.tsx` | User info + menu | All | Basic — Settings is dead link | `AppButton`, `Badge` |
| Login | `app/(auth)/login.tsx` | Email/password login | All | Complete | `AppInput`, `AppButton` |
| Register | `app/(auth)/register.tsx` | Personal or company signup | All | Complete | `AppInput`, `AppButton` |
| Product detail | `app/product/[id].tsx` | Product info + add to cart | Guest + all | Complete | `PriceDisplay`, `CompanyPriceToggle` |
| Category | `app/category/[slug].tsx` | Category products | Guest + all | **Broken** — ignores slug | `ProductCard` |
| Checkout | `app/checkout.tsx` | Address + COD checkout | Auth (no guard) | Complete — COD only | `AppInput`, `PriceDisplay` |
| Order confirmation | `app/order-confirmation.tsx` | Success message | Auth | Basic | `AppButton` |
| Order detail | `app/order/[id].tsx` | Order items + cancel | Auth | Complete | `Badge`, `PriceDisplay` |
| Addresses | `app/addresses.tsx` | Address list | Auth (no guard) | **Incomplete** — buttons are no-ops | `AppButton`, `EmptyState` |
| Add address | `app/add-address.tsx` | Create address form | Auth | Complete | `AppInput`, `AppButton` |
| Wishlist | `app/wishlist.tsx` | Saved products grid | Auth (no guard) | **Read-only** — no add/remove | `ProductCard`, `EmptyState` |
| Company profile | `app/company-profile.tsx` | Read-only company info | Company | Basic — text only | None |
| Delivery dashboard | `app/(delivery)/index.tsx` | Active orders by status | Delivery agent | Complete | `OrderCard`, `Badge` |
| Delivery map | `app/(delivery)/map.tsx` | Map view | Delivery agent | **Placeholder** — EmptyState only | `EmptyState` |
| Delivery completed | `app/(delivery)/completed.tsx` | Delivered orders list | Delivery agent | **Incomplete** — no-op onPress | `OrderCard` |
| Delivery profile | `app/(delivery)/profile.tsx` | Re-exports customer profile | Delivery agent | Basic — not agent-specific | Re-export |
| Delivery order detail | `app/delivery-order/[id].tsx` | Status workflow + map | Delivery agent | Most complete secondary screen | `DeliveryMap`, `AppButton`, `Badge` |
| Delivery completed success | `app/delivery-completed.tsx` | Post-delivery confirmation | Delivery agent | Basic | `AppButton` |

## Admin pages (10 routes)

| Page | Path | Purpose | UI Status |
|------|------|---------|-------------|
| Root redirect | `src/app/page.tsx` | → dashboard or login | Complete |
| Login | `src/app/login/page.tsx` | Admin authentication | Complete |
| Dashboard | `src/app/(admin)/dashboard/page.tsx` | Stats overview | Complete (read-only) |
| Products | `src/app/(admin)/products/page.tsx` | Create + delete + search | Basic — no edit |
| Categories | `src/app/(admin)/categories/page.tsx` | Create + list | Basic — no edit/delete |
| Orders | `src/app/(admin)/orders/page.tsx` | List + status update | Basic — no agent assignment |
| Users | `src/app/(admin)/users/page.tsx` | List + activate/deactivate | Complete |
| Companies | `src/app/(admin)/companies/page.tsx` | List + approve/reject | Complete |
| Delivery Agents | `src/app/(admin)/delivery-agents/page.tsx` | Create form only | **Incomplete** — no list |
| Coupons | `src/app/(admin)/coupons/page.tsx` | Create + list | Basic — no edit/delete |
| Reviews | `src/app/(admin)/reviews/page.tsx` | List + delete | Complete |
| Settings | `src/app/(admin)/settings/page.tsx` | Platform settings | **Placeholder** — nothing works |

---

# 7. Backend/API Analysis

## Framework
**NestJS 10** with Express adapter, Prisma ORM, global JWT auth guard.

## Entry point
`apps/api/src/main.ts`
- CORS: `origin: true` (reflects any origin), `credentials: true`
- Global prefix: `api`
- Global `ValidationPipe`: whitelist, transform, forbidNonWhitelisted
- Port: `API_PORT` env (default 3001)

## API routes (52 handlers, base `/api`)

### Public endpoints
| Method | Path | Controller |
|--------|------|------------|
| POST | `/auth/register` | AuthController |
| POST | `/auth/register-company` | AuthController |
| POST | `/auth/login` | AuthController |
| POST | `/auth/refresh` | AuthController |
| POST | `/auth/logout` | AuthController |
| GET | `/products` | ProductsController |
| GET | `/products/slug/:slug` | ProductsController |
| GET | `/products/:id` | ProductsController |
| GET | `/categories` | CategoriesController |
| GET | `/categories/:id` | CategoriesController |
| GET | `/banners` | BannersController |
| GET | `/products/:id/reviews` | ReviewsController |

### Authenticated endpoints (JWT required)
| Method | Path | Notes |
|--------|------|-------|
| GET | `/auth/me` | Current user |
| GET/POST/PATCH/DELETE | `/cart/*` | Cart operations |
| GET/POST/PATCH/DELETE | `/addresses/*` | Address CRUD |
| POST | `/orders` | Create order |
| GET | `/orders/my-orders` | User's orders |
| GET | `/orders/:id` | Order detail (ownership check) |
| PATCH | `/orders/:id/cancel` | Cancel pending order |
| GET/POST/DELETE | `/wishlist/*` | Wishlist CRUD |
| POST | `/reviews` | Create review (requires delivered order) |

### Admin-only (`@Roles('admin')`)
| Method | Path |
|--------|------|
| POST/PATCH/DELETE | `/products`, `/products/:id` |
| POST/PATCH/DELETE | `/categories`, `/categories/:id` |
| GET | `/admin/dashboard` |
| GET/PATCH | `/admin/users`, `/admin/users/:id/activate\|deactivate` |
| GET/PATCH | `/admin/company-accounts`, `.../approve\|reject` |
| POST | `/admin/delivery-agents` |
| GET/PATCH | `/admin/orders`, `/admin/orders/:id/status`, `.../assign-delivery-agent` |
| GET | `/admin/reviews` |
| GET/POST/PATCH/DELETE | `/admin/coupons`, `/admin/coupons/:id` |
| DELETE | `/reviews/:id` |

### Delivery agent-only (`@Roles('delivery_agent')`)
| Method | Path |
|--------|------|
| GET | `/delivery/orders` |
| GET | `/delivery/orders/:id` |
| PATCH | `/delivery/orders/:id/picked-up` |
| PATCH | `/delivery/orders/:id/on-the-way` |
| PATCH | `/delivery/orders/:id/delivered` |

### Broken / problematic endpoints
| Method | Path | Issue |
|--------|------|-------|
| GET | `/` | Requires JWT — should be public health check |
| GET | `/health` | Requires JWT — should be public |

## Auth middleware
- **Global guard:** `JwtAuthGuard` registered via `APP_GUARD` in `auth.module.ts`
- **Decorators:** `@Public()` bypasses JWT; `@Roles(...)` checks role; `@CurrentUser()` extracts JWT payload
- **No Passport strategy** despite packages being installed
- **No `RolesGuard`** — role logic is inline in `JwtAuthGuard`

## Services (13 active)
See Section 4 for per-service responsibilities. `UsersModule` is an empty stub.

## Error handling
- NestJS default HTTP exceptions only (`UnauthorizedException`, `ForbiddenException`, `NotFoundException`, `BadRequestException`, `ConflictException`)
- No custom exception filters, no structured error codes, no logging middleware
- Transactions used in orders, reviews, delivery (good)

## Validation
- **API:** `class-validator` DTOs on all endpoints
- **Shared Zod schemas:** Exist in `packages/shared` but **not used by API**
- **Gap:** `UpdateOrderStatusDto.status` accepts any string — no enum validation

## Environment variables needed
See Section 12.

---

# 8. Database / Data Model

## Enums (7)
`UserRole`, `CompanyStatus`, `PriceType`, `OrderStatus`, `PaymentMethod`, `PaymentStatus`, `CouponType`

## Models (17)

### User
```
User { id, email, passwordHash, fullName, phone?, role, isActive, timestamps }
  → companyProfile?, addresses[], cart?, orders[], assignedOrders[], wishlist[], reviews[], refreshTokens[]
```

### CompanyProfile
```
CompanyProfile { id, userId, companyName, vatNumber, businessAddress, contactPerson, companyPhone, status, timestamps }
  → user
```

### Category
```
Category { id, name, slug, description?, imageUrl?, isActive, timestamps }
  → products[]
```

### Product
```
Product { id, categoryId, name, slug, description, normalPrice, companyPrice, stockQuantity, sku, brand?, imageUrl?, ratingAverage, ratingCount, isFeatured, isActive, timestamps }
  → category, images[], cartItems[], orderItems[], wishlist[], reviews[]
```

### ProductImage
```
ProductImage { id, productId, imageUrl, sortOrder }
```

### Address
```
Address { id, userId, label, fullName, phone, country, city, street, building?, floor?, apartment?, postalCode, latitude?, longitude?, isDefault, timestamps }
  → user, orders[]
```

### Cart / CartItem
```
Cart { id, userId (unique), timestamps } → items[]
CartItem { id, cartId, productId, quantity, selectedPriceType, timestamps }
  Unique: [cartId, productId, selectedPriceType]
```

### Order / OrderItem
```
Order { id, orderNumber, userId, addressId, deliveryAgentId?, status, paymentMethod, paymentStatus, subtotal, deliveryFee, discountAmount, taxAmount, totalAmount, customerNote?, timestamps }
  → user, address, deliveryAgent?, items[], statusHistory[], deliveryProof?, reviews[]
OrderItem { id, orderId, productId, productName, quantity, unitPrice, selectedPriceType, totalPrice }
```

### OrderStatusHistory
```
OrderStatusHistory { id, orderId, status, note?, changedByUserId?, createdAt }
```

### DeliveryProof
```
DeliveryProof { id, orderId (unique), deliveryAgentId, deliveredToName?, deliveryNote?, deliveredAt, latitude?, longitude? }
```

### Wishlist
```
Wishlist { id, userId, productId, createdAt }
  Unique: [userId, productId]
```

### Review
```
Review { id, userId, productId, orderId, rating (1-5), comment?, timestamps }
  Unique: [userId, productId, orderId]
```

### Coupon
```
Coupon { id, code, type, value, minOrderAmount, isActive, startsAt, expiresAt, timestamps }
```

### Banner
```
Banner { id, title, subtitle?, imageUrl, linkUrl?, sortOrder, isActive, timestamps }
```

### RefreshToken
```
RefreshToken { id, token, userId, expiresAt, createdAt }
```

## Missing entities for target app

| Entity | Why needed |
|--------|-----------|
| `Notification` | Push/email/SMS tracking |
| `Payment` / `PaymentTransaction` | Card payment records, refunds |
| `Seller` / `Vendor` | Multi-vendor marketplace (if target requires) |
| `DeliveryRoute` | Route optimization, multi-stop deliveries |
| `AgentLocation` | Live GPS tracking for delivery agents |
| `ProductVariant` | Size, color, etc. |
| `ShippingZone` / `DeliveryZone` | Geo-based delivery fees |
| `AuditLog` | Admin action tracking |
| `FileUpload` / `Media` | Proper image management |
| `ChatMessage` / `SupportTicket` | Customer support |
| `PushToken` | Device notification registration |

---

# 9. UI/UX Review

## Does it look like a professional shopping app?

**Partially.** The mobile app has an intentional Amazon-inspired design system (`#FF9900` orange, `#232F3E` navy) with consistent spacing, typography, and reusable components (`AppButton`, `ProductCard`, `PriceDisplay`, skeletons). Primary flows (home → product → cart → checkout) have reasonable visual structure.

However, it does **not** yet feel like a polished production app because:
- Many interactive elements are dead/no-op (home add-to-cart, address buttons, settings, delivery completed cards)
- Secondary screens (`company-profile`, `addresses`) are bare text layouts
- No custom fonts loaded (`expo-font` in package.json but never used)
- No product image gallery — single image only
- No animations beyond splash screen
- Hardcoded "New York, NY" location on home screen

## Does it look AI-generated or generic?

**Leans generic.** The Amazon-clone palette is deliberate but common. Component naming and structure are clean but not distinctive. No unique brand identity beyond "DoubleA Commerce" text and "AA" logo placeholder. Admin dashboard is entirely utilitarian with inline styles — looks like a quick CRUD scaffold.

## Design consistency

| Area | Consistency |
|------|-------------|
| Mobile primary screens | Good — shared theme tokens |
| Mobile secondary screens | Poor — mixed inline styles, plain text |
| Admin dashboard | Low — globals.css + inline styles, unused `theme/colors.ts` |
| Cross-app (mobile vs admin) | None — completely separate styling approaches |

## Brand identity

**Weak.** No logo asset on disk, no brand guidelines, no custom iconography. `app.json` references to icon/splash were removed because files don't exist.

## Shopping flows

| Flow | Clarity |
|------|---------|
| Browse → Product → Cart → Checkout → Confirmation | Clear and wired |
| Guest browsing → Login → Checkout | Works but guest cart not preserved |
| Search → Product | Works but no debounce, no filters beyond sort |
| Wishlist | Broken — can view but never add |
| Reviews | Not accessible from UI |

## Delivery flows

| Flow | Clarity |
|------|---------|
| Agent dashboard → Order detail → Status updates | Clear and functional |
| Map on order detail | Static marker only — not a live experience |
| Map tab | Empty placeholder |
| Customer tracking | Does not exist |

## Wholesale flows

| Flow | Clarity |
|------|---------|
| Company registration | Clear |
| Company pricing toggle | Clear for approved companies |
| Company profile | Read-only, minimal |
| Admin approval | Clear in admin dashboard |

## Files needing UI improvement

| File | Issue |
|------|-------|
| `apps/mobile/app/(tabs)/index.tsx` | Dead add-to-cart, hardcoded location, FlatList in ScrollView |
| `apps/mobile/app/category/[slug].tsx` | Broken category filter |
| `apps/mobile/app/addresses.tsx` | Non-functional buttons |
| `apps/mobile/app/(tabs)/profile.tsx` | Dead settings menu item |
| `apps/mobile/app/(delivery)/map.tsx` | Empty placeholder |
| `apps/mobile/app/(delivery)/completed.tsx` | Non-functional cards |
| `apps/mobile/app/company-profile.tsx` | Bare text layout |
| `apps/admin/src/app/(admin)/settings/page.tsx` | Fake settings page |
| `apps/admin/src/app/(admin)/delivery-agents/page.tsx` | No agent list |
| All admin pages | No pagination, minimal error states, inline styles |

---

# 10. Geo Features Review

## Present

| Feature | Location | Quality |
|---------|----------|---------|
| `latitude`/`longitude` on Address | `prisma/schema.prisma` → `Address` model | Data fields only — no map picker UI |
| `latitude`/`longitude` on DeliveryProof | `prisma/schema.prisma` → `DeliveryProof` model | Optional at delivery completion — not auto-captured from GPS |
| Static map with marker | `apps/mobile/src/components/DeliveryMap.native.tsx` | Single `MapView` + `Marker` — no route, no animation |
| External navigation | `apps/mobile/app/delivery-order/[id].tsx` | `Linking.openURL` to Apple/Google Maps |
| Web map placeholder | `apps/mobile/src/components/DeliveryMap.web.tsx` | Shows coordinates as text |
| Metro web stub | `apps/mobile/metro.config.js` | Returns empty module for `react-native-maps` on web |

## Missing (critical for geo-specialized app)

| Feature | Status |
|---------|--------|
| Live delivery agent GPS tracking | Not implemented |
| Customer order tracking map | Not implemented |
| Delivery route visualization / polyline | Not implemented |
| Route optimization (multi-stop) | Not implemented |
| Address autocomplete (Google Places, etc.) | Not implemented |
| Geocoding / reverse geocoding | Not implemented |
| Map-based address picker | Not implemented |
| Geofencing (arrival detection) | Not implemented |
| Delivery zone management | Not implemented |
| PostGIS / spatial database queries | Not implemented |
| Mapbox / Google Maps SDK / Leaflet / MapLibre | Not integrated |
| GeoJSON / WMS / WFS | Not used |
| Delivery map dashboard tab | Empty stub |
| ETA calculation | Not implemented |
| Distance-based delivery fees | Not implemented (flat $5.99) |

## Assessment

**The app is NOT geo-specialized.** It has database fields for coordinates and one static map component. There is no geo intelligence, no spatial analysis, and no creative map UX. For a company wanting to specialize in geo apps, this is essentially a blank canvas in that dimension.

---

# 11. Infrastructure / DevOps

## What exists

| Item | Path | Status |
|------|------|--------|
| Docker Compose | `docker-compose.yml` | Postgres 16, pgAdmin, API — **works for Postgres; API container has OpenSSL/Prisma crash on Alpine** |
| API Dockerfile | `apps/api/Dockerfile` | Multi-stage Node 20 Alpine — builds from monorepo root |
| Prisma migration | `apps/api/prisma/migrations/20240701000000_init/` | Single init migration |
| Seed script | `apps/api/prisma/seed.ts` | Demo accounts + products + orders |
| Env examples | `.env.example` (root, api, admin, mobile) | Present but inconsistent (see Section 12) |
| npm workspaces | Root `package.json` | `apps/*`, `packages/*` |
| Root scripts | `package.json` | `api`, `admin`, `mobile`, `docker:up/down`, `db:*` |

## What is missing

| Item | Impact |
|------|--------|
| CI/CD pipelines (GitHub Actions, etc.) | No automated testing or deployment |
| Kubernetes manifests / Helm charts | No production orchestration |
| Test suite / test runner config | Zero test coverage |
| ESLint / Prettier / Husky | No code quality enforcement |
| Reverse proxy (nginx, Traefik) | No production routing |
| SSL/TLS configuration | Not configured |
| Monitoring / logging (Datadog, Sentry, etc.) | No observability |
| Admin Docker container | Admin not containerized |
| Mobile build pipeline (EAS) | No `eas.json` for app store builds |
| Database backup strategy | Not defined |
| Staging environment | Not defined |
| API container healthcheck | Missing in Dockerfile |
| Non-root Docker user | Missing in Dockerfile |
| Subsequent DB migrations | Only one init migration exists |

---

# 12. Environment Variables

> Secret values are NOT listed. Only purpose and location.

| Variable | Purpose | Where used | Required? |
|----------|---------|------------|-----------|
| `DATABASE_URL` | PostgreSQL connection string | `apps/api/prisma/schema.prisma`, docker-compose | **Required** |
| `JWT_ACCESS_SECRET` | Signs/verifies access tokens | `apps/api/src/auth/auth.service.ts`, `jwt-auth.guard.ts` | **Required** |
| `JWT_REFRESH_SECRET` | Documented but **UNUSED in code** | `.env.example` only | Optional (dead config) |
| `JWT_ACCESS_EXPIRES` | Access token TTL (default `15m`) | `auth.service.ts` | Optional |
| `JWT_REFRESH_EXPIRES` | Documented but **UNUSED** — hardcoded 7 days in code | `.env.example` only | Optional (dead config) |
| `API_PORT` | API server port (default `3001`) | `apps/api/src/main.ts` | Optional |
| `ADMIN_URL` | Admin dashboard URL | docker-compose, root `.env.example` | Optional |
| `MOBILE_API_URL` | Mobile API URL reference | root `.env.example`, docker-compose | Optional |
| `NEXT_PUBLIC_API_URL` | Admin axios base URL | `apps/admin/src/services/api.ts` | **Required for admin** |
| `EXPO_PUBLIC_API_URL` | Mobile axios base URL | `apps/mobile/src/services/api.ts` | **Required for mobile** |
| `EXPO_PUBLIC_ADMIN_URL` | Admin URL shown in mobile login alert | `apps/mobile/app/(auth)/login.tsx` | Optional |

### Known inconsistencies
- Root `.env.example`: `NEXT_PUBLIC_API_URL=http://localhost:3001` and `EXPO_PUBLIC_API_URL=http://localhost:3001` — **missing `/api` suffix**
- Admin/mobile `.env.example`: correctly include `/api` suffix
- API global prefix is `api` (set in `main.ts`), so correct URL is `http://localhost:3001/api`

---

# 13. How To Run The Project

## Prerequisites
- Node.js 18+
- Docker & Docker Compose
- npm (workspaces)
- Expo Go app on phone (for mobile testing)

## Install

```bash
cd Bazar-App
npm install
```

## Database

```bash
# Start PostgreSQL + pgAdmin
npm run docker:up

# Setup database (first time)
cd apps/api
cp ../../.env.example .env
npx prisma generate
npx prisma migrate deploy
npm run prisma:seed
```

## Start API

```bash
# From root (recommended — run locally, not Docker API container)
npm run api
# → http://localhost:3001/api
```

> **Known issue:** Docker API container (`doublea-api`) crashes due to OpenSSL/Prisma incompatibility on Alpine. Use local `npm run api` instead.

## Start Admin Dashboard

```bash
# From root (new terminal)
cd apps/admin
cp ../.env.example .env   # or use ../../.env.example
npm run admin             # or: npm run dev from apps/admin
# → http://localhost:3000
```

## Start Mobile App

```bash
# From root (new terminal)
cd apps/mobile
cp ../../.env.example .env
# For physical device, set EXPO_PUBLIC_API_URL to your PC's LAN IP:
# EXPO_PUBLIC_API_URL=http://192.168.x.x:3001/api
npx expo start --clear
# Scan QR with Expo Go
```

## Build commands

```bash
npm run api:build          # NestJS production build
cd apps/admin && npm run build   # Next.js production build
# Mobile: no build script — use EAS Build for production (not configured)
```

## Test commands

**None.** No test scripts exist in any `package.json`.

## Known issues when running

| Issue | Workaround |
|-------|-----------|
| Docker API container crash-loops | Run `npm run api` locally |
| Expo SDK version mismatch with Expo Go | Project upgraded to SDK 54; ensure Expo Go is latest |
| Duplicate react-native versions in monorepo | Fixed via root `package.json` overrides — run `npm install` after pull |
| `localhost` doesn't work on physical phone | Use LAN IP in `EXPO_PUBLIC_API_URL` |
| VPN (e.g. NordVPN) blocks LAN connections | Disconnect VPN or use `npx expo start --tunnel` |
| Root `.env.example` missing `/api` suffix | Use per-app `.env.example` as reference |
| No `assets/icon.png` | Removed from `app.json` — Expo Go works without them |
| Windows PowerShell doesn't support `&&` | Use `;` or separate commands |
| Admin React version mismatch | Root overrides force React 19; admin declares React 18 |

---

# 14. Bugs / Problems / Technical Debt

## Critical / blocking

| # | Problem | Location |
|---|---------|----------|
| 1 | Category screen ignores `slug` param — shows all products | `apps/mobile/app/category/[slug].tsx` |
| 2 | iOS TurboModule `PlatformConstants` error was caused by duplicate react-native versions (0.74.1 + 0.81.5) | Monorepo `node_modules` — recently fixed but fragile |
| 3 | Docker API container crash-loops (OpenSSL/Prisma on Alpine) | `apps/api/Dockerfile` |
| 4 | Health endpoints require JWT — unusable for monitoring | `apps/api/src/app.controller.ts` |

## Broken UI / no-op handlers

| # | Problem | Location |
|---|---------|----------|
| 5 | Home "Add to Cart" buttons do nothing | `apps/mobile/app/(tabs)/index.tsx` |
| 6 | Address list item buttons are no-ops | `apps/mobile/app/addresses.tsx` |
| 7 | Settings menu item has `route: null` | `apps/mobile/app/(tabs)/profile.tsx` |
| 8 | Delivery completed cards don't navigate | `apps/mobile/app/(delivery)/completed.tsx` |
| 9 | Delivery map tab is empty placeholder | `apps/mobile/app/(delivery)/map.tsx` |
| 10 | Admin Settings page is fake — Save does nothing | `apps/admin/src/app/(admin)/settings/page.tsx` |
| 11 | Authenticated cart tab badge always shows 0 | `apps/mobile/app/(tabs)/_layout.tsx` |

## Missing functionality (advertised but not wired)

| # | Problem | Location |
|---|---------|----------|
| 12 | Wishlist add/remove not implemented in any UI | No usage of `wishlistApi.add/remove` |
| 13 | Product reviews not submitable from mobile | `reviewsApi` unused in mobile |
| 14 | Address edit/delete/set-default not implemented | API methods exist, UI doesn't call them |
| 15 | Guest cart not persisted or merged on login | `apps/mobile/src/store/authStore.ts` |
| 16 | Admin cannot edit products/categories/coupons | API PATCH/DELETE exist, admin UI missing |
| 17 | Admin cannot assign delivery agent to orders | API endpoint exists, admin UI missing |
| 18 | No delivery agent list in admin | No GET endpoint or UI |
| 19 | No banner management in admin | API is read-only |
| 20 | Card payment not implemented | Schema only |

## Architecture / structure

| # | Problem | Location |
|---|---------|----------|
| 21 | `UsersModule` is empty stub | `apps/api/src/users/users.module.ts` |
| 22 | `@doublea/shared` not used by API — duplicate validation | API uses class-validator; shared has Zod |
| 23 | `@doublea/shared` barely used by admin — types on 2 pages only | |
| 24 | No frontend route guards for roles | All mobile layouts are open |
| 25 | Admin auth is localStorage-only — no server session check | `apps/admin/src/app/(admin)/layout.tsx` |
| 26 | No shared design system between mobile and admin | |
| 27 | Naming drift: `Bazar-App` folder / `doublea-commerce` package / `DoubleA` brand | |
| 28 | React version split: admin declares 18, root overrides to 19 | |
| 29 | `passport`, `passport-jwt`, `zod` installed in API but unused | `apps/api/package.json` |
| 30 | `react-hook-form`, `zod` installed in admin but unused | `apps/admin/package.json` |
| 31 | `apps/admin/src/theme/colors.ts` defined but never imported | |
| 32 | `slugify` utility defined but never called | `apps/api/src/common/utils/index.ts` |
| 33 | `@OptionalAuth()` decorator defined but never used | `apps/api/src/common/decorators/roles.decorator.ts` |

## Security

| # | Problem | Location |
|---|---------|----------|
| 34 | CORS `origin: true` — reflects any origin with credentials | `apps/api/src/main.ts` |
| 35 | Default JWT secrets in `.env.example` | |
| 36 | `JWT_REFRESH_SECRET` unused — misleading security config | |
| 37 | No rate limiting on auth endpoints | |
| 38 | Deactivated users' access tokens remain valid until expiry | |
| 39 | Pending company accounts can authenticate | `auth-users.service.ts` |
| 40 | No helmet, CSRF protection, or request size limits | |
| 41 | Admin stores tokens in localStorage (XSS vulnerable) | `apps/admin` |
| 42 | Password minimum length is only 6 characters | `auth/dto/auth.dto.ts` |
| 43 | Logout endpoint is `@Public()` — no caller authentication | |

## Data / validation

| # | Problem | Location |
|---|---------|----------|
| 44 | Admin order status accepts any string — no state machine | `orders/dto/order.dto.ts` |
| 45 | Refresh token expiry hardcoded — ignores `JWT_REFRESH_EXPIRES` env | `auth.service.ts` |
| 46 | No cleanup of expired refresh tokens | |
| 47 | Coupon applied silently — no user-facing validation endpoint | |

## Performance

| # | Problem | Location |
|---|---------|----------|
| 48 | `FlatList` nested inside `ScrollView` on home screen | `apps/mobile/app/(tabs)/index.tsx` |
| 49 | Search fires API call on every keystroke — no debounce | `apps/mobile/app/(tabs)/search.tsx` |
| 50 | Delivery dashboard polls every 30s — no WebSocket | `apps/mobile/app/(delivery)/index.tsx` |

## DevOps / quality

| # | Problem | Location |
|---|---------|----------|
| 51 | Zero test coverage | Entire repo |
| 52 | No CI/CD pipeline | |
| 53 | No linting or formatting config | |
| 54 | Single DB migration — no migration history for schema changes | |
| 55 | Expo web test artifacts committed | `apps/mobile/.expo-web-test*/` |
| 56 | README says `cd BazarApp` but folder is `Bazar-App` | `README.md` |
| 57 | README claims "Zod shared schemas" used by API — false | `README.md` |

---

# 15. What Is Missing Compared To The Target App

| Target requirement | Current status | Gap severity |
|-------------------|----------------|--------------|
| Professional Amazon-like shopping app | MVP skeleton with Amazon-inspired theme | **Medium** — core flow works, polish missing |
| One app for iOS and Android | Expo app exists, SDK 54, monorepo issues recently fixed | **Low** — architecture correct, needs EAS Build for production |
| Role: guest | Works — browse, guest cart | **Low** — cart not persisted |
| Role: buyer | Works — full shopping flow | **Low** — missing reviews, wishlist UI |
| Role: wholesale company | Partial — pricing toggle, registration, approval | **Medium** — no wholesale-specific flows |
| Role: delivery driver | Partial — order workflow works | **Medium** — map tab empty, no live tracking |
| Role: admin / company admin | Admin web only; no company admin role | **High** — no company admin, admin can't do everything API supports |
| Backend with proper auth | JWT + refresh works | **Medium** — security hardening needed |
| Products, cart, orders | Implemented | **Low** |
| Payments | COD only | **High** — no card/digital payment |
| Delivery management | Basic status workflow | **High** — no tracking, routing, agent management |
| Notifications | None | **High** — completely missing |
| Admin dashboard | 10 pages, several incomplete | **Medium** |
| Geo: maps | Static marker only | **Critical** — core business differentiator missing |
| Geo: delivery routes | None | **Critical** |
| Geo: live location | None | **Critical** |
| Geo: address/location features | Text form only, lat/lng fields unused in UI | **Critical** |
| Geo: PostGIS / spatial | None | **Critical** |
| Docker/Kubernetes ready | Docker Compose for dev only | **High** — no K8s, no CI/CD, API container broken |
| File uploads | None | **High** |
| Tests | None | **High** |
| Professional UI/UX | Theme exists but many stubs | **Medium** |
| Multi-vendor / seller | None | **N/A** — not in current scope but may be needed |

---

# 16. Recommended Next Improvements

## Priority 1 — Must fix before continuing

### 1.1 Stabilize monorepo dependency resolution
- **Problem:** Duplicate `react-native` versions caused iOS runtime crash (`PlatformConstants` error).
- **Why it matters:** App cannot run on devices without consistent native module resolution.
- **Solution:** Keep root `overrides` for `react-native@0.81.5`; simplify `metro.config.js`; run `expo-doctor` after every dependency change.
- **Files:** `package.json`, `apps/mobile/metro.config.js`, `apps/mobile/app.json`

### 1.2 Fix broken mobile screens
- **Problem:** Category filter, wishlist add, address management, home add-to-cart, cart badge — all broken or no-op.
- **Why it matters:** Users hit dead ends in core shopping flows.
- **Solution:** Wire `slug` param in category screen; add wishlist toggle on `ProductCard`; implement address edit/delete; connect home add-to-cart; fix cart badge for auth users.
- **Files:** `apps/mobile/app/category/[slug].tsx`, `apps/mobile/app/(tabs)/index.tsx`, `apps/mobile/app/addresses.tsx`, `apps/mobile/app/(tabs)/_layout.tsx`, `apps/mobile/src/components/ProductCard.tsx`

### 1.3 Add frontend route guards
- **Problem:** Any role can access any screen via deep link.
- **Why it matters:** Delivery agents see customer UI; unauthenticated users hit 401 errors on protected screens.
- **Solution:** Add auth/role checks in `_layout.tsx` files for `(tabs)`, `(delivery)`, and protected stack screens.
- **Files:** `apps/mobile/app/(tabs)/_layout.tsx`, `apps/mobile/app/(delivery)/_layout.tsx`, `apps/mobile/app/_layout.tsx`

### 1.4 Fix API health endpoints and Docker build
- **Problem:** Health check requires JWT; Docker API container crash-loops.
- **Why it matters:** Blocks deployment and monitoring.
- **Solution:** Add `@Public()` to health endpoints; fix Dockerfile OpenSSL (use `node:20-slim` or install openssl compat).
- **Files:** `apps/api/src/app.controller.ts`, `apps/api/Dockerfile`

### 1.5 Align environment variable examples
- **Problem:** Root `.env.example` has wrong API URL (missing `/api` suffix).
- **Why it matters:** New developers will configure broken URLs.
- **Solution:** Fix root `.env.example` to match per-app examples.
- **Files:** `.env.example`

## Priority 2 — Important improvements

### 2.1 Implement geo features (core business differentiator)
- **Problem:** No real geo functionality despite company ambition.
- **Why it matters:** This is the stated specialization — currently zero value delivered.
- **Solution:** Start with: map-based address picker, customer delivery tracking map, live agent location, delivery route polyline. Evaluate Mapbox or Google Maps SDK.
- **Files:** New `apps/mobile/src/components/`, `apps/api/src/` (location endpoints), `prisma/schema.prisma` (AgentLocation model)

### 2.2 Complete admin dashboard
- **Problem:** Settings fake, no edit/delete for products/categories/coupons, no agent assignment, no agent list.
- **Why it matters:** Admin cannot fully operate the platform.
- **Solution:** Wire existing API endpoints to admin UI; build settings page; add delivery agent list endpoint.
- **Files:** `apps/admin/src/app/(admin)/*.tsx`, `apps/api/src/admin/admin.controller.ts`

### 2.3 Unify shared validation between API and frontends
- **Problem:** `@doublea/shared` Zod schemas used by mobile but not API (which uses class-validator separately).
- **Why it matters:** Validation rules can drift; duplicate maintenance.
- **Solution:** Either adopt Zod in API via `nestjs-zod` or generate DTOs from shared schemas.
- **Files:** `packages/shared/src/validators/`, all `apps/api/src/*/dto/`

### 2.4 Add payment integration
- **Problem:** Only COD works; `card` enum is dead.
- **Why it matters:** Production e-commerce requires digital payments.
- **Solution:** Integrate Stripe or similar; add `Payment` model; payment webhook handler.
- **Files:** New `apps/api/src/payments/`, `prisma/schema.prisma`, `apps/mobile/app/checkout.tsx`

### 2.5 Add notifications
- **Problem:** No push, email, or SMS on order status changes.
- **Why it matters:** Users and agents have no way to know about updates.
- **Solution:** Expo push notifications for mobile; email via SendGrid/Resend for order confirmations.
- **Files:** New `apps/api/src/notifications/`, `prisma/schema.prisma`, mobile push token registration

### 2.6 Add CI/CD and tests
- **Problem:** Zero automated quality gates.
- **Why it matters:** Regressions like the react-native duplication will recur.
- **Solution:** GitHub Actions: lint + API unit tests (Jest) + mobile type-check; Prisma migration check.
- **Files:** New `.github/workflows/`, test files in `apps/api/`

### 2.7 Security hardening
- **Problem:** Permissive CORS, no rate limiting, weak token management.
- **Why it matters:** Production security risk.
- **Solution:** Restrict CORS origins, add `@nestjs/throttler`, invalidate tokens on deactivation, hash refresh tokens.
- **Files:** `apps/api/src/main.ts`, `apps/api/src/auth/`, `apps/api/src/common/guards/`

## Priority 3 — Nice to have later

### 3.1 Shared design system across mobile and admin
- **Files:** New `packages/ui/` or extend `packages/shared`

### 3.2 File upload service (S3/Cloudinary)
- **Files:** New `apps/api/src/uploads/`, admin/mobile image picker

### 3.3 EAS Build for app store deployment
- **Files:** New `eas.json`, `apps/mobile/app.json`

### 3.4 Kubernetes manifests
- **Files:** New `k8s/` directory

### 3.5 Product variants, recommendations, recently viewed
- **Files:** `prisma/schema.prisma`, new API modules

### 3.6 Dark mode support
- **Files:** `apps/mobile/src/theme/`, `app.json`

### 3.7 i18n and multi-currency
- **Files:** New `packages/i18n/`, price formatting utilities

### 3.8 WebSocket for real-time order/delivery updates
- **Files:** `apps/api/src/` (gateway), mobile query subscriptions

---

# 17. Questions For The Owner

1. **Geo priority:** Which geo features matter most first — live agent tracking, customer delivery map, address autocomplete, or delivery zone management?

2. **Map provider:** Do you have a preference or budget for Mapbox, Google Maps, or OpenStreetMap/MapLibre?

3. **Payment provider:** Which payment gateway should be integrated (Stripe, Mollie, Adyen)? Is COD sufficient for launch?

4. **Company admin role:** Should wholesale companies manage their own products/orders, or only receive discounted pricing as buyers?

5. **Multi-vendor:** Is this a single-store platform (DoubleA sells everything) or a marketplace where multiple sellers list products?

6. **Target markets:** Which countries/currencies? Currently hardcoded to USD (`$`) and USA addresses in seed data.

7. **App distribution:** Expo Go for dev only, or do you need TestFlight/App Store builds soon (requires EAS Build + Apple Developer account)?

8. **Admin users:** Will admins only use the web dashboard, or do they also need mobile access?

9. **Notifications:** Push notifications only, or also email/SMS? Which events should trigger notifications?

10. **Infrastructure target:** Is Docker Compose sufficient for now, or do you need Kubernetes manifests for a specific cloud provider (AWS, Azure, GCP)?

11. **Brand identity:** Is "DoubleA Commerce" the final brand, or will it be renamed (repo is `Bazar-App`)?

12. **Delivery model:** Own fleet of drivers, or third-party delivery integration (e.g. external courier API)?

13. **Image management:** Will product images be uploaded by admin, or imported from external URLs/ERP?

14. **Testing expectations:** What level of test coverage do you want before production (unit, integration, E2E)?

15. **Existing production environment:** Is anything already deployed, or is this purely local development so far?

---

# 18. Summary For ChatGPT

```
ChatGPT, here is the current state of my project:

- Stack: Expo SDK 54 + React Native 0.81 mobile app, Next.js 14 admin dashboard,
  NestJS 10 + Prisma 5 + PostgreSQL 16 API, TypeScript monorepo with shared
  Zod types/validators. Docker Compose for local Postgres. No CI/CD, no tests,
  no Kubernetes.

- Implemented: Full REST API (52 endpoints) with JWT auth and 4 roles
  (normal_user, company, admin, delivery_agent). Product catalog with dual
  pricing (retail + wholesale). Cart, checkout (COD only), orders with status
  workflow. Delivery agent pickup→deliver flow with static map. Admin dashboard
  with 10 pages (dashboard, products, categories, orders, users, companies,
  delivery agents, coupons, reviews, settings). Mobile app with 27 screens.
  Database with 17 models. Seed data with demo accounts.

- Missing: Real geo features (no live tracking, no routes, no address
  autocomplete, no PostGIS — only lat/lng DB fields and one static map marker).
  Card payments. Push/email/SMS notifications. File uploads. Wishlist add/remove
  UI. Product reviews UI. Address edit/delete UI. Admin product/category/coupon
  editing. Delivery agent assignment in admin. Delivery map tab (empty stub).
  Customer order tracking. Route guards on mobile. Tests. CI/CD. Production
  deployment config. Company admin role.

- Biggest problems: Many mobile UI buttons are no-ops (home add-to-cart, address
  management, settings, delivery completed cards). Category screen ignores slug
  param. Duplicate react-native versions in monorepo caused iOS crash (recently
  fixed but fragile). Docker API container broken. @doublea/shared package
  underused by API and admin. No frontend role guards. Security gaps (permissive
  CORS, no rate limiting). Admin settings page is fake. Zero test coverage.

- My target: Professional Amazon-like shopping app for iOS + Android with
  role-based access (guest, buyer, wholesale company, delivery driver, admin).
  Backend with auth, products, cart, orders, payments, delivery, notifications.
  Admin dashboard. Geo-specialized features (maps, delivery routes, live
  location, address/location). Docker/Kubernetes-ready infrastructure.

- What I need next: Priority 1 — stabilize monorepo deps, fix all broken mobile
  screens and no-op buttons, add route guards, fix API health/Docker. Priority 2
  — build real geo features (this is our specialization), complete admin
  dashboard, add payments and notifications, unify shared validation, add
  CI/CD and tests, security hardening. Please help me create a detailed
  improvement plan and implementation prompts for each priority area.
```

---

*End of audit. This document reflects the codebase as inspected on July 9, 2026. No code was modified during this audit.*
