import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { friendlyError } from '../utils/errorMessages';

export function useHold() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createHold = async (roomId: string, start: string, end: string) => {
    setLoading(true);
    setError(null);
    try {
      const hold = await api.createHold({ roomId, start, end });
      navigate(`/checkout/${hold.holdId}`);
    } catch (e) {
      setError(friendlyError(e, 'Failed to reserve room'));
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, createHold };
}
