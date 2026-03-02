import { logger } from '../utils/logger';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export type ApiError = {
  error: {
    code: string;
    message: string;
    requestId?: string;
  };
};

// ---------------------------------------------------------------------------
// Token storage — access token lives in memory only (never localStorage/cookie).
// Storing in memory prevents XSS exfiltration: an attacker script cannot read
// a JS variable that is not exposed on a global. The trade-off is that the token
// is lost on page reload, which is intentional — the app calls /auth/refresh on
// mount to rehydrate using the HttpOnly refresh cookie (which the browser sends
// automatically and JS can never read).
// ---------------------------------------------------------------------------
let _accessToken = '';

export const tokenStore = {
  getAccess: () => _accessToken,
  set: (access: string) => {
    _accessToken = access;
  },
  clear: () => {
    _accessToken = '';
  },
};

// Callback registered by App to handle forced logout on expired session
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

// ---------------------------------------------------------------------------
// Core fetch wrapper with transparent access-token refresh
// ---------------------------------------------------------------------------
let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

async function request<T>(path: string, opts: RequestInit = {}, skipRefresh = false): Promise<T> {
  const token = tokenStore.getAccess();
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(opts.headers ?? {}),
      },
    });
  } catch {
    // TypeError: Failed to fetch — browser is offline or server unreachable
    throw {
      error: { code: 'NETWORK_ERROR', message: 'Unable to connect. Check your internet connection.' },
    } as ApiError;
  }

  if (res.status === 401 && !skipRefresh) {
    // Access token expired — silently refresh using the HttpOnly refresh cookie.
    // The browser sends the cookie automatically; no JS access to the token needed.
    if (isRefreshing) {
      return new Promise<T>((resolve, reject) => {
        refreshQueue.push((newToken) => {
          const newOpts = {
            ...opts,
            headers: { ...((opts.headers as Record<string, string>) ?? {}), Authorization: `Bearer ${newToken}` },
          };
          request<T>(path, newOpts, true).then(resolve).catch(reject);
        });
      });
    }

    isRefreshing = true;
    try {
      const refreshed = await request<{ accessToken: string }>(
        '/auth/refresh',
        {
          method: 'POST',
          // `credentials: 'include'` is required so the browser attaches the
          // HttpOnly refresh cookie even on cross-origin dev setups.
          credentials: 'include',
        },
        true,
      );
      tokenStore.set(refreshed.accessToken);
      refreshQueue.forEach((cb) => cb(refreshed.accessToken));
      refreshQueue = [];
      const retryOpts = {
        ...opts,
        headers: {
          ...((opts.headers as Record<string, string>) ?? {}),
          Authorization: `Bearer ${refreshed.accessToken}`,
        },
      };
      return request<T>(path, retryOpts, true);
    } catch {
      tokenStore.clear();
      onUnauthorized?.();
      logger.warn('Session expired — token refresh failed', { event: 'auth.session_expired', path });
      throw { error: { code: 'SESSION_EXPIRED', message: 'Session expired, please log in again' } } as ApiError;
    } finally {
      isRefreshing = false;
    }
  }

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as ApiError | null;
    throw data ?? ({ error: { code: 'HTTP_ERROR', message: `HTTP ${res.status}` } } as ApiError);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

