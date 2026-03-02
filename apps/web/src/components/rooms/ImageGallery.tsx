import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface ImageGalleryProps {
  images: string[];
}

export const ImageGallery = React.memo(function ImageGallery({ images }: ImageGalleryProps) {
  const { t } = useTranslation();
  const [activeIdx, setActiveIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Clamp activeIdx if images array shrinks
  const validIdx = Math.min(activeIdx, Math.max(0, images.length - 1));

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  if (images.length === 0) return null;

  return (
    <div className="image-gallery">
      <div className="image-gallery__hero" onClick={() => setLightboxOpen(true)}>
        <img src={images[validIdx]} alt={t('imageGallery.altRoom')} />
        <span className="image-gallery__hint">{t('imageGallery.clickToEnlarge')}</span>
      </div>
      {images.length > 1 && (
        <div className="image-gallery__thumbs">
          {images.slice(0, 4).map((src, i) => (
            <button
              key={i}
              className={`image-gallery__thumb${i === validIdx ? ' image-gallery__thumb--active' : ''}`}
              onClick={() => setActiveIdx(i)}
            >
              <img src={src} alt={t('imageGallery.altView', { number: i + 1 })} />
            </button>
          ))}
        </div>
      )}
      {lightboxOpen && (
        <div className="lightbox" onClick={() => setLightboxOpen(false)}>
          <img src={images[validIdx]} alt={t('imageGallery.altFullscreen')} onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
});
