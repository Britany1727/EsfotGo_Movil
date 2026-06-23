import * as SecureStore from 'expo-secure-store';
import { httpClient } from '@/services/http-client';
import { AppError, NotFoundError } from '@/core/errors/app-error';
import type { CampusLocation, LocationMediaType } from '@/features/map/domain/location.entity';
import type { PoiInput, PoiUpdateInput, RestrictedZone } from '@/features/admin/domain/poi.entity';
import { isDevMode } from '@/core/config/env';
import { MockData } from '@/core/dev/mock-services';

const AUTH_TOKEN_KEY = 'esfotgo_jwt_token';

// ─── DTOs ───────────────────────────────────────────────────

interface LocationDto {
  _id?: string; id?: string;
  nombre?: string; name?: string;
  descripcion?: string; description?: string;
  categoria?: string; category?: string;
  latitud?: number; latitude?: number;
  longitud?: number; longitude?: number;
  imagen?: string; image_url?: string; imageUrl?: string;
  imagen_360?: string; image360?: string;
  tipo_media?: string; mediaType?: string;
  created_at?: string; createdAt?: string;
}

interface ZoneDto {
  _id?: string; id?: string;
  nombre?: string; name?: string;
  descripcion?: string; description?: string;
  coordenadas?: { latitude: number; longitude: number }[];
  fill_color?: string; fillColor?: string;
  stroke_color?: string; strokeColor?: string;
  activo?: boolean; isActive?: boolean;
  tipo_restriccion?: string; restrictionType?: string;
  horario_activo?: string; activeSchedule?: string;
  created_at?: string; createdAt?: string;
  updated_at?: string; updatedAt?: string;
}

// ─── Mappers ────────────────────────────────────────────────

function mapDtoToLocation(dto: LocationDto): CampusLocation {
  return {
    id: dto._id ?? dto.id ?? '',
    name: dto.nombre ?? dto.name ?? '',
    description: dto.descripcion ?? dto.description ?? null,
    category: dto.categoria ?? dto.category ?? 'otro',
    latitude: dto.latitud ?? dto.latitude ?? 0,
    longitude: dto.longitud ?? dto.longitude ?? 0,
    imageUrl: dto.imagen ?? dto.image_url ?? dto.imageUrl ?? null,
    image: dto.imagen ?? dto.image_url ?? dto.imageUrl ?? undefined,
    image360: dto.imagen_360 ?? dto.image360 ?? undefined,
    mediaType: (dto.tipo_media ?? dto.mediaType ?? undefined) as LocationMediaType,
    createdAt: dto.created_at ?? dto.createdAt ?? new Date().toISOString(),
  };
}

function mapDtoToZone(dto: ZoneDto): RestrictedZone {
  return {
    id: dto._id ?? dto.id ?? '',
    name: dto.nombre ?? dto.name ?? '',
    description: dto.descripcion ?? dto.description ?? undefined,
    coordinates: dto.coordenadas ?? [],
    fillColor: dto.fill_color ?? dto.fillColor ?? 'rgba(200,16,46,0.2)',
    strokeColor: dto.stroke_color ?? dto.strokeColor ?? '#C8102E',
    isActive: dto.activo ?? dto.isActive ?? true,
    restrictionType: (dto.tipo_restriccion ?? dto.restrictionType ?? 'otro') as RestrictedZone['restrictionType'],
    activeSchedule: dto.horario_activo ?? dto.activeSchedule ?? null,
    createdAt: dto.created_at ?? dto.createdAt ?? '',
    updatedAt: dto.updated_at ?? dto.updatedAt ?? '',
  };
}

function mapZoneToDto(zone: Partial<RestrictedZone>): Record<string, unknown> {
  const dto: Record<string, unknown> = {};
  if (zone.name !== undefined) dto.nombre = zone.name;
  if (zone.description !== undefined) dto.descripcion = zone.description;
  if (zone.coordinates !== undefined) dto.coordenadas = zone.coordinates;
  if (zone.fillColor !== undefined) dto.fill_color = zone.fillColor;
  if (zone.strokeColor !== undefined) dto.stroke_color = zone.strokeColor;
  if (zone.isActive !== undefined) dto.activo = zone.isActive;
  if (zone.restrictionType !== undefined) dto.tipo_restriccion = zone.restrictionType;
  if (zone.activeSchedule !== undefined) dto.horario_activo = zone.activeSchedule;
  return dto;
}

// ─── Repository ─────────────────────────────────────────────

export class ExpressPoiRepository {
  private async token(): Promise<string | null> {
    try { return SecureStore.getItemAsync(AUTH_TOKEN_KEY); } catch { return null; }
  }

  async getAll(): Promise<CampusLocation[]> {
    if (isDevMode()) return MockData.getCampusLocations();
    const { data, error } = await httpClient.get<LocationDto[]>('/mapa/ubicaciones');
    if (error) throw new AppError(error ?? 'Unknown API error', 'API_ERROR');
    return (data ?? []).map(mapDtoToLocation);
  }

  async getById(id: string): Promise<CampusLocation> {
    const { data, error } = await httpClient.get<LocationDto>(`/mapa/ubicacion/${id}`);
    if (error) throw new AppError(error ?? 'Unknown API error', 'API_ERROR');
    if (!data) throw new NotFoundError('POI no encontrado');
    return mapDtoToLocation(data);
  }

