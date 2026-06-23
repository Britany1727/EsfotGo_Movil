import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import type { GraphRouteResult } from '@/features/graph/application/graph-route.service';
import { formatGraphRouteInfo } from '@/features/graph/application/graph-route.service';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Navigation, X } from 'lucide-react-native';
import { LightTheme as T, Shadows, Sizes, Typography } from '@/constants/design-system';

interface RouteInfoCardProps {
  graphRoute: GraphRouteResult | null;
  isVisible: boolean;
  onClear: () => void;
}

export const RouteInfoCard = memo(
  function RouteInfoCard({ graphRoute, isVisible, onClear }: RouteInfoCardProps) {
    const info = useMemo(() => {
      if (graphRoute) return formatGraphRouteInfo(graphRoute);
      return null;
    }, [graphRoute]);

    if (!isVisible || !graphRoute || !info) return null;

    return (
      <Animated.View
        entering={FadeIn.duration(300)}
        exiting={FadeOut.duration(200)}
        style={styles.card}
      >
        <View style={styles.content}>
          <View style={styles.iconWrap}>
            <Navigation size={20} strokeWidth={1.8} color={T.primary} />
          </View>
          <View style={styles.info}>
            <Text style={styles.label}>Llegada estimada</Text>
            <Text style={styles.value}>
              {info.etaLabel}{' '}
              <Text style={styles.distance}>({info.distanceLabel})</Text>
            </Text>
            {info.directionLabel && (
              <Text style={styles.direction}>{info.directionLabel}</Text>
            )}
          </View>
        </View>
        <Pressable style={styles.clearBtn} onPress={onClear} hitSlop={8}>
          <X size={14} strokeWidth={2.2} color={T.textSecondary} />
        </Pressable>
      </Animated.View>
    );
  },
  (prev, next) =>
    prev.isVisible === next.isVisible &&
    prev.graphRoute?.distance === next.graphRoute?.distance &&
    prev.graphRoute?.nodeCount === next.graphRoute?.nodeCount,
);

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    backgroundColor: T.surfaceGlass,
    borderRadius: Sizes.radiusLg,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: T.cardBorder,
    ...Shadows.lg,
    zIndex: 200,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: T.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: { flex: 1, gap: 2 },
  label: {
    ...Typography.overline,
    color: T.textSecondary,
    fontWeight: '600',
  },
  value: {
    ...Typography.h4,
    color: T.textPrimary,
  },
  distance: {
    ...Typography.bodySm,
    color: T.textSecondary,
    fontWeight: '400',
  },
  direction: { ...Typography.caption, color: T.textTertiary, marginTop: 1 },
  clearBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: T.surfaceBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});
