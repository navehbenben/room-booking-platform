import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styles from './Footer.module.scss';

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div>
          <div className={styles.brandName}>
            Room<span>Book</span>
          </div>
          <p className={styles.brandDesc}>{t('footer.brandDesc')}</p>
        </div>
        <div>
          <div className={styles.colTitle}>{t('footer.platform')}</div>
          <div className={styles.links}>
            <Link to="/search" className={styles.link}>
              {t('footer.searchRooms')}
            </Link>
            <Link to="/bookings" className={styles.link}>
              {t('footer.myBookings')}
            </Link>
            <Link to="/privacy" className={styles.link}>
              {t('footer.privacyGdpr')}
            </Link>
          </div>
        </div>
        <div>
          <div className={styles.colTitle}>{t('footer.techStack')}</div>
          <div className={styles.links}>
            <span className={styles.link}>NestJS API</span>
            <span className={styles.link}>PostgreSQL 16</span>
            <span className={styles.link}>Redis 7</span>
            <span className={styles.link}>React 18 + Vite</span>
          </div>
        </div>
      </div>
      <div className={styles.bottom}>
        <span>{t('footer.allRightsReserved', { year: new Date().getFullYear() })}</span>
        <span>
          API: <code>http://localhost:3001</code>
          <span className={styles.sep}>·</span>
          UI: <code>http://localhost:8080</code>
        </span>
      </div>
    </footer>
  );
}
