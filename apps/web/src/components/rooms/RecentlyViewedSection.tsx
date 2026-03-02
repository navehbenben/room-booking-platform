import React from 'react';
import { useTranslation } from 'react-i18next';
import { useRecentlyViewed } from '../../hooks/useRecentlyViewed';
import { roomImageUrl } from '../../utils/room';
import { FEATURE_LABEL_KEYS } from '../../constants/amenities';

interface RecentlyViewedSectionProps {
  onView: (roomId: string) => void;
}

export const RecentlyViewedSection = React.memo(function RecentlyViewedSection({ onView }: RecentlyViewedSectionProps) {
  const { t } = useTranslation();
  const { rooms, clearAll } = useRecentlyViewed();

  if (rooms.length === 0) return null;

  return (
    <section className="recently-viewed">
      <div className="recently-viewed__header">
        <h3 className="recently-viewed__title">{t('recentlyViewed.title')}</h3>
        <button className="recently-viewed__clear" onClick={clearAll} aria-label={t('recentlyViewed.clearAriaLabel')}>
          {t('recentlyViewed.clearAll')}
        </button>
      </div>
      <div className="recently-viewed__track">
        {rooms.map((room) => (
          <button
            key={room.roomId}
            className="rv-card"
            onClick={() => onView(room.roomId)}
            aria-label={t('recentlyViewed.viewAriaLabel', { name: room.name })}
          >
            <div className="rv-card__img-wrap">
              <img
                className="rv-card__img"
                src={roomImageUrl(room.name)}
                alt={room.name}
                loading="lazy"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
            <div className="rv-card__body">
              <div className="rv-card__name">{room.name}</div>
              <div className="rv-card__capacity">{t('recentlyViewed.capacity', { count: room.capacity })}</div>
              {room.features.length > 0 && (
                <div className="rv-card__features">
                  {room.features.slice(0, 2).map((f) => (
                    <span key={f} className="rv-card__tag">
                      {FEATURE_LABEL_KEYS[f] ? t(FEATURE_LABEL_KEYS[f]) : f}
                    </span>
                  ))}
                  {room.features.length > 2 && (
                    <span className="rv-card__tag rv-card__tag--more">+{room.features.length - 2}</span>
                  )}
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
});
