import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './CountdownTimer.module.scss';

interface CountdownTimerProps {
  expiresAt: string;
}

export const CountdownTimer = React.memo(function CountdownTimer({ expiresAt }: CountdownTimerProps) {
  const { t } = useTranslation();
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, Math.floor((Date.parse(expiresAt) - Date.now()) / 1000)),
  );

  useEffect(() => {
    if (remaining === 0) return;
    const id = setInterval(() => {
      const next = Math.max(0, Math.floor((Date.parse(expiresAt) - Date.now()) / 1000));
      setRemaining(next);
      if (next === 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [expiresAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');

  return (
    <div
      className={[styles.countdown, remaining < 60 && styles.warning].filter(Boolean).join(' ')}
      data-warning={remaining < 60 ? 'true' : undefined}
    >
      <span className={styles.label}>{t('countdown.expiresIn')}</span>
      <span className={styles.time}>
        {mm}:{ss}
      </span>
    </div>
  );
});
