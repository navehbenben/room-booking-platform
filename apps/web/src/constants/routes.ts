export const ROUTES = {
  HOME:        '/',
  SEARCH:      '/search',
  ROOM:        '/rooms/:id',
  CHECKOUT:    '/checkout/:holdId',
  BOOKINGS:    '/bookings',
  PROFILE:     '/userprofile',
  LOGIN:       '/login',
  REGISTER:    '/register',
  GDPR:        '/privacy',
} as const;

export function roomPath(id: string) {
  return `/rooms/${id}`;
}

export function checkoutPath(holdId: string) {
  return `/checkout/${holdId}`;
}

export function loginWithRedirect(redirect: string) {
  return `/login?redirect=${encodeURIComponent(redirect)}`;
}