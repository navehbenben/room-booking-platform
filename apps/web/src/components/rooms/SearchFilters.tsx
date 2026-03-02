import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import type { SearchParams } from '../../types';
import { AMENITY_OPTIONS } from '../../constants/amenities';
import {
  isStartInPast,
  isValidDateRange,
  dateToStartISO,
  dateToEndISO,
  localToday,
  isoToLocalDate,
} from '../../utils/date';

interface SearchFiltersProps {
  params: SearchParams;
  loading: boolean;
  onParamChange: <K extends keyof SearchParams>(key: K, val: SearchParams[K]) => void;
  onSearch: () => void;
}

export const SearchFilters = React.memo(function SearchFilters({
  params,
  loading,
  onParamChange,
  onSearch,
}: SearchFiltersProps) {
  const { t } = useTranslation();

  // params.start / params.end are ISO UTC strings — convert back to local date for display
  const startDate = isoToLocalDate(params.start);
  const endDate = isoToLocalDate(params.end);

  const isPastStart = isStartInPast(startDate);
  const isDateRangeValid = isValidDateRange(startDate, endDate);
  const isValid = !isPastStart && isDateRangeValid;

  const activeFeatures = useMemo(
    () =>
      params.featuresText
        ? params.featuresText
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
    [params.featuresText],
  );

  const toggleFeature = useCallback(
    (key: string) => {
      const next = activeFeatures.includes(key) ? activeFeatures.filter((f) => f !== key) : [...activeFeatures, key];
      onParamChange('featuresText', next.join(','));
    },
    [activeFeatures, onParamChange],
  );

  return (
    <div className="search-filters">
      <div className="search-filters__heading">{t('filters.heading')}</div>
      <div className="search-filters__body">
        <div>
          <label className="search-filters__label">{t('filters.checkIn')}</label>
          <input
            className={`input${isPastStart ? ' input--error' : ''}`}
            type="date"
            value={startDate}
            min={localToday()}
            onChange={(e) => onParamChange('start', dateToStartISO(e.target.value))}
          />
          {isPastStart && <span className="input-error">{t('filters.checkInError')}</span>}
        </div>
        <div>
          <label className="search-filters__label">{t('filters.checkOut')}</label>
          <input
            className={`input${!isDateRangeValid ? ' input--error' : ''}`}
            type="date"
            value={endDate}
            min={startDate || localToday()}
            onChange={(e) => onParamChange('end', dateToEndISO(e.target.value))}
          />
          {!isDateRangeValid && <span className="input-error">{t('filters.checkOutError')}</span>}
        </div>
        <div>
          <label className="search-filters__label">{t('filters.minCapacity')}</label>
          <input
            className="input"
            type="number"
            min={1}
            max={500}
            value={params.capacity}
            onChange={(e) => onParamChange('capacity', Math.max(1, Number(e.target.value)))}
            placeholder={t('filters.capacityPlaceholder')}
          />
        </div>
        <div>
          <label className="search-filters__label">{t('filters.amenities')}</label>
          <div className="amenity-pills">
            {AMENITY_OPTIONS.map(({ key, labelKey, icon }) => (
              <button
                key={key}
                type="button"
                className={`amenity-pill${activeFeatures.includes(key) ? ' amenity-pill--active' : ''}`}
                onClick={() => toggleFeature(key)}
              >
                <span className="amenity-pill__icon">{icon}</span>
                {t(labelKey)}
              </button>
            ))}
          </div>
          {activeFeatures.length > 0 && (
            <button type="button" className="amenity-pills__clear" onClick={() => onParamChange('featuresText', '')}>
              {t('filters.clearAmenities')}
            </button>
          )}
        </div>
        <Button
          variant="primary"
          onClick={onSearch}
          loading={loading}
          disabled={loading || !isValid}
          aria-label="Search rooms"
          className="search-filters__search-btn"
        >
          {t('filters.searchBtn')}
        </Button>
      </div>
    </div>
  );
});
