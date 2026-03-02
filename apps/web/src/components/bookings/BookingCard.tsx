import React from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import type { Booking } from '../../types';

type BadgeVariant = 'success' | 'warning' | 'cancelled' | 'neutral';

function statusVariant(status: string): BadgeVariant {
  if (status === 'CONFIRMED') return 'success';
  if (status === 'CANCELLED') return 'cancelled';
  return 'neutral';
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { timeStyle: 'short' });
}

interface BookingCardProps {
  booking: Booking;
  cancellingId: string | null;
  onCancel: (id: string) => void;
}

export const BookingCard = React.memo(function BookingCard({ booking, cancellingId, onCancel }: BookingCardProps) {
  const { t } = useTranslation();
  const isCancelling = cancellingId === booking.bookingId;

  return (
    <div className="booking-card">
      <div className="booking-card__header">
        <div>
          <div className="booking-card__room-id">
            {booking.roomName ?? t('bookingCard.roomFallback', { id: booking.roomId.slice(0, 8) })}
          </div>
          <div className="booking-card__time">
            {fmtDate(booking.start)} — {fmtTime(booking.end)}
          </div>
          <div className="booking-card__meta">
            {t('bookingCard.booked')} {fmtDate(booking.createdAt)}
            <span className="booking-card__sep">·</span>
            {t('bookingCard.id')} <code>{booking.bookingId.slice(0, 8)}…</code>
          </div>
        </div>
        <Badge variant={statusVariant(booking.status)}>{booking.status}</Badge>
      </div>
      {booking.status === 'CONFIRMED' && (
        <div className="booking-card__actions">
          <Button
            variant="danger"
            size="sm"
            onClick={() => onCancel(booking.bookingId)}
            loading={isCancelling}
            disabled={isCancelling}
          >
            {t('bookingCard.cancelBtn')}
          </Button>
        </div>
      )}
    </div>
  );
});
