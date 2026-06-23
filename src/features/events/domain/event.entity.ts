import type { BaseEntity } from '@/core/types';

export interface Event extends BaseEntity {
  title: string;
  description: string | null;
  imageUrl: string | null;
  location: string | null;
  category: EventCategory | null;
  startDate: string;
  endDate: string | null;
  createdBy: string | null;
  organizer: string | null;
}

export type EventCategory =
  | 'academico'
  | 'cultural'
  | 'deportivo'
  | 'tecnologico'
  | 'institucional'
  | 'todos';

export type EventDateFilter = 'todos' | 'proximos' | 'este_mes' | 'pasados';

export type EventCreateInput = Omit<Event, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'> & {
  imageBase64?: string;
};

export type EventUpdateInput = Partial<Event> & {
  imageBase64?: string;
};
