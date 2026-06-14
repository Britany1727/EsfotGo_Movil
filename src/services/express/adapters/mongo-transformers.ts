// ============================================================
// TypeScript Entity → MongoDB Request DTO Transformers
// ============================================================
// Converts app entities (camelCase, English) to MongoDB wire format (snake_case, Spanish).
// Used when sending data TO the Express API (POST, PUT).

// ─── Profile ─────────────────────────────────────────────────

interface UpdateProfileEntity {
  fullName?: string;
  phone?: string;
  avatarUrl?: string;
}

export function transformProfileToDto(input: UpdateProfileEntity): Record<string, unknown> {
  const dto: Record<string, unknown> = {};
  if (input.fullName) dto.nombre = input.fullName;
  if (input.phone) dto.telefono = input.phone;
  if (input.avatarUrl) dto.imagen = input.avatarUrl;
  return dto;
}

// ─── Event ───────────────────────────────────────────────────

interface CreateEventEntity {
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  location?: string | null;
  category?: string | null;
  startDate: string;
  endDate?: string | null;
  organizer?: string | null;
}

export function transformEventToDto(input: CreateEventEntity): Record<string, unknown> {
  const dto: Record<string, unknown> = {};
  dto.titulo = input.title;
  if (input.description) dto.descripcion = input.description;
  if (input.imageUrl) dto.imagen = input.imageUrl;
  if (input.location) dto.ubicacion = input.location;
  if (input.category) dto.categoria = input.category;
  dto.fecha_inicio = input.startDate;
  if (input.endDate) dto.fecha_fin = input.endDate;
  if (input.organizer) dto.organizador = input.organizer;
  return dto;
}

export function transformEventUpdateToDto(input: Partial<CreateEventEntity>): Record<string, unknown> {
  const dto: Record<string, unknown> = {};
  if (input.title !== undefined) dto.titulo = input.title;
  if (input.description !== undefined) dto.descripcion = input.description;
  if (input.imageUrl !== undefined) dto.imagen = input.imageUrl;
  if (input.location !== undefined) dto.ubicacion = input.location;
  if (input.category !== undefined) dto.categoria = input.category;
  if (input.startDate !== undefined) dto.fecha_inicio = input.startDate;
  if (input.endDate !== undefined) dto.fecha_fin = input.endDate;
  if (input.organizer !== undefined) dto.organizador = input.organizer;
  return dto;
}

// ─── Campus Location (POI) ───────────────────────────────────

interface CreateLocationEntity {
  name: string;
  description?: string;
  category: string;
  latitude: number;
  longitude: number;
  imageUrl?: string;
}

export function transformLocationToDto(input: CreateLocationEntity): Record<string, unknown> {
  const dto: Record<string, unknown> = {
    nombre: input.name,
    categoria: input.category,
    latitud: input.latitude,
    longitud: input.longitude,
  };
  if (input.description) dto.descripcion = input.description;
  if (input.imageUrl) dto.imagen = input.imageUrl;
  return dto;
}

export function transformLocationUpdateToDto(input: Partial<CreateLocationEntity>): Record<string, unknown> {
  const dto: Record<string, unknown> = {};
  if (input.name !== undefined) dto.nombre = input.name;
  if (input.description !== undefined) dto.descripcion = input.description;
  if (input.category !== undefined) dto.categoria = input.category;
  if (input.latitude !== undefined) dto.latitud = input.latitude;
  if (input.longitude !== undefined) dto.longitud = input.longitude;
  if (input.imageUrl !== undefined) dto.imagen = input.imageUrl;
  return dto;
}

// ─── Restricted Zone ─────────────────────────────────────────

interface CreateZoneEntity {
  name: string;
  description?: string;
  coordinates: { latitude: number; longitude: number }[];
  fillColor: string;
  strokeColor: string;
  isActive: boolean;
}

export function transformZoneToDto(input: CreateZoneEntity): Record<string, unknown> {
  return {
    nombre: input.name,
    descripcion: input.description,
    coordenadas: input.coordinates,
    fill_color: input.fillColor,
    stroke_color: input.strokeColor,
    activo: input.isActive,
  };
}

export function transformZoneUpdateToDto(input: Partial<CreateZoneEntity>): Record<string, unknown> {
  const dto: Record<string, unknown> = {};
  if (input.name !== undefined) dto.nombre = input.name;
  if (input.description !== undefined) dto.descripcion = input.description;
  if (input.coordinates !== undefined) dto.coordenadas = input.coordinates;
  if (input.fillColor !== undefined) dto.fill_color = input.fillColor;
  if (input.strokeColor !== undefined) dto.stroke_color = input.strokeColor;
  if (input.isActive !== undefined) dto.activo = input.isActive;
  return dto;
}

// ─── Bus Route ───────────────────────────────────────────────

interface CreateBusRouteEntity {
  name: string;
  description?: string | null;
  color: string;
  isActive: boolean;
}

export function transformBusRouteToDto(input: CreateBusRouteEntity): Record<string, unknown> {
  return {
    nombre: input.name,
    descripcion: input.description,
    color: input.color,
    activo: input.isActive,
  };
}

export function transformBusRouteUpdateToDto(input: Partial<CreateBusRouteEntity>): Record<string, unknown> {
  const dto: Record<string, unknown> = {};
  if (input.name !== undefined) dto.nombre = input.name;
  if (input.description !== undefined) dto.descripcion = input.description;
  if (input.color !== undefined) dto.color = input.color;
  if (input.isActive !== undefined) dto.activo = input.isActive;
  return dto;
}

// ─── Bus Stop ────────────────────────────────────────────────

interface CreateBusStopEntity {
  routeId: string;
  name: string;
  latitude: number;
  longitude: number;
  stopOrder: number;
}

export function transformBusStopToDto(input: CreateBusStopEntity): Record<string, unknown> {
  return {
    ruta_id: input.routeId,
    nombre: input.name,
    latitud: input.latitude,
    longitud: input.longitude,
    orden: input.stopOrder,
  };
}

export function transformBusStopUpdateToDto(input: Partial<CreateBusStopEntity>): Record<string, unknown> {
  const dto: Record<string, unknown> = {};
  if (input.name !== undefined) dto.nombre = input.name;
  if (input.latitude !== undefined) dto.latitud = input.latitude;
  if (input.longitude !== undefined) dto.longitud = input.longitude;
  if (input.stopOrder !== undefined) dto.orden = input.stopOrder;
  return dto;
}

// ─── Graph Node ──────────────────────────────────────────────

interface CreateGraphNodeEntity {
  label: string;
  latitude: number;
  longitude: number;
}

export function transformGraphNodeToDto(input: CreateGraphNodeEntity & { id?: string }): Record<string, unknown> {
  const dto: Record<string, unknown> = { label: input.label, latitude: input.latitude, longitude: input.longitude };
  if (input.id) dto._id = input.id;
  return dto;
}

// ─── Graph Edge ──────────────────────────────────────────────

interface CreateGraphEdgeEntity {
  fromNodeId: string;
  toNodeId: string;
  weight: number;
  blocked: boolean;
  bidirectional: boolean;
}

export function transformGraphEdgeToDto(input: CreateGraphEdgeEntity & { id?: string }): Record<string, unknown> {
  const dto: Record<string, unknown> = {
    from_node_id: input.fromNodeId,
    to_node_id: input.toNodeId,
    weight: input.weight,
    blocked: input.blocked,
    bidirectional: input.bidirectional,
  };
  if (input.id) dto._id = input.id;
  return dto;
}
