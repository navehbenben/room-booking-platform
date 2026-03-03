import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PromoBanner } from '../components/landing/PromoBanner';
import { FeaturedRoomsStrip } from '../components/landing/FeaturedRoomsStrip';
import {
  defaultStart,
  defaultEnd,
  isStartInPast,
  isValidDateRange,
  dateToStartISO,
  dateToEndISO,
  localToday,
} from '../utils/date';
import { LANDING_AMENITY_PILLS } from '../constants/amenities';
import styles from './LandingPage.module.scss';

export function LandingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [start, setStart] = useState(defaultStart());
  const [end, setEnd] = useState(defaultEnd());
  const [capacity, setCapacity] = useState(2);
  const [dateError, setDateError] = useState('');

  const validate = (): boolean => {
    if (isStartInPast(start)) {
      setDateError(t('landing.hero.errorPastStart'));
      return false;
    }
    if (!isValidDateRange(start, end)) {
      setDateError(t('landing.hero.errorInvalidRange'));
      return false;
    }
    setDateError('');
    return true;
  };

  const handleSearch = () => {
    if (!validate()) return;
    const params = new URLSearchParams({
      start: dateToStartISO(start),
      end: dateToEndISO(end),
      capacity: String(capacity),
    });
    navigate(`/search?${params.toString()}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <div className={styles.landing}>
      {/* ── Hero ──────────────────────────────────────────── */}
      <div className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>{t('landing.hero.title')}</h1>
          <p className={styles.heroSubtitle}>{t('landing.hero.subtitle')}</p>

          {/* Booking.com-style horizontal search bar */}
          <div className={styles.heroSearch}>
            <div className={styles.heroSearchField}>
              <label className={styles.heroSearchLabel}>{t('landing.hero.checkIn')}</label>
              <input
                className={styles.heroSearchInput}
                type="date"
                value={start}
                min={localToday()}
                onChange={(e) => {
                  setStart(e.target.value);
                  setDateError('');
                }}
                onKeyDown={handleKeyDown}
              />
            </div>
            <div className="hero-search__divider" />
            <div className={styles.heroSearchField}>
              <label className={styles.heroSearchLabel}>{t('landing.hero.checkOut')}</label>
              <input
                className={`${styles.heroSearchInput}${dateError ? ` ${styles.heroSearchInputError}` : ''}`}
                type="date"
                value={end}
                min={start || localToday()}
                onChange={(e) => {
                  setEnd(e.target.value);
                  setDateError('');
                }}
                onKeyDown={handleKeyDown}
              />
            </div>
            <div className="hero-search__divider" />
            <div className={`${styles.heroSearchField} ${styles.heroSearchFieldCapacity}`}>
              <label className={styles.heroSearchLabel}>{t('landing.hero.guests')}</label>
              <input
                className={styles.heroSearchInput}
                type="number"
                min={1}
                max={500}
                value={capacity}
                onChange={(e) => setCapacity(Math.max(1, Number(e.target.value)))}
                onKeyDown={handleKeyDown}
              />
            </div>
            <button className={styles.heroSearchBtn} onClick={handleSearch}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              {t('landing.hero.search')}
            </button>
          </div>

          {dateError && (
            <p className={styles.heroSearchError} role="alert">
              {dateError}
            </p>
          )}

          {/* Trust pills */}
          <div className={styles.heroTrust}>
            <span className={styles.heroTrustPill}>{t('landing.hero.trustInstant')}</span>
            <span className={styles.heroTrustPill}>{t('landing.hero.trustFree')}</span>
            <span className={styles.heroTrustPill}>{t('landing.hero.trust500')}</span>
            <span className={styles.heroTrustPill}>{t('landing.hero.trustNoCard')}</span>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        {/* ── Deals / Promos (horizontal scroll) ────────── */}
        <PromoBanner />

        {/* ── Featured rooms (horizontal scroll) ─────────── */}
        <FeaturedRoomsStrip />

        {/* ── Why choose us ────────────────────────────── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('landing.whyUs.sectionTitle')}</h2>
          <div className={styles.features}>
            <div className={styles.featureCard}>
              <div className={styles.featureCardIcon}>🏢</div>
              <div className={styles.featureCardTitle}>{t('landing.whyUs.rooms500Title')}</div>
              <p className={styles.featureCardDesc}>{t('landing.whyUs.rooms500Desc')}</p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureCardIcon}>⚡</div>
              <div className={styles.featureCardTitle}>{t('landing.whyUs.instantTitle')}</div>
              <p className={styles.featureCardDesc}>{t('landing.whyUs.instantDesc')}</p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureCardIcon}>🔒</div>
              <div className={styles.featureCardTitle}>{t('landing.whyUs.secureTitle')}</div>
              <p className={styles.featureCardDesc}>{t('landing.whyUs.secureDesc')}</p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureCardIcon}>📊</div>
              <div className={styles.featureCardTitle}>{t('landing.whyUs.smartTitle')}</div>
              <p className={styles.featureCardDesc}>{t('landing.whyUs.smartDesc')}</p>
            </div>
          </div>
        </section>

        {/* ── Popular amenities ─────────────────────────── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('landing.amenities.sectionTitle')}</h2>
          <div className={styles.amenityPills}>
            {LANDING_AMENITY_PILLS.map(({ key, labelKey }) => (
              <button
                key={key}
                className={styles.amenityPill}
                onClick={() => navigate(`/search?amenity=${encodeURIComponent(key)}`)}
              >
                {t(labelKey)}
              </button>
            ))}
          </div>
        </section>

        {/* ── CTA ───────────────────────────────────────── */}
        <div className={styles.cta}>
          <h2 className={styles.ctaTitle}>{t('landing.cta.title')}</h2>
          <p className={styles.ctaSub}>{t('landing.cta.subtitle')}</p>
          <div className={styles.ctaBtns}>
            <button className="btn btn--yellow btn--md" onClick={handleSearch}>
              {t('landing.cta.searchBtn')}
            </button>
            <Link to="/register" className="btn btn--outline-white btn--md" style={{ textDecoration: 'none' }}>
              {t('landing.cta.createAccountBtn')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
