import React, { useRef, useMemo, useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetView, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import { Navigation, Info, Star, XCircle } from 'lucide-react-native';
import { getCategoryConfig } from '@/features/map/application/map.hooks';
import type { CampusLocation } from '@/features/map/domain/location.entity';
import { useFavoritesStore } from '@/store/favorites.store';
import { useAuthStore } from '@/store/auth.store';
import { LightTheme as T, Shadows, Sizes, Typography } from '@/constants/design-system';

interface Props {
  location: CampusLocation | null;
  onClose: () => void;
  onNavigate?: (l: CampusLocation) => void;
  onMoreInfo?: (l: CampusLocation) => void;
  onClearRoute?: () => void;
}

export function LocationDetailSheet({ location, onClose, onNavigate, onMoreInfo, onClearRoute }: Props) {
  const sheetRef = useRef<BottomSheet>(null);
  const [routeActive, setRouteActive] = useState(false);
  const isFav = useFavoritesStore((s) => location ? s.isFavorite(location.id) : false);
  const toggleFavorite = useFavoritesStore((s) => s.toggleLocation);
  const role = useAuthStore((s) => s.user?.role);
  const canFav = role === 'administrador' || role === 'gestor' || role === 'docente';

  const snapPoints = useMemo(() => ['35%', '65%', '92%'], []);

  useEffect(() => {
    if (location) {
      sheetRef.current?.snapToIndex(0);
    } else {
      sheetRef.current?.close();
    }
  }, [location]);

  useEffect(() => {
    setRouteActive(false);
  }, [location?.id]);

  const handleChange = useCallback((index: number) => {
    if (index < 0) {
      if (routeActive) {
        sheetRef.current?.snapToIndex(0);
        return;
      }
      onClose();
    }
  }, [onClose, routeActive]);

  const handleRouteToggle = useCallback(() => {
    if (routeActive) {
      setRouteActive(false);
      onClearRoute?.();
    } else {
      setRouteActive(true);
      onNavigate?.(location);
    }
  }, [routeActive, onNavigate, onClearRoute, location]);

  if (!location) {
    return (
      <BottomSheet
        ref={sheetRef}
        snapPoints={snapPoints}
        index={-1}
        enablePanDownToClose
        onChange={handleChange}
        handleIndicatorStyle={{ backgroundColor: T.textMuted }}
        backgroundStyle={{ backgroundColor: T.surfaceGlass }}
        style={s.shadow}
      >
        <BottomSheetView style={s.empty} />
      </BottomSheet>
    );
  }

  const config = getCategoryConfig(location.category);

  return (
    <BottomSheet
      ref={sheetRef}
      snapPoints={snapPoints}
      index={0}
      enablePanDownToClose
      onChange={handleChange}
      handleIndicatorStyle={{ backgroundColor: T.textMuted }}
      backgroundStyle={{ backgroundColor: T.surfaceGlass }}
      style={s.shadow}
    >
      <BottomSheetScrollView contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">
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
          {canFav && (
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
          )}
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
            style={[s.navBtn, routeActive && s.navBtnActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              handleRouteToggle();
            }}
          >
            {routeActive ? (
              <XCircle size={18} strokeWidth={2} color="#FFFFFF" />
            ) : (
              <Navigation size={18} strokeWidth={2} color="#FFFFFF" />
            )}
            <Text style={s.navT}>{routeActive ? 'Dejar Ruta' : 'Como llegar'}</Text>
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
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const s = StyleSheet.create({
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 20,
  },
  empty: {
    height: 1,
  },
  scrollContent: {
    padding: Sizes.paddingLg,
    paddingTop: 4,
    gap: 16,
    paddingBottom: 80,
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
  navBtnActive: {
    backgroundColor: T.error,
    shadowColor: T.error,
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
