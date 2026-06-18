import type { CampusLocation } from '@/features/map/domain/location.entity';

export interface PoiInput {
  name: string;
  description?: string;
  category: string;
  latitude: number;
  longitude: number;
  imageUrl?: string;
  mediaType?: string;
}

export interface PoiUpdateInput {
  name?: string;
  description?: string;
  category?: string;
  latitude?: number;
  longitude?: number;
  imageUrl?: string | null;
  mediaType?: string | null;
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
