import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSearch } from '../hooks/useSearch';
import { SearchFilters } from '../components/rooms/SearchFilters';
import { RoomCard } from '../components/rooms/RoomCard';
import { SkeletonCard } from '../components/ui/SkeletonCard';
import { EmptyState } from '../components/ui/EmptyState';
import { Spinner } from '../components/ui/Spinner';
import { RecentlyViewedSection } from '../components/rooms/RecentlyViewedSection';
import { SORT_OPTIONS } from '../constants/search';
import { sortRooms } from '../utils/room';
import type { SortOption } from '../types';

interface SearchPageProps {
  isLoggedIn: boolean;
}

export function SearchPage({ isLoggedIn }: SearchPageProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [sort, setSort] = useState<SortOption>('recommended');
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Read initial params from URL — stable on mount only
  const initialOverrides = useMemo(
    () => ({
      ...(searchParams.get('start') ? { start: searchParams.get('start')! } : {}),
      ...(searchParams.get('end') ? { end: searchParams.get('end')! } : {}),
      ...(searchParams.get('capacity') ? { capacity: Number(searchParams.get('capacity')) } : {}),
      ...(searchParams.get('amenity') ? { featuresText: searchParams.get('amenity')! } : {}),
    }),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const { params, setParam, results, total, hasMore, loading, error, search, loadMore } = useSearch(initialOverrides);

  // Auto-search on mount
  const didMount = useRef(false);
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      search(1);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Infinite scroll sentinel
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { threshold: 0.1 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  const handleView = useCallback(
    (roomId: string) => {
      const startISO = new Date(params.start).toISOString();
      const endISO = new Date(params.end).toISOString();
      navigate(`/rooms/${roomId}?start=${encodeURIComponent(startISO)}&end=${encodeURIComponent(endISO)}`);
    },
    [navigate, params.start, params.end],
  );

  const handleSearch = useCallback(() => {
    search(1);
    setFiltersOpen(false);
  }, [search]);

  const sortedResults = useMemo(() => sortRooms(results, sort), [results, sort]);
  const dateRange = params.start && params.end ? { start: params.start, end: params.end } : undefined;

  const pageTitle =
    loading && results.length === 0
      ? t('search.title_loading')
      : results.length > 0
        ? t('search.title_results', { count: total })
        : t('search.title_empty');

  return (
    <div className="main">
      {/* Mobile filter toggle */}
      <button
        className="search-page__filter-toggle"
        onClick={() => setFiltersOpen((v) => !v)}
        aria-expanded={filtersOpen}
      >
        {filtersOpen ? t('search.filterToggleClose') : t('search.filterToggleOpen')}
      </button>

      <div className="search-page">
        {/* Sidebar */}
        <aside className={`search-page__sidebar${filtersOpen ? ' search-page__sidebar--open' : ''}`}>
          <SearchFilters params={params} loading={loading} onParamChange={setParam} onSearch={handleSearch} />
        </aside>

        {/* Results */}
        <div className="search-page__results">
          {/* Header row: count + sort */}
          <div className="search-page__header">
            <h1 className="search-page__title">{pageTitle}</h1>

            {results.length > 0 && (
              <div className="sort-bar">
                <span className="sort-bar__label">{t('search.sortBy')}</span>
                <select
                  className="sort-bar__select"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortOption)}
                  aria-label={t('search.sortAriaLabel')}
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {t(o.labelKey)}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {!isLoggedIn && results.length > 0 && (
            <div className="search-page__login-banner">
              <span>{t('search.loginBanner')}</span>
              <a href={`/login?redirect=${encodeURIComponent('/search')}`} className="search-page__login-link">
                {t('search.loginBannerLink')}
              </a>
            </div>
          )}

          {error && (
            <div className="alert alert--error" role="alert">
              {error}
              <button className="alert__retry" onClick={() => search(1)}>
                {t('common.retry')}
              </button>
            </div>
          )}

          <div className="room-list">
            {loading && results.length === 0 ? (
              Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
            ) : results.length === 0 && !loading ? (
              <div className="room-grid__empty">
                <EmptyState title={t('search.noRoomsTitle')} subtitle={t('search.noRoomsSubtitle')} />
              </div>
            ) : (
              sortedResults.map((room) => (
                <RoomCard key={room.roomId} room={room} onView={handleView} disabled={loading} dateRange={dateRange} />
              ))
            )}
          </div>

          <div ref={sentinelRef} style={{ height: 1 }} />

          {loading && results.length > 0 && (
            <div className="search-page__load-more-spinner">
              <Spinner />
            </div>
          )}

          {!hasMore && results.length > 0 && !loading && (
            <p className="search-page__end-message">{t('search.allShown', { count: total })}</p>
          )}

          <RecentlyViewedSection onView={handleView} />
        </div>
      </div>
    </div>
  );
}
