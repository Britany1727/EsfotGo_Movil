// ============================================================
// MongoDB DTOs — Wire format (snake_case, Spanish field names)
// ============================================================
// These represent EXACTLY what the Express API returns/sends.
// Never use these directly in UI — always map through mappers.

// ─── Auth / Profile ─────────────────────────────────────────

export interface LoginRequestDto {
  email: string;
  password: string;
}

export interface LoginResponseDto {
  token: string;
  user: UserDto;
}

export interface RegisterRequestDto {
  nombre: string;
  email: string;
  password: string;
}

export interface RegisterResponseDto {
  msg: string;
  emailConfirmationRequired?: boolean;
  user?: UserDto;
}

export interface UserDto {
  _id: string;
  nombre?: string;
  apellido?: string;
  email: string;
  direccion?: string;
  telefono?: string;
  rol?: 'admin' | 'docente' | 'estudiante' | 'user';
  imagen?: string;
  status?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateProfileRequestDto {
  nombre?: string;
  apellido?: string;
  email?: string;
  telefono?: string;
  direccion?: string;
}

export interface ChangePasswordRequestDto {
  passwordactual?: string;
  passwordnuevo?: string;
  currentPassword?: string;
  newPassword?: string;
}

// ─── Events ──────────────────────────────────────────────────

export interface EventDto {
  _id?: string;
  id?: string;
  titulo?: string;
  title?: string;
  nombre?: string;
  descripcion?: string;
  description?: string;
  informacion?: string;
  imagen?: string;
  image_url?: string;
  imageUrl?: string;
  ubicacion?: string;
  location?: string;
  categoria?: string;
  category?: string;
  fecha_inicio?: string;
  start_date?: string;
  startDate?: string;
  fecha?: string;
  fecha_fin?: string;
  end_date?: string;
  endDate?: string;
  hora?: string;
  created_by?: string;
  createdBy?: string;
  organizador?: string;
  organizer?: string;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
}

export interface CreateEventRequestDto {
  titulo: string;
  descripcion?: string;
  imagen?: string;
  ubicacion?: string;
  categoria?: string;
  fecha_inicio: string;
  fecha_fin?: string;
  organizador?: string;
}

// ─── Campus Locations (Map POIs) ─────────────────────────────

export interface LocationDto {
  _id?: string;
  id?: string;
  nombre?: string;
  name?: string;
  descripcion?: string;
  description?: string;
  categoria?: string;
  category?: string;
  latitud?: number;
  latitude?: number;
  longitud?: number;
  longitude?: number;
  imagen?: string;
  image_url?: string;
  imageUrl?: string;
  imagen_360?: string;
  image360?: string;
  tipo_media?: string;
  mediaType?: string;
  created_at?: string;
  createdAt?: string;
}

export interface CreateLocationRequestDto {
  nombre: string;
  descripcion?: string;
  categoria: string;
  latitud: number;
  longitud: number;
  imagen?: string;
  imagen_360?: string;
  image360?: string;
  tipo_media?: string;
  mediaType?: string;
}

// ─── Restricted Zones ────────────────────────────────────────

export interface ZoneDto {
  _id?: string;
  id?: string;
  nombre?: string;
  name?: string;
  descripcion?: string;
  description?: string;
  coordenadas?: { latitude: number; longitude: number }[];
  fill_color?: string;
  fillColor?: string;
  stroke_color?: string;
  strokeColor?: string;
  activo?: boolean;
  isActive?: boolean;
  tipo_restriccion?: string;
  restrictionType?: string;
  horario_activo?: string;
  activeSchedule?: string;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
}

export interface CreateZoneRequestDto {
  nombre: string;
  descripcion?: string;
  coordenadas: { latitude: number; longitude: number }[];
  fill_color: string;
  stroke_color: string;
  activo: boolean;
  tipo_restriccion: string;
  horario_activo?: string;
}

// ─── Bus Routes ──────────────────────────────────────────────

export interface BusRouteDto {
  _id?: string;
  id?: string;
  nombre?: string;
  name?: string;
  descripcion?: string;
  description?: string;
  color?: string;
  activo?: boolean;
  isActive?: boolean;
  tiempo_estimado?: number;
  estimatedTime?: number;
  distancia?: number;
  distance?: number;
  direccion?: string;
  direction?: string;
  created_at?: string;
  createdAt?: string;
}

export interface CreateBusRouteRequestDto {
  nombre: string;
  descripcion?: string;
  color: string;
  activo: boolean;
  tiempo_estimado?: number;
  distancia?: number;
  direccion?: string;
}

// ─── Bus Stops ───────────────────────────────────────────────

export interface BusStopDto {
  _id?: string;
  id?: string;
  ruta_id?: string;
  route_id?: string;
  routeId?: string;
  nombre?: string;
  name?: string;
  latitud?: number;
  latitude?: number;
  longitud?: number;
  longitude?: number;
  orden?: number;
  stop_order?: number;
  stopOrder?: number;
  created_at?: string;
  createdAt?: string;
}

export interface CreateBusStopRequestDto {
  ruta_id: string;
  nombre: string;
  latitud: number;
  longitud: number;
  orden: number;
}

// ─── Bus Locations (live) ────────────────────────────────────

export interface BusLocationDto {
  _id?: string;
  id?: string;
  ruta_id?: string;
  route_id?: string;
  routeId?: string;
  bus_id?: string;
  busId?: string;
  latitud?: number;
  latitude?: number;
  longitud?: number;
  longitude?: number;
  heading?: number;
  updated_at?: string;
  updatedAt?: string;
}

// ─── Graph ───────────────────────────────────────────────────

export interface GraphNodeDto {
  _id?: string;
  id?: string;
  label?: string;
  nombre?: string;
  latitude?: number;
  latitud?: number;
  longitude?: number;
  longitud?: number;
}

export interface GraphEdgeDto {
  _id?: string;
  id?: string;
  from_node_id?: string;
  fromNodeId?: string;
  to_node_id?: string;
  toNodeId?: string;
  weight?: number;
  peso?: number;
  blocked?: boolean;
  bloqueado?: boolean;
  bidirectional?: boolean;
  bidireccional?: boolean;
}

// ─── Aulas ───────────────────────────────────────────────────

export interface AulaDto {
  _id: string;
  nombre?: string;
  capacidad?: number;
  ubicacion?: string;
  estado?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Oficinas ────────────────────────────────────────────────

export interface OficinaDto {
  _id: string;
  nombre?: string;
  descripcion?: string;
  ubicacion?: string;
  horario?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Bulk Upload ─────────────────────────────────────────────

export interface BulkUploadResultDto {
  total: number;
  inserted: number;
  failed: number;
  errors: { index: number; row: Record<string, unknown>; reason: string }[];
}

// ─── Token Refresh ───────────────────────────────────────────

export interface RefreshTokenRequestDto {
  refreshToken: string;
}

export interface RefreshTokenResponseDto {
  token: string;
  refreshToken?: string;
}

// ─── Managed Users (Admin) ───────────────────────────────────

export interface ManagedUserDto {
  _id: string;
  nombre?: string;
  apellido?: string;
  email: string;
  direccion?: string;
  telefono?: string;
  rol?: string;
  status?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Favorites ──────────────────────────────────────────────

export interface FavoriteDto {
  _id?: string;
  id?: string;
  item_id?: string;
  itemId?: string;
  item_tipo?: string;
  itemType?: string;
  item_nombre?: string;
  itemName?: string;
  item_data?: Record<string, unknown>;
  itemData?: Record<string, unknown>;
  created_at?: string;
  createdAt?: string;
}

// ─── Chat Messages ──────────────────────────────────────────

export interface ChatMessageDto {
  _id?: string;
  id?: string;
  sender?: string;
  nombre?: string;
  from?: string;
  content?: string;
  text?: string;
  mensaje?: string;
  timestamp?: string;
  created_at?: string;
  createdAt?: string;
  room?: string;
  sala?: string;
}
