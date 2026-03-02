export interface AmenityOption {
  key: string;
  labelKey: string;
  icon: string;
}

export const AMENITY_OPTIONS: AmenityOption[] = [
  { key: 'projector', labelKey: 'amenities.projector', icon: '📽' },
  { key: 'whiteboard', labelKey: 'amenities.whiteboard', icon: '📋' },
  { key: 'video_conf', labelKey: 'amenities.video_conf', icon: '📹' },
  { key: 'tv', labelKey: 'amenities.tv', icon: '🖥' },
  { key: 'phone', labelKey: 'amenities.phone', icon: '📞' },
  { key: 'standing_desk', labelKey: 'amenities.standing_desk', icon: '🪑' },
  { key: 'natural_light', labelKey: 'amenities.natural_light', icon: '☀️' },
  { key: 'ac', labelKey: 'amenities.ac', icon: '❄️' },
  { key: 'webcam', labelKey: 'amenities.webcam', icon: '📷' },
  { key: 'soundproof', labelKey: 'amenities.soundproof', icon: '🔇' },
  { key: 'lounge_seating', labelKey: 'amenities.lounge_seating', icon: '🛋' },
  { key: 'dual_screen', labelKey: 'amenities.dual_screen', icon: '🖥' },
];

/** Maps feature key → i18n translation key (pill/tag display) */
export const FEATURE_LABEL_KEYS: Record<string, string> = {
  projector: 'amenities.projector',
  whiteboard: 'amenities.whiteboard',
  tv: 'amenities.tv',
  video_conf: 'amenities.video_conf',
  phone: 'amenities.phone',
  standing_desk: 'amenities.standing_desk',
  natural_light: 'amenities.natural_light',
  ac: 'amenities.ac',
  webcam: 'amenities.webcam',
  soundproof: 'amenities.soundproof',
  lounge_seating: 'amenities.lounge_seating',
  dual_screen: 'amenities.dual_screen',
};

/** Amenities shown on the landing page quick-filter row */
export const LANDING_AMENITY_PILLS: Pick<AmenityOption, 'key' | 'labelKey'>[] = [
  { key: 'projector', labelKey: 'amenities.landing.projector' },
  { key: 'whiteboard', labelKey: 'amenities.landing.whiteboard' },
  { key: 'video_conf', labelKey: 'amenities.landing.video_conf' },
  { key: 'natural_light', labelKey: 'amenities.landing.natural_light' },
  { key: 'standing_desk', labelKey: 'amenities.landing.standing_desk' },
  { key: 'tv', labelKey: 'amenities.landing.tv' },
  { key: 'soundproof', labelKey: 'amenities.landing.soundproof' },
  { key: 'ac', labelKey: 'amenities.landing.ac' },
];