  async create(input: PoiInput, userId: string): Promise<CampusLocation> {
    if (isDevMode()) {
      return { id: `mock-${Date.now()}`, name: input.name, description: input.description ?? null, category: input.category, latitude: input.latitude, longitude: input.longitude, imageUrl: input.imageUrl ?? null, createdAt: new Date().toISOString() };
    }
    const t = await this.token();
    console.log('[ExpressPoiRepo] Creando ubicacion:', input.name, 'coords:', input.latitude, input.longitude);
    const { data, error } = await httpClient.post<LocationDto>('/admin/mapa/ubicaciones', {
      nombre: input.name,
      descripcion: input.description,
      categoria: input.category,
      latitud: input.latitude,
      longitud: input.longitude,
      imagen: input.imageUrl,
      imagen_360: input.image360,
      tipo_media: input.mediaType,
      usuario_id: userId || undefined,
    }, t);
    if (error || !data) {
      console.log('[ExpressPoiRepo] Error creando ubicacion:', error);
      throw new AppError(error ?? 'Unknown API error', 'API_ERROR');
    }
    console.log('[ExpressPoiRepo] Ubicacion creada exitosamente:', data._id ?? data.id);
    return mapDtoToLocation(data);
  }

  async update(id: string, input: PoiUpdateInput, userId: string): Promise<CampusLocation> {
    if (isDevMode()) { return { id, name: input.name ?? '', description: input.description ?? null, category: input.category ?? 'otro', latitude: input.latitude ?? 0, longitude: input.longitude ?? 0, imageUrl: input.imageUrl ?? null, createdAt: '' }; }
    const t = await this.token();
    console.log('[ExpressPoiRepo] Actualizando ubicacion:', id);
    const payload: Record<string, unknown> = {};
    if (input.name !== undefined) payload.nombre = input.name;
    if (input.description !== undefined) payload.descripcion = input.description;
    if (input.category !== undefined) payload.categoria = input.category;
    if (input.latitude !== undefined) payload.latitud = input.latitude;
    if (input.longitude !== undefined) payload.longitud = input.longitude;
    if (input.imageUrl !== undefined) payload.imagen = input.imageUrl;
    if (input.image360 !== undefined) payload.imagen_360 = input.image360;
    if (input.mediaType !== undefined) payload.tipo_media = input.mediaType;
    if (userId) payload.usuario_id = userId;
    const { data, error } = await httpClient.put<LocationDto>(`/admin/mapa/ubicaciones/${id}`, payload, t);
    if (error || !data) {
      console.log('[ExpressPoiRepo] Error actualizando ubicacion:', error);
      throw new AppError(error ?? 'Unknown API error', 'API_ERROR');
    }
    return mapDtoToLocation(data);
  }

  async delete(id: string, _userId: string): Promise<void> {
    if (isDevMode()) return;
    const t = await this.token();
    console.log('[ExpressPoiRepo] Eliminando ubicacion:', id);
    const { error } = await httpClient.delete(`/admin/mapa/ubicaciones/${id}`, t);
    if (error) {
      console.log('[ExpressPoiRepo] Error eliminando ubicacion:', error);
      throw new AppError(error ?? 'Unknown API error', 'API_ERROR');
    }
  }

  async getZones(): Promise<RestrictedZone[]> {
    if (isDevMode()) return [];
    const t = await this.token();
    const { data, error } = await httpClient.get<ZoneDto[]>('/admin/mapa/zonas', t);
    if (error) throw new AppError(error ?? 'Unknown API error', 'API_ERROR');
    return (data ?? []).map(mapDtoToZone);
  }

  async createZone(zone: Omit<RestrictedZone, 'id' | 'createdAt' | 'updatedAt'>): Promise<RestrictedZone> {
    if (isDevMode()) return { ...zone, id: `mock-${Date.now()}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    const t = await this.token();
    console.log('[ExpressPoiRepo] Creando zona:', zone.name, 'tipo:', zone.restrictionType);
    const { data, error } = await httpClient.post<ZoneDto>('/admin/mapa/zonas', {
      nombre: zone.name,
      descripcion: zone.description,
      coordenadas: zone.coordinates,
      fill_color: zone.fillColor,
      stroke_color: zone.strokeColor,
      activo: zone.isActive,
      tipo_restriccion: zone.restrictionType,
      horario_activo: zone.activeSchedule,
    }, t);
    if (error || !data) {
      console.log('[ExpressPoiRepo] Error creando zona:', error);
      throw new AppError(error ?? 'Unknown API error', 'API_ERROR');
    }
    console.log('[ExpressPoiRepo] Zona creada exitosamente:', data._id ?? data.id);
    return mapDtoToZone(data);
  }

  async updateZone(id: string, input: Partial<RestrictedZone>): Promise<RestrictedZone> {
    if (isDevMode()) return { id, name: '', description: '', coordinates: [], fillColor: '', strokeColor: '', isActive: true, restrictionType: 'otro', activeSchedule: null, createdAt: '', updatedAt: '', ...input };
    const t = await this.token();
    const dto = mapZoneToDto(input);
    const { data, error } = await httpClient.put<ZoneDto>(`/admin/mapa/zonas/${id}`, dto, t);
    if (error || !data) throw new AppError(error ?? 'Unknown API error', 'API_ERROR');
    return mapDtoToZone(data);
  }

  async deleteZone(id: string): Promise<void> {
    if (isDevMode()) return;
    const t = await this.token();
    const { error } = await httpClient.delete(`/admin/mapa/zonas/${id}`, t);
    if (error) throw new AppError(error ?? 'Unknown API error', 'API_ERROR');
  }

  subscribeToChanges(callback: () => void): () => void {
    const interval = setInterval(callback, 30000);
    return () => clearInterval(interval);
  }
}
