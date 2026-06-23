import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ExpressFavoriteRepository } from '../infrastructure/express-favorite.repository';
import type { Favorite, CreateFavoriteInput, FavoriteItemType } from '../domain/favorite.entity';
import { isDevMode } from '@/core/config/env';

const repository = new ExpressFavoriteRepository();

const MOCK_FAVORITES: Favorite[] = [
  {
    id: 'fav-1', itemId: '1', itemType: 'aula', itemName: 'Aula 101 - Matemáticas',
    itemData: { code: 'A-101', description: 'Laboratorio de computación', category: 'aula', floor: 1, capacity: 40 },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'fav-2', itemId: '2', itemType: 'aula', itemName: 'Aula 205 - Tecnología',
    itemData: { code: 'A-205', description: 'Sala de clase equipada', category: 'aula', floor: 2, capacity: 35 },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'fav-5', itemId: 'r1', itemType: 'ruta', itemName: 'Ruta al Edificio ESFOT',
    itemData: { origin: 'Mi ubicación', destination: 'Edificio Principal ESFOT', distanceMeters: 320, estimatedMinutes: 4, color: '#042c5c' },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'fav-6', itemId: 'r2', itemType: 'ruta', itemName: 'Ruta al Laboratorio',
    itemData: { origin: 'Entrada EPN', destination: 'Bloque de Laboratorios', distanceMeters: 580, estimatedMinutes: 7, color: '#059669' },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'fav-7', itemId: 'u1', itemType: 'ubicacion', itemName: 'Cafetería Central',
    itemData: { description: 'Área de alimentación principal', category: 'otro', icon: '☕' },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'fav-8', itemId: 'u2', itemType: 'ubicacion', itemName: 'Biblioteca EPN',
    itemData: { description: 'Centro de recursos bibliográficos', category: 'otro', icon: '📖' },
    createdAt: new Date().toISOString(),
  },
];

export function useFavorites() {
  return useQuery<Favorite[]>({
    queryKey: ['favorites'],
    queryFn: async () => {
      if (isDevMode()) return MOCK_FAVORITES;
      return repository.getFavorites();
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
  });
}

export function useFavoritesByType() {
  const query = useFavorites();

  const byType = (type: FavoriteItemType): Favorite[] =>
    (query.data ?? []).filter((f) => f.itemType === type);

  return {
    ...query,
    aulas: byType('aula'),
    rutas: byType('ruta'),
    ubicaciones: byType('ubicacion'),
    total: query.data?.length ?? 0,
    countByType: {
      aulas: byType('aula').length,
      rutas: byType('ruta').length,
      ubicaciones: byType('ubicacion').length,
    },
  };
}

export function useFavoriteCount() {
  const { data } = useFavorites();
  return data?.length ?? 0;
}

export function useAddFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateFavoriteInput) => repository.addFavorite(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });
}

export function useRemoveFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => repository.removeFavorite(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });
}
