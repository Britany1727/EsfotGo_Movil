import React, { useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import MapView, { PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps';
import type { MapRegion } from '@/features/map/domain/coordinates';
import type { BusRoute, BusStop } from '@/features/polibus/domain/route.entity';
import {
  useBusRoutes,
  useRouteStops,
  useBusLocations,
  useOptimizedRoutePolyline,
} from '@/features/polibus/application/bus.hooks';
import { BusMarker, StopMarker } from '@/features/map/presentation/markers';
import { MemoPolyline } from '@/features/polibus/presentation/memo-polyline';
import { StopList } from '@/features/polibus/presentation/stop-list';
import { RouteSelector } from '@/features/polibus/presentation/route-selector';
import { useBatteryOptimizer } from '@/features/map/services/battery-optimizer';
import { LightTheme as T, Shadows, Sizes, Typography } from '@/constants/design-system';

const MAP_PROVIDER = Platform.OS === 'ios' ? PROVIDER_DEFAULT : PROVIDER_GOOGLE;

const EPN_REGION: MapRegion = {
  latitude: -0.2095,
  longitude: -78.4905,
  latitudeDelta: 0.014,
  longitudeDelta: 0.014,
};

export default function PolibusScreen() {
  const mapRef = useRef<MapView>(null);
  const { data: routes, isLoading: routesLoading, error: routesError } = useBusRoutes();
  const battery = useBatteryOptimizer();

  const [selectedRoute, setSelectedRoute] = useState<BusRoute | null>(null);

  const { data: stops, error: stopsError } = useRouteStops(selectedRoute?.id ?? '');
  const { data: busLocations, error: busLocationsError } = useBusLocations(selectedRoute?.id ?? '');

  if (routesError) console.log('[PolibusScreen] Error cargando rutas:', (routesError as Error)?.message ?? routesError);
  if (stopsError) console.log('[PolibusScreen] Error cargando paradas:', (stopsError as Error)?.message ?? stopsError);
  if (busLocationsError) console.log('[PolibusScreen] Error cargando buses:', (busLocationsError as Error)?.message ?? busLocationsError);
  const polyline = useOptimizedRoutePolyline(stops);

  const handleSelectRoute = useCallback((route: BusRoute) => {
    setSelectedRoute((prev) => (prev?.id === route.id ? null : route));
  }, []);

  const handleStopPress = useCallback(
    (stop: BusStop, _index: number) => {
      mapRef.current?.animateToRegion(
        {
          latitude: stop.latitude,
          longitude: stop.longitude,
          latitudeDelta: 0.004,
          longitudeDelta: 0.004,
        },
        500,
      );
    },
    [],
  );

  const polylineCoords = useMemo(
    () => polyline?.simplifiedPoints ?? [],
    [polyline],
  );

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={MAP_PROVIDER}
        initialRegion={EPN_REGION}
        showsUserLocation
        showsMyLocationButton={false}
        toolbarEnabled={false}
      >
        <MemoPolyline
          coordinates={polylineCoords}
          color={selectedRoute?.color ?? '#1B6BB0'}
        />

        {stops?.map((stop, idx) => (
          <StopMarker
            key={stop.id}
            coordinate={{ latitude: stop.latitude, longitude: stop.longitude }}
            name={stop.name}
            index={idx}
            total={stops.length}
            stopNumber={idx + 1}
          />
        ))}

        {busLocations?.map((bus) => (
          <BusMarker
            key={bus.id}
            coordinate={{ latitude: bus.latitude, longitude: bus.longitude }}
            busId={bus.busId}
            heading={bus.heading}
            routeColor={selectedRoute?.color ?? '#1B6BB0'}
          />
        ))}
      </MapView>

      <View style={styles.panel}>
        {routesLoading && <ActivityIndicator size="small" color={T.primary} />}

        <RouteSelector
          routes={routes ?? []}
          selectedRouteId={selectedRoute?.id ?? null}
          stops={stops}
          onSelectRoute={handleSelectRoute}
        />

        {selectedRoute && stops && stops.length > 0 && (
          <View style={styles.detailSection}>
            <View style={styles.detailStats}>
              <StatItem value={stops.length} label="Paradas" />
              <View style={styles.detailDivider} />
              <StatItem value={busLocations?.length ?? 0} label="Buses" />
              <View style={styles.detailDivider} />
              <StatItem
                value={
                  polyline?.distance
                    ? `${(polyline.distance / 1000).toFixed(1)} km`
                    : '--'
                }
                label="Distancia"
              />
              {battery.isLowPower && (
                <View style={styles.batteryTip}>
                  <Text style={styles.batteryTipText}>Ahorro</Text>
                </View>
              )}
            </View>

            <StopList
              stops={stops}
              onStopPress={handleStopPress}
              routeColor={selectedRoute.color}
            />
          </View>
        )}
      </View>
    </View>
  );
}

function StatItem({ value, label }: { value: string | number; label: string }) {
  return (
    <View style={statStyles.item}>
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  item: { alignItems: 'center' as const },
  value: { ...Typography.h4, color: T.primary, fontSize: 18 },
  label: { ...Typography.caption, color: T.textSecondary },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  panel: {
    backgroundColor: T.surfaceGlass,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Sizes.paddingLg,
    paddingTop: 14,
    gap: 16,
    borderWidth: 1,
    borderColor: T.cardBorder,
    borderBottomWidth: 0,
    ...Shadows.xl,
    maxHeight: '52%',
  },
  detailSection: { gap: 14, marginTop: 0 },
  detailStats: {
    flexDirection: 'row', alignItems: 'center', gap: 20,
    backgroundColor: T.background,
    borderRadius: Sizes.radiusMd,
    padding: 14,
  },
  detailDivider: {
    width: 1, height: 32, backgroundColor: T.divider,
  },
  batteryTip: {
    marginLeft: 'auto',
    backgroundColor: T.warningBg,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  batteryTipText: {
    fontSize: 10, fontWeight: '700', color: T.warning,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
});
