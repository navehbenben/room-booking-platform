import type { Room } from '../types';
import type { SortOption } from '../types';

/** Generates a deterministic placeholder image URL from a room name. */
export function roomImageUrl(name: string): string {
  const slug = name.toLowerCase().replace(/\s+/g, '-');
  return `https://picsum.photos/seed/${slug}/600/360`;
}

/** Client-side sort — applied after the API returns results. */
export function sortRooms(rooms: Room[], sort: SortOption): Room[] {
  if (sort === 'recommended') return rooms;
  return [...rooms].sort((a, b) => {
    if (sort === 'capacity_asc')  return a.capacity - b.capacity;
    if (sort === 'capacity_desc') return b.capacity - a.capacity;
    return 0;
  });
}

/**
 * Returns a pseudo-random urgency message for a room to simulate demand signals.
 * Seeded by roomId so the same room always shows the same badge.
 */
export function urgencyLabel(roomId: string): string | null {
  // Use a simple hash so it's stable per room
  const hash = roomId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const bucket = hash % 6;
  if (bucket === 0) return 'High demand';
  if (bucket === 1) return 'Only 2 slots left today';
  if (bucket === 2) return 'Popular choice';
  return null; // ~50% of rooms show no urgency label
}