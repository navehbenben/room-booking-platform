import { useState, useCallback, useRef } from 'react';
import { api } from '../api/client';
import type { Room, SearchParams } from '../types';
import { friendlyError } from '../utils/errorMessages';
import { defaultStart, defaultEnd, dateToStartISO, dateToEndISO } from '../utils/date';
import { SEARCH_LIMIT } from '../constants/search';

export function useSearch(initialOverrides: Partial<SearchParams> = {}) {
  const [params, setParams] = useState<SearchParams>({
    start:        initialOverrides.start        ?? dateToStartISO(defaultStart()),
    end:          initialOverrides.end          ?? dateToEndISO(defaultEnd()),
    capacity:     initialOverrides.capacity     ?? 2,
    featuresText: initialOverrides.featuresText ?? '',
    page:         1,
  });
  const [results, setResults] = useState<Room[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Stable refs — loadMore reads from refs to avoid stale closures
  const paramsRef = useRef(params);
  paramsRef.current = params;
  const loadingRef = useRef(loading);
  loadingRef.current = loading;
  const hasMoreRef = useRef(hasMore);
  hasMoreRef.current = hasMore;
  const pageRef = useRef(page);
  pageRef.current = page;

  const setParam = useCallback(<K extends keyof SearchParams>(key: K, val: SearchParams[K]) => {
    setParams((prev) => ({ ...prev, [key]: val }));
  }, []);

  const search = useCallback(
    async (p = 1) => {
      setError('');
      const currentParams = paramsRef.current;

      if (currentParams.start && currentParams.end &&
          new Date(currentParams.start) >= new Date(currentParams.end)) {
        setError('Check-out must be after check-in.');
        return;
      }

      setLoading(true);
      if (p === 1) setHasMore(false);
      try {
        const features = currentParams.featuresText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        const res = await api.search({
          start:    new Date(currentParams.start).toISOString(),
          end:      new Date(currentParams.end).toISOString(),
          capacity: currentParams.capacity,
          features,
          page:     p,
        });
        setResults((prev) => (p === 1 ? res.results : [...prev, ...res.results]));
        setTotal(res.total);
        setPage(p);
        setHasMore(res.results.length > 0 && p * SEARCH_LIMIT < res.total);
      } catch (e) {
        setError(friendlyError(e));
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Stable loadMore — IntersectionObserver won't reconnect on every page change
  const loadMore = useCallback(() => {
    if (!loadingRef.current && hasMoreRef.current) {
      search(pageRef.current + 1);
    }
  }, [search]);

  return { params, setParam, results, total, page, hasMore, loading, error, search, loadMore };
}