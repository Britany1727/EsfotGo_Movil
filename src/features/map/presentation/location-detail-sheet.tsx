import React, { useRef, useMemo, useCallback, useEffect, useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetView, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import { Navigation, Info, Star, XCircle, Map } from 'lucide-react-native';
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
  onStartPlanner?: () => void;
}

export function LocationDetailSheet({ location, onClose, onNavigate, onMoreInfo, onClearRoute, onStartPlanner }: Props) {
  const sheetRef = useRef<BottomSheet>(null);
  const [routeActive, setRouteActive] = useState(false);
  const isFav = useFavoritesStore((s) => location ? s.isFavorite(location.id) : false);
  const toggleFavorite = useFavoritesStore((s) => s.toggleLocation);
  const role = useAuthStore((s) => s.user?.role);
  const canFav = role === 'administrador' || role === 'gestor' || role === 'docente' || role === 'estudiante';
  const snapPoints = useMemo(() => ['35%', '65%', '92%'], []);
  const config = useMemo(() => location ? getCategoryConfig(location.category) : null, [location]);

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
      onNavigate?.(location!);
    }
  }, [routeActive, onNavigate, onClearRoute, location]);

  return (
    <BottomSheet
      ref={sheetRef}
      snapPoints={snapPoints}
      index={location ? 0 : -1}
      enablePanDownToClose
      onChange={handleChange}
      handleIndicatorStyle={{ backgroundColor: T.textMuted }}
      backgroundStyle={{ backgroundColor: T.surfaceGlass }}
      style={s.shadow}
    >
      {location && config ? (
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

          {(() => {
            const imageSrc = location.image360 || location.image || location.imageUrl;
            const is360 = location.mediaType === '360' || !!location.image360;
            if (imageSrc) {
              return (
                <Pressable
                  style={s.imgPreview}
                  onPress={() => onMoreInfo?.(location)}
                >
                  <Image source={{ uri: imageSrc }} style={s.imgPreviewImg} />
                  {is360 && (
                    <>
                      <View style={s.panoBadge}>
                        <Text style={s.panoBadgeT}>360°</Text>
                      </View>
                      <View style={s.panoOverlay}>
                        <Text style={s.panoIcon}>🔭</Text>
                        <Text style={s.panoOverlayT}>Ver en 360°</Text>
                      </View>
                    </>
                  )}
                </Pressable>
              );
            }
            return null;
          })()}

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

          {onStartPlanner && (
            <Pressable
              style={s.plannerBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onStartPlanner();
              }}
            >
              <Map size={18} strokeWidth={2} color={T.highlight} />
              <Text style={s.plannerT}>Elegir origen y destino</Text>
            </Pressable>
          )}
        </BottomSheetScrollView>
      ) : (
        <BottomSheetView style={s.empty} />
      )}
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
  plannerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: T.surface, borderRadius: 16,
    padding: 16, borderWidth: 1.5, borderColor: T.highlight + '40',
    ...Shadows.sm,
  },
  plannerT: { ...Typography.button, color: T.highlight, fontSize: 15 },
  favBtn: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
  },
  imgPreview: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: T.surface,
    position: 'relative',
  },
  imgPreviewImg: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
  },
  panoBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,80,180,0.85)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  panoBadgeT: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  panoOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  panoIcon: {
    fontSize: 32,
  },
  panoOverlayT: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
