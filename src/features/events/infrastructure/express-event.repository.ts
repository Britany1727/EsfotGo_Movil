import * as SecureStore from 'expo-secure-store';
import { expressClient } from '@/services/express/api-client';
import { AppError, NotFoundError } from '@/core/errors/app-error';
import type { Event } from '../domain/event.entity';
import type { IEventRepository } from '../domain/event.repository';
import type { PaginatedResponse } from '@/core/types';

const AUTH_TOKEN_KEY = 'esfotgo_jwt_token';

// ─── DTO (MongoDB wire format) ──────────────────────────────

interface EventDto {
  _id?: string;
  id?: string;
  titulo?: string;
  title?: string;
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
  fecha_fin?: string;
  end_date?: string;
  endDate?: string;
  created_by?: string;
  createdBy?: string;
  organizador?: string;
  organizer?: string;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
}

// ─── Mapper ──────────────────────────────────────────────────

function mapEventToEntity(dto: EventDto): Event {
  return {
    id: dto._id ?? dto.id ?? '',
    title: dto.titulo ?? dto.title ?? dto.nombre ?? '',
    description: dto.descripcion ?? dto.description ?? dto.informacion ?? null,
    imageUrl: dto.imagen ?? dto.image_url ?? dto.imageUrl ?? null,
    location: dto.ubicacion ?? dto.location ?? null,
    category: (dto.categoria ?? dto.category) as Event['category'] ?? null,
    startDate: dto.fecha_inicio ?? dto.start_date ?? dto.startDate ?? dto.fecha ?? '',
    endDate: dto.fecha_fin ?? dto.end_date ?? dto.endDate ?? null,
    createdBy: dto.created_by ?? dto.createdBy ?? null,
    organizer: dto.organizador ?? dto.organizer ?? null,
    createdAt: dto.created_at ?? dto.createdAt ?? new Date().toISOString(),
    updatedAt: dto.updated_at ?? dto.updatedAt ?? new Date().toISOString(),
  };
}

function mapEntityToDto(input: Partial<Event>): Record<string, unknown> {
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

function apiError(error: string | null): AppError {
  return new AppError(error ?? 'Error del servidor', 'API_ERROR');
}

// ─── Repository ──────────────────────────────────────────────

export class ExpressEventRepository implements IEventRepository {
  private async token(): Promise<string | null> {
    return SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  }

  async getEvents(page: number = 1, pageSize: number = 10, search?: string): Promise<PaginatedResponse<Event>> {
    const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
    if (search) params.set('search', search);
    const { data, error } = await expressClient.get<EventDto[]>(`/eventos?${params.toString()}`);
    if (error) throw apiError(error);
    const items = (data ?? []).map(mapEventToEntity);
    return { data: items, count: items.length, page, pageSize };
  }

  async getEventById(id: string): Promise<Event> {
    const { data, error } = await expressClient.get<EventDto>(`/verevento/${id}`);
    if (error) throw apiError(error);
    if (!data) throw new NotFoundError('Evento no encontrado');
    return mapEventToEntity(data);
  }

  async createEvent(input: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>): Promise<Event> {
    const { data, error } = await expressClient.post<EventDto>('/evento', {
      nombre: input.title,
      organizador: input.organizer,
      fecha: input.startDate?.slice(0, 10) ?? '',
      hora: input.startDate?.slice(11, 16) ?? '',
      ubicacion: input.location,
      informacion: input.description ?? '',
    });
    if (error || !data) throw apiError(error);
    return mapEventToEntity(data);
  }

  async updateEvent(id: string, input: Partial<Event>): Promise<Event> {
    const t = await this.token();
    const dto = mapEntityToDto(input);
    const { data, error } = await expressClient.put<EventDto>(`/admin/actualizarevento/${id}`, dto, t);
    if (error || !data) throw apiError(error);
    return mapEventToEntity(data);
  }

  async deleteEvent(id: string): Promise<void> {
    const t = await this.token();
    const { error } = await expressClient.delete(`/admin/eliminarevento/${id}`, t);
    if (error) throw apiError(error);
  }
}
