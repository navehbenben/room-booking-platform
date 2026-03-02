# Web — React Frontend

The single-page application for the Room Booking Platform. Built with React 18, Vite 5, TypeScript, and React Router 6. Supports six languages via i18next with automatic browser-language detection.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Application Routes](#application-routes)
- [Project Structure](#project-structure)
- [API Client](#api-client)
- [Authentication Flow](#authentication-flow)
- [State Management](#state-management)
- [Hooks Reference](#hooks-reference)
- [Component Library](#component-library)
- [Internationalisation (i18n)](#internationalisation-i18n)
- [Testing](#testing)
- [Docker Build](#docker-build)

---

## Tech Stack

| | |
|---|---|
| Framework | React 18.3 |
| Build tool | Vite 5.4 |
| Language | TypeScript 5.5 |
| Routing | React Router 6.26 |
| i18n | i18next + react-i18next + i18next-browser-languagedetector |
| HTTP | Fetch API (custom client with token refresh) |
| Testing | Vitest + Testing Library + jsdom |
| Styling | Plain CSS with CSS custom properties |

---

## Getting Started

### Prerequisites

- Node.js 20+
- The API running locally (see `apps/api/README.md`) or via Docker Compose

### Install dependencies

```bash
npm install
```

### Start development server

```bash
npm run dev
```

Opens at `http://localhost:5173`. API requests are proxied to `http://localhost:3001` by default — set `VITE_API_BASE_URL` if your API runs elsewhere.

### Available scripts

| Script | Description |
|---|---|
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run type-check` | TypeScript check without emit |
| `npm run lint` | ESLint |
| `npm run format:check` | Prettier check |
| `npm test` | Vitest (single run) |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:coverage` | Vitest with v8 coverage report |

---

## Environment Variables

Variables are prefixed with `VITE_` and injected at build time.

| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `/api` | Base path for all API requests. In development, Vite's dev server proxies this to the API. In production, Nginx handles the proxy. |
| `VITE_DD_CLIENT_TOKEN` | — | Datadog Browser Logs client token (optional). If unset, logging is disabled. |
| `VITE_DD_SITE` | `datadoghq.com` | Datadog intake site. |

---

## Application Routes

| Route | Auth required | Description |
|---|---|---|
| `/` | No | Landing page with hero search form and featured rooms |
| `/login` | No (redirects if logged in) | Email / password login |
| `/register` | No (redirects if logged in) | Account registration |
| `/search` | No | Room search with filters and infinite scroll |
| `/rooms/:roomId` | No | Room detail — images, features, availability, hold creation |
| `/checkout/:holdId` | **Yes** | Checkout with 5-minute countdown and booking confirmation |
| `/bookings` | **Yes** | My bookings — list and cancel |
| `/userprofile` | **Yes** | Profile settings, password change, privacy controls |
| `/privacy` | No | GDPR privacy controls (consent, data export, account deletion) |

Unauthenticated users accessing protected routes are redirected to `/login?redirect=<original-path>` and returned to their intended destination after login.

---

## Project Structure

```
src/
├── main.tsx                    # Entry point — i18n init (must be first import), React root
├── i18n/
│   ├── index.ts                # i18next configuration
│   └── locales/
│       ├── en/translation.json
│       ├── es/translation.json
│       ├── fr/translation.json
│       ├── de/translation.json
│       ├── it/translation.json
│       └── pt/translation.json
│
├── api/
│   └── client.ts               # Typed fetch wrapper, token management, auto-refresh
│
├── ui/
│   ├── App.tsx                 # Router, auth state, RequireAuth guard
│   └── styles.css              # Global styles and CSS variables
│
├── pages/
│   ├── LandingPage.tsx
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── SearchPage.tsx
│   ├── RoomDetailPage.tsx
│   ├── CheckoutPage.tsx
│   ├── MyBookingsPage.tsx
│   ├── UserProfilePage.tsx
│   └── GdprPage.tsx
│
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   └── GoogleAuthButton.tsx
│   ├── bookings/
│   │   └── BookingCard.tsx
│   ├── checkout/
│   │   ├── BookingSummary.tsx
│   │   ├── CheckoutForm.tsx
│   │   ├── CountdownTimer.tsx
│   │   └── ExpiryModal.tsx
│   ├── landing/
│   │   ├── FeaturedRoomsStrip.tsx
│   │   ├── PromoBanner.tsx
│   │   └── RecentlyViewedSection.tsx
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   └── Nav.tsx
│   ├── rooms/
│   │   ├── AmenitiesGrid.tsx
│   │   ├── ImageGallery.tsx
│   │   ├── RoomCard.tsx
│   │   └── SearchFilters.tsx
│   └── ui/
│       ├── Badge.tsx
│       ├── Button.tsx
│       ├── EmptyState.tsx
│       ├── Input.tsx
│       ├── LanguageSwitcher.tsx
│       ├── SkeletonCard.tsx
│       └── Spinner.tsx
│
├── hooks/
│   ├── useAuth.ts
│   ├── useBookings.ts
│   ├── useCheckout.ts
│   ├── useGdpr.ts
│   ├── useHold.ts
│   ├── useProfile.ts
│   ├── useRecentlyViewed.ts
│   ├── useRoomDetail.ts
│   └── useSearch.ts
│
├── constants/
│   ├── amenities.ts            # Amenity options with i18n keys and icons
│   └── search.ts               # Sort options with i18n keys
│
├── types/
│   └── index.ts                # Shared TypeScript interfaces
│
├── utils/
│   ├── date.ts                 # formatInTimezone, timezoneOffsetLabel
│   └── errorMessages.ts        # Friendly error strings via i18next
│
└── setupTests.ts               # Vitest global setup (i18n init, testing-library matchers)
```

---

## API Client

`src/api/client.ts` is a typed fetch wrapper around the backend REST API. It handles:

### Token management

The access token (JWT) is stored in a JavaScript module-level variable — never in `localStorage` or `sessionStorage`. This prevents XSS attacks from stealing the token. The refresh token lives in an HttpOnly cookie managed by the browser.

```
┌─────────────┐     401     ┌──────────────────────┐
│  any request│ ──────────► │ queue request         │
└─────────────┘             │ POST /auth/refresh    │
                            │ retry with new token  │
                            └──────────────────────┘
```

On a `401` response, the client:
1. Queues the failed request
2. Calls `POST /auth/refresh` (the HttpOnly cookie is sent automatically)
3. Stores the new access token
4. Replays all queued requests with the updated token

Concurrent `401`s during a single refresh window are coalesced — only one `/auth/refresh` call is made.

### Idempotency

`POST /bookings` automatically includes a `Idempotency-Key: <uuid>` header (generated with `crypto.randomUUID()`). Retrying the same request is safe — the server returns the original response.

### Exposed methods

```typescript
// Auth
api.register(email, password, name?)
api.login(email, password)
api.logout()
api.rehydrate()               // called on app mount to restore session via refresh token

// Rooms
api.rooms()                   // list all
api.search(params)            // paginated, filtered search
api.roomDetail(id, start?, end?)

// Holds
api.createHold(roomId, start, end)
api.getHold(holdId)

// Bookings
api.book(roomId, start, end)
api.createBookingWithHold(holdId, notes?)
api.myBookings()
api.cancelBooking(id)

// Users / Profile
api.getProfile()
api.updateProfile(name)
api.changePassword(currentPassword, newPassword)
api.exportMyData()
api.deleteMyAccount()
```

---

## Authentication Flow

```
App mounts
  └── useAuth → api.rehydrate() → POST /auth/refresh
        ├── success: store access token, isLoggedIn = true
        └── failure: isLoggedIn = false (no valid cookie)

Login / Register
  └── api.login() / api.register()
        └── response: { userId, accessToken }
              ├── store access token in memory
              └── server sets refreshToken as HttpOnly cookie

Page reload
  └── access token is lost (in-memory)
      └── App mounts again → rehydrate() → refreshes seamlessly

Logout
  └── api.logout() → POST /auth/logout
        ├── server revokes refreshToken, clears cookie
        └── client clears in-memory token, updates UI
```

During rehydration, `App.tsx` shows a loading spinner so the UI never flashes an "unauthenticated" state before the token refresh completes.

---

## State Management

The application uses React's built-in hooks — no external state management library. Auth state (`isLoggedIn`, `rehydrating`) is lifted into `App.tsx` and passed down as props.

| Concern | Location |
|---|---|
| Auth state | `useAuth` hook → `App.tsx` props |
| Room search state | `useSearch` hook (local to `SearchPage`) |
| Checkout / hold state | `useCheckout` + `useHold` hooks |
| Bookings list | `useBookings` hook |
| Profile data | `useProfile` hook |
| Recently viewed rooms | `useRecentlyViewed` hook → `localStorage` |
| GDPR consent | `useGdpr` hook |

---

## Hooks Reference

### `useAuth()`

Manages the authentication lifecycle. Call once in `App.tsx`.

```typescript
const { isLoggedIn, rehydrating, login, register, logout } = useAuth();
```

- `rehydrating` — true while `POST /auth/refresh` is in-flight on mount
- `login(email, password)` — authenticates and updates `isLoggedIn`
- `register(email, password, name?)` — creates account and logs in
- `logout()` — revokes session and sets `isLoggedIn = false`

---

### `useSearch()`

Manages paginated room search with infinite scroll.

```typescript
const { results, total, loading, error, hasMore, loadMore, setParams } = useSearch();
```

- Page 1 always replaces the results list
- Pages 2+ are accumulated (append)
- `loadMore()` increments the page and fetches the next batch
- `setParams(newParams)` resets to page 1 with the new filters

---

### `useHold()`

Creates a 5-minute hold on a room slot.

```typescript
const { loading, error, holdId, expiresAt, createHold } = useHold();
```

On success, `holdId` and `expiresAt` are populated. The `CheckoutPage` reads `holdId` from the URL param and uses `useCheckout` to manage the countdown.

---

### `useCheckout()`

Manages the checkout session for a given hold.

```typescript
const { hold, secondsLeft, expired, confirming, error, confirm } = useCheckout(holdId);
```

- Fetches hold details on mount
- `secondsLeft` counts down in real-time (updated every second)
- `expired` becomes `true` when `secondsLeft <= 0` — `ExpiryModal` is shown
- `confirm(notes?)` calls `POST /bookings` with the holdId and navigates to `/bookings` on success

---

### `useRecentlyViewed()`

Stores the last 6 viewed rooms in `localStorage`.

```typescript
const { rooms, addRoom } = useRecentlyViewed();
```

Called automatically by `RoomDetailPage` whenever a room is loaded.

---

### `useProfile()`

Fetches and updates the current user's profile.

```typescript
const { profile, loading, error, saveName, savePassword } = useProfile();
```

---

### `useGdpr()`

Manages GDPR consent and account actions.

```typescript
const { consent, updateConsent, exportData, exporting, exportError,
        deleteAccount, deleting, deleteError } = useGdpr(onAccountDeleted);
```

- `exportData()` — triggers a JSON download of all personal data
- `deleteAccount()` — permanently deletes the account and calls `onAccountDeleted`

---

## Component Library

### `<Button>`

```tsx
<Button variant="primary" | "secondary" | "ghost" | "danger"
        loading={boolean}
        disabled={boolean}>
  Label
</Button>
```

### `<Badge>`

```tsx
<Badge variant="success" | "warning" | "cancelled" | "neutral" | "sale">
  Text
</Badge>
```

### `<CountdownTimer>`

Displays a live countdown. Turns red when less than 60 seconds remain.

```tsx
<CountdownTimer secondsLeft={secondsLeft} />
```

### `<ImageGallery>`

Hero image with up to 4 thumbnail strip. Click hero to open fullscreen lightbox. Keyboard `Escape` closes the lightbox.

```tsx
<ImageGallery images={room.images} />
```

### `<LanguageSwitcher>`

Globe 🌐 dropdown in the Header. Displays languages by their native name (English, Español, Français, Deutsch, Italiano, Português). Selection is persisted to `localStorage`.

### `<SkeletonCard>`

Animated loading placeholder matching the shape of a `RoomCard`.

---

## Internationalisation (i18n)

The app is fully translated into six languages.

| Language | Code | Notes |
|---|---|---|
| English | `en` | Default / fallback |
| Spanish | `es` | Castilian Spanish |
| French | `fr` | Formal (vous) |
| German | `de` | Formal (Sie) |
| Italian | `it` | |
| Portuguese | `pt` | European Portuguese |

### Language detection order

1. `localStorage` (`i18nextLng` key) — preserves manual selection across sessions
2. `navigator.language` — browser's configured language

### Switching language

The `LanguageSwitcher` component calls `i18n.changeLanguage(code)`. i18next-browser-languagedetector automatically persists the choice to `localStorage`.

### Translation keys

All strings live in `src/i18n/locales/{lang}/translation.json` under a single `translation` namespace. Keys are organised by feature:

```
common.*         Shared: loading, cancel, save, back
nav.*            Header navigation tabs
header.*         Auth buttons, aria labels
footer.*         Brand, links, copyright
landing.*        Hero form, promo banners, featured strip
search.*         Page title, empty state, sort options
filters.*        SearchFilters labels
roomCard.*       Capacity plurals, feature overflow
roomDetail.*     Policies, timezone banner, CTA
checkout.*       Timer, form, summary
bookings.*       MyBookings title, empty state
auth.*           Login/register forms, password strength
profile.*        UserProfilePage labels
gdpr.*           All five GDPR sections
amenities.*      Amenity display names
errors.*         Friendly error messages
languageSwitcher.* Aria label
app.*            Loading spinner
```

### Pluralisation

i18next `_one` / `_other` suffix convention:

```json
"capacity_one": "Up to {{count}} person",
"capacity_other": "Up to {{count}} people"
```

```tsx
t('roomCard.capacity', { count: room.capacity })
```

### Adding a new language

1. Copy `src/i18n/locales/en/translation.json` to `src/i18n/locales/{code}/translation.json`
2. Translate all values (keep keys and `{{variable}}` placeholders unchanged)
3. Add the language code to `supportedLngs` in `src/i18n/index.ts`
4. Import and register the new JSON in the `resources` object in `src/i18n/index.ts`
5. Add a `{ code, label }` entry to `LANGUAGES` in `src/components/ui/LanguageSwitcher.tsx`

---

## Testing

Tests use Vitest with jsdom and `@testing-library/react`.

```bash
npm test            # single run
npm run test:watch  # watch mode
npm run test:coverage
```

### Setup

`src/setupTests.ts` initialises i18next synchronously with English only and no `LanguageDetector` — this ensures all existing string assertions continue to pass without modification.

### Test location

Test files live alongside their components in `__tests__/` subdirectories:

```
src/components/ui/__tests__/Button.test.tsx
src/components/auth/__tests__/LoginForm.test.tsx
src/hooks/__tests__/useAuth.test.ts
...
```

**179 tests** across **28 test files** (as of latest run).

---

## Docker Build

Two-stage Dockerfile:

1. **build** — Node 20 Alpine, installs all deps, runs `vite build`, outputs to `dist/`
2. **runtime** — Nginx 1.27 Alpine, copies `dist/` to `/usr/share/nginx/html`, applies SPA routing config

### Nginx configuration

- All unknown paths return `index.html` (client-side routing)
- `/api/*` is reverse-proxied to the `api-lb` service (internal Docker DNS)
- `/api/metrics` returns `403` (metrics are internal-only)

Build manually:

```bash
docker build -t room-booking-web .
docker run -p 8080:80 room-booking-web
```

The container expects the API to be reachable at `/api` (proxied internally). Set `VITE_API_BASE_URL` at build time if using a different path:

```bash
docker build --build-arg VITE_API_BASE_URL=https://api.example.com -t room-booking-web .
```
# room-booking-platform
