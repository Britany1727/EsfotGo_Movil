import { expressClient } from '@/services/express/api-client';
import { AppError, NotFoundError } from '@/core/errors/app-error';
import type { CampusLocation } from '../domain/location.entity';
import type { ILocationRepository } from '../domain/location.repository';
import type { LocationDto } from '@/services/express/adapters/mongo-dtos';
import { mapLocationDtoToCampusLocation } from '@/services/express/adapters/mongo-mappers';

export class ExpressLocationRepository implements ILocationRepository {
  async getCampusLocations(category?: string): Promise<CampusLocation[]> {
    const path = category ? `/mapa/categoria/${category}` : '/mapa/ubicaciones';
    const { data, error } = await expressClient.get<LocationDto[]>(path);
    if (error) throw new AppError(error, 'API_ERROR');
    return (data ?? []).map(mapLocationDtoToCampusLocation);
  }

  async getLocationById(id: string): Promise<CampusLocation> {
    const { data, error } = await expressClient.get<LocationDto>(`/mapa/ubicacion/${id}`);
    if (error) throw new AppError(error, 'API_ERROR');
    if (!data) throw new NotFoundError('Ubicación no encontrada');
    return mapLocationDtoToCampusLocation(data);
  }
}
