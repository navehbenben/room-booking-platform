/**
 * Standalone seed script — run once at container startup via docker-compose.
 * Connects directly to PostgreSQL via TypeORM DataSource (no NestJS context).
 *
 * Usage:
 *   docker compose:  command: ["node", "dist/seed.js"]
 *   local dev:       DATABASE_URL=... npm run seed
 */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { RoomEntity } from './modules/rooms/entities/room.entity';

// ── Seed data ────────────────────────────────────────────────────────────────

const ROOM_NAMES = [
  // Cosmic / Space
  'Orion',
  'Nova',
  'Atlas',
  'Luna',
  'Zenith',
  'Apex',
  'Horizon',
  'Summit',
  'Vertex',
  'Nexus',
  'Pulse',
  'Ember',
  'Flare',
  'Drift',
  'Echo',
  'Harbor',
  'Iris',
  'Jade',
  'Maple',
  'Neon',
  'Opal',
  'Prism',
  'Quartz',
  'Raven',
  'Solar',
  'Titan',
  'Umbra',
  'Vega',
  'Aurora',
  'Blaze',
  // Nature / Landscapes
  'Crest',
  'Dawn',
  'Eclipse',
  'Forge',
  'Grove',
  'Haven',
  'Indigo',
  'Journey',
  'Kestrel',
  'Lake',
  'Muse',
  'Nordic',
  'Orbit',
  'Peak',
  'Quest',
  'River',
  'Sage',
  'Thunder',
  'Unity',
  'Valor',
  'Wave',
  'Xenon',
  'Zephyr',
  'Amber',
  'Birch',
  'Cedar',
  'Dune',
  'Elm',
  'Fjord',
  'Gale',
  // Gems / Minerals
  'Heath',
  'Isle',
  'Juniper',
  'Kelp',
  'Larch',
  'Mist',
  'Oak',
  'Pine',
  'Reef',
  'Sand',
  'Teal',
  'Vale',
  'Willow',
  'Coral',
  'Delta',
  'Falcon',
  'Griffin',
  'Hydra',
  'Ion',
  'Juno',
  // Astronomy
  'Kronos',
  'Leo',
  'Marina',
  'Neptune',
  'Omega',
  'Perseus',
  'Rigel',
  'Sirius',
  'Talon',
  'Ursa',
  // Architecture / Elements
  'Viper',
  'Wren',
  'Aster',
  'Basalt',
  'Cairn',
  'Dusk',
  'Ether',
  'Frost',
  'Gleam',
  'Halo',
];

const CAPACITIES = [2, 2, 4, 4, 4, 6, 6, 8, 8, 10, 12, 14, 16, 20, 24, 30];

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'America/Toronto',
  'Europe/London',
  'Europe/Paris',
  'Europe/Rome',
  'Europe/Berlin',
  'Europe/Amsterdam',
  'Europe/Madrid',
  'Europe/Warsaw',
  'Europe/Helsinki',
  'Europe/Athens',
  'Europe/Moscow',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Bangkok',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Asia/Shanghai',
  'Australia/Sydney',
  'Pacific/Auckland',
];

const ALL_FEATURES = [
  'projector',
  'whiteboard',
  'tv',
  'video_conf',
  'phone',
  'standing_desk',
  'natural_light',
  'ac',
  'webcam',
  'soundproof',
  'lounge_seating',
  'dual_screen',
];

const FEATURE_LABELS: Record<string, string> = {
  projector: 'projector',
  whiteboard: 'whiteboard',
  tv: 'TV screen',
  video_conf: 'video conferencing',
  phone: 'conference phone',
  standing_desk: 'standing desks',
  natural_light: 'natural light',
  ac: 'air conditioning',
  webcam: 'webcam',
  soundproof: 'soundproofing',
  lounge_seating: 'lounge seating',
  dual_screen: 'dual screens',
};

