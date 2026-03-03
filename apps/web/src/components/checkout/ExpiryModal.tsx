import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import styles from './ExpiryModal.module.scss';

interface ExpiryModalProps {
  roomId: string;
  start: string;
  end: string;
}

export const ExpiryModal = React.memo(function ExpiryModal({ roomId, start, end }: ExpiryModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleRecheck = () => {
    navigate(`/rooms/${roomId}?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`);
  };

  return (
    // Overlay is intentionally non-dismissable — user must act on the CTA
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="expiry-modal-title">
      <div className={styles.modal}>
        <div className={styles.icon} aria-hidden="true">
          ⏰
        </div>
        <h2 className={styles.title} id="expiry-modal-title">
          {t('expiryModal.title')}
        </h2>
        <p className={styles.message}>{t('expiryModal.message')}</p>
        <Button variant="primary" onClick={handleRecheck}>
          {t('expiryModal.recheckBtn')}
        </Button>
      </div>
    </div>
  );
});
