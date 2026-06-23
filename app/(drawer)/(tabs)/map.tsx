import React, { useCallback, useRef, useState, useMemo, useEffect } from 'react';
import {
  View, StyleSheet, Pressable, Platform, Text, ActivityIndicator,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, PROVIDER_DEFAULT, Polyline, Circle } from 'react-native-maps';
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
import { PannellumViewer } from '@/features/map/presentation/pannellum-viewer';
import { RestrictedZonesLayer } from '@/features/map/presentation/restricted-zones-layer';
import { RestrictedZoneInfoModal } from '@/features/map/presentation/restricted-zone-info-modal';
import { MapFloatingActions } from '@/features/map/presentation/map-floating-actions';
import { RouteInfoCard } from '@/features/map/presentation/route-info-card';
import { BusMarker } from '@/features/polibus/presentation/bus-marker';
import { useBusRoutes, useBusLocations } from '@/features/polibus/application/bus.hooks';
import { useAdminZones } from '@/features/admin/application/poi.hooks';
import { useBatteryOptimizer } from '@/features/map/services/battery-optimizer';
import { useCampusGraph, useOptimalRoute, haversineMeters } from '@/features/graph/application/graph.hooks';
import { findNearestNode, graphRouteToWaypoints } from '@/features/graph/application/graph-route.service';
import type { GraphRouteResult } from '@/features/graph/application/graph-route.service';
import { LightTheme as T, Shadows, Sizes, Typography } from '@/constants/design-system';
import { MapPin, Navigation, Crosshair, Flag, X, ArrowDownUp } from 'lucide-react-native';
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
  const [viewing360Location, setViewing360Location] = useState<CampusLocation | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [graphRoute, setGraphRoute] = useState<GraphRouteResult | null>(null);
  const [fromNodeId, setFromNodeId] = useState<string | null>(null);
  const [toNodeId, setToNodeId] = useState<string | null>(null);
  const [remainingDistance, setRemainingDistance] = useState<number | null>(null);
  const fullRouteRef = useRef<GeoCoordinate[]>([]);
  const [planner, setPlanner] = useState<{ mode: 'idle' | 'selecting-origin' | 'selecting-destination' | 'planned'; origin: GeoCoordinate | null; originName: string; destination: GeoCoordinate | null; destinationName: string }>({ mode: 'idle', origin: null, originName: '', destination: null, destinationName: '' });

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

  function directRoute(originPt: GeoCoordinate, destPt: GeoCoordinate): GraphRouteResult {
    const d = Math.round(haversineMeters(originPt.latitude, originPt.longitude, destPt.latitude, destPt.longitude));
    return { waypoints: [originPt, destPt], distance: d, etaMinutes: Math.round(d / 83.33), nodeCount: 2 };
  }

  const computeRoute = useCallback(
    (origin?: GeoCoordinate, dest?: GeoCoordinate) => {
      if (!dest) return;
      if (!origin && !userLocation) return;
      setGraphRoute(null);
      setFromNodeId(null);
      setToNodeId(null);

      const originPt: GeoCoordinate = origin ?? {
        latitude: userLocation!.coords.latitude,
        longitude: userLocation!.coords.longitude,
      };

      if (!campusGraph || campusGraph.nodes.length === 0) {
        console.log('[MapScreen] Sin grafo, usando línea directa');
        setGraphRoute(directRoute(originPt, dest));
        return;
      }

      console.log('[MapScreen] computeRoute:', JSON.stringify(originPt), '→', JSON.stringify(dest), 'grafo nodos:', campusGraph.nodes.length);

      const SEARCH_RADII = [200, 500, 1000, 2000, 5000];
      let fromNode: string | null = null;
      let toNode: string | null = null;

      for (const radius of SEARCH_RADII) {
        fromNode = findNearestNode(campusGraph, originPt, radius);
        toNode = findNearestNode(campusGraph, dest, radius);
        console.log(`[MapScreen]  radio ${radius}m → fromNode: ${fromNode}, toNode: ${toNode}`);
        if (fromNode && toNode) break;
      }

      if (fromNode && toNode) {
        console.log('[MapScreen] Ruta por nodos:', fromNode, '→', toNode);
        setFromNodeId(fromNode);
        setToNodeId(toNode);
      } else {
        console.log('[MapScreen] Nodos no encontrados, usando línea directa');
        setGraphRoute(directRoute(originPt, dest));
      }
    },
    [userLocation, campusGraph],
  );

  React.useEffect(() => {
    if (optimalGraphRoute && campusGraph) {
      const result = graphRouteToWaypoints(campusGraph, optimalGraphRoute);
      console.log('[MapScreen] graphRoute nodos:', result.distance, 'm,', result.nodeCount, 'nodos');
      setGraphRoute(result);
    } else if (fromNodeId && toNodeId && !optimalGraphRoute) {
      const fromNode = campusGraph?.nodes.find((n) => n.id === fromNodeId);
      const toNode = campusGraph?.nodes.find((n) => n.id === toNodeId);
      if (fromNode && toNode) {
        console.log('[MapScreen] A* sin ruta, usando línea directa entre nodos');
        setGraphRoute(directRoute(
          { latitude: fromNode.latitude, longitude: fromNode.longitude },
          { latitude: toNode.latitude, longitude: toNode.longitude },
        ));
      } else {
        console.log('[MapScreen] A* sin ruta y nodos no encontrados');
        setGraphRoute(null);
      }
    }
  }, [optimalGraphRoute, campusGraph, fromNodeId, toNodeId]);

  // Route tracking — trim waypoints as user walks
  useEffect(() => {
    const coords = graphRoute?.waypoints;
    if (!coords || coords.length < 2 || !userLocation) {
      setRemainingDistance(null);
      fullRouteRef.current = [];
      return;
    }

    fullRouteRef.current = coords;
    const userLat = userLocation.coords.latitude;
    const userLng = userLocation.coords.longitude;

    const THRESHOLD_M = 12;
    let trimIdx = 0;
    let cumDist = 0;

    for (let i = 0; i < coords.length - 1; i++) {
      const d = haversineLocal(userLat, userLng, coords[i].latitude, coords[i].longitude);
      if (d < THRESHOLD_M) trimIdx = i + 1;
    }

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

    const last = coords[coords.length - 1];
    if (haversineLocal(userLat, userLng, last.latitude, last.longitude) < THRESHOLD_M) {
      setRemainingDistance(null);
    }
  }, [userLocation, graphRoute]);

  const { data: busRoutes } = useBusRoutes();
  const activeRoute = busRoutes?.find((r) => r.isActive);
  const { data: busLocations } = useBusLocations(activeRoute?.id ?? '');

  const { zones } = useAdminZones();

  const handleRegionChange = useCallback((r: MapRegion) => setRegion(r), []);
  const handleMarkerPress = useCallback((marker: MapMarkerData) => {
    const coord = marker.coordinate;
    if (planner.mode === 'selecting-origin') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setPlanner((prev) => ({ ...prev, mode: 'selecting-destination', origin: coord, originName: marker.title }));
      return;
    }
    if (planner.mode === 'selecting-destination') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setPlanner((prev) => ({ ...prev, mode: 'planned', destination: coord, destinationName: marker.title }));
      const origin = planner.origin!;
      setSelectedLocation({ id: marker.id, name: marker.title, description: marker.description ?? null, category: marker.category, latitude: coord.latitude, longitude: coord.longitude, imageUrl: marker.imageUrl ?? null, image360: marker.image360, mediaType: marker.mediaType as CampusLocation['mediaType'], createdAt: '' });
      computeRoute(origin, coord);
      return;
    }
    const loc: CampusLocation = {
      id: marker.id, name: marker.title,
      description: marker.description ?? null,
      category: marker.category,
      latitude: coord.latitude,
      longitude: coord.longitude,
      imageUrl: marker.imageUrl ?? null,
      image360: marker.image360,
      mediaType: marker.mediaType as CampusLocation['mediaType'],
      createdAt: '',
    };
    const imageToShow = loc.image360 || loc.imageUrl;
    if (imageToShow) {
      setViewing360Location(loc);
    }
    setSelectedLocation(loc);
    computeRoute(undefined, coord);
  }, [computeRoute, planner.mode, planner.origin]);

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
    computeRoute(undefined, { latitude: location.latitude, longitude: location.longitude });
  }, [computeRoute]);
  const handleClearRoute = useCallback(() => {
    setGraphRoute(null); setFromNodeId(null); setToNodeId(null);
    setSelectedLocation(null);
    setPlanner({ mode: 'idle', origin: null, originName: '', destination: null, destinationName: '' });
  }, []);

  const handleMapPress = useCallback((event: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => {
    const coord = event.nativeEvent.coordinate;
    if (planner.mode === 'selecting-origin') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setPlanner((prev) => ({ ...prev, mode: 'selecting-destination', origin: coord, originName: `${coord.latitude.toFixed(5)}, ${coord.longitude.toFixed(5)}` }));
      return;
    }
    if (planner.mode === 'selecting-destination') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const destName = `${coord.latitude.toFixed(5)}, ${coord.longitude.toFixed(5)}`;
      setPlanner((prev) => ({ ...prev, mode: 'planned', destination: coord, destinationName: destName }));
      const origin = planner.origin!;
      setSelectedLocation({ id: `plan-dest-${Date.now()}`, name: 'Destino', description: destName, category: 'otro', latitude: coord.latitude, longitude: coord.longitude, imageUrl: null, createdAt: '' });
      computeRoute({ latitude: origin.latitude, longitude: origin.longitude }, { latitude: coord.latitude, longitude: coord.longitude });
      return;
    }
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
    computeRoute(undefined, { latitude: coord.latitude, longitude: coord.longitude });
  }, [computeRoute, planner.mode, planner.origin]);

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

        {graphRoute && graphRoute.waypoints.length > 1 && (
          <Polyline
            coordinates={graphRoute.waypoints}
            strokeColor={T.success}
            strokeWidth={6}
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
        {graphRoute && (
          <LocationMarker
            key="route-dest"
            marker={{
              id: 'route-dest',
              coordinate: graphRoute.waypoints[graphRoute.waypoints.length - 1],
              title: selectedLocation?.name ?? 'Destino',
              description: `${graphRoute.distance}m · ${graphRoute.nodeCount} nodos`,
              category: 'otro',
              clusterWeight: 0,
            }}
            tracksViewChanges={true}
          />
        )}
        {planner.origin && (
          <Marker
            coordinate={planner.origin}
            anchor={{ x: 0.5, y: 1 }}
            zIndex={110}
          >
            <View style={styles.originMarker}>
              <Flag size={18} strokeWidth={2.5} color="#FFFFFF" />
            </View>
          </Marker>
        )}
        {planner.destination && (
          <Marker
            coordinate={planner.destination}
            anchor={{ x: 0.5, y: 1 }}
            zIndex={110}
          >
            <View style={styles.destMarker}>
              <MapPin size={18} strokeWidth={2.5} color="#FFFFFF" />
            </View>
          </Marker>
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
        graphRoute={graphRoute}
        isVisible={!!graphRoute}
        onClear={handleClearRoute}
      />

      {/* Route tracking — remaining distance */}
      {graphRoute && remainingDistance !== null && remainingDistance > 0 && (
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

      {/* Route planner panel */}
      {planner.mode !== 'idle' && (
        <Animated.View
          entering={FadeIn.duration(250)}
          exiting={FadeOut.duration(200)}
          style={styles.plannerPanel}
        >
          <View style={styles.plannerHeader}>
            <Text style={styles.plannerTitle}>Planificar ruta</Text>
            <Pressable style={styles.plannerClose} onPress={() => setPlanner({ mode: 'idle', origin: null, originName: '', destination: null, destinationName: '' })} hitSlop={10}>
              <X size={18} strokeWidth={2.2} color={T.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.plannerRow}>
            <View style={[styles.plannerDot, { backgroundColor: T.success }]} />
            <View style={styles.plannerField}>
              <Text style={styles.plannerLabel}>Origen</Text>
              <Text style={styles.plannerValue} numberOfLines={1}>
                {planner.origin ? planner.originName : (planner.mode === 'selecting-origin' ? 'Toca en el mapa...' : '—')}
              </Text>
            </View>
          </View>

          <View style={styles.plannerConnector}>
            <View style={styles.plannerLine} />
          </View>

          <View style={styles.plannerRow}>
            <View style={[styles.plannerDot, { backgroundColor: T.error }]} />
            <View style={styles.plannerField}>
              <Text style={styles.plannerLabel}>Destino</Text>
              <Text style={styles.plannerValue} numberOfLines={1}>
                {planner.destination ? planner.destinationName : (planner.mode === 'selecting-destination' ? 'Toca en el mapa...' : '—')}
              </Text>
            </View>
          </View>

          {planner.mode === 'selecting-origin' && (
            <Text style={styles.plannerHint}>Toca un punto en el mapa o un marcador para elegir el ORIGEN</Text>
          )}
          {planner.mode === 'selecting-destination' && (
            <Text style={styles.plannerHint}>Toca un punto en el mapa o un marcador para elegir el DESTINO</Text>
          )}

          {planner.mode === 'planned' && (
            <View style={styles.plannerActions}>
              <Pressable style={styles.plannerSwapBtn} onPress={() => {
                const orig = planner.origin!; const origN = planner.originName;
                const dest = planner.destination!; const destN = planner.destinationName;
                setPlanner({ mode: 'planned', origin: dest, originName: destN, destination: orig, destinationName: origN });
                computeRoute(dest, orig);
              }}>
                <ArrowDownUp size={16} strokeWidth={2} color={T.textSecondary} />
                <Text style={styles.plannerSwapT}>Intercambiar</Text>
              </Pressable>
              <Pressable style={styles.plannerCalcBtn} onPress={() => {
                setPlanner({ mode: 'idle', origin: null, originName: '', destination: null, destinationName: '' });
              }}>
                <Navigation size={16} strokeWidth={2} color="#FFFFFF" />
                <Text style={styles.plannerCalcT}>Iniciar ruta</Text>
              </Pressable>
            </View>
          )}

          {planner.mode === 'selecting-origin' && (
            <Pressable style={styles.plannerUseGpsBtn} onPress={() => {
              if (!userLocation) return;
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              const coord = { latitude: userLocation.coords.latitude, longitude: userLocation.coords.longitude };
              setPlanner((prev) => ({ ...prev, mode: 'selecting-destination', origin: coord, originName: 'Mi ubicación' }));
            }}>
              <Crosshair size={16} strokeWidth={2} color={T.primary} />
              <Text style={styles.plannerUseGpsT}>Usar mi ubicación como origen</Text>
            </Pressable>
          )}
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

      {/* 360° viewer — fullscreen overlay on marker tap */}
      {viewing360Location && (
        <PannellumViewer
          imageUrl={viewing360Location.image360 || viewing360Location.imageUrl || ''}
          onClose={() => setViewing360Location(null)}
          title={viewing360Location.name}
        />
      )}

      {/* Location detail */}
      <LocationDetailSheet
        location={selectedLocation}
        onClose={() => { setSelectedLocation(null); setGraphRoute(null); setFromNodeId(null); setToNodeId(null); }}
        onNavigate={(loc) => computeRoute(undefined, { latitude: loc.latitude, longitude: loc.longitude })}
        onMoreInfo={(loc) => setInfoLocation(loc)}
        onClearRoute={() => { setGraphRoute(null); setFromNodeId(null); setToNodeId(null); }}
        onStartPlanner={() => {
          setPlanner({ mode: 'selecting-origin', origin: null, originName: '', destination: null, destinationName: '' });
          setSelectedLocation(null);
        }}
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

      <MapFloatingActions mapRef={mapRef} userLocation={userLocation} bottom={100} />
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

  // ─── Planner panel ─────────────────────────────────────────
  plannerPanel: {
    position: 'absolute',
    bottom: 140,
    left: 16,
    right: 16,
    backgroundColor: T.surface,
    borderRadius: Sizes.radiusLg,
    padding: 16,
    borderWidth: 1,
    borderColor: T.cardBorder,
    ...Shadows.xl,
    zIndex: 300,
    gap: 8,
  },
  plannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  plannerTitle: {
    ...Typography.h4,
    color: T.textPrimary,
    fontSize: 16,
  },
  plannerClose: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: T.surfaceBorder,
    justifyContent: 'center', alignItems: 'center',
  },
  plannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  plannerDot: {
    width: 14, height: 14, borderRadius: 7,
    borderWidth: 2, borderColor: '#FFFFFF',
  },
  plannerField: {
    flex: 1,
  },
  plannerLabel: {
    ...Typography.caption,
    color: T.textTertiary,
    fontWeight: '600',
    fontSize: 11,
  },
  plannerValue: {
    ...Typography.body,
    color: T.textPrimary,
    fontWeight: '500',
  },
  plannerConnector: {
    paddingLeft: 6,
    height: 12,
  },
  plannerLine: {
    width: 2,
    height: '100%',
    backgroundColor: T.textTertiary,
    marginLeft: 6,
  },
  plannerHint: {
    ...Typography.caption,
    color: T.primary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 4,
  },
  plannerActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  plannerSwapBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 12,
    borderRadius: 12,
    backgroundColor: T.surfaceBorder,
  },
  plannerSwapT: {
    ...Typography.button,
    color: T.textSecondary,
    fontSize: 13,
  },
  plannerCalcBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 12,
    borderRadius: 12,
    backgroundColor: T.primary,
  },
  plannerCalcT: {
    ...Typography.button,
    color: '#FFFFFF',
    fontSize: 13,
  },
  plannerUseGpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 10,
    borderRadius: 12,
    backgroundColor: T.primaryMuted,
    marginTop: 4,
  },
  plannerUseGpsT: {
    ...Typography.button,
    color: T.primary,
    fontSize: 13,
  },
  originMarker: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: T.success,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2.5, borderColor: '#FFFFFF',
    ...Shadows.md,
  },
  destMarker: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: T.error,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2.5, borderColor: '#FFFFFF',
    ...Shadows.md,
  },
});
