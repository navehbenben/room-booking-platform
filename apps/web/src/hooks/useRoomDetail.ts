import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import type { RoomDetail } from '../types';
import { friendlyError } from '../utils/errorMessages';

export function useRoomDetail() {
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const start = searchParams.get('start') ?? undefined;
  const end = searchParams.get('end') ?? undefined;

  const [room, setRoom] = useState<RoomDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId) return;
    setLoading(true);
    setError(null);
    api
      .roomDetail(roomId, start, end)
      .then((r) => setRoom(r as RoomDetail))
      .catch((e) => setError(friendlyError(e, 'Failed to load room details')))
      .finally(() => setLoading(false));
  }, [roomId, start, end]);

  return { room, loading, error, roomId, start, end };
}
