import * as SecureStore from 'expo-secure-store';
import { httpClient } from '@/services/http-client';
import { AppError, NotFoundError } from '@/core/errors/app-error';
import type { Event, EventCategory } from '../domain/event.entity';
import type { IEventRepository } from '../domain/event.repository';
import type { PaginatedResponse } from '@/core/types';
import { mapEventDtoToEvent } from '@/services/express/adapters/mongo-mappers';
import type { EventDto } from '@/services/express/adapters/mongo-dtos';

const AUTH_TOKEN_KEY = 'esfotgo_jwt_token';

function mapEntityToDto(input: Partial<Event> & { imageBase64?: string }): Record<string, unknown> {
  const dto: Record<string, unknown> = {};
  if (input.title !== undefined) dto.nombre = input.title;
  if (input.description !== undefined) dto.informacion = input.description;
  if (input.imageBase64) {
    dto.subirBase64Evento = input.imageBase64;
  } else if (input.imageUrl !== undefined) {
    dto.imagen = input.imageUrl;
  }
  if (input.location !== undefined) dto.ubicacion = input.location;
  if (input.category !== undefined) dto.categoria = input.category;
  if (input.startDate !== undefined) {
    dto.fecha = input.startDate.slice(0, 10);
    dto.hora = input.startDate.slice(11, 16);
  }
  if (input.endDate !== undefined) dto.fecha_fin = input.endDate;
  if (input.organizer !== undefined) dto.organizador = input.organizer;
  return dto;
}

function apiError(error: string | null): AppError {
  return new AppError(error ?? 'Error del servidor', 'API_ERROR');
}

export class ExpressEventRepository implements IEventRepository {
  private async token(): Promise<string | null> {
    return SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  }

  async getEvents(page: number = 1, pageSize: number = 10, search?: string): Promise<PaginatedResponse<Event>> {
    const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
    if (search) params.set('search', search);
    const { data, error } = await httpClient.get<EventDto[]>(`/eventos?${params.toString()}`);
    if (error) throw apiError(error);
    const items = (data ?? []).map(mapEventDtoToEvent);
    return { data: items, count: items.length, page, pageSize };
  }

  async getEventById(id: string): Promise<Event> {
    const { data, error } = await httpClient.get<EventDto>(`/verevento/${id}`);
    if (error) throw apiError(error);
    if (!data) throw new NotFoundError('Evento no encontrado');
    return mapEventDtoToEvent(data);
  }

  async createEvent(input: Omit<Event, 'id' | 'createdAt' | 'updatedAt'> & { imageBase64?: string }): Promise<Event> {
    const t = await this.token();
    const dto = mapEntityToDto(input);
    const { data, error } = await httpClient.post<EventDto>('/admin/evento', dto, t);
    if (error) throw apiError(error);
    if (!data) {
      const now = new Date().toISOString();
      return {
        id: '',
        title: input.title ?? '',
        description: input.description ?? null,
        imageUrl: null,
        location: input.location ?? null,
        category: (input.category ?? null) as EventCategory | null,
        startDate: input.startDate,
        endDate: input.endDate ?? null,
        createdBy: input.createdBy ?? 'anonimo',
        organizer: input.organizer ?? null,
        createdAt: now,
        updatedAt: now,
      };
    }
    return mapEventDtoToEvent(data);
  }

  async updateEvent(id: string, input: Partial<Event> & { imageBase64?: string }): Promise<Event> {
    const t = await this.token();
    const dto = mapEntityToDto(input);
    const { data, error } = await httpClient.put<EventDto>(`/admin/actualizarevento/${id}`, dto, t);
    if (error) throw apiError(error);
    if (!data) {
      return this.getEventById(id);
    }
    return mapEventDtoToEvent(data);
  }

  async deleteEvent(id: string): Promise<void> {
    const t = await this.token();
    const { error } = await httpClient.delete(`/admin/eliminarevento/${id}`, t);
    if (error) throw apiError(error);
  }
}
