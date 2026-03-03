import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { friendlyError } from '../utils/errorMessages';
import { useAppDispatch } from '../store/hooks';
import { logoutUser } from '../store/slices/authSlice';
import { clearProfile } from '../store/slices/profileSlice';
import { clearAll as clearRecentlyViewed } from '../store/slices/recentlyViewedSlice';

const CONSENT_KEY = 'rb_gdpr_consent';

export interface GdprConsent {
  analytics: boolean;
  marketing: boolean;
  restrictProcessing: boolean;
  updatedAt: string;
}

const DEFAULT_CONSENT: GdprConsent = {
  analytics: false,
  marketing: false,
  restrictProcessing: false,
  updatedAt: new Date().toISOString(),
};

function loadConsent(): GdprConsent {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return DEFAULT_CONSENT;
    return { ...DEFAULT_CONSENT, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CONSENT;
  }
}

export function useGdpr() {
  const dispatch = useAppDispatch();
  const [consent, setConsent] = useState<GdprConsent>(loadConsent);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Persist consent whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
    } catch {
      // ignore storage errors
    }
  }, [consent]);

  const updateConsent = useCallback((key: keyof Omit<GdprConsent, 'updatedAt'>, value: boolean) => {
    setConsent((prev) => ({ ...prev, [key]: value, updatedAt: new Date().toISOString() }));
  }, []);

  const exportData = useCallback(async () => {
    setExporting(true);
    setExportError(null);
    try {
      const data = await api.exportMyData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my-data-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setExportError(friendlyError(err, 'Export failed. Please try again.'));
    } finally {
      setExporting(false);
    }
  }, []);

  const deleteAccount = useCallback(async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.deleteMyAccount();
      localStorage.removeItem(CONSENT_KEY);
      // Clear all Redux state tied to this user
      dispatch(clearProfile());
      dispatch(clearRecentlyViewed());
      await dispatch(logoutUser());
    } catch (err: any) {
      setDeleteError(friendlyError(err, 'Deletion failed. Please try again.'));
      setDeleting(false);
    }
  }, [dispatch]);

  return {
    consent,
    updateConsent,
    exportData,
    exporting,
    exportError,
    deleteAccount,
    deleting,
    deleteError,
  };
}
