import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Link } from 'expo-router';
import { MapPin, ChevronRight } from 'lucide-react-native';
import { LightTheme as T, Sizes, Shadows, Typography } from '@/constants/design-system';

interface LocationCardProps {
  location?: { latitude: number; longitude: number } | null;
}

export function LocationCard({ location }: LocationCardProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 24, stiffness: 360 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 20, stiffness: 300 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <Link href="/map" asChild>
      <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut}>
        <Animated.View style={[styles.card, animStyle]}>
          <View style={styles.header}>
            <View style={styles.iconWrap}>
              <MapPin size={20} strokeWidth={2} color={T.primary} />
            </View>
            <View style={styles.info}>
              <Text style={styles.title}>
                {location ? 'Tu ubicacion' : 'Campus EPN'}
              </Text>
              <Text style={styles.subtitle}>
                {location
                  ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
                  : 'Explora el mapa del campus'
                }
              </Text>
            </View>
            <ChevronRight size={20} strokeWidth={2} color={T.textTertiary} />
          </View>

          <View style={styles.mapBar}>
            <Text style={styles.mapBarText}>Ver mapa del campus</Text>
          </View>
        </Animated.View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: T.surface,
    borderRadius: Sizes.radiusLg,
    padding: Sizes.paddingLg,
    borderWidth: 1,
    borderColor: T.cardBorder,
    ...Shadows.md,
    gap: Sizes.gapMd,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: T.infoBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: { flex: 1 },
  title: { ...Typography.h4, color: T.textPrimary },
  subtitle: { ...Typography.bodySm, color: T.textSecondary },
  mapBar: {
    backgroundColor: T.primaryMuted,
    borderRadius: Sizes.radiusSm,
    padding: 14,
    alignItems: 'center',
  },
  mapBarText: {
    ...Typography.caption,
    color: T.primary,
    fontWeight: '700',
  },
});
