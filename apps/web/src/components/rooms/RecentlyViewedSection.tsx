import React from 'react';
import { useTranslation } from 'react-i18next';
import { useRecentlyViewed } from '../../hooks/useRecentlyViewed';
import { roomImageUrl } from '../../utils/room';
import { FEATURE_LABEL_KEYS } from '../../constants/amenities';
import styles from './RecentlyViewedSection.module.scss';

interface RecentlyViewedSectionProps {
  onView: (roomId: string) => void;
}

export const RecentlyViewedSection = React.memo(function RecentlyViewedSection({ onView }: RecentlyViewedSectionProps) {
  const { t } = useTranslation();
  const { rooms, clearAll } = useRecentlyViewed();

  if (rooms.length === 0) return null;

  return (
    <section className={styles.wrap}>
      <div className={styles.header}>
        <h3 className={styles.title}>{t('recentlyViewed.title')}</h3>
        <button className={styles.clear} onClick={clearAll} aria-label={t('recentlyViewed.clearAriaLabel')}>
          {t('recentlyViewed.clearAll')}
        </button>
      </div>
      <div className={styles.track}>
        {rooms.map((room) => (
          <button
            key={room.roomId}
            className={styles.card}
            onClick={() => onView(room.roomId)}
            aria-label={t('recentlyViewed.viewAriaLabel', { name: room.name })}
          >
            <div className={styles.imgWrap}>
              <img
                className={styles.img}
                src={roomImageUrl(room.name)}
                alt={room.name}
                loading="lazy"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
            <div className={styles.body}>
              <div className={styles.name}>{room.name}</div>
              <div className={styles.capacity}>{t('recentlyViewed.capacity', { count: room.capacity })}</div>
              {room.features.length > 0 && (
                <div className={styles.features}>
                  {room.features.slice(0, 2).map((f) => (
                    <span key={f} className={styles.tag}>
                      {FEATURE_LABEL_KEYS[f] ? t(FEATURE_LABEL_KEYS[f]) : f}
                    </span>
                  ))}
                  {room.features.length > 2 && (
                    <span className={styles.tag}>+{room.features.length - 2}</span>
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
