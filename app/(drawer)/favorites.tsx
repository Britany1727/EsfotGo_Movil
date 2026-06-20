import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator,
} from 'react-native';
import Animated, {
  FadeInDown, useSharedValue, useAnimatedScrollHandler,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { BookOpen, Map, Star, CalendarDays } from 'lucide-react-native';
import { LightTheme as T, Sizes, Shadows, Typography } from '@/constants/design-system';
import { GlassHeader } from '@/components/ui/GlassHeader';
import { BuildingCard, type Building } from '@/components/ui/BuildingCard';
import { RouteCard, type Route } from '@/components/ui/RouteCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { useFavoritesByType, useRemoveFavorite } from '@/features/favoritos/application/favorite.hooks';
import { useFavoritesStore } from '@/store/favorites.store';
import { useAuthStore } from '@/store/auth.store';
import type { Favorite } from '@/features/favoritos/domain/favorite.entity';

type FavTab = 'aulas' | 'edificios' | 'rutas' | 'ubicaciones';

const TABS: { key: FavTab; label: string; Icon: React.ComponentType<any> }[] = [
  { key: 'aulas', label: 'Aulas', Icon: BookOpen },
  { key: 'edificios', label: 'Edificios', Icon: Map },
  { key: 'rutas', label: 'Rutas', Icon: Star },
  { key: 'ubicaciones', label: 'Ubicaciones', Icon: CalendarDays },
];

function favoriteToBuilding(f: Favorite): Building {
  const data = f.itemData as Record<string, unknown> ?? {};
  return {
    id: f.itemId,
    name: f.itemName,
    category: (data.category as Building['category']) ?? 'otro',
    code: data.code as string | undefined,
    description: data.description as string | undefined,
    floor: data.floor as number | undefined,
    capacity: data.capacity as number | undefined,
    icon: data.icon as string | undefined,
  };
}

function favoriteToRoute(f: Favorite): Route {
  const data = f.itemData as Record<string, unknown> ?? {};
  return {
    id: f.itemId,
    name: f.itemName,
    origin: (data.origin as string) ?? '',
    destination: (data.destination as string) ?? '',
    distanceMeters: data.distanceMeters as number | undefined,
    estimatedMinutes: data.estimatedMinutes as number | undefined,
    color: (data.color as string) ?? undefined,
    stops: data.stops as number | undefined,
  };
}

export default function FavoritesScreen() {
  const router = useRouter();
  const role = useAuthStore((s) => s.user?.role);
  const uid = useAuthStore((s) => s.user?.id);
  const canFav = role === 'administrador' || role === 'gestor' || role === 'docente';

  const [activeTab, setActiveTab] = useState<FavTab>('aulas');
  const { aulas, edificios, rutas, ubicaciones, total, isLoading, countByType } = useFavoritesByType();
  const removeFavorite = useRemoveFavorite();
  const allLocations = useFavoritesStore((s) => s.locations);
  const removeLocalLocation = useFavoritesStore((s) => s.removeLocation);
  const allRoutes = useFavoritesStore((s) => s.routes);
  const removeLocalRoute = useFavoritesStore((s) => s.removeRoute);

  const localLocations = allLocations.filter((l) => l.userId === uid);
  const localRoutes = allRoutes.filter((r) => r.userId === uid);

  const localAulas = localLocations.filter((l) => l.category === 'aulas');
  const localEdificios = localLocations.filter((l) => l.category === 'edificios');
  const localUbicaciones = localLocations.filter(
    (l) => l.category !== 'aulas' && l.category !== 'edificios'
  );

  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  const totalFavs = total + localLocations.length + localRoutes.length;

  const handleRemoveFavorite = useCallback((tab: FavTab, id: string) => {
    if (tab === 'rutas') {
      const isLocalRoute = localRoutes.some((r) => r.id === id);
      if (isLocalRoute) {
        removeLocalRoute(id);
        return;
      }
    }
    const localTargets =
      tab === 'aulas' ? localAulas :
      tab === 'edificios' ? localEdificios :
      tab === 'ubicaciones' ? localUbicaciones : [];
    const isLocal = localTargets.some((f) => f.id === id);
    if (isLocal) {
      removeLocalLocation(id);
      return;
    }
    const items =
      tab === 'aulas' ? aulas :
      tab === 'edificios' ? edificios :
      tab === 'rutas' ? rutas : ubicaciones;
    const fav = items.find((f) => f.itemId === id);
    if (!fav) return;
    removeFavorite.mutate(fav.id);
  }, [aulas, edificios, rutas, ubicaciones, removeFavorite, localAulas, localEdificios, localUbicaciones, localRoutes, removeLocalLocation, removeLocalRoute]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={T.primary} />
        </View>
      );
    }

    if (activeTab === 'rutas') {
      const apiRoutes = rutas.map(favoriteToRoute);
      const allRoutes = [
        ...apiRoutes,
        ...localRoutes.map((r): Route => ({
          id: r.id,
          name: r.name,
          origin: r.direction ?? '',
          destination: '',
          distanceMeters: r.distance ?? undefined,
          estimatedMinutes: r.estimatedTime ?? undefined,
          color: r.color,
        })),
      ];
      if (allRoutes.length === 0) {
        return (
          <EmptyState
            icon={<Star size={36} strokeWidth={1.5} color={T.textTertiary} />}
            title="Sin rutas favoritas"
            subtitle="Guarda rutas desde el Mapa para acceder rapidamente"
            actionLabel="Ir al Mapa"
            onAction={() => router.push('/map' as any)}
            delay={100}
          />
        );
      }
      return (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.list}>
          {allRoutes.map((route, i) => (
            <RouteCard
              key={route.id}
              route={route}
              isFavorite
              onPress={() => router.push('/map' as any)}
              onFavoritePress={() => handleRemoveFavorite('rutas', route.id)}
              animationDelay={i * 60}
            />
          ))}
        </Animated.View>
      );
    }

    const normalizeCategory = (cat: string): Building['category'] => {
      if (cat === 'edificios') return 'edificio';
      if (cat === 'aulas') return 'aula';
      if (cat === 'laboratorios') return 'laboratorio';
      if (cat === 'oficinas') return 'oficina';
      return 'otro';
    };

    const localToBuilding = (loc: typeof localLocations[number]): Building => ({
      id: loc.id,
      name: loc.name,
      category: normalizeCategory(loc.category),
      description: loc.description ?? '',
      code: '',
    });

    const items =
      activeTab === 'aulas'
        ? [
            ...aulas.map(favoriteToBuilding),
            ...localAulas.map(localToBuilding),
          ]
        : activeTab === 'edificios'
        ? [
            ...edificios.map(favoriteToBuilding),
            ...localEdificios.map(localToBuilding),
          ]
        : activeTab === 'ubicaciones'
        ? [
            ...ubicaciones.map(favoriteToBuilding),
            ...localUbicaciones.map(localToBuilding),
          ]
        : ubicaciones.map(favoriteToBuilding);

    if (items.length === 0) {
      const config: Record<FavTab, { Icon: React.ComponentType<any>; title: string; subtitle: string; action: string }> = {
        aulas: { Icon: BookOpen, title: 'Sin aulas favoritas', subtitle: 'Agrega aulas desde el Mapa', action: 'Ir al Mapa' },
        edificios: { Icon: Map, title: 'Sin edificios favoritos', subtitle: 'Explora el campus en el Mapa', action: 'Explorar' },
        rutas: { Icon: Star, title: 'Sin rutas', subtitle: '', action: '' },
        ubicaciones: { Icon: CalendarDays, title: 'Sin ubicaciones', subtitle: 'Guarda lugares frecuentes desde el Mapa', action: 'Ir al Mapa' },
      };
      const c = config[activeTab];
      return (
        <EmptyState
          icon={<c.Icon size={36} strokeWidth={1.5} color={T.textTertiary} />}
          title={c.title}
          subtitle={c.subtitle}
          actionLabel={c.action}
          onAction={() => router.push('/map' as any)}
          delay={100}
        />
      );
    }

    return (
      <Animated.View entering={FadeInDown.duration(400)} style={styles.list}>
        {items.map((item, i) => (
          <BuildingCard
            key={item.id}
            building={item as Building}
            onPress={() => router.push('/map' as any)}
            onMapPress={() => router.push('/map' as any)}
            onFavoritePress={() => handleRemoveFavorite(activeTab, item.id)}
            animationDelay={i * 60}
          />
        ))}
      </Animated.View>
    );
  };

  return (
    <View style={styles.root}>
      <GlassHeader
        scrollY={scrollY}
        onAvatarPress={() => router.push('/profile' as any)}
      />

      {!canFav ? (
        <View style={styles.restrictedWrap}>
          <Star size={36} strokeWidth={1.5} color={T.textTertiary} />
          <Text style={styles.restrictedTitle}>Favoritos no disponibles</Text>
          <Text style={styles.restrictedSub}>
            Solo administradores y docentes pueden usar favoritos
          </Text>
        </View>
      ) : (
        <Animated.ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Favoritos</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{totalFavs}</Text>
            </View>
          </View>
          <Text style={styles.subtitle}>
            Tus aulas, edificios y rutas guardadas
          </Text>
        </Animated.View>

        {/* Tabs */}
        <Animated.View entering={FadeInDown.delay(80)} style={styles.tabsWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabs}
          >
            {TABS.map((tab) => {
              const apiCount = countByType[tab.key];
              const localCount =
                tab.key === 'aulas' ? localAulas.length :
                tab.key === 'edificios' ? localEdificios.length :
                tab.key === 'rutas' ? localRoutes.length :
                tab.key === 'ubicaciones' ? localUbicaciones.length : 0;
              const count = apiCount + localCount;
              const isActive = activeTab === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  style={[styles.tab, isActive && styles.tabActive]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setActiveTab(tab.key);
                  }}
                >
                  <tab.Icon size={14} strokeWidth={2} color={isActive ? '#FFFFFF' : T.textSecondary} />
                  <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                    {tab.label}
                  </Text>
                  {count > 0 && (
                    <View style={[styles.tabBadge, isActive && styles.tabBadgeActive]}>
                      <Text style={[styles.tabBadgeText, isActive && styles.tabBadgeTextActive]}>
                        {count}
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </Animated.View>

        {/* Content */}
        {renderContent()}

        <View style={{ height: 100 }} />
      </Animated.ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.background },
  scroll: { flex: 1 },
  content: { paddingTop: 8 },

  header: {
    paddingHorizontal: Sizes.paddingMd,
    paddingTop: 72,
    paddingBottom: Sizes.gapSm,
    gap: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: { ...Typography.h2, color: T.textPrimary },
  countBadge: {
    backgroundColor: T.primaryMuted,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  countText: { fontSize: 14, fontWeight: '700', color: T.primary },
  subtitle: { ...Typography.body, color: T.textSecondary },

  tabsWrap: { marginBottom: Sizes.gapMd },
  tabs: {
    paddingHorizontal: Sizes.paddingMd,
    gap: 8,
    paddingVertical: 4,
  },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: Sizes.radiusFull,
    backgroundColor: T.surfaceGlass,
    borderWidth: 1, borderColor: T.cardBorder,
    ...Shadows.sm,
  },
  tabActive: {
    backgroundColor: T.primary, borderColor: T.primary,
    ...Shadows.md, shadowColor: T.primary, shadowOpacity: 0.3,
  },
  tabLabel: { ...Typography.caption, fontWeight: '600', color: T.textSecondary },
  tabLabelActive: { color: '#FFFFFF' },
  tabBadge: {
    backgroundColor: T.primaryMuted,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: 'center',
  },
  tabBadgeActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: T.primary,
  },
  tabBadgeTextActive: { color: '#FFFFFF' },

  list: {
    paddingHorizontal: Sizes.paddingMd,
    paddingTop: 4,
  },

  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  restrictedWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Sizes.paddingXl,
    gap: 12,
  },
  restrictedTitle: {
    ...Typography.h4,
    color: T.textSecondary,
    textAlign: 'center',
  },
  restrictedSub: {
    ...Typography.body,
    color: T.textTertiary,
    textAlign: 'center',
    maxWidth: 260,
  },
});
