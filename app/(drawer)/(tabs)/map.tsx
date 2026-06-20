import React, { useCallback, useRef, useState, useMemo, useEffect } from 'react';
import {
  View, StyleSheet, Pressable, Platform, Text, ActivityIndicator,
} from 'react-native';
import MapView, { PROVIDER_GOOGLE, PROVIDER_DEFAULT, Polyline, Circle } from 'react-native-maps';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MapRegion, MapMarkerData, ClusterPoint, GeoCoordinate } from '@/features/map/domain/coordinates';
import type { CampusLocation } from '@/features/map/domain/location.entity';
import type { RestrictedZone } from '@/features/admin/domain/poi.entity';
import { useMapClusters } from '@/features/map/application/map.hooks';
import { useLocation } from '@/hooks/useLocation';
import { GpsPermissionPrompt } from '@/features/auth/presentation/gps-permission-prompt';
import { UserMarker } from '@/features/map/presentation/user-marker';
import { LocationMarker, ClusterMarker } from '@/features/map/presentation/markers';
import { MapControls } from '@/features/map/presentation/map-controls';
import { CategoryFilter } from '@/features/map/presentation/category-filter';
import { MapSearchBar } from '@/features/map/presentation/map-search-bar';
import { LocationDetailSheet } from '@/features/map/presentation/location-detail-sheet';
import { LocationInfoModal } from '@/features/map/presentation/location-info-modal';
import { RestrictedZonesLayer } from '@/features/map/presentation/restricted-zones-layer';
import { RestrictedZoneInfoModal } from '@/features/map/presentation/restricted-zone-info-modal';
import { RouteInfoCard } from '@/features/map/presentation/route-info-card';
import { BusMarker } from '@/features/polibus/presentation/bus-marker';
import { useBusRoutes, useBusLocations } from '@/features/polibus/application/bus.hooks';
import { useAdminZones } from '@/features/admin/application/poi.hooks';
import { calculateOptimalRoute } from '@/features/map/services/route-calculator';
import { useBatteryOptimizer } from '@/features/map/services/battery-optimizer';
import { useCampusGraph, useOptimalRoute } from '@/features/graph/application/graph.hooks';
import { findNearestNode, graphRouteToWaypoints } from '@/features/graph/application/graph-route.service';
import type { RouteCalculation } from '@/features/map/services/route-calculator';
import type { GraphRouteResult } from '@/features/graph/application/graph-route.service';
import { OsrmRoutingRepository } from '@/features/map/infrastructure/osrm-routing.repository';
import type { RoutingResult } from '@/features/map/domain/routing.repository';
import { LightTheme as T, Shadows, Sizes, Typography } from '@/constants/design-system';
import { MapPin, Navigation, X } from 'lucide-react-native';
import { useLocalSearchParams } from 'expo-router';

const MAP_PROVIDER = Platform.OS === 'ios' ? PROVIDER_DEFAULT : PROVIDER_GOOGLE;

const EPN_REGION: MapRegion = {
  latitude: -0.2095,
  longitude: -78.4905,
  latitudeDelta: 0.012,
  longitudeDelta: 0.012,
};

function isClusterPoint(item: MapMarkerData | ClusterPoint): item is ClusterPoint {
  return 'count' in item && item.count > 1;
}

