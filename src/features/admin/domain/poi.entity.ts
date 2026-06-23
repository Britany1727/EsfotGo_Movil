import type { CampusLocation } from '@/features/map/domain/location.entity';

export interface PoiInput {
  name: string;
  description?: string;
  category: string;
  latitude: number;
  longitude: number;
  imageUrl?: string;
  image360?: string;
  mediaType?: 'image' | '360' | undefined;
}

export interface PoiUpdateInput {
  name?: string;
  description?: string;
  category?: string;
  latitude?: number;
  longitude?: number;
  imageUrl?: string | null;
  image360?: string | null;
  mediaType?: 'image' | '360' | null;
}

export type ZoneRestrictionType = 'acceso_restringido' | 'construccion' | 'peatonal' | 'emergencia' | 'ambiental' | 'seguridad' | 'otro';

export interface RestrictedZone {
  id: string;
  name: string;
  description?: string;
  coordinates: { latitude: number; longitude: number }[];
  fillColor: string;
  strokeColor: string;
  isActive: boolean;
  restrictionType: ZoneRestrictionType;
  activeSchedule: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PoiEvent {
  type: 'created' | 'updated' | 'deleted';
  poi: CampusLocation;
  timestamp: string;
  userId: string;
}

export type PoiEventListener = (event: PoiEvent) => void;
