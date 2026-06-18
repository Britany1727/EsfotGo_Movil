import React from 'react';
import {
  View, Text, Pressable, StyleSheet,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Star, Navigation } from 'lucide-react-native';
import { LightTheme as T, Sizes, Shadows, Typography } from '@/constants/design-system';

export interface Route {
  id: string;
  name: string;
  origin: string;
  destination: string;
  distanceMeters?: number;
  estimatedMinutes?: number;
  isActive?: boolean;
  color?: string;
  stops?: number;
  icon?: string;
}

interface RouteCardProps {
  route: Route;
  onPress?: () => void;
  onFavoritePress?: () => void;
  isFavorite?: boolean;
  animationDelay?: number;
}

export function RouteCard({
  route,
  onPress,
  onFavoritePress,
  isFavorite = false,
  animationDelay = 0,
}: RouteCardProps) {
  const distanceLabel = route.distanceMeters
    ? route.distanceMeters >= 1000
      ? `${(route.distanceMeters / 1000).toFixed(1)} km`
      : `${Math.round(route.distanceMeters)} m`
    : null;

  const timeLabel = route.estimatedMinutes
    ? `${route.estimatedMinutes} min`
    : null;

  const accentColor = route.color ?? T.primary;

  return (
    <Animated.View entering={FadeInDown.delay(animationDelay).duration(400)}>
      <Pressable
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}
        onPress={onPress}
        delayPressIn={100}
        pressRetentionOffset={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <View style={[styles.colorBar, { backgroundColor: accentColor }]} />

        <View style={styles.content}>
          <View style={styles.headerRow}>
            <Navigation size={16} strokeWidth={2} color={accentColor} />
            <Text style={styles.name} numberOfLines={1}>{route.name}</Text>
            {route.isActive !== undefined && (
              <View style={[
                styles.statusBadge,
                { backgroundColor: route.isActive ? T.successBg : T.errorBg },
              ]}>
                <Text style={[
                  styles.statusText,
                  { color: route.isActive ? T.success : T.error },
                ]}>
                  {route.isActive ? 'Activa' : 'Inactiva'}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.pathRow}>
            <View style={styles.dot} />
            <Text style={styles.pathLabel} numberOfLines={1}>{route.origin}</Text>
          </View>
          <View style={styles.pathLine} />
          <View style={styles.pathRow}>
            <View style={[styles.dot, { backgroundColor: T.accent }]} />
            <Text style={styles.pathLabel} numberOfLines={1}>{route.destination}</Text>
          </View>

          <View style={styles.statsRow}>
            {distanceLabel && (
              <View style={styles.stat}>
                <Text style={styles.statValue}>{distanceLabel}</Text>
                <Text style={styles.statLabel}>Distancia</Text>
              </View>
            )}
            {timeLabel && (
              <>
                <View style={styles.statDivider} />
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{timeLabel}</Text>
                  <Text style={styles.statLabel}>Tiempo</Text>
                </View>
              </>
            )}
            {route.stops !== undefined && (
              <>
                <View style={styles.statDivider} />
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{route.stops}</Text>
                  <Text style={styles.statLabel}>Paradas</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {onFavoritePress && (
          <Pressable
            style={styles.favBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onFavoritePress();
            }}
            hitSlop={8}
          >
            <Star
              size={18}
              strokeWidth={2}
              color={isFavorite ? T.highlight : T.textTertiary}
              fill={isFavorite ? T.highlight : 'transparent'}
            />
          </Pressable>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: T.surfaceGlass,
    borderRadius: Sizes.radiusXl,
    marginBottom: Sizes.gapMd,
    overflow: 'hidden',
    borderWidth: 1, borderColor: T.cardBorder,
    ...Shadows.md,
  },
  colorBar: { width: 5 },
  content: { flex: 1, padding: Sizes.paddingMd, gap: 6 },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4,
  },
  name: {
    ...Typography.body, color: T.textPrimary, fontWeight: '700', flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  statusText: { ...Typography.caption, fontWeight: '700' },
  pathRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: T.primary, marginLeft: 2,
    ...Shadows.xs,
  },
  pathLine: {
    width: 1, height: 12, backgroundColor: T.divider, marginLeft: 6,
  },
  pathLabel: {
    ...Typography.bodySm, color: T.textSecondary, flex: 1,
  },
  statsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginTop: 4, paddingTop: 8,
    borderTopWidth: 1, borderTopColor: T.divider,
  },
  stat: { alignItems: 'center' },
  statValue: { ...Typography.h4, color: T.textPrimary, fontSize: 15 },
  statLabel: { ...Typography.caption, color: T.textTertiary },
  statDivider: {
    width: 1, height: 24, backgroundColor: T.divider,
  },
  favBtn: {
    padding: Sizes.paddingMd, justifyContent: 'center', alignItems: 'center',
  },
});
