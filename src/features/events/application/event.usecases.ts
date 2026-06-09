import { IEventRepository } from '../domain/event.repository';
import type { Event } from '../domain/event.entity';
import type { PaginatedResponse, User } from '@/core/types';
import { PermissionError } from '@/core/errors/app-error';
import { hasPermission } from '@/constants/roles';

export class GetEventsUseCase {
  constructor(private readonly eventRepository: IEventRepository) {}

  async execute(
    page: number = 1,
    pageSize: number = 10,
    search?: string
  ): Promise<PaginatedResponse<Event>> {
    return this.eventRepository.getEvents(page, pageSize, search);
  }
}

export class GetEventDetailUseCase {
  constructor(private readonly eventRepository: IEventRepository) {}

  async execute(id: string): Promise<Event> {
    return this.eventRepository.getEventById(id);
  }
}

export class CreateEventUseCase {
  constructor(private readonly eventRepository: IEventRepository) {}

  async execute(
    _user: User | null,
    input: Omit<Event, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>
  ): Promise<Event> {
    return this.eventRepository.createEvent({
      ...input,
      createdBy: _user?.id ?? 'anonimo',
    });
  }
}

export class UpdateEventUseCase {
  constructor(private readonly eventRepository: IEventRepository) {}

  async execute(user: User | null, eventId: string, input: Partial<Event>): Promise<Event> {
    if (!user || !hasPermission(user.role, 'update:events')) {
      throw new PermissionError();
    }

    return this.eventRepository.updateEvent(eventId, input);
  }
}

export class DeleteEventUseCase {
  constructor(private readonly eventRepository: IEventRepository) {}

  async execute(user: User | null, eventId: string): Promise<void> {
    if (!user || !hasPermission(user.role, 'delete:events')) {
      throw new PermissionError();
    }

    return this.eventRepository.deleteEvent(eventId);
  }
}
