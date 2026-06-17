# Frontend

Single-page web app for the Ticketing Application, built with React, TypeScript, and Vite. It lets users search and book flights, trains, and hotels, manage their bookings, pay, and (for admins) view metrics and add catalog data.

## Tech Stack

- React 18 + TypeScript
- Vite 6 (dev server & build)
- React Router v6 (`react-router-dom`)
- Axios for HTTP (with JWT auth and automatic token-refresh interceptors)
- ESLint + `@typescript-eslint`

## Routes / Pages

Routing is defined in `src/App.tsx`. All routes render inside a shared `Layout`.

### Public

- `/` - Home
- `/login` - Login
- `/register` - Register
- `/flights` - Flight search & results
- `/trains` - Train search & results
- `/hotels` - Hotel search & results
- `/hotels/:id` - Hotel detail
- `/ships`, `/buses` - "Coming Soon" placeholders

### Protected (require authentication via `ProtectedRoute`)

- `/dashboard` - User dashboard
- `/bookings` - Booking history
- `/bookings/:id` - Booking detail
- `/payment/:bookingId` - Payment
- `/profile` - User profile
- `/admin/dashboard` - Admin dashboard (metrics)
- `/admin/add-data` - Admin: add catalog data (flights / trains / hotels)

Any unmatched path redirects to `/`.

## API Layer

All backend calls go through `src/services/api.ts`, a configured Axios instance. The base URL is:

```ts
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'
```

- A request interceptor attaches `Authorization: Bearer <access_token>` from `localStorage`.
- A response interceptor auto-refreshes the JWT on a `401` (deduplicating concurrent refreshes), retries the original request, and redirects to `/login` if the refresh fails.

The file groups typed API clients: `authAPI`, `flightAPI`, `trainAPI`, `hotelAPI`, `bookingAPI`, `paymentAPI`, `profileAPI`, `pricingAPI`, and `adminAPI`.

## Environment Variables

Vite environment variables (prefixed `VITE_`):

- `VITE_API_URL` - Base URL for all backend API requests. If unset, it defaults to `/api`, which is proxied to the API gateway.

In development, `vite.config.ts` proxies `/api` to `http://localhost:3000` (the API gateway), so `VITE_API_URL` typically does not need to be set locally.

## Getting Started

### Prerequisites

- Node.js 20+ (the Docker build uses `node:20-alpine`)

### Install & Run (development)

```bash
npm install
npm run dev
```

The dev server runs on http://localhost:5173 (see `vite.config.ts`) with `/api` proxied to the gateway at `http://localhost:3000`.

### Build (production)

```bash
npm run build      # type-checks (tsc) then builds with Vite
npm run preview    # preview the production build locally
```

### Lint

```bash
npm run lint
```

### With Docker

The multi-stage `Dockerfile` builds the app with `node:20-alpine` and serves the static output via `nginx`. From the project root:

```bash
docker compose up frontend
```

## Project Structure

```
frontend/
├── src/
│   ├── components/      # Shared UI (Layout, ProtectedRoute, ErrorBoundary,
│   │   │               #   Skeleton, PromoCodeInput, shared/*)
│   ├── contexts/        # React contexts (AuthContext, ToastContext)
│   ├── pages/           # Route pages (Home, Login, Flights, Hotels, Payment, Admin*, ...)
│   ├── services/        # API client (api.ts) + token refresh bridge (tokenRefresh.ts)
│   ├── App.tsx          # Route definitions
│   ├── main.tsx         # App entry (BrowserRouter + StrictMode)
│   └── index.css        # Global styles
├── index.html
├── vite.config.ts       # Vite config (dev port 5173, /api proxy)
├── tsconfig.json
├── nginx.conf           # nginx config used by the production image
├── Dockerfile
└── package.json
```

## Available Scripts

- `npm run dev` - Start the Vite dev server
- `npm run build` - Type-check then build for production
- `npm run preview` - Preview the production build
- `npm run lint` - Run ESLint

## Notes

- Auth tokens (`access_token`, `refresh_token`) and the `user` object are kept in `localStorage`.
- The app is wrapped in an `ErrorBoundary`, plus `AuthProvider` and `ToastProvider`.
