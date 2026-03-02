import { useState, useCallback } from 'react';

export interface RecentlyViewedRoom {
  roomId: string;
  name: string;
  capacity: number;
  features: string[];
}

// GDPR note: stores only non-personal room metadata (no user data).
// Keys are roomId + display fields. Users can clear via clearAll().
const LS_KEY = 'rb_recently_viewed';
const MAX_ITEMS = 8;

function read(): RecentlyViewedRoom[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function useRecentlyViewed() {
  const [rooms, setRooms] = useState<RecentlyViewedRoom[]>(read);

  const addRoom = useCallback((room: RecentlyViewedRoom) => {
    setRooms((prev) => {
      const filtered = prev.filter((r) => r.roomId !== room.roomId);
      const next = [room, ...filtered].slice(0, MAX_ITEMS);
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    try {
      localStorage.removeItem(LS_KEY);
    } catch {}
    setRooms([]);
  }, []);

  return { rooms, addRoom, clearAll };
}
