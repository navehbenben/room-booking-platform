import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';

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
    <div className="expiry-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="expiry-modal-title">
      <div className="expiry-modal">
        <div className="expiry-modal__icon" aria-hidden="true">
          ⏰
        </div>
        <h2 className="expiry-modal__title" id="expiry-modal-title">
          {t('expiryModal.title')}
        </h2>
        <p className="expiry-modal__message">{t('expiryModal.message')}</p>
        <Button variant="primary" onClick={handleRecheck}>
          {t('expiryModal.recheckBtn')}
        </Button>
      </div>
    </div>
  );
});
