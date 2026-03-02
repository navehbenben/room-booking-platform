import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCheckout } from '../hooks/useCheckout';
import { CountdownTimer } from '../components/checkout/CountdownTimer';
import { BookingSummary } from '../components/checkout/BookingSummary';
import { CheckoutForm } from '../components/checkout/CheckoutForm';
import { ExpiryModal } from '../components/checkout/ExpiryModal';

export function CheckoutPage() {
  const { t } = useTranslation();
  const { hold, room, remainingSeconds, loading, error, confirm, expired, confirmLoading, bookingId } = useCheckout();

  const isWarning = remainingSeconds > 0 && remainingSeconds < 60;

  if (loading) {
    return (
      <div className="main">
        <div className="checkout-page checkout-page--loading">{t('checkout.loading')}</div>
      </div>
    );
  }

  if (bookingId) {
    return (
      <div className="main">
        <div className="checkout-page checkout-page--success">
          <div className="checkout-success__icon">✓</div>
          <h2 className="checkout-success__title">{t('checkout.success.title')}</h2>
          <p className="checkout-success__id">
            {t('checkout.success.bookingId')} <code>{bookingId}</code>
          </p>
          <div className="checkout-success__actions">
            <Link to="/bookings" className="btn btn--primary btn--md">
              {t('checkout.success.viewBookings')}
            </Link>
            <Link to="/search" className="btn btn--ghost btn--md">
              {t('checkout.success.findMoreRooms')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!hold && expired) {
    return (
      <div className="main">
        <div className="checkout-page checkout-page--expired">
          <h2>{t('checkout.expired.title')}</h2>
          <p>{t('checkout.expired.message')}</p>
          <Link to="/search" className="btn btn--primary btn--md">
            {t('checkout.expired.searchBtn')}
          </Link>
        </div>
      </div>
    );
  }

  if (error || !hold) {
    return (
      <div className="main">
        <div className="alert alert--error">{error ?? t('checkout.notFound')}</div>
        <Link to="/search" className="btn btn--ghost btn--md" style={{ marginTop: '1rem', display: 'inline-flex' }}>
          {t('checkout.backToSearch')}
        </Link>
      </div>
    );
  }

  return (
    <>
      {expired && <ExpiryModal roomId={hold.roomId} start={hold.start} end={hold.end} />}
      <div className="main">
        <div className="checkout-page">
          <CountdownTimer expiresAt={hold.expiresAt} />

          {isWarning && (
            <div className="checkout-warning-banner" role="alert">
              {t('checkout.warningBanner')}
            </div>
          )}

          {error && <div className="alert alert--error">{error}</div>}

          <div className="checkout-layout">
            <div className="checkout-layout__summary">
              {room ? (
                <BookingSummary room={room} start={hold.start} end={hold.end} />
              ) : (
                <div className="checkout-layout__no-room">
                  <p>
                    {t('checkout.noRoom.start')} {new Date(hold.start).toLocaleString()}
                  </p>
                  <p>
                    {t('checkout.noRoom.end')} {new Date(hold.end).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
            <div className="checkout-layout__form">
              <CheckoutForm onConfirm={confirm} loading={confirmLoading} disabled={expired} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
