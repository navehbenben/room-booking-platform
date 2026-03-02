import { useState, useCallback, useEffect } from 'react';
import { api } from '../api/client';
import type { Booking } from '../types';
import { friendlyError } from '../utils/errorMessages';

export function useBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const data = await api.myBookings();
      setBookings(data);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const cancel = useCallback(async (bookingId: string) => {
    setCancellingId(bookingId);
    try {
      await api.cancelBooking(bookingId);
      setBookings((prev) =>
        prev.map((b) => (b.bookingId === bookingId ? { ...b, status: 'CANCELLED' } : b)),
      );
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setCancellingId(null);
    }
  }, []);

  return { bookings, loading, error, cancellingId, load, cancel };
}
