# DoubleA Commerce

A modern, production-ready e-commerce platform inspired by Amazon UX patterns — with an original, premium design. Built as a monorepo with React Native (Expo) mobile app, NestJS API, PostgreSQL, and Next.js admin dashboard.

## Architecture

```
doublea-commerce/
├── apps/
│   ├── mobile/     # React Native + Expo customer & delivery agent app
│   ├── admin/      # Next.js admin dashboard
│   └── api/        # NestJS REST API + Prisma
├── packages/
│   └── shared/     # Shared types, validators, constants
└── docker-compose.yml
```

## Prerequisites

- Node.js 18+
- Docker & Docker Compose
- npm (workspaces)

## Quick Start

### 1. Clone and install

```bash
cd BazarApp
cp .env.example .env
npm install
```

### 2. Start PostgreSQL

```bash
npm run docker:up
# Starts PostgreSQL on port 5432 and pgAdmin on port 5050
```

### 3. Run database migrations & seed

```bash
cd apps/api
cp ../../.env.example .env
npx prisma generate
npx prisma migrate deploy
npm run prisma:seed
```

### 4. Start the API

```bash
# From root
npm run api
# API runs at http://localhost:3001/api
```

### 5. Start Admin Dashboard

```bash
# From root (in a new terminal)
npm run admin
# Admin runs at http://localhost:3000
```

### 6. Start Mobile App

```bash
# From root (in a new terminal)
cd apps/mobile
cp ../../.env.example .env
npm run start
# Scan QR code with Expo Go, or press 'a' for Android emulator
```

> **Note:** For physical devices, set `EXPO_PUBLIC_API_URL` to your machine's LAN IP (e.g. `http://192.168.1.10:3001/api`).

## Demo Accounts

| Role            | Email                  | Password      |
|-----------------|------------------------|---------------|
| Admin           | admin@doublea.com      | Admin123!     |
| Normal User     | user@doublea.com       | User123!      |
| Company User    | company@doublea.com    | Company123!   |
| Delivery Agent  | delivery@doublea.com   | Delivery123!  |

## Features

### Mobile App (Customer)
- Guest browsing (search, categories, product details, local cart)
- JWT authentication with refresh tokens
- Company pricing toggle for approved business accounts
- Cart, checkout, addresses, order history
- Wishlist and product reviews
- Cash on Delivery (default payment)

### Mobile App (Delivery Agent)
- Assigned orders grouped by status
- Order details with customer info and map
- Status workflow: Picked Up → On The Way → Delivered
- Delivery completion with proof fields

### Admin Dashboard
- Dashboard statistics
- Product & category management
- Order management with status updates
- User management & company approval
- Delivery agent creation
- Coupon & review management

### API
- Full REST API with role-based access control
- bcrypt password hashing
- JWT access + refresh tokens
- Input validation (class-validator + Zod shared schemas)
- Order status history tracking
- Stock management on order placement

## Environment Variables

| Variable              | Description                    | Default                                      |
|-----------------------|--------------------------------|----------------------------------------------|
| DATABASE_URL          | PostgreSQL connection string   | postgresql://doublea:doublea_secret@localhost:5432/doublea_commerce |
| JWT_ACCESS_SECRET     | Access token secret            | (change in production)                       |
| JWT_REFRESH_SECRET    | Refresh token secret           | (change in production)                       |
| API_PORT              | API server port                | 3001                                         |
| NEXT_PUBLIC_API_URL   | API URL for admin              | http://localhost:3001/api                    |
| EXPO_PUBLIC_API_URL   | API URL for mobile             | http://localhost:3001/api                    |
| WHISH_CHANNEL         | Whish Pay merchant channel     | (from Whish merchant portal)                 |
| WHISH_SECRET          | Whish Pay secret               | (from Whish merchant portal)                 |
| WHISH_WEBSITE_URL     | Website registered with Whish  | https://your-domain.com                      |
| WHISH_ENVIRONMENT     | `sandbox` or `production`      | sandbox                                      |
| PUBLIC_API_URL        | Public API base incl. `/api` for Whish callbacks | http://localhost:3001/api (use tunnel in sandbox) |

## API Endpoints

Base URL: `http://localhost:3001/api`

- **Auth:** `POST /auth/register`, `/auth/login`, `/auth/refresh`, `GET /auth/me`
- **Products:** `GET /products`, `GET /products/:id`, admin CRUD
- **Categories:** `GET /categories`, admin CRUD
- **Cart:** `GET /cart`, `POST /cart/items` (authenticated)
- **Orders:** `POST /orders`, `GET /orders/my-orders`, `PATCH /orders/:id/cancel`, `POST /orders/:id/whish/verify`
- **Whish Pay:** `GET /whish/callback/*`, `GET /whish/redirect/*` (public)
- **Delivery:** `GET /delivery/orders`, status update endpoints
- **Admin:** `/admin/dashboard`, `/admin/users`, `/admin/orders`, etc.

## Docker Services

| Service    | Port | Description        |
|------------|------|--------------------|
| postgres   | 5432 | PostgreSQL 16      |
| pgadmin    | 5050 | Database admin UI  |
| api        | 3001 | NestJS API (optional) |

## Tech Stack

- **Mobile:** React Native, Expo, Expo Router, Zustand, TanStack Query, React Hook Form, Zod
- **Admin:** Next.js 14, TypeScript
- **API:** NestJS, Prisma, PostgreSQL, JWT, bcrypt
- **Shared:** TypeScript, Zod validators

## License

Private — DoubleA Commerce © 2024
