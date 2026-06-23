// ============================================================
// MongoDB → TypeScript Entity Mappers
// ============================================================
// Converts MongoDB DTOs (snake_case, Spanish) to app entities (camelCase, English).
// Handles: _id→id, date normalization, coordinate normalization, dual-schema reading.

import type {
  UserDto, EventDto, LocationDto, ZoneDto,
  BusRouteDto, BusStopDto, BusLocationDto,
  GraphNodeDto, GraphEdgeDto, FavoriteDto,
} from './mongo-dtos';
import type { User, Role } from '@/core/types';
import type { Event, EventCategory } from '@/features/events/domain/event.entity';
import type { CampusLocation, LocationMediaType } from '@/features/map/domain/location.entity';
import type { RestrictedZone } from '@/features/admin/domain/poi.entity';
import type { BusRoute, BusStop, BusLocation } from '@/features/polibus/domain/route.entity';
import type { GraphNode, GraphEdge } from '@/features/graph/domain/graph.entity';
import type { Favorite } from '@/features/favoritos/domain/favorite.entity';
import type { AulaDto, ChatMessageDto } from './mongo-dtos';

// ─── Helpers ─────────────────────────────────────────────────

function extractId(dto: { _id?: string; id?: string }): string {
  return dto._id ?? dto.id ?? '';
}

function normalizeDate(val?: string): string {
  return val ?? new Date().toISOString();
}

function normalizeCoord(val?: number): number {
  return val ?? 0;
}

function normalizeRole(rol?: string): Role {
  if (rol === 'administrador' || rol === 'admin') return 'administrador';
  if (rol === 'gestor') return 'gestor';
  if (rol === 'docente') return 'docente';
  return 'estudiante';
}

function fullName(nombre?: string, apellido?: string): string | null {
  if (!nombre) return null;
  return apellido ? `${nombre} ${apellido}`.trim() : nombre;
}

// ─── User ────────────────────────────────────────────────────

export function mapUserDtoToUser(dto: UserDto): User {
  return {
    id: dto._id,
    email: dto.email ?? '',
    fullName: fullName(dto.nombre, dto.apellido),
    role: normalizeRole(dto.rol),
    avatarUrl: dto.imagen ?? null,
    phone: dto.telefono ?? null,
    createdAt: normalizeDate(dto.createdAt),
    updatedAt: normalizeDate(dto.updatedAt),
  };
}

// ─── Event ───────────────────────────────────────────────────

export function mapEventDtoToEvent(dto: EventDto): Event {
  return {
    id: extractId(dto),
    title: dto.titulo ?? dto.title ?? dto.nombre ?? '',
    description: dto.descripcion ?? dto.description ?? dto.informacion ?? null,
    imageUrl: dto.imagen ?? dto.image_url ?? dto.imageUrl ?? null,
    location: dto.ubicacion ?? dto.location ?? null,
    category: (dto.categoria ?? dto.category ?? null) as EventCategory | null,
    startDate: dto.fecha_inicio ?? dto.start_date ?? dto.startDate ?? dto.fecha ?? '',
    endDate: dto.fecha_fin ?? dto.end_date ?? dto.endDate ?? null,
    createdBy: dto.created_by ?? dto.createdBy ?? null,
    organizer: dto.organizador ?? dto.organizer ?? null,
    createdAt: normalizeDate(dto.created_at ?? dto.createdAt),
    updatedAt: normalizeDate(dto.updated_at ?? dto.updatedAt),
  };
}

// ─── Campus Location ─────────────────────────────────────────

export function mapLocationDtoToCampusLocation(dto: LocationDto): CampusLocation {
  return {
    id: extractId(dto),
    name: dto.nombre ?? dto.name ?? '',
    description: dto.descripcion ?? dto.description ?? null,
    category: dto.categoria ?? dto.category ?? 'otro',
    latitude: normalizeCoord(dto.latitud ?? dto.latitude),
    longitude: normalizeCoord(dto.longitud ?? dto.longitude),
    imageUrl: dto.imagen ?? dto.image_url ?? dto.imageUrl ?? null,
    image: dto.imagen ?? dto.image_url ?? dto.imageUrl ?? undefined,
    image360: dto.imagen_360 ?? dto.image360 ?? undefined,
    mediaType: (dto.tipo_media ?? dto.mediaType ?? undefined) as LocationMediaType,
    createdAt: normalizeDate(dto.created_at ?? dto.createdAt),
  };
}

// ─── Restricted Zone ─────────────────────────────────────────

