import { useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchProfile,
  updateProfileName,
  changeProfilePassword,
  selectProfile,
  selectProfileLoading,
  selectProfileError,
} from '../store/slices/profileSlice';
import type { UserProfile } from '../types';

export function useProfile() {
  const dispatch = useAppDispatch();
  const profile = useAppSelector(selectProfile);
  const loading = useAppSelector(selectProfileLoading);
  const error = useAppSelector(selectProfileError);

  useEffect(() => {
    // fetchProfile thunk is a no-op when data is already in the store —
    // navigating back to the profile page avoids a redundant round-trip.
    dispatch(fetchProfile());
  }, [dispatch]);

  /** Optimistically updates the display name. Throws on failure (for the form to catch). */
  const saveName = useCallback(
    async (name: string): Promise<void> => {
      const result = await dispatch(updateProfileName(name));
      if (updateProfileName.rejected.match(result)) {
        throw result.payload;
      }
    },
    [dispatch],
  );

  const savePassword = useCallback(
    async (currentPassword: string, newPassword: string): Promise<void> => {
      const result = await dispatch(changeProfilePassword({ currentPassword, newPassword }));
      if (changeProfilePassword.rejected.match(result)) {
        throw result.payload;
      }
    },
    [dispatch],
  );

  return { profile: profile as UserProfile | null, loading, error, saveName, savePassword };
}
