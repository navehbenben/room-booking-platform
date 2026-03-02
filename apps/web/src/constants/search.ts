import type { SortOption } from '../types';

export const SEARCH_LIMIT = 50;

export const SORT_OPTIONS: { value: SortOption; labelKey: string }[] = [
  { value: 'recommended',   labelKey: 'sort.recommended' },
  { value: 'capacity_asc',  labelKey: 'sort.capacityAsc' },
  { value: 'capacity_desc', labelKey: 'sort.capacityDesc' },
];