export function mapZoneDtoToZone(dto: ZoneDto): RestrictedZone {
  return {
    id: extractId(dto),
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

// ─── Bus Route ───────────────────────────────────────────────

export function mapBusRouteDtoToBusRoute(dto: BusRouteDto): BusRoute {
  return {
    id: extractId(dto),
    name: dto.nombre ?? dto.name ?? '',
    description: dto.descripcion ?? dto.description ?? null,
    color: dto.color ?? '#1B6BB0',
    isActive: dto.activo ?? dto.isActive ?? true,
    estimatedTime: dto.tiempo_estimado ?? dto.estimatedTime ?? null,
    distance: dto.distancia ?? dto.distance ?? null,
    direction: dto.direccion ?? dto.direction ?? null,
    createdAt: normalizeDate(dto.created_at ?? dto.createdAt),
  };
}

// ─── Bus Stop ────────────────────────────────────────────────

export function mapBusStopDtoToBusStop(dto: BusStopDto): BusStop {
  return {
    id: extractId(dto),
    routeId: dto.ruta_id ?? dto.route_id ?? dto.routeId ?? '',
    name: dto.nombre ?? dto.name ?? '',
    latitude: normalizeCoord(dto.latitud ?? dto.latitude),
    longitude: normalizeCoord(dto.longitud ?? dto.longitude),
    stopOrder: dto.orden ?? dto.stop_order ?? dto.stopOrder ?? 0,
    createdAt: normalizeDate(dto.created_at ?? dto.createdAt),
  };
}

// ─── Bus Location ────────────────────────────────────────────

export function mapBusLocationDtoToBusLocation(dto: BusLocationDto): BusLocation {
  return {
    id: extractId(dto),
    routeId: dto.ruta_id ?? dto.route_id ?? dto.routeId ?? '',
    busId: dto.bus_id ?? dto.busId ?? '',
    latitude: normalizeCoord(dto.latitud ?? dto.latitude),
    longitude: normalizeCoord(dto.longitud ?? dto.longitude),
    heading: dto.heading ?? 0,
    updatedAt: normalizeDate(dto.updated_at ?? dto.updatedAt),
  };
}

// ─── Graph Node ──────────────────────────────────────────────

export function mapGraphNodeDtoToGraphNode(dto: GraphNodeDto): GraphNode {
  return {
    id: extractId(dto),
    label: dto.label ?? dto.nombre ?? '',
    latitude: normalizeCoord(dto.latitude ?? dto.latitud),
    longitude: normalizeCoord(dto.longitude ?? dto.longitud),
  };
}

// ─── Graph Edge ──────────────────────────────────────────────

export function mapGraphEdgeDtoToGraphEdge(dto: GraphEdgeDto): GraphEdge {
  return {
    id: extractId(dto),
    fromNodeId: dto.from_node_id ?? dto.fromNodeId ?? '',
    toNodeId: dto.to_node_id ?? dto.toNodeId ?? '',
    weight: dto.weight ?? dto.peso ?? 1,
    blocked: dto.blocked ?? dto.bloqueado ?? false,
    bidirectional: dto.bidirectional ?? dto.bidireccional ?? true,
  };
}

// ─── Favorite ────────────────────────────────────────────────

export function mapFavoriteDtoToFavorite(dto: FavoriteDto): Favorite {
  return {
    id: extractId(dto),
    itemId: dto.item_id ?? dto.itemId ?? '',
    itemType: (dto.item_tipo ?? dto.itemType ?? 'ubicacion') as Favorite['itemType'],
    itemName: dto.item_nombre ?? dto.itemName ?? '',
    itemData: dto.item_data ?? dto.itemData ?? {},
    createdAt: normalizeDate(dto.created_at ?? dto.createdAt),
  };
}

// ─── Aula (normalized) ───────────────────────────────────────

export interface Aula {
  id: string;
  nombre: string;
  capacidad: number | null;
  ubicacion: string | null;
  estado: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export function mapAulaDtoToAula(dto: AulaDto): Aula {
  return {
    id: extractId(dto),
    nombre: dto.nombre ?? '',
    capacidad: dto.capacidad ?? null,
    ubicacion: dto.ubicacion ?? null,
    estado: dto.estado ?? null,
    createdAt: dto.createdAt ?? null,
    updatedAt: dto.updatedAt ?? null,
  };
}

// ─── Chat Message ───────────────────────────────────────────

export interface ChatMessageEntity {
  id: string;
  sender: string;
  senderName: string;
  content: string;
  timestamp: string;
  room: string;
}

export function mapChatMessageDtoToEntity(dto: ChatMessageDto): ChatMessageEntity {
  return {
    id: extractId(dto),
    sender: dto.sender ?? '',
    senderName: dto.nombre ?? dto.from ?? '',
    content: dto.content ?? dto.text ?? dto.mensaje ?? '',
    timestamp: dto.timestamp ?? dto.created_at ?? dto.createdAt ?? new Date().toISOString(),
    room: dto.room ?? dto.sala ?? 'general',
  };
}
