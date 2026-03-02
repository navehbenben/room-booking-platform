import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import { roomImageUrl } from '../../utils/room';
import { dateToStartISO, dateToEndISO, defaultStart, defaultEnd } from '../../utils/date';
import { FEATURE_LABEL_KEYS } from '../../constants/amenities';
import type { Room } from '../../types';

export function FeaturedRoomsStrip() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    api.search({
      start:    dateToStartISO(defaultStart()),
      end:      dateToEndISO(defaultEnd()),
      capacity: 2,
      page:     1,
    })
      .then((res) => {
        if (!cancelled) setRooms(res.results.slice(0, 10));
      })
      .catch(() => { /* silently hide section on error */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === 'left' ? -280 : 280, behavior: 'smooth' });
  };

  const handleView = (roomId: string) => {
    const p = new URLSearchParams({
      start: dateToStartISO(defaultStart()),
      end:   dateToEndISO(defaultEnd()),
    });
    navigate(`/rooms/${roomId}?${p.toString()}`);
  };

  if (!loading && rooms.length === 0) return null;

  return (
    <section className="featured-strip">
      <div className="featured-strip__header">
        <h2 className="featured-strip__title">{t('landing.featuredStrip.title')}</h2>
        <div className="featured-strip__nav">
          <button className="featured-strip__arrow" onClick={() => scroll('left')} aria-label={t('landing.featuredStrip.scrollLeft')}>‹</button>
          <button className="featured-strip__arrow" onClick={() => scroll('right')} aria-label={t('landing.featuredStrip.scrollRight')}>›</button>
        </div>
      </div>

      <div className="featured-strip__track" ref={scrollRef}>
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="featured-room-card featured-room-card--skeleton" aria-hidden="true">
                <div className="featured-room-card__img-wrap skeleton-shimmer" />
                <div className="featured-room-card__body">
                  <div className="skeleton-line skeleton-line--title" />
                  <div className="skeleton-line skeleton-line--short" />
                </div>
              </div>
            ))
          : rooms.map((room) => (
              <button
                key={room.roomId}
                className="featured-room-card"
                onClick={() => handleView(room.roomId)}
                aria-label={t('roomCard.viewAriaLabel', { name: room.name })}
              >
                <div className="featured-room-card__img-wrap">
                  {!imgErrors[room.roomId] ? (
                    <img
                      className="featured-room-card__img"
                      src={roomImageUrl(room.name)}
                      alt={room.name}
                      loading="lazy"
                      onError={() => setImgErrors((prev) => ({ ...prev, [room.roomId]: true }))}
                    />
                  ) : (
                    <div className="featured-room-card__img-fallback" aria-hidden="true">🏢</div>
                  )}
                </div>
                <div className="featured-room-card__body">
                  <div className="featured-room-card__name">{room.name}</div>
                  <div className="featured-room-card__capacity">
                    {t('roomCard.capacity', { count: room.capacity })}
                  </div>
                  {room.features.length > 0 && (
                    <div className="featured-room-card__features">
                      {room.features.slice(0, 2).map((f) => (
                        <span key={f} className="featured-room-card__tag">
                          {FEATURE_LABEL_KEYS[f] ? t(FEATURE_LABEL_KEYS[f]) : f}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </button>
            ))
        }
      </div>
    </section>
  );
}
