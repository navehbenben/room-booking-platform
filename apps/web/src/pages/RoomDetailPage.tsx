import React, { useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useRoomDetail } from '../hooks/useRoomDetail';
import { useHold } from '../hooks/useHold';
import { useRecentlyViewed } from '../hooks/useRecentlyViewed';
import { useAppSelector } from '../store/hooks';
import { selectIsLoggedIn } from '../store/slices/authSlice';
import { ImageGallery } from '../components/rooms/ImageGallery';
import { AmenitiesGrid } from '../components/rooms/AmenitiesGrid';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { formatInTimezone, timezoneOffsetLabel } from '../utils/date';
import type { RoomDetail } from '../types';
import styles from './RoomDetailPage.module.scss';

function availabilityBadge(status: RoomDetail['availabilityStatus'], t: (key: string) => string) {
  if (status === 'AVAILABLE') return <Badge variant="success">{t('roomDetail.availabilityAvailable')}</Badge>;
  if (status === 'HELD') return <Badge variant="warning">{t('roomDetail.availabilityHeld')}</Badge>;
  return <Badge variant="cancelled">{t('roomDetail.availabilityBooked')}</Badge>;
}

export function RoomDetailPage() {
  const isLoggedIn = useAppSelector(selectIsLoggedIn);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { room, loading, error, roomId, start, end } = useRoomDetail();
  const { loading: holdLoading, error: holdError, createHold } = useHold();
  const { addRoom } = useRecentlyViewed();

  useEffect(() => {
    if (room) {
      addRoom({ roomId: room.roomId, name: room.name, capacity: room.capacity, features: room.features });
    }
  }, [room?.roomId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleReserve = useCallback(() => {
    if (!roomId || !start || !end) return;
    createHold(roomId, start, end);
  }, [roomId, start, end, createHold]);

  const handleBack = useCallback(() => navigate(-1), [navigate]);

  const handleSignInToBook = useCallback(() => {
    navigate(`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`);
  }, [navigate, location]);

  if (loading) {
    return (
      <div className="main">
        <div className={styles.loading}>{t('roomDetail.loadingText')}</div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="main">
        <div className="alert alert--error">{error ?? t('roomDetail.notFound')}</div>
        <Button variant="ghost" onClick={handleBack} style={{ marginTop: '1rem' }}>
          {t('common.back')}
        </Button>
      </div>
    );
  }

  const canReserve = !!start && !!end && room.availabilityStatus === 'AVAILABLE';
  const tz = room.timezone ?? 'UTC';
  const tzLabel = timezoneOffsetLabel(tz);

  return (
    <div className="main">
      <div className={styles.page}>
        <div className={styles.detail}>
          <button className={styles.back} onClick={handleBack}>
            {t('roomDetail.backToResults')}
          </button>

          <ImageGallery images={room.images} />

          <div className={styles.header}>
            <h1 className={styles.name}>{room.name}</h1>
            <div className={styles.badges}>
              <Badge variant="neutral">{t('roomDetail.capacity', { count: room.capacity })}</Badge>
              {availabilityBadge(room.availabilityStatus, t)}
            </div>
          </div>

          {/* Timezone notice — always visible so users know which local time applies */}
          <div className={styles.tzBanner} role="note">
            <span className={styles.tzIcon}>🌍</span>
            <span>
              {t('roomDetail.timesInTz')} <strong>{tz}</strong> ({tzLabel}).
              {start && end && (
                <>
                  {' '}
                  {t('roomDetail.yourBooking')}{' '}
                  <strong>{formatInTimezone(start, tz, { hour: '2-digit', minute: '2-digit' })}</strong> →{' '}
                  <strong>{formatInTimezone(end, tz, { hour: '2-digit', minute: '2-digit' })}</strong>
                </>
              )}
            </span>
          </div>

          {room.description && <p className={styles.description}>{room.description}</p>}

          {room.features.length > 0 && (
            <div className={styles.amenities}>
              <h2 className={styles.sectionTitle}>{t('roomDetail.amenitiesTitle')}</h2>
              <AmenitiesGrid features={room.features} />
            </div>
          )}

          <div className={styles.policies}>
            <h2 className={styles.sectionTitle}>{t('roomDetail.policiesTitle')}</h2>
            <ul className={styles.policyList}>
              <li>{t('roomDetail.policy1')}</li>
              <li>{t('roomDetail.policy2')}</li>
              <li>{t('roomDetail.policy3')}</li>
            </ul>
          </div>

          <div className={styles.cta}>
            <div className={styles.ctaTitle}>{t('roomDetail.ctaTitle')}</div>

            {holdError && <div className="alert alert--error">{holdError}</div>}

            {!start || !end ? (
              <p className={styles.noDates}>{t('roomDetail.noDatesMsg')}</p>
            ) : !isLoggedIn ? (
              <div className={styles.loginCta}>
                <p className={styles.loginCtaText}>{t('roomDetail.loginCtaText')}</p>
                <div className={styles.loginCtaBtns}>
                  <Button variant="primary" onClick={handleSignInToBook}>
                    {t('roomDetail.signInToBook')}
                  </Button>
                  <Button variant="ghost" onClick={() => navigate('/register')}>
                    {t('roomDetail.createAccount')}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="primary"
                onClick={handleReserve}
                loading={holdLoading}
                disabled={!canReserve || holdLoading}
              >
                {room.availabilityStatus !== 'AVAILABLE'
                  ? t('roomDetail.roomNotAvailable')
                  : t('roomDetail.reserveNow')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
