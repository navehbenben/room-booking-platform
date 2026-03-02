import React from 'react';
import { useTranslation } from 'react-i18next';
import { useBookings } from '../hooks/useBookings';
import { BookingCard } from '../components/bookings/BookingCard';
import { SkeletonCard } from '../components/ui/SkeletonCard';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';

export function MyBookingsPage() {
  const { t } = useTranslation();
  const { bookings, loading, error, cancellingId, load, cancel } = useBookings();

  return (
    <div className="main">
      <div className="bookings-page">
        <div className="bookings-page__header">
          <h1 className="bookings-page__title">{t('bookings.title')}</h1>
          <Button variant="ghost" size="sm" onClick={load} loading={loading}>
            {t('bookings.refresh')}
          </Button>
        </div>

        {error && <div className="alert alert--error">{error}</div>}

        {loading ? (
          <div className="booking-list">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <EmptyState title={t('bookings.emptyTitle')} subtitle={t('bookings.emptySubtitle')} />
        ) : (
          <div className="booking-list">
            {bookings.map((booking) => (
              <BookingCard key={booking.bookingId} booking={booking} cancellingId={cancellingId} onCancel={cancel} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
