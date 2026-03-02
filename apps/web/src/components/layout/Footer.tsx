import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="footer">
      <div className="footer__inner">
        <div>
          <div className="footer__brand-name">Room<span>Book</span></div>
          <p className="footer__brand-desc">{t('footer.brandDesc')}</p>
        </div>
        <div>
          <div className="footer__col-title">{t('footer.platform')}</div>
          <div className="footer__links">
            <Link to="/search" className="footer__link">{t('footer.searchRooms')}</Link>
            <Link to="/bookings" className="footer__link">{t('footer.myBookings')}</Link>
            <Link to="/privacy" className="footer__link">{t('footer.privacyGdpr')}</Link>
          </div>
        </div>
        <div>
          <div className="footer__col-title">{t('footer.techStack')}</div>
          <div className="footer__links">
            <span className="footer__link">NestJS API</span>
            <span className="footer__link">PostgreSQL 16</span>
            <span className="footer__link">Redis 7</span>
            <span className="footer__link">React 18 + Vite</span>
          </div>
        </div>
      </div>
      <div className="footer__bottom">
        <span>{t('footer.allRightsReserved', { year: new Date().getFullYear() })}</span>
        <span>
          API: <code>http://localhost:3001</code>
          <span className="footer__sep">·</span>
          UI: <code>http://localhost:8080</code>
        </span>
      </div>
    </footer>
  );
}
