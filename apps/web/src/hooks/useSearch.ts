import { useCallback, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  searchRooms,
  updateParams,
  applyUrlOverrides,
  selectSearchParams,
  selectSearchResults,
  selectSearchMeta,
} from '../store/slices/searchSlice';
import type { SearchParams } from '../types';
import { friendlyError } from '../utils/errorMessages';

export function useSearch(initialOverrides: Partial<SearchParams> = {}) {
  const dispatch = useAppDispatch();
  const params = useAppSelector(selectSearchParams);
  const results = useAppSelector(selectSearchResults);
  const { total, page, hasMore, loading, error } = useAppSelector(selectSearchMeta);

  // Apply URL-provided overrides on mount only (e.g. from landing page search).
  // When there are no overrides the hook restores the last search from the store,
  // enabling back-navigation to SearchPage with filters intact.
  useEffect(() => {
    const hasOverrides = Object.values(initialOverrides).some((v) => v !== undefined);
    if (hasOverrides) dispatch(applyUrlOverrides(initialOverrides));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /** Update a single filter field in the store. */
  const setParam = useCallback(
    <K extends keyof SearchParams>(key: K, val: SearchParams[K]) => {
      dispatch(updateParams({ [key]: val }));
    },
    [dispatch],
  );

  // Stable refs — loadMore is captured by IntersectionObserver once and must
  // not change reference on every re-render, yet still read the latest values.
  const loadingRef = useRef(loading);
  loadingRef.current = loading;
  const hasMoreRef = useRef(hasMore);
  hasMoreRef.current = hasMore;
  const pageRef = useRef(page);
  pageRef.current = page;

  const search = useCallback(
    (p = 1) => {
      dispatch(searchRooms(p));
    },
    [dispatch],
  );

  /** Appends the next page — safe to hand to IntersectionObserver. */
  const loadMore = useCallback(() => {
    if (!loadingRef.current && hasMoreRef.current) {
      dispatch(searchRooms(pageRef.current + 1));
    }
  }, [dispatch]);

  return { params, setParam, results, total, page, hasMore, loading, error, search, loadMore };
}
