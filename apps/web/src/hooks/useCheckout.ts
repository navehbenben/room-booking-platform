import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client';
import type { Hold, RoomDetail } from '../types';
import { friendlyError } from '../utils/errorMessages';

export function useCheckout() {
  const { holdId } = useParams<{ holdId: string }>();
  const [hold, setHold] = useState<Hold | null>(null);
  const [room, setRoom] = useState<RoomDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [bookingId, setBookingId] = useState<string | null>(null);

  useEffect(() => {
    if (!holdId) return;
    setLoading(true);
    api
      .getHold(holdId)
      .then(async (h) => {
        setHold(h as Hold);
        const remaining = Math.max(0, Math.floor((Date.parse(h.expiresAt) - Date.now()) / 1000));
        setRemainingSeconds(remaining);
        if (remaining === 0) {
          setExpired(true);
        }
        try {
          const roomData = await api.roomDetail(h.roomId);
          setRoom(roomData as RoomDetail);
        } catch {
          // Room load failure is non-fatal
        }
      })
      .catch((e) => {
        if (e?.error?.code === 'HOLD_EXPIRED') {
          setExpired(true);
        } else {
          setError(friendlyError(e, 'Failed to load reservation'));
        }
      })
      .finally(() => setLoading(false));
  }, [holdId]);

  useEffect(() => {
    if (!hold || expired) return;
    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        const next = Math.max(0, prev - 1);
        if (next === 0) setExpired(true);
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [hold, expired]);

  const confirm = useCallback(
    async (notes?: string) => {
      // Guard against calling confirm when the hold has already expired
      if (!holdId || expired) return;
      setConfirmLoading(true);
      setError(null);
      try {
        const result = await api.createBookingWithHold(holdId, notes);
        setBookingId(result.bookingId);
      } catch (e) {
        setError(friendlyError(e, 'Failed to confirm booking'));
      } finally {
        setConfirmLoading(false);
      }
    },
    [holdId, expired],
  );

  return { hold, room, remainingSeconds, loading, error, confirm, expired, confirmLoading, bookingId };
}
