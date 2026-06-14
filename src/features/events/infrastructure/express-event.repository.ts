import * as SecureStore from 'expo-secure-store';
import { expressClient } from '@/services/express/api-client';
import { AppError, NotFoundError } from '@/core/errors/app-error';
import type { Event } from '../domain/event.entity';
import type { IEventRepository } from '../domain/event.repository';
import type { PaginatedResponse } from '@/core/types';
import { mapEventDtoToEvent } from '@/services/express/adapters/mongo-mappers';
import type { EventDto } from '@/services/express/adapters/mongo-dtos';

const AUTH_TOKEN_KEY = 'esfotgo_jwt_token';

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

export class ExpressEventRepository implements IEventRepository {
  private async token(): Promise<string | null> {
    return SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  }

  async getEvents(page: number = 1, pageSize: number = 10, search?: string): Promise<PaginatedResponse<Event>> {
    const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
    if (search) params.set('search', search);
    const { data, error } = await expressClient.get<EventDto[]>(`/eventos?${params.toString()}`);
    if (error) throw apiError(error);
    const items = (data ?? []).map(mapEventDtoToEvent);
    return { data: items, count: items.length, page, pageSize };
  }

  async getEventById(id: string): Promise<Event> {
    const { data, error } = await expressClient.get<EventDto>(`/verevento/${id}`);
    if (error) throw apiError(error);
    if (!data) throw new NotFoundError('Evento no encontrado');
    return mapEventDtoToEvent(data);
  }

  async createEvent(input: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>): Promise<Event> {
    const dto = mapEntityToDto(input);
    const { data, error } = await expressClient.post<EventDto>('/evento', dto);
    if (error || !data) throw apiError(error);
    return mapEventDtoToEvent(data);
  }

  async updateEvent(id: string, input: Partial<Event>): Promise<Event> {
    const t = await this.token();
    const dto = mapEntityToDto(input);
    const { data, error } = await expressClient.put<EventDto>(`/admin/actualizarevento/${id}`, dto, t);
    if (error || !data) throw apiError(error);
    return mapEventDtoToEvent(data);
  }

  async deleteEvent(id: string): Promise<void> {
    const t = await this.token();
    const { error } = await expressClient.delete(`/admin/eliminarevento/${id}`, t);
    if (error) throw apiError(error);
  }
}
