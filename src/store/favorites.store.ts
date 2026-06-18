import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CampusLocation } from '@/features/map/domain/location.entity';
import type { BusRoute } from '@/features/polibus/domain/route.entity';

interface FavoriteLocation {
  id: string;
  name: string;
  description: string | null;
  category: string;
  latitude: number;
  longitude: number;
  imageUrl: string | null;
  image?: string;
  image360?: string;
  mediaType?: string;
}

interface FavoriteRoute {
  id: string;
  name: string;
  description: string | null;
  color: string;
  isActive: boolean;
  estimatedTime: number | null;
  distance: number | null;
  direction: string | null;
}

interface FavoritesState {
  locations: FavoriteLocation[];
  addLocation: (location: CampusLocation) => void;
  removeLocation: (id: string) => void;
  isFavorite: (id: string) => boolean;
  toggleLocation: (location: CampusLocation) => void;

  routes: FavoriteRoute[];
  addRoute: (route: BusRoute) => void;
  removeRoute: (id: string) => void;
  isRouteFavorite: (id: string) => boolean;
  toggleRoute: (route: BusRoute) => void;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      locations: [],
      routes: [],

      addLocation: (location) => {
        const { locations } = get();
        if (locations.some((f) => f.id === location.id)) return;
        set({
          locations: [
            ...locations,
            {
              id: location.id,
              name: location.name,
              description: location.description,
              category: location.category,
              latitude: location.latitude,
              longitude: location.longitude,
              imageUrl: location.imageUrl,
              image: location.image,
              image360: location.image360,
              mediaType: location.mediaType,
            },
          ],
        });
      },

      removeLocation: (id) => {
        set({ locations: get().locations.filter((f) => f.id !== id) });
      },

      isFavorite: (id) => get().locations.some((f) => f.id === id),

      toggleLocation: (location) => {
        if (get().isFavorite(location.id)) {
          get().removeLocation(location.id);
        } else {
          get().addLocation(location);
        }
      },

      addRoute: (route) => {
        const { routes } = get();
        if (routes.some((r) => r.id === route.id)) return;
        set({
          routes: [
            ...routes,
            {
              id: route.id,
              name: route.name,
              description: route.description,
              color: route.color,
              isActive: route.isActive,
              estimatedTime: route.estimatedTime,
              distance: route.distance,
              direction: route.direction,
            },
          ],
        });
      },

      removeRoute: (id) => {
        set({ routes: get().routes.filter((r) => r.id !== id) });
      },

      isRouteFavorite: (id) => get().routes.some((r) => r.id === id),

      toggleRoute: (route) => {
        if (get().isRouteFavorite(route.id)) {
          get().removeRoute(route.id);
        } else {
          get().addRoute(route);
        }
      },
    }),
    {
      name: 'esfotgo-favorites',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