const ROOM_TYPES: Record<number, string> = {
  2: 'Focus Pod',
  4: 'Small Meeting Room',
  6: 'Collaboration Room',
  8: 'Conference Room',
  10: 'Conference Room',
  12: 'Large Meeting Room',
  14: 'Large Meeting Room',
  16: 'Board Room',
  20: 'Training Room',
  24: 'Event Space',
  30: 'Auditorium',
};

function getRoomType(capacity: number): string {
  const keys = Object.keys(ROOM_TYPES)
    .map(Number)
    .sort((a, b) => a - b);
  let best = keys[0];
  for (const k of keys) {
    if (k <= capacity) best = k;
  }
  return ROOM_TYPES[best];
}

function generateImages(name: string): string[] {
  const slug = name.toLowerCase().replace(/\s+/g, '-');
  return [
    `https://picsum.photos/seed/${slug}/1200/700`,
    `https://picsum.photos/seed/${slug}-b/1200/700`,
    `https://picsum.photos/seed/${slug}-c/1200/700`,
  ];
}

function generateDescription(room: { name: string; capacity: number; features: string[] }): string {
  const type = getRoomType(room.capacity);
  const featureList = room.features.map((f) => FEATURE_LABELS[f] || f);
  const featureStr =
    featureList.length === 0
      ? ''
      : featureList.length === 1
        ? ` equipped with ${featureList[0]}`
        : ` equipped with ${featureList.slice(0, -1).join(', ')} and ${featureList[featureList.length - 1]}`;
  const useCase =
    room.capacity <= 4
      ? 'focused work sessions and one-on-ones'
      : room.capacity <= 10
        ? 'team meetings and collaborative sessions'
        : 'large presentations and company events';
  return `${room.name} is a modern ${room.capacity}-person ${type}${featureStr}. Ideal for ${useCase}.`;
}

function generateRooms(
  count: number,
): Array<Pick<RoomEntity, 'name' | 'capacity' | 'features' | 'images' | 'description' | 'timezone'>> {
  const rooms = [];
  for (let i = 0; i < count; i++) {
    const baseName = ROOM_NAMES[i % ROOM_NAMES.length];
    const series = Math.floor(i / ROOM_NAMES.length) + 1;
    const name = series === 1 ? baseName : `${baseName} ${series}`;
    const capacity = CAPACITIES[i % CAPACITIES.length];
    const timezone = TIMEZONES[i % TIMEZONES.length];
    const features = ALL_FEATURES.filter((_, fi) => {
      const a = (i * 3 + fi * 7) % 11 < 4;
      const b = (i * 5 + fi * 2) % 13 < 5;
      return a || b;
    }).slice(0, 6);
    rooms.push({
      name,
      capacity,
      timezone,
      features,
      images: generateImages(name),
      description: generateDescription({ name, capacity, features }),
    });
  }
  return rooms;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('[seed] DATABASE_URL is not set');
    process.exit(1);
  }

  const dataSource = new DataSource({
    type: 'postgres',
    url,
    entities: [RoomEntity],
    synchronize: true,
    logging: false,
    extra: { max: 2 },
  });

  await dataSource.initialize();
  console.log('[seed] Connected');

  try {
    const seedCount = parseInt(process.env.SEED_ROOMS_COUNT || '500', 10);
    const repo = dataSource.getRepository(RoomEntity);
    const existing = await repo.count();

    if (existing >= seedCount) {
      console.log(`[seed] ${existing} rooms already present — nothing to do`);
      return;
    }

    const toInsert = generateRooms(seedCount).slice(existing);
    let done = 0;
    for (let i = 0; i < toInsert.length; i += 50) {
      const batch = toInsert.slice(i, i + 50);
      await repo.save(batch.map((r) => repo.create(r)));
      done += batch.length;
      process.stdout.write(`\r[seed] ${done}/${toInsert.length} rooms inserted...`);
    }
    console.log(`\n[seed] Done — added ${toInsert.length} rooms (total: ${existing + toInsert.length})`);
  } finally {
    await dataSource.destroy();
  }
}

run().catch((err) => {
  console.error('[seed] Fatal:', err.message);
  process.exit(1);
});
