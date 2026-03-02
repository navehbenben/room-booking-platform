import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Room } from '../../types';
import { FEATURE_LABEL_KEYS } from '../../constants/amenities';
import { roomImageUrl, urgencyLabel } from '../../utils/room';

interface RoomCardProps {
  room: Room;
  onView: (roomId: string) => void;
  disabled: boolean;
  dateRange?: { start: string; end: string };
}

export const RoomCard = React.memo(function RoomCard({ room, onView, disabled, dateRange }: RoomCardProps) {
  const { t } = useTranslation();
  const [imgError, setImgError] = useState(false);
  const urgency = urgencyLabel(room.roomId);

  const handleCardClick = useCallback(() => {
    if (!disabled) onView(room.roomId);
  }, [disabled, onView, room.roomId]);

  const handleButtonClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onView(room.roomId);
  }, [onView, room.roomId]);

  const visibleFeatures = room.features.slice(0, 4);
  const extraCount = room.features.length - visibleFeatures.length;

  return (
    <div
      className={`room-card${disabled ? ' room-card--disabled' : ''}`}
      onClick={handleCardClick}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleCardClick(); }}
      aria-label={t('roomCard.viewAriaLabel', { name: room.name })}
      aria-disabled={disabled}
    >
      {/* Image */}
      <div className="room-card__image-wrap">
        {!imgError ? (
          <img
            className="room-card__img"
            src={roomImageUrl(room.name)}
            alt={room.name}
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="room-card__img-fallback" aria-hidden="true">🏢</div>
        )}
        <span className="room-card__badge">{t('roomCard.available')}</span>
        {urgency && (
          <span className="room-card__urgency">{urgency}</span>
        )}
      </div>

      {/* Card body */}
      <div className="room-card__body">
        <div className="room-card__name">{room.name}</div>

        <div className="room-card__meta">
          <span className="room-card__capacity">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            {t('roomCard.capacity', { count: room.capacity })}
          </span>
        </div>

        {room.features.length > 0 && (
          <div className="room-card__features">
            {visibleFeatures.map((f) => (
              <span key={f} className="room-card__feature-tag">
                {FEATURE_LABEL_KEYS[f] ? t(FEATURE_LABEL_KEYS[f]) : f}
              </span>
            ))}
            {extraCount > 0 && (
              <span className="room-card__feature-tag room-card__feature-tag--more">
                {t('roomCard.moreFeatures', { count: extraCount })}
              </span>
            )}
          </div>
        )}

        {dateRange && (
          <div className="room-card__dates">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            {new Date(dateRange.start).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            {' – '}
            {new Date(dateRange.end).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}

        <div className="room-card__footer">
          <button
            className="room-card__cta"
            onClick={handleButtonClick}
            disabled={disabled}
          >
            {t('roomCard.seeAvailability')}
          </button>
        </div>
      </div>
    </div>
  );
});
