# Frontend Developer Guide

## Project Overview

This is a professional React + TypeScript frontend for a government-grade authentication system combined with device/asset management (DeviceMS). The application implements sophisticated session management, real-time activity tracking, and comprehensive user interface for managing authentication and assets.

**Technology Stack:**

- **React 18** - UI library
- **TypeScript** - Type safety
- **Zustand** - State management
- **React Router v6** - Routing
- **Axios** - HTTP client
- **TanStack Query** - Data fetching & caching
- **Tailwind CSS** - Styling
- **Shadcn/ui** - UI component library

---

## Table of Contents

1. [Project Structure](#project-structure)
2. [Authentication System](#authentication-system)
3. [State Management](#state-management)
4. [Key Features](#key-features)
5. [Development Workflow](#development-workflow)
6. [Deployment](#deployment)

---

## Project Structure

\`\`\`
src/
├── App.tsx # Main App component & routing
├── router.tsx # Route definitions
├── pages/ # Top-level page components
│ ├── LoginPage.tsx
│ └── DashboardPage.tsx
│
├── features/ # Feature modules (grouped by functionality)
│ ├── auth/ # Authentication pages
│ │ ├── pages/
│ │ ├── components/
│ │ └── hooks/
│ ├── dashboard/ # Dashboard pages
│ ├── assets/ # Asset management (devices, buildings, vehicles)
│ └── admin/ # Admin panels (user management, sessions)
│
├── shared/ # Reusable across features
│ ├── components/ # Common UI components (Button, Modal, etc.)
│ ├── hooks/ # Custom React hooks
│ │ ├── useSessionManager.ts # Session lifecycle management
│ │ ├── useSessionMonitor.ts # Multi-session admin panel
│ │ ├── useActivityTracker.ts # Activity tracking
│ │ ├── useInactivityWarning.ts # Inactivity warnings
│ │ └── ...
│ ├── layouts/ # Layout components (MainLayout, etc.)
│ ├── services/ # API services
│ │ ├── api.ts # Axios instance & base config
│ │ ├── authService.ts # Auth API calls
│ │ ├── sessionMonitorService.ts # Session admin API
│ │ └── ...
│ ├── store/ # Zustand stores
│ │ ├── authStore.ts # Authentication state
│ │ ├── cookieAuthStore.ts # Cookie-based auth (alternative)
│ │ ├── sessionStore.ts # Session state
│ │ ├── notificationStore.ts # Notifications
│ │ └── ...
│ └── lib/ # Utilities & helpers
│ ├── axiosInstance.ts # Axios interceptors
│ ├── tokenStorage.ts # Token management
│ └── ...
│
└── types/ # Global TypeScript types
└── index.ts
\`\`\`

---

## Authentication System

### How It Works

The frontend implements a sophisticated token-based authentication system with automatic token refresh and multi-device session management.

**Key Components:**

1. **authStore (Zustand)** - Manages auth state (user, tokens, login status)
2. **cookieAuthStore** - Alternative store with enhanced cookie handling
3. **axiosInstance** - Axios interceptor for token attachment and refresh
4. **useSessionManager** - Hook for managing session lifecycle
5. **useInactivityWarning** - Hook for inactivity tracking

### Login Flow

\`\`\`
User → LoginPage.tsx
↓
POST /auth/login
↓
Response: access_token, refresh_token (cookie), user
↓
authStore.setUser()
↓
axiosInstance adds Authorization header
↓
redirect to Dashboard
\`\`\`

### Token Refresh Flow

\`\`\`
API Call with expired token
↓
401 Unauthorized response
↓
axiosInstance interceptor catches 401
↓
POST /auth/refresh (auto-sends refresh_token from cookie)
↓
New access_token returned
↓
Set in axiosInstance
↓
Retry original request
↓
Success
\`\`\`

### Multi-Device Session Management

The system tracks multiple simultaneous sessions per user:

\`\`\`typescript
// User logged in from 3 devices:
Sessions [
{
id: "session-1",
device: "Chrome on Linux",
lastActivity: "2025-10-18T15:45Z",
isCurrent: true
},
{
id: "session-2",
device: "Safari on iOS",
lastActivity: "2025-10-18T12:10Z",
isCurrent: false
},
{
id: "session-3",
device: "Edge on Windows",
lastActivity: "2025-10-18T09:00Z",
isCurrent: false
}
]

// Admin can revoke any session:
DELETE /api/auth/sessions/session-2
// → User logged out from that device
\`\`\`

---

## State Management (Zustand)

### authStore

**Purpose:** Global authentication state

\`\`\`typescript
// Store state
{
user: User | null,
isAuthenticated: boolean,
isLoading: boolean,
error: string | null,
accessToken: string | null
}

// Store actions
{
login(credentials),
logout(),
setUser(user),
setAccessToken(token),
updateUser(updates),
refreshToken()
}

// Usage in component
const { user, isAuthenticated, login } = useAuthStore();
\`\`\`

### cookieAuthStore

**Purpose:** Enhanced auth with cookie management

\`\`\`typescript
// Additional methods
{
getTokenFromCookie(),
setTokenInCookie(token),
clearTokenFromCookie(),
validateSession(),
syncWithStorage()
}
\`\`\`

### sessionStore

**Purpose:** Manages active sessions for current user

\`\`\`typescript
{
sessions: UserSession[],
currentSession: UserSession | null,
fetchSessions(),
revokeSession(sessionId),
revokeAllOtherSessions()
}
\`\`\`

---

## Key Features

### 1. Automatic Token Refresh

**File:** `src/shared/lib/axiosInstance.ts`

The axios interceptor automatically:

- Attaches access token to requests
- Detects 401 responses
- Calls refresh endpoint
- Retries original request with new token

\`\`\`typescript
// Automatic on every request
axiosInstance.interceptors.response.use(
response => response,
error => {
if (error.response?.status === 401) {
return refreshAndRetry(error.config);
}
return Promise.reject(error);
}
);
\`\`\`

### 2. Session Activity Tracking

**File:** `src/shared/hooks/useActivityTracker.ts`

Tracks user activity (clicks, typing, scrolling) and:

- Updates last activity timestamp
- Extends session expiration
- Tracks activity across tabs
- Persists to backend

### 3. Inactivity Warnings

**File:** `src/shared/hooks/useInactivityWarning.ts`

Shows warning when user inactive for 25 minutes (with 5-min timeout):

- Modal dialog with countdown
- Options to "Stay Logged In" or "Logout"
- Automatic logout if no response

### 4. Multi-Tab Synchronization

**File:** `src/shared/hooks/useSessionActivityTracker.ts`

Keeps multiple browser tabs in sync:

- Shared localStorage state
- Storage event listeners
- Force logout if session terminated on another tab
- Real-time notification updates

### 5. Device Management

Multiple device type pages:

- **Buildings** - Manage office buildings
- **Vehicles** - Track company vehicles
- **ICT Assets** - IT equipment inventory
- **Office Equipment** - Furniture, printers, etc.
- **Plant Machinery** - Industrial equipment
- **Land Assets** - Property management
- **Portable Items** - Mobile devices/tools
- **Furniture Equipment** - Office furniture

Each with:

- Create, read, update, delete operations
- Transfer history tracking
- Condition and depreciation tracking
- Search and filtering
- Bulk operations

### 6. Admin Features

**Session Monitor** - `src/features/assets/pages/admin/SessionMonitor.tsx`

Administrators can:

- View all active user sessions
- See device info (browser, OS, IP address)
- Revoke individual sessions
- Force users to re-authenticate
- Track session timeline

### 7. Real-Time Notifications

**File:** `src/shared/store/notificationStore.ts`

System events trigger notifications:

- Session terminated by admin
- Token reuse detected
- Login from new device
- Password expiration warning
- Failed login attempts

---

## Development Workflow

### Setup

\`\`\`bash

# Install dependencies

npm install

# Configure environment variables

cp .env.example .env.local

# Edit .env.local with your backend URL

# Start development server

npm run dev

# Runs on http://localhost:5173

\`\`\`

### Environment Variables

\`\`\`bash
VITE_API_URL=http://localhost:8000/api
VITE_APP_NAME=DeviceMS
VITE_PRODUCTION=false
\`\`\`

### Common Tasks

#### Adding a New Page

1. Create page component in `src/features/[feature]/pages/`
2. Create route in `src/router.tsx`
3. Add navigation in layout

\`\`\`typescript
// src/router.tsx
{
path: "/new-page",
element: <NewPageComponent />,
requiredRole: "admin" // Optional
}
\`\`\`

#### Adding API Calls

1. Create service in `src/shared/services/`
2. Use axiosInstance for automatic auth

\`\`\`typescript
// src/shared/services/newService.ts
export const newService = {
getItems: () => axiosInstance.get('/api/items'),
createItem: (data) => axiosInstance.post('/api/items', data),
deleteItem: (id) => axiosInstance.delete(`/api/items/${id}`)
};
\`\`\`

#### Using State Management

\`\`\`typescript
import { useAuthStore } from '@/shared/store/authStore';

function MyComponent() {
const { user, isAuthenticated } = useAuthStore();

return isAuthenticated ? <Dashboard /> : <LoginPage />;
}
\`\`\`

#### Handling Loading & Errors

\`\`\`typescript
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

const handleFetch = async () => {
setLoading(true);
setError(null);
try {
const data = await apiService.fetchData();
// Process data
} catch (err) {
setError(err instanceof Error ? err.message : 'Unknown error');
} finally {
setLoading(false);
}
};
\`\`\`

### Debugging

**Check Authentication:**
\`\`\`typescript
// In browser console
localStorage.getItem('authStore') // Check auth state
document.cookie // Check auth cookies
\`\`\`

**Check API Requests:**

- Open DevTools Network tab
- Look for auth/login, auth/refresh calls
- Check Authorization headers
- Verify response tokens

**Session Issues:**
\`\`\`typescript
// Check active sessions
sessionStore.sessions // Array of active sessions
sessionStore.currentSession // Current device session
\`\`\`

---

## Deployment

### Build

\`\`\`bash
npm run build

# Creates optimized production build in dist/

\`\`\`

### Environment Configuration (Production)

\`\`\`bash
VITE_API_URL=https://api.production.gov
VITE_PRODUCTION=true
\`\`\`

### Security Checklist

- [ ] Remove debug logs
- [ ] Disable console errors display
- [ ] Configure CORS origins
- [ ] Set secure cookie flags
- [ ] Enable HTTPS only
- [ ] Configure CSP headers
- [ ] Remove sensitive data from state

### Performance Optimization

**Bundle Size:**

- Tree-shake unused code
- Lazy load routes
- Code split heavy components

\`\`\`typescript
const AdminPanel = lazy(() => import('./features/admin/AdminPanel'));
\`\`\`

**State Optimization:**

- Only subscribe to needed state
- Memoize selectors
- Avoid unnecessary re-renders

\`\`\`typescript
const user = useAuthStore(state => state.user);
\`\`\`

---

## Troubleshooting

### "401 Unauthorized" Errors

**Cause:** Token expired or invalid
**Solution:** Check if refresh endpoint is being called. Verify cookie settings.

### "CORS Error"

**Cause:** Frontend origin not allowed by backend
**Solution:** Add frontend URL to CORS_ORIGINS in backend config

### Session Keeps Getting Invalidated

**Cause:** Activity tracking disabled or backend session timeout too short
**Solution:** Check useActivityTracker is active, increase session timeout

### Multiple Login Requests

**Cause:** Multiple components calling login simultaneously
**Solution:** Use loading state, disable form while loading

---

## Resources

- [React 18 Docs](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
- [Zustand Docs](https://github.com/pmndrs/zustand)
- [React Router v6](https://reactrouter.com)
- [Tailwind CSS](https://tailwindcss.com)
- [ShadcN UI](https://ui.shadcn.com)
- [Axios Docs](https://axios-http.com)

---

## Contributing

Follow these guidelines:

1. Create feature branch: `git checkout -b feature/feature-name`
2. Make changes following project structure
3. Test locally: `npm run dev`
4. Build: `npm run build`
5. Submit pull request with description

---

## Support

For issues, check:

1. Backend API docs: `GET /api/docs`
2. Correlation IDs in error responses
3. Browser console for client errors
4. Network tab for API calls
