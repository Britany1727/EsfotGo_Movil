import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import type { MapRegion, MapMarkerData } from '../domain/coordinates';
import type { CampusLocation } from '../domain/location.entity';
import { regionToBoundingBox } from '../domain/coordinates';
import { ExpressLocationRepository } from '../infrastructure/express-location.repository';
import { filterMarkersInViewport, clusterMarkers } from '../services/geo.service';
import { geoCache } from '../infrastructure/geo-cache';
import { useBatteryOptimizer } from '../services/battery-optimizer';
import { isDevMode } from '@/core/config/env';
import { MockData } from '@/core/dev/mock-services';

const repository = new ExpressLocationRepository();

const CATEGORY_CONFIG: Record<string, { color: string; label: string }> = {
  academico: { color: '#1B6BB0', label: 'Académico' },
  biblioteca: { color: '#7C3AED', label: 'Biblioteca' },
  servicios: { color: '#059669', label: 'Servicios' },
  deportes: { color: '#DC2626', label: 'Deportes' },
  eventos: { color: '#F59E0B', label: 'Eventos' },
  estacionamiento: { color: '#6B7280', label: 'Estacionamiento' },
  entrada: { color: '#0EA5E9', label: 'Entrada' },
  aulas: { color: '#8B5CF6', label: 'Aulas' },
  otro: { color: '#9CA3AF', label: 'Otro' },
};

export function getCategoryConfig(category: string) {
  return CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG.otro;
}

export function getAllCategories() {
  return Object.entries(CATEGORY_CONFIG).map(([key, val]) => ({
    key,
    ...val,
  }));
}

function locationToMarker(loc: CampusLocation): MapMarkerData {
  return {
    id: loc.id,
    coordinate: { latitude: loc.latitude, longitude: loc.longitude },
    title: loc.name,
    description: loc.description ?? undefined,
    category: loc.category,
    imageUrl: loc.imageUrl ?? undefined,
    image360: loc.image360,
    mediaType: loc.mediaType,
    clusterWeight: 1,
  };
}

export function useCampusLocations(category?: string) {
  return useQuery<CampusLocation[]>({
    queryKey: ['campus-locations', { category }],
    queryFn: async () => {
      if (isDevMode()) {
        const all = await MockData.getCampusLocations();
        return category ? all.filter((l) => l.category === category) : all;
      }
      return repository.getCampusLocations(category);
    },
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
  });
}

// ─── Search cache ───────────────────────────────────────────

const searchCache = new Map<string, CampusLocation[]>();
const SEARCH_CACHE_MAX = 10;

export function useMapSearch(searchQuery: string, debounceMs: number = 300) {
  const { data: allLocations, isLoading } = useCampusLocations();
  const [debounced, setDebounced] = useState('');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const setSearch = useCallback(
    (query: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => setDebounced(query), debounceMs);
    },
    [debounceMs]
  );

  const results = useMemo(() => {
    if (!debounced || debounced.length < 2 || !allLocations) return [];
    const q = debounced.toLowerCase();
    const cacheKey = q;
    const cached = searchCache.get(cacheKey);
    if (cached) return cached;
    const filtered = allLocations.filter(
      (loc) =>
        loc.name.toLowerCase().includes(q) ||
        (loc.description?.toLowerCase().includes(q) ?? false)
    );
    if (searchCache.size >= SEARCH_CACHE_MAX) {
      const first = searchCache.keys().next().value;
      if (first) searchCache.delete(first);
    }
    searchCache.set(cacheKey, filtered);
    return filtered;
  }, [allLocations, debounced]);

  return { results, setSearch, searchQuery: debounced, isLoading };
}

export function useMapClusters(
  region: MapRegion | null,
  category?: string
) {
  const { data: locations } = useCampusLocations(category);
  const battery = useBatteryOptimizer();
  const queryClient = useQueryClient();
  const prevRegionRef = useRef<MapRegion | null>(null);
  const prevCategoryRef = useRef<string | undefined>(undefined);

  const regionKey = useMemo(() => {
    if (!region) return '';
    return `${region.latitude.toFixed(4)},${region.longitude.toFixed(4)}`;
  }, [region]);

  const allMarkers: MapMarkerData[] = useMemo(
    () => locations?.map(locationToMarker) ?? [],
    [locations]
  );

  const viewportMarkers = useMemo(() => {
    if (!region) return allMarkers;
    const prevKey = prevRegionRef.current
      ? `${prevRegionRef.current.latitude.toFixed(4)},${prevRegionRef.current.longitude.toFixed(4)}`
      : '';
    if (prevRegionRef.current && regionKey === prevKey && prevCategoryRef.current === category) {
      return allMarkers;
    }
    prevRegionRef.current = region;
    prevCategoryRef.current = category;

    const box = regionToBoundingBox(region);
    const cacheKey = geoCache.buildViewportKey(box, `vp:${category ?? 'all'}`);

    const cached = geoCache.get<MapMarkerData[]>(cacheKey);
    if (cached) return cached;

    const filtered = filterMarkersInViewport(allMarkers, box);
    geoCache.set(cacheKey, filtered, 3000);
    return filtered;
  }, [allMarkers, regionKey, category]);

  const clusteredItems = useMemo(() => {
    if (!region) return viewportMarkers;

    const box = regionToBoundingBox(region);
    const forceCluster = battery.shouldForceCluster();
    const minForCluster = forceCluster ? 5 : 8;

    if (viewportMarkers.length < minForCluster) return viewportMarkers;

    return clusterMarkers(viewportMarkers, box);
  }, [viewportMarkers, regionKey, battery]);

  return {
    markers: viewportMarkers,
    clusters: clusteredItems,
    totalCount: allMarkers.length,
    visibleCount: viewportMarkers.length,
    invalidateCache: () => queryClient.invalidateQueries({ queryKey: ['campus-locations'] }),
  };
}

export function useLocationDetail(id: string) {
  return useQuery<CampusLocation>({
    queryKey: ['campus-locations', id],
    queryFn: () => repository.getLocationById(id),
    enabled: !!id,
  });
}
