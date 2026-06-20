import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CampusLocation } from '@/features/map/domain/location.entity';
import type { BusRoute } from '@/features/polibus/domain/route.entity';
import { useAuthStore } from './auth.store';

function getCurrentUserId(): string | undefined {
  return useAuthStore.getState().user?.id;
}

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
  userId: string;
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
  userId: string;
}

interface FavoritesState {
  locations: FavoriteLocation[];
  routes: FavoriteRoute[];
  addLocation: (location: CampusLocation) => void;
  removeLocation: (id: string) => void;
  isFavorite: (id: string) => boolean;
  toggleLocation: (location: CampusLocation) => void;

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
        const uid = getCurrentUserId();
        if (!uid) return;
        const { locations } = get();
        if (locations.some((f) => f.id === location.id && f.userId === uid)) return;
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
              userId: uid,
            },
          ],
        });
      },

      removeLocation: (id) => {
        const uid = getCurrentUserId();
        if (!uid) return;
        set({ locations: get().locations.filter((f) => !(f.id === id && f.userId === uid)) });
      },

      isFavorite: (id) => {
        const uid = getCurrentUserId();
        if (!uid) return false;
        return get().locations.some((f) => f.id === id && f.userId === uid);
      },

      toggleLocation: (location) => {
        if (get().isFavorite(location.id)) {
          get().removeLocation(location.id);
        } else {
          get().addLocation(location);
        }
      },

      addRoute: (route) => {
        const uid = getCurrentUserId();
        if (!uid) return;
        const { routes } = get();
        if (routes.some((r) => r.id === route.id && r.userId === uid)) return;
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
              userId: uid,
            },
          ],
        });
      },

      removeRoute: (id) => {
        const uid = getCurrentUserId();
        if (!uid) return;
        set({ routes: get().routes.filter((r) => !(r.id === id && r.userId === uid)) });
      },

      isRouteFavorite: (id) => {
        const uid = getCurrentUserId();
        if (!uid) return false;
        return get().routes.some((r) => r.id === id && r.userId === uid);
      },

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
