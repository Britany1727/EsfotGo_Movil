import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marker, Callout } from 'react-native-maps';
import { Bus as BusIcon } from 'lucide-react-native';
import { getCategoryConfig } from '@/features/map/application/map.hooks';
import type { MapMarkerData } from '@/features/map/domain/coordinates';
import { LightTheme as T, Shadows, Sizes, Typography } from '@/constants/design-system';

interface LocationMarkerProps {
  marker: MapMarkerData;
  onPress?: (marker: MapMarkerData) => void;
  tracksViewChanges?: boolean;
}

export const LocationMarker = memo(function LocationMarker({
  marker, onPress, tracksViewChanges = false,
}: LocationMarkerProps) {
  const config = getCategoryConfig(marker.category);
  return (
    <Marker
      coordinate={marker.coordinate}
      title={marker.title}
      description={marker.description}
      tracksViewChanges={true}
      onPress={() => onPress?.(marker)}
      anchor={{ x: 0.5, y: 1 }}
      zIndex={100}
    >
      <View style={[s.marker, { backgroundColor: config.color }]}>
        <Text style={s.markerLetter}>{config.label.charAt(0)}</Text>
      </View>
      <Callout tooltip>
        <View style={s.callout}>
          <Text style={s.calloutTitle}>{marker.title}</Text>
          {marker.description && (
            <Text style={s.calloutDesc} numberOfLines={3}>{marker.description}</Text>
          )}
          <View style={[s.calloutBadge, { backgroundColor: config.color + '15' }]}>
            <Text style={[s.calloutBadgeText, { color: config.color }]}>{config.label}</Text>
          </View>
        </View>
      </Callout>
    </Marker>
  );
});

interface ClusterMarkerProps {
  id: string;
  coordinate: { latitude: number; longitude: number };
  count: number;
  topCategory: string;
  onPress?: () => void;
}

export const ClusterMarker = memo(function ClusterMarker({
  id, coordinate, count, topCategory, onPress,
}: ClusterMarkerProps) {
  const config = getCategoryConfig(topCategory);
  const size = Math.min(56, 36 + count * 2);
  return (
    <Marker coordinate={coordinate} identifier={id} onPress={onPress} tracksViewChanges={true} anchor={{ x: 0.5, y: 0.5 }} zIndex={90}>
      <View style={[s.cluster, {
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: config.color,
      }]}>
        <Text style={s.clusterCount}>{count > 99 ? '99+' : count}</Text>
      </View>
    </Marker>
  );
});

interface BusMarkerProps {
  coordinate: { latitude: number; longitude: number };
  busId: string;
  heading: number;
  routeColor: string;
}

export const BusMarker = memo(function BusMarker({
  coordinate, busId, heading, routeColor,
}: BusMarkerProps) {
  return (
    <Marker
      coordinate={coordinate}
      title={`Bus ${busId}`}
      rotation={heading}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={true}
      flat
      zIndex={100}
    >
      <View style={[s.bus, { backgroundColor: routeColor }]}>
        <BusIcon size={16} strokeWidth={2.2} color="#FFFFFF" />
      </View>
    </Marker>
  );
});

interface StopMarkerProps {
  coordinate: { latitude: number; longitude: number };
  name: string;
  index: number;
  total: number;
  stopNumber: number;
}

export const StopMarker = memo(function StopMarker({
  coordinate, name, index, total, stopNumber,
}: StopMarkerProps) {
  const isFirst = index === 0;
  const isLast = index === total - 1;
  const prefix = isFirst ? 'Inicio: ' : isLast ? 'Fin: ' : '';
  return (
    <Marker
      coordinate={coordinate}
      title={`${prefix}${name}`}
      description={`Parada ${stopNumber} de ${total}`}
      tracksViewChanges={true}
      anchor={{ x: 0.5, y: 0.5 }}
      zIndex={80}
    >
      <View style={[s.stop, isFirst && s.stopFirst, isLast && s.stopLast]}>
        <Text style={[s.stopNum, (isFirst || isLast) && s.stopNumEnd]}>{stopNumber}</Text>
      </View>
    </Marker>
  );
});

const s = StyleSheet.create({
  marker: {
    width: 36, height: 36, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2.5, borderColor: '#FFFFFF',
    ...Shadows.md,
  },
  markerLetter: {
    fontSize: 13, fontWeight: '800', color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  callout: {
    backgroundColor: T.surface,
    borderRadius: 18,
    padding: 16,
    width: 240,
    gap: 8,
    borderWidth: 1,
    borderColor: T.cardBorder,
    ...Shadows.xl,
  },
  calloutTitle: { ...Typography.h4, color: T.textPrimary },
  calloutDesc: { ...Typography.bodySm, color: T.textSecondary, lineHeight: 18 },
  calloutBadge: {
    marginTop: 4, paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8, alignSelf: 'flex-start',
  },
  calloutBadgeText: { fontSize: 11, fontWeight: '700' },
  cluster: {
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: '#FFFFFF',
    ...Shadows.lg,
  },
  clusterCount: {
    color: '#FFFFFF', fontSize: 14, fontWeight: '800',
  },
  bus: {
    width: 36, height: 36, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#FFFFFF',
    ...Shadows.md,
  },
  stop: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: T.textSecondary,
    borderWidth: 2.5, borderColor: '#FFFFFF',
    justifyContent: 'center', alignItems: 'center',
    ...Shadows.sm,
  },
  stopNum: { fontSize: 10, fontWeight: '800', color: '#FFFFFF' },
  stopNumEnd: { fontSize: 11 },
  stopFirst: {
    backgroundColor: T.success,
    width: 30, height: 30, borderRadius: 15,
  },
  stopLast: {
    backgroundColor: T.error,
    width: 30, height: 30, borderRadius: 15,
  },
});