function authHeader(): Record<string, string> {
  const t = tokenStore.getAccess();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

function uuid(): string {
  return crypto.randomUUID();
}

// ---------------------------------------------------------------------------
// API surface
// ---------------------------------------------------------------------------
export const api = {
  // Called on app mount to restore session from the HttpOnly refresh cookie.
  // Returns a new access token if a valid cookie exists, throws otherwise.
  rehydrate: () => request<{ accessToken: string }>('/auth/refresh', { method: 'POST', credentials: 'include' }, true),

  register: (body: { email: string; password: string; name?: string }) =>
    // skipRefresh=true: a 401 here means bad credentials, not an expired session —
    // we must not try to refresh and overwrite the real error with SESSION_EXPIRED.
    request<{ userId: string; accessToken: string }>(
      '/auth/register',
      {
        method: 'POST',
        body: JSON.stringify(body),
        credentials: 'include',
      },
      true,
    ),

  login: (body: { email: string; password: string }) =>
    // skipRefresh=true: same reason as register above.
    request<{ userId: string; accessToken: string }>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify(body),
        credentials: 'include',
      },
      true,
    ),

  // No body needed — server reads the HttpOnly cookie and clears it server-side
  logout: () => request<void>('/auth/logout', { method: 'POST', credentials: 'include' }, true),

  rooms: () => request<Array<{ roomId: string; name: string; capacity: number; features: string[] }>>('/rooms'),

  search: (params: { start: string; end: string; capacity?: number; features?: string[]; page?: number }) => {
    const q = new URLSearchParams();
    q.set('start', params.start);
    q.set('end', params.end);
    if (params.capacity) q.set('capacity', String(params.capacity));
    if (params.features && params.features.length > 0) q.set('features', params.features.join(','));
    if (params.page && params.page > 1) q.set('page', String(params.page));
    return request<{
      results: Array<{
        roomId: string;
        name: string;
        capacity: number;
        features: string[];
        timezone: string;
        status: string;
      }>;
      total: number;
      page: number;
      limit: number;
    }>(`/rooms/search?${q.toString()}`);
  },

  book: (body: { roomId: string; start: string; end: string }) =>
    request<{ bookingId: string; status: string }>('/bookings', {
      method: 'POST',
      body: JSON.stringify({ roomId: body.roomId, start: body.start, end: body.end }),
      headers: { ...authHeader(), 'idempotency-key': uuid() },
    }),

  myBookings: () =>
    request<
      Array<{ bookingId: string; roomId: string; start: string; end: string; status: string; createdAt: string }>
    >('/bookings/me', { headers: authHeader() }),

  cancelBooking: (bookingId: string) =>
    request<{ bookingId: string; status: string }>(`/bookings/${bookingId}`, {
      method: 'DELETE',
      headers: authHeader(),
    }),

  roomDetail: (id: string, start?: string, end?: string) => {
    const q = new URLSearchParams();
    if (start) q.set('start', start);
    if (end) q.set('end', end);
    const qs = q.toString();
    return request<{
      roomId: string;
      name: string;
      capacity: number;
      description: string;
      features: string[];
      images: string[];
      availabilityStatus: 'AVAILABLE' | 'HELD' | 'BOOKED';
    }>(`/rooms/${id}${qs ? '?' + qs : ''}`);
  },

  createHold: (body: { roomId: string; start: string; end: string }) =>
    request<{ holdId: string; expiresAt: string }>('/holds', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: authHeader(),
    }),

  getHold: (holdId: string) =>
    request<{ holdId: string; roomId: string; start: string; end: string; expiresAt: string }>(`/holds/${holdId}`, {
      headers: authHeader(),
    }),

  createBookingWithHold: (holdId: string, notes?: string) =>
    request<{ bookingId: string; status: string }>('/bookings', {
      method: 'POST',
      body: JSON.stringify({ holdId, notes }),
      headers: { ...authHeader(), 'idempotency-key': uuid() },
    }),

  /** Returns the authenticated user's profile. */
  getProfile: () =>
    request<{
      id: string;
      email: string;
      name: string | null;
      createdAt: string;
      hasPassword: boolean;
      hasGoogleAccount: boolean;
    }>('/users/me', { headers: authHeader() }),

  /** Updates the authenticated user's display name. */
  updateProfile: (body: { name: string }) =>
    request<{
      id: string;
      email: string;
      name: string | null;
      createdAt: string;
      hasPassword: boolean;
      hasGoogleAccount: boolean;
    }>('/users/me', { method: 'PATCH', body: JSON.stringify(body), headers: authHeader() }),

  /** Changes the password for password-based accounts. */
  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    request<void>('/users/me/change-password', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: authHeader(),
    }),

  /** Right to Access + Portability: returns all personal data as a JSON object. */
  exportMyData: () => request<object>('/users/me/data', { headers: authHeader() }),

  /** Right to Erasure: permanently deletes the account and clears the session cookie. */
  deleteMyAccount: () =>
    request<void>('/users/me', { method: 'DELETE', headers: authHeader(), credentials: 'include' }),
};
