import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn, SlideInUp, FadeOut } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Navigation, Info, Star } from 'lucide-react-native';
import { getCategoryConfig } from '@/features/map/application/map.hooks';
import type { CampusLocation } from '@/features/map/domain/location.entity';
import { useFavoritesStore } from '@/store/favorites.store';
import { LightTheme as T, Shadows, Sizes, Typography } from '@/constants/design-system';

interface Props {
  location: CampusLocation | null;
  onClose: () => void;
  onNavigate?: (l: CampusLocation) => void;
  onMoreInfo?: (l: CampusLocation) => void;
}

export function LocationDetailSheet({ location, onClose, onNavigate, onMoreInfo }: Props) {
  const isFav = useFavoritesStore((s) => location ? s.isFavorite(location.id) : false);
  const toggleFavorite = useFavoritesStore((s) => s.toggleLocation);

  if (!location) return null;
  const config = getCategoryConfig(location.category);

  return (
    <Animated.View
      entering={SlideInUp.springify().damping(20).stiffness(200)}
      exiting={FadeOut.duration(200)}
      style={s.overlay}
    >
      <Pressable style={s.backdrop} onPress={onClose} />
      <Animated.View entering={FadeIn.delay(100)} style={s.sheet}>
        <View style={s.handle} />

        <View style={s.header}>
          <View style={[s.iconWrap, { backgroundColor: config.color + '18' }]}>
            <Text style={[s.iconLetter, { color: config.color }]}>
              {config.label.charAt(0)}
            </Text>
          </View>
          <View style={s.headerT}>
            <Text style={s.title}>{location.name}</Text>
            <View style={[s.badge, { backgroundColor: config.color + '18' }]}>
              <Text style={[s.badgeT, { color: config.color }]}>{config.label}</Text>
            </View>
          </View>
          <Pressable
            style={s.favBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              toggleFavorite(location);
            }}
            hitSlop={8}
          >
            <Star
              size={22}
              strokeWidth={isFav ? 0 : 2}
              fill={isFav ? T.highlight : 'transparent'}
              color={isFav ? T.highlight : T.textTertiary}
            />
          </Pressable>
        </View>

        {location.description && (
          <Text style={s.desc}>{location.description}</Text>
        )}

        <View style={s.coords}>
          <Text style={s.coordT}>
            {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
          </Text>
        </View>

        {onNavigate && (
          <Pressable
            style={s.navBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onNavigate(location);
            }}
          >
            <Navigation size={18} strokeWidth={2} color="#FFFFFF" />
            <Text style={s.navT}>Como llegar</Text>
          </Pressable>
        )}

        {onMoreInfo && (
          <Pressable
            style={s.infoBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onMoreInfo(location);
            }}
          >
            <Info size={18} strokeWidth={2} color={T.primary} />
            <Text style={s.infoT}>Mas Informacion</Text>
          </Pressable>
        )}
      </Animated.View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  overlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0, top: 0,
    justifyContent: 'flex-end', zIndex: 999, elevation: 999,
  },
  backdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  sheet: {
    backgroundColor: T.surfaceGlass,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: Sizes.paddingLg, paddingTop: 12, gap: 16,
    borderWidth: 1, borderColor: T.cardBorder,
    borderBottomWidth: 0,
    ...Shadows.xl,
  },
  handle: {
    width: 36, height: 5, borderRadius: 3,
    backgroundColor: T.textMuted, alignSelf: 'center', marginBottom: 10,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconWrap: {
    width: 52, height: 52, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  iconLetter: { fontSize: 24, fontWeight: '800' },
  headerT: { flex: 1, gap: 4 },
  title: { ...Typography.h4, color: T.textPrimary },
  badge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
    alignSelf: 'flex-start',
  },
  badgeT: { fontSize: 11, fontWeight: '700' },
  desc: { ...Typography.body, color: T.textSecondary, lineHeight: 22 },
  coords: {
    backgroundColor: T.inputBg, borderRadius: 12, padding: 12,
  },
  coordT: {
    ...Typography.caption, color: T.textTertiary,
    fontFamily: 'monospace', textAlign: 'center',
  },
  navBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: T.primary, borderRadius: 16,
    padding: 16, ...Shadows.md, shadowColor: T.primary, shadowOpacity: 0.3,
  },
  navT: { ...Typography.button, color: '#FFFFFF', fontSize: 15 },
  infoBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: T.surface, borderRadius: 16,
    padding: 16, borderWidth: 1.5, borderColor: T.primary + '40',
    ...Shadows.sm,
  },
  infoT: { ...Typography.button, color: T.primary, fontSize: 15 },
  favBtn: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
  },
});
