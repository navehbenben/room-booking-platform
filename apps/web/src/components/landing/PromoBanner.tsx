import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface Deal {
  id: string;
  badgeVariant: 'sale' | 'popular' | 'new' | 'limited';
  searchParams: { featuresText?: string; capacity?: number };
  gradient: string;
}

const DEALS: Deal[] = [
  {
    id: 'earlyBird',
    badgeVariant: 'sale',
    searchParams: {},
    gradient: 'linear-gradient(135deg, #003580 0%, #0071c2 100%)',
  },
  {
    id: 'teamBundle',
    badgeVariant: 'popular',
    searchParams: { capacity: 10 },
    gradient: 'linear-gradient(135deg, #1a6b3a 0%, #28a745 100%)',
  },
  {
    id: 'videoReady',
    badgeVariant: 'new',
    searchParams: { featuresText: 'video_conf,webcam' },
    gradient: 'linear-gradient(135deg, #6f2da8 0%, #9b59b6 100%)',
  },
  {
    id: 'focusPods',
    badgeVariant: 'limited',
    searchParams: { featuresText: 'soundproof', capacity: 1 },
    gradient: 'linear-gradient(135deg, #c47100 0%, #febb02 100%)',
  },
  {
    id: 'naturalLight',
    badgeVariant: 'popular',
    searchParams: { featuresText: 'natural_light' },
    gradient: 'linear-gradient(135deg, #c0392b 0%, #e74c3c 100%)',
  },
];

export function PromoBanner() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleDealClick = (deal: Deal) => {
    const p = new URLSearchParams();
    if (deal.searchParams.featuresText) p.set('amenity', deal.searchParams.featuresText);
    if (deal.searchParams.capacity)     p.set('capacity', String(deal.searchParams.capacity));
    navigate(`/search?${p.toString()}`);
  };

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === 'left' ? -320 : 320, behavior: 'smooth' });
  };

  return (
    <section className="promo-banner">
      <div className="promo-banner__header">
        <h2 className="promo-banner__title">{t('landing.promo.sectionTitle')}</h2>
        <div className="promo-banner__nav">
          <button className="promo-banner__arrow" onClick={() => scroll('left')} aria-label={t('landing.promo.scrollLeft')}>‹</button>
          <button className="promo-banner__arrow" onClick={() => scroll('right')} aria-label={t('landing.promo.scrollRight')}>›</button>
        </div>
      </div>

      <div className="promo-banner__track" ref={scrollRef}>
        {DEALS.map((deal) => (
          <button
            key={deal.id}
            className="deal-card"
            style={{ background: deal.gradient }}
            onClick={() => handleDealClick(deal)}
            aria-label={t(`landing.promo.${deal.id}.title`)}
          >
            <span className={`deal-card__badge deal-card__badge--${deal.badgeVariant}`}>
              {t(`landing.promo.${deal.id}.badge`)}
            </span>
            <div className="deal-card__title">{t(`landing.promo.${deal.id}.title`)}</div>
            <div className="deal-card__subtitle">{t(`landing.promo.${deal.id}.subtitle`)}</div>
            <span className="deal-card__cta">{t(`landing.promo.${deal.id}.cta`)} →</span>
          </button>
        ))}
      </div>
    </section>
  );
}