function haversineLocal(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const insets = useSafeAreaInsets();
  const { location: userLocation, permissionStatus, retry, error: locationError } = useLocation();
  const battery = useBatteryOptimizer();
  const initialCenteredRef = useRef(false);

  const [region, setRegion] = useState<MapRegion>(EPN_REGION);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [selectedLocation, setSelectedLocation] = useState<CampusLocation | null>(null);
  const [infoLocation, setInfoLocation] = useState<CampusLocation | null>(null);
  const [selectedZone, setSelectedZone] = useState<RestrictedZone | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [route, setRoute] = useState<RouteCalculation | null>(null);
  const [graphRoute, setGraphRoute] = useState<GraphRouteResult | null>(null);
  const [osrmRoute, setOsrmRoute] = useState<RoutingResult | null>(null);
  const [fromNodeId, setFromNodeId] = useState<string | null>(null);
  const [toNodeId, setToNodeId] = useState<string | null>(null);
  const [remainingDistance, setRemainingDistance] = useState<number | null>(null);
  const fullRouteRef = useRef<GeoCoordinate[]>([]);

  const params = useLocalSearchParams<{ locationId?: string }>();
  const locationIdFromParams = params.locationId;

  const fabScale = useSharedValue(1);
  const fabAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
  }));

  const { data: campusGraph, error: graphError } = useCampusGraph();
  const optimalGraphRoute = useOptimalRoute(campusGraph, fromNodeId, toNodeId);
  const { clusters } = useMapClusters(region, selectedCategory);

  React.useEffect(() => {
    if (userLocation && !initialCenteredRef.current && mapRef.current) {
      initialCenteredRef.current = true;
      mapRef.current.animateToRegion({
        latitude: userLocation.coords.latitude,
        longitude: userLocation.coords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 800);
    }
  }, [userLocation]);

  if (graphError) console.log('[MapScreen] Error cargando grafo:', (graphError as Error)?.message ?? graphError);

  const osrmRepoRef = useRef(new OsrmRoutingRepository());

  const computeRoute = useCallback(
    (dest: GeoCoordinate) => {
      if (!userLocation) return;
      const origin: GeoCoordinate = {
        latitude: userLocation.coords.latitude,
        longitude: userLocation.coords.longitude,
      };
      if (campusGraph) {
        const fromNode = findNearestNode(campusGraph, origin);
        const toNode = findNearestNode(campusGraph, dest);
        if (fromNode && toNode && fromNode !== toNode) {
          setFromNodeId(fromNode); setToNodeId(toNode); setRoute(null); setOsrmRoute(null); return;
        }
      }
      osrmRepoRef.current.getRoute(origin, dest)
        .then((osrmResult) => {
          setRoute(null); setGraphRoute(null); setOsrmRoute(osrmResult); setFromNodeId(null); setToNodeId(null);
        })
        .catch((osrmErr: unknown) => {
          console.log('[MapScreen] OSRM falló, usando ruta directa:', (osrmErr as Error)?.message);
          const calc = calculateOptimalRoute(origin, dest);
          setRoute(calc); setGraphRoute(null); setOsrmRoute(null); setFromNodeId(null); setToNodeId(null);
        });
    },
    [userLocation, campusGraph],
  );

  React.useEffect(() => {
    if (optimalGraphRoute && campusGraph) {
      setGraphRoute(graphRouteToWaypoints(campusGraph, optimalGraphRoute));
    } else if (fromNodeId && toNodeId && !optimalGraphRoute) {
      setGraphRoute(null);
      setRoute(null);
    }
  }, [optimalGraphRoute, campusGraph, fromNodeId, toNodeId, userLocation, selectedLocation]);

  // Route tracking — trim waypoints as user walks
  useEffect(() => {
    const coords = graphRoute?.waypoints ?? route?.waypoints ?? osrmRoute?.waypoints;
    if (!coords || coords.length < 2 || !userLocation) {
      setRemainingDistance(null);
      fullRouteRef.current = [];
      return;
    }

    fullRouteRef.current = coords;
    const userLat = userLocation.coords.latitude;
    const userLng = userLocation.coords.longitude;

    // Find first waypoint not yet passed (within 12m threshold)
    const THRESHOLD_M = 12;
    let trimIdx = 0;
    let cumDist = 0;

    for (let i = 0; i < coords.length - 1; i++) {
      const d = haversineLocal(userLat, userLng, coords[i].latitude, coords[i].longitude);
      if (d < THRESHOLD_M) trimIdx = i + 1;
    }

    // Calculate remaining distance
    const remaining = trimIdx > 0 ? coords.slice(trimIdx) : coords;
    for (let i = 0; i < remaining.length - 1; i++) {
      cumDist += haversineLocal(
        remaining[i].latitude, remaining[i].longitude,
        remaining[i + 1].latitude, remaining[i + 1].longitude,
      );
    }
    if (remaining.length > 0) {
      cumDist += haversineLocal(userLat, userLng, remaining[0].latitude, remaining[0].longitude);
    }

    setRemainingDistance(Math.round(cumDist));

    // If reached destination (<12m from last waypoint)
    const last = coords[coords.length - 1];
    if (haversineLocal(userLat, userLng, last.latitude, last.longitude) < THRESHOLD_M) {
      setRemainingDistance(null);
    }
  }, [userLocation, graphRoute, route, osrmRoute]);

  const { data: busRoutes } = useBusRoutes();
  const activeRoute = busRoutes?.find((r) => r.isActive);
  const { data: busLocations } = useBusLocations(activeRoute?.id ?? '');

  const { zones } = useAdminZones();

  const handleRegionChange = useCallback((r: MapRegion) => setRegion(r), []);
  const handleMarkerPress = useCallback((marker: MapMarkerData) => {
    setSelectedLocation({
      id: marker.id, name: marker.title,
      description: marker.description ?? null,
      category: marker.category,
      latitude: marker.coordinate.latitude,
      longitude: marker.coordinate.longitude,
      imageUrl: marker.imageUrl ?? null,
      createdAt: '',
    });
    computeRoute(marker.coordinate);
  }, [computeRoute]);

  // Auto-select location from params (e.g., navigated from Aulas screen)
  React.useEffect(() => {
    if (!locationIdFromParams || clusters.length === 0) return;
    const found = clusters.find(
      (c): c is MapMarkerData => !isClusterPoint(c) && c.id === locationIdFromParams,
    );
    if (found) {
      setSelectedLocation({
        id: found.id, name: found.title,
        description: found.description ?? null,
        category: found.category,
        latitude: found.coordinate.latitude,
        longitude: found.coordinate.longitude,
        imageUrl: found.imageUrl ?? null,
        createdAt: '',
      });
      computeRoute(found.coordinate);
      mapRef.current?.animateToRegion({
        latitude: found.coordinate.latitude,
        longitude: found.coordinate.longitude,
        latitudeDelta: 0.004,
        longitudeDelta: 0.004,
      }, 500);
    }
  }, [locationIdFromParams, clusters]);

  const handleSelectLocation = useCallback((location: CampusLocation) => {
    setSelectedLocation(location);
    mapRef.current?.animateToRegion({
      latitude: location.latitude, longitude: location.longitude,
      latitudeDelta: 0.004, longitudeDelta: 0.004,
    }, 500);
    computeRoute({ latitude: location.latitude, longitude: location.longitude });
  }, [computeRoute]);
  const handleClearRoute = useCallback(() => {
    setRoute(null); setGraphRoute(null); setOsrmRoute(null); setFromNodeId(null); setToNodeId(null);
    setSelectedLocation(null);
  }, []);

  const handleMapPress = useCallback((event: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => {
    const coord = event.nativeEvent.coordinate;
    const dest: CampusLocation = {
      id: `tap-${Date.now()}`,
      name: 'Destino seleccionado',
      description: `${coord.latitude.toFixed(5)}, ${coord.longitude.toFixed(5)}`,
      category: 'otro',
      latitude: coord.latitude,
      longitude: coord.longitude,
      imageUrl: null,
      createdAt: new Date().toISOString(),
    };
    setSelectedLocation(dest);
    computeRoute({ latitude: coord.latitude, longitude: coord.longitude });
  }, [computeRoute]);

  const handleMyLocation = useCallback(() => {
    if (!userLocation) return;
    setIsLocating(true);
    mapRef.current?.animateToRegion({
      latitude: userLocation.coords.latitude,
      longitude: userLocation.coords.longitude,
      latitudeDelta: 0.005, longitudeDelta: 0.005,
    }, 600);
    setTimeout(() => setIsLocating(false), 1200);
  }, [userLocation]);
  const handleZoomIn = useCallback(() => setRegion((prev) => ({
    ...prev, latitudeDelta: prev.latitudeDelta / 1.6, longitudeDelta: prev.longitudeDelta / 1.6,
  })), []);
  const handleZoomOut = useCallback(() => setRegion((prev) => ({
    ...prev, latitudeDelta: prev.latitudeDelta * 1.6, longitudeDelta: prev.longitudeDelta * 1.6,
  })), []);
  const skipAnimation = useMemo(() => battery.shouldSkipAnimation(), [battery]);

  if (permissionStatus !== 'granted' && permissionStatus !== 'idle') {
    return (
      <View style={styles.container}>
        <View style={styles.permissionFallback}>
          <GpsPermissionPrompt
            variant="inline"
            onGranted={() => {
              retry();
            }}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={MAP_PROVIDER}
        initialRegion={EPN_REGION}
        region={region}
        onRegionChangeComplete={handleRegionChange}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsCompass={false}
        showsScale
        rotateEnabled={false}
        toolbarEnabled={false}
        pitchEnabled={false}
        onPress={handleMapPress}
      >
        {userLocation && (
          <>
            <Circle
              center={{
                latitude: userLocation.coords.latitude,
                longitude: userLocation.coords.longitude,
              }}
              radius={userLocation.coords.accuracy ?? 10}
              fillColor="rgba(0, 122, 255, 0.12)"
              strokeColor="rgba(0, 122, 255, 0.35)"
              strokeWidth={1.5}
            />
            <UserMarker location={userLocation} />
          </>
        )}

        <RestrictedZonesLayer zones={zones} onZonePress={setSelectedZone} />

        {(route || graphRoute || osrmRoute) && (route?.waypoints.length ?? graphRoute?.waypoints.length ?? osrmRoute?.waypoints.length ?? 0) > 1 && (
          <Polyline
            coordinates={graphRoute ? graphRoute.waypoints : osrmRoute ? osrmRoute.waypoints : route!.waypoints}
            strokeColor={graphRoute ? T.success : osrmRoute ? '#2563EB' : T.primary}
            strokeWidth={graphRoute ? 6 : osrmRoute ? 5 : 5}
            lineDashPattern={graphRoute ? undefined : osrmRoute ? undefined : [8, 6]}
            lineCap="round"
            lineJoin="round"
          />
        )}
        {clusters.map((item) =>
          isClusterPoint(item) ? (
            <ClusterMarker
              key={item.id}
              id={item.id}
              coordinate={item.coordinate}
              count={item.count}
              topCategory={item.topCategory}
            />
          ) : (
            <LocationMarker
              key={item.id}
              marker={item}
              onPress={handleMarkerPress}
              tracksViewChanges={!skipAnimation}
            />
          ),
        )}
        {busLocations?.map((bus) => (
          <BusMarker key={bus.id} bus={bus} color={activeRoute?.color} />
        ))}
        {(route || graphRoute) && (
          <LocationMarker
            key="route-dest"
            marker={{
              id: 'route-dest',
              coordinate: route?.destination ?? (graphRoute
                ? graphRoute.waypoints[graphRoute.waypoints.length - 1]
                : { latitude: 0, longitude: 0 }),
              title: selectedLocation?.name ?? 'Destino',
              description: graphRoute
                ? `${graphRoute.distance}m · ${graphRoute.nodeCount} nodos`
                : `${Math.round(route?.distance ?? 0)}m`,
              category: 'otro',
              clusterWeight: 0,
            }}
            tracksViewChanges={true}
          />
        )}
      </MapView>

      {/* Floating search + chips */}
      <View style={styles.floatingTop} pointerEvents="box-none">
        <View style={styles.searchWrap}>
          <MapSearchBar onSelectLocation={handleSelectLocation} />
        </View>
        <View style={styles.chipWrap}>
          <CategoryFilter
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
        </View>
      </View>

      {/* Route info card */}
      <RouteInfoCard
        route={osrmRoute ? null : route}
        graphRoute={osrmRoute ? null : graphRoute}
        isVisible={!!(route || graphRoute || osrmRoute)}
        onClear={handleClearRoute}
      />

      {/* OSRM route info — compact inline */}
      {osrmRoute && (
        <Animated.View
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(200)}
          style={styles.osrmCard}
        >
          <View style={styles.osrmContent}>
            <View style={styles.osrmIconWrap}>
              <Navigation size={18} strokeWidth={1.8} color="#2563EB" />
            </View>
            <View style={styles.osrmInfo}>
              <Text style={styles.osrmLabel}>Ruta externa (OSRM)</Text>
              <Text style={styles.osrmValue}>
                {osrmRoute.distance < 1000
                  ? `${osrmRoute.distance} m`
                  : `${(osrmRoute.distance / 1000).toFixed(1)} km`}{' '}
                <Text style={styles.osrmDistance}>
                  (~{Math.round(osrmRoute.duration / 60)} min)
                </Text>
              </Text>
            </View>
          </View>
          <Pressable style={styles.clearBtn} onPress={handleClearRoute} hitSlop={8}>
            <X size={14} strokeWidth={2.2} color={T.textSecondary} />
          </Pressable>
        </Animated.View>
      )}

      {/* Route tracking — remaining distance */}
      {(graphRoute || route) && remainingDistance !== null && remainingDistance > 0 && (
        <Animated.View
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(200)}
          style={styles.trackingBanner}
        >
          <View style={styles.trackingContent}>
            <Navigation size={16} strokeWidth={2} color={T.primary} />
            <Text style={styles.trackingValue}>
              {remainingDistance >= 1000
                ? `${(remainingDistance / 1000).toFixed(2)} km restantes`
                : `${remainingDistance} m restantes`}
            </Text>
          </View>
          <Text style={styles.trackingLabel}>Ruta interna del campus</Text>
        </Animated.View>
      )}

      {/* Map controls — right edge */}
      <View style={styles.rightControls}>
        <MapControls
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onMyLocation={handleMyLocation}
          isLocating={isLocating}
        />
      </View>

      {/* Current location FAB */}
      <Animated.View style={[styles.fabWrap, { bottom: insets.bottom + 96 }, fabAnimStyle]}>
        <Pressable
          onPressIn={() => {
            fabScale.value = withSpring(0.88, { damping: 16, stiffness: 360 });
          }}
          onPressOut={() => {
            fabScale.value = withSpring(1, { damping: 20, stiffness: 300 });
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            handleMyLocation();
          }}
          style={styles.locationFab}
        >
          <MapPin size={22} strokeWidth={2.2} color={T.primary} />
        </Pressable>
      </Animated.View>

      {/* Location detail */}
      <LocationDetailSheet
        location={selectedLocation}
        onClose={() => { setSelectedLocation(null); setRoute(null); setGraphRoute(null); setOsrmRoute(null); }}
        onNavigate={(loc) => computeRoute({ latitude: loc.latitude, longitude: loc.longitude })}
        onMoreInfo={(loc) => setInfoLocation(loc)}
        onClearRoute={() => { setRoute(null); setGraphRoute(null); setOsrmRoute(null); }}
      />

      {infoLocation && (
        <LocationInfoModal
          location={infoLocation}
          onClose={() => setInfoLocation(null)}
        />
      )}

      {selectedZone && (
        <RestrictedZoneInfoModal
          zone={selectedZone}
          onClose={() => setSelectedZone(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },

  permissionFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: T.background,
    padding: 24,
  },

  floatingTop: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 100,
    paddingTop: Platform.OS === 'ios' ? 54 : 44,
    paddingHorizontal: 14,
    gap: 10,
  },
  searchWrap: {},
  chipWrap: { paddingLeft: 4 },

  rightControls: {
    position: 'absolute',
    right: 16,
    top: Platform.OS === 'ios' ? 210 : 200,
    zIndex: 99,
  },

  fabWrap: {
    position: 'absolute',
    bottom: 0,
    right: 20,
    zIndex: 50,
  },
  locationFab: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: T.surface,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: T.cardBorder,
    ...Shadows.xl,
  },
  osrmCard: {
    position: 'absolute',
    top: 130,
    left: 16,
    right: 16,
    backgroundColor: T.surfaceGlass,
    borderRadius: Sizes.radiusLg,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2563EB30',
    ...Shadows.lg,
    zIndex: 200,
  },
  osrmContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  osrmIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#2563EB18',
    justifyContent: 'center',
    alignItems: 'center',
  },
  osrmInfo: { flex: 1, gap: 2 },
  osrmLabel: {
    ...Typography.overline,
    color: '#2563EB',
    fontWeight: '700',
  },
  osrmValue: {
    ...Typography.h4,
    color: T.textPrimary,
    fontSize: 16,
  },
  osrmDistance: {
    ...Typography.bodySm,
    color: T.textSecondary,
    fontWeight: '400',
  },
  clearBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: T.surfaceBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  trackingBanner: {
    position: 'absolute',
    top: 130,
    left: 16,
    right: 16,
    backgroundColor: T.surfaceGlass,
    borderRadius: Sizes.radiusLg,
    padding: 14,
    borderWidth: 1,
    borderColor: T.primary + '30',
    ...Shadows.lg,
    zIndex: 200,
  },
  trackingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  trackingValue: {
    ...Typography.h4,
    color: T.textPrimary,
    fontSize: 16,
  },
  trackingLabel: {
    ...Typography.caption,
    color: T.textSecondary,
    marginLeft: 24,
  },
});
