import React from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '../ui/Badge';
import { formatInTimezone, timezoneOffsetLabel } from '../../utils/date';
import type { RoomDetail } from '../../types';

interface BookingSummaryProps {
  room: RoomDetail;
  start: string;
  end: string;
}

export const BookingSummary = React.memo(function BookingSummary({
  room,
  start,
  end,
}: BookingSummaryProps) {
  const { t } = useTranslation();
  const tz = room.timezone ?? 'UTC';
  const tzLabel = timezoneOffsetLabel(tz);
  const durationMs = new Date(end).getTime() - new Date(start).getTime();
  const durationHours = Math.round((durationMs / (1000 * 60 * 60)) * 10) / 10;

  return (
    <div className="booking-summary">
      <h3 className="booking-summary__name">{room.name}</h3>
      <div className="booking-summary__capacity">
        <Badge variant="neutral">
          {t('bookingSummary.capacity', { count: room.capacity })}
        </Badge>
      </div>
      <div className="booking-summary__tz-note" role="note">
        🌍 {t('bookingSummary.timesIn')} <strong>{tz}</strong> ({tzLabel})
      </div>
      <div className="booking-summary__dates">
        <div className="booking-summary__date-row">
          <span className="booking-summary__label">{t('common.from')}</span>
          <span>{formatInTimezone(start, tz)}</span>
        </div>
        <div className="booking-summary__date-row">
          <span className="booking-summary__label">{t('common.to')}</span>
          <span>{formatInTimezone(end, tz)}</span>
        </div>
        <div className="booking-summary__date-row">
          <span className="booking-summary__label">{t('common.duration')}</span>
          <span>{durationHours}h</span>
        </div>
      </div>
      {room.features.length > 0 && (
        <div className="booking-summary__features">
          {room.features.map((f) => (
            <Badge key={f} variant="neutral">
              {f}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
});