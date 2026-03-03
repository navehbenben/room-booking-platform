import React from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '../ui/Badge';
import { formatInTimezone, timezoneOffsetLabel } from '../../utils/date';
import type { RoomDetail } from '../../types';
import styles from './BookingSummary.module.scss';

interface BookingSummaryProps {
  room: RoomDetail;
  start: string;
  end: string;
}

export const BookingSummary = React.memo(function BookingSummary({ room, start, end }: BookingSummaryProps) {
  const { t } = useTranslation();
  const tz = room.timezone ?? 'UTC';
  const tzLabel = timezoneOffsetLabel(tz);
  const durationMs = new Date(end).getTime() - new Date(start).getTime();
  const durationHours = Math.round((durationMs / (1000 * 60 * 60)) * 10) / 10;

  return (
    <div className={styles.wrap}>
      <h3 className={styles.name}>{room.name}</h3>
      <div>
        <Badge variant="neutral">{t('bookingSummary.capacity', { count: room.capacity })}</Badge>
      </div>
      <div className={styles.tzNote} role="note">
        🌍 {t('bookingSummary.timesIn')} <strong>{tz}</strong> ({tzLabel})
      </div>
      <div className={styles.dates}>
        <div className={styles.dateRow}>
          <span className={styles.label}>{t('common.from')}</span>
          <span>{formatInTimezone(start, tz)}</span>
        </div>
        <div className={styles.dateRow}>
          <span className={styles.label}>{t('common.to')}</span>
          <span>{formatInTimezone(end, tz)}</span>
        </div>
        <div className={styles.dateRow}>
          <span className={styles.label}>{t('common.duration')}</span>
          <span>{durationHours}h</span>
        </div>
      </div>
      {room.features.length > 0 && (
        <div className={styles.features}>
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
