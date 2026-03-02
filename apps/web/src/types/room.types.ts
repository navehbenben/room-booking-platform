export interface Room {
  roomId: string;
  name: string;
  capacity: number;
  features: string[];
  /** IANA timezone of the room's physical location, e.g. "Europe/Rome". */
  timezone: string;
  status: string;
}

export interface RoomDetail extends Room {
  description: string;
  images: string[];
  availabilityStatus: 'AVAILABLE' | 'HELD' | 'BOOKED';
}

export interface SearchParams {
  start: string;
  end: string;
  capacity: number;
  featuresText: string;
  page: number;
}

export interface SearchResult {
  results: Room[];
  total: number;
  page: number;
  limit: number;
}

export type SortOption = 'recommended' | 'capacity_asc' | 'capacity_desc';
