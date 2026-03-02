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
    <div className="landing">
      {/* ── Hero ──────────────────────────────────────────── */}
      <div className="hero">
        <div className="hero__content">
          <h1 className="hero__title">{t('landing.hero.title')}</h1>
          <p className="hero__subtitle">{t('landing.hero.subtitle')}</p>

          {/* Booking.com-style horizontal search bar */}
          <div className="hero-search">
            <div className="hero-search__field hero-search__field--date">
              <label className="hero-search__label">{t('landing.hero.checkIn')}</label>
              <input
                className="hero-search__input"
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
            <div className="hero-search__field hero-search__field--date">
              <label className="hero-search__label">{t('landing.hero.checkOut')}</label>
              <input
                className={`hero-search__input${dateError ? ' hero-search__input--error' : ''}`}
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
            <div className="hero-search__field hero-search__field--capacity">
              <label className="hero-search__label">{t('landing.hero.guests')}</label>
              <input
                className="hero-search__input"
                type="number"
                min={1}
                max={500}
                value={capacity}
                onChange={(e) => setCapacity(Math.max(1, Number(e.target.value)))}
                onKeyDown={handleKeyDown}
              />
            </div>
            <button className="hero-search__btn" onClick={handleSearch}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              {t('landing.hero.search')}
            </button>
          </div>

          {dateError && (
            <p className="hero-search__error" role="alert">
              {dateError}
            </p>
          )}

          {/* Trust pills */}
          <div className="hero__trust">
            <span className="hero__trust-pill">{t('landing.hero.trustInstant')}</span>
            <span className="hero__trust-pill">{t('landing.hero.trustFree')}</span>
            <span className="hero__trust-pill">{t('landing.hero.trust500')}</span>
            <span className="hero__trust-pill">{t('landing.hero.trustNoCard')}</span>
          </div>
        </div>
      </div>

      <div className="landing__content">
        {/* ── Deals / Promos (horizontal scroll) ────────── */}
        <PromoBanner />

        {/* ── Featured rooms (horizontal scroll) ─────────── */}
        <FeaturedRoomsStrip />

        {/* ── Why choose us ────────────────────────────── */}
        <section className="landing__section">
          <h2 className="landing__section-title">{t('landing.whyUs.sectionTitle')}</h2>
          <div className="landing__features">
            <div className="feature-card">
              <div className="feature-card__icon">🏢</div>
              <div className="feature-card__title">{t('landing.whyUs.rooms500Title')}</div>
              <p className="feature-card__desc">{t('landing.whyUs.rooms500Desc')}</p>
            </div>
            <div className="feature-card">
              <div className="feature-card__icon">⚡</div>
              <div className="feature-card__title">{t('landing.whyUs.instantTitle')}</div>
              <p className="feature-card__desc">{t('landing.whyUs.instantDesc')}</p>
            </div>
            <div className="feature-card">
              <div className="feature-card__icon">🔒</div>
              <div className="feature-card__title">{t('landing.whyUs.secureTitle')}</div>
              <p className="feature-card__desc">{t('landing.whyUs.secureDesc')}</p>
            </div>
            <div className="feature-card">
              <div className="feature-card__icon">📊</div>
              <div className="feature-card__title">{t('landing.whyUs.smartTitle')}</div>
              <p className="feature-card__desc">{t('landing.whyUs.smartDesc')}</p>
            </div>
          </div>
        </section>

        {/* ── Popular amenities ─────────────────────────── */}
        <section className="landing__section landing__amenities-section">
          <h2 className="landing__section-title">{t('landing.amenities.sectionTitle')}</h2>
          <div className="landing__amenity-pills">
            {LANDING_AMENITY_PILLS.map(({ key, labelKey }) => (
              <button
                key={key}
                className="landing__amenity-pill"
                onClick={() => navigate(`/search?amenity=${encodeURIComponent(key)}`)}
              >
                {t(labelKey)}
              </button>
            ))}
          </div>
        </section>

        {/* ── CTA ───────────────────────────────────────── */}
        <div className="landing__cta">
          <h2 className="landing__cta-title">{t('landing.cta.title')}</h2>
          <p className="landing__cta-sub">{t('landing.cta.subtitle')}</p>
          <div className="landing__cta-btns">
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
