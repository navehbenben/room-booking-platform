import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api/client';
import { UserProfile } from '../types';

export function useProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Ref so saveName always closes over the latest profile without being a dependency
  const profileRef = useRef(profile);
  profileRef.current = profile;

  useEffect(() => {
    let cancelled = false;
    api
      .getProfile()
      .then((data) => {
        if (!cancelled) setProfile(data as UserProfile);
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load profile');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Stable: no dependency on profile state — uses ref for rollback
  const saveName = useCallback(async (name: string) => {
    const previous = profileRef.current;
    setProfile((p) => (p ? { ...p, name } : p));
    try {
      const updated = await api.updateProfile({ name });
      setProfile(updated as UserProfile);
    } catch (e) {
      setProfile(previous);
      throw e;
    }
  }, []);

  const savePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    await api.changePassword({ currentPassword, newPassword });
  }, []);

  return { profile, loading, error, saveName, savePassword };
}
