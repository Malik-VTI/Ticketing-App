# Frontend - Ticketing Application

React frontend application for the Ticketing Application built with Vite, TypeScript, and React Router.

## Features

- User registration and login
- JWT token management
- Protected routes
- Responsive design
- Simple and clean UI

## Prerequisites

- Node.js 18+ 
- npm or yarn

## Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env` file (optional, defaults to localhost:3000):
   ```env
   VITE_API_URL=http://localhost:3000/api
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

## Project Structure

```
frontend/
├── src/
│   ├── components/        # Reusable components
│   │   ├── Layout.tsx    # Main layout with header/footer
│   │   └── ProtectedRoute.tsx
│   ├── contexts/          # React contexts
│   │   └── AuthContext.tsx
│   ├── pages/             # Page components
│   │   ├── Home.tsx
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   └── Dashboard.tsx
│   ├── services/          # API services
│   │   └── api.ts
│   ├── App.tsx            # Main app component
│   ├── main.tsx           # Entry point
│   └── index.css          # Global styles
├── index.html
├── package.json
└── vite.config.ts
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Pages

- **Home** (`/`) - Landing page with features
- **Flights** (`/flights`) - Search flight schedules powered by the Flight Service
- **Login** (`/login`) - User login
- **Register** (`/register`) - User registration
- **Dashboard** (`/dashboard`) - Protected user dashboard

## API Integration

The frontend communicates with the API Gateway at `http://localhost:3000/api` by default.

### Flight Search

- Default page load fetches paginated flight schedules
- Search form accepts airport names/cities/codes (case-insensitive)
- Airport suggestions are preloaded (up to 1000 airports) for convenience
- Search requests hit `GET /api/flights/search` which converts names to IDs server-side

### Authentication Flow

1. User registers/logs in
2. API Gateway returns JWT tokens
3. Tokens stored in localStorage
4. Tokens automatically added to API requests
5. On 401 error, user redirected to login

## Development

The app uses:
- **Vite** for fast development and building
- **React Router** for routing
- **Axios** for HTTP requests
- **TypeScript** for type safety

## Environment Variables

Create a `.env` file in the frontend directory:

```env
VITE_API_URL=http://localhost:3000/api
```

Note: Vite requires the `VITE_` prefix for environment variables.

## Next Steps

- Add airport lookup UI to avoid manual UUID entry ✅
- Expand search capabilities for trains and hotels
- Implement booking flow
- Add payment integration
- Enhance UI/UX
- Add loading states and error handling improvements

