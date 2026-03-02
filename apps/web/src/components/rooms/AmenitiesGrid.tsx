import React from 'react';
import { useTranslation } from 'react-i18next';

const FEATURE_ICONS: Record<string, React.ReactNode> = {
  projector: (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="7" width="20" height="10" rx="2" />
      <circle cx="12" cy="12" r="2" />
      <line x1="12" y1="17" x2="12" y2="21" />
      <line x1="8" y1="21" x2="16" y2="21" />
    </svg>
  ),
  whiteboard: (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
      <path d="M7 10l3 3 7-7" />
    </svg>
  ),
  tv: (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  ),
  video_conf: (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" />
    </svg>
  ),
  phone: (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8a19.79 19.79 0 01-3.07-8.68A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.72 6.72l1.28-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
    </svg>
  ),
  standing_desk: (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="8" width="20" height="3" rx="1" />
      <line x1="6" y1="11" x2="6" y2="22" />
      <line x1="18" y1="11" x2="18" y2="22" />
      <line x1="9" y1="22" x2="3" y2="22" />
      <line x1="21" y1="22" x2="15" y2="22" />
      <line x1="12" y1="8" x2="12" y2="3" />
    </svg>
  ),
  natural_light: (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  ),
  ac: (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  webcam: (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="10" r="5" />
      <circle cx="12" cy="10" r="2" />
      <line x1="12" y1="15" x2="12" y2="22" />
      <line x1="8" y1="22" x2="16" y2="22" />
    </svg>
  ),
};

/** Maps feature key → i18n translation key for AmenitiesGrid (more descriptive than pills) */
const GRID_LABEL_KEYS: Record<string, string> = {
  projector: 'amenities.grid.projector',
  whiteboard: 'amenities.grid.whiteboard',
  tv: 'amenities.grid.tv',
  video_conf: 'amenities.grid.video_conf',
  phone: 'amenities.grid.phone',
  standing_desk: 'amenities.grid.standing_desk',
  natural_light: 'amenities.grid.natural_light',
  ac: 'amenities.grid.ac',
  webcam: 'amenities.grid.webcam',
};

interface AmenitiesGridProps {
  features: string[];
}

export const AmenitiesGrid = React.memo(function AmenitiesGrid({ features }: AmenitiesGridProps) {
  const { t } = useTranslation();

  if (features.length === 0) return null;

  return (
    <div className="amenities-grid">
      {features.map((f) => {
        const icon = FEATURE_ICONS[f] ?? null;
        const labelKey = GRID_LABEL_KEYS[f];
        const label = labelKey ? t(labelKey) : f;
        return (
          <div key={f} className="amenity-tile">
            {icon && <span className="amenity-tile__icon">{icon}</span>}
            <span className="amenity-tile__label">{label}</span>
          </div>
        );
      })}
    </div>
  );
});
