import React, { memo } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { ChevronRight, Heart } from 'lucide-react-native';
import type { BusRoute, BusStop } from '@/features/polibus/domain/route.entity';
import { useFavoritesStore } from '@/store/favorites.store';
import { useAuthStore } from '@/store/auth.store';
import { LightTheme as T, Shadows, Sizes } from '@/constants/design-system';

interface RouteSelectorProps {
  routes: BusRoute[];
  selectedRouteId: string | null;
  stops?: BusStop[];
  onSelectRoute: (route: BusRoute) => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function RouteCard({
  route,
  isSelected,
  stops,
  onPress,
}: {
  route: BusRoute;
  isSelected: boolean;
  stops?: BusStop[];
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const isFav = useFavoritesStore((s) => s.isRouteFavorite(route.id));
  const toggleRouteFav = useFavoritesStore((s) => s.toggleRoute);
  const role = useAuthStore((s) => s.user?.role);
  const canFav = role === 'administrador' || role === 'gestor' || role === 'docente';

  return (
    <AnimatedPressable
      style={[
        s.card,
        animStyle,
        isSelected && {
          borderColor: route.color,
          backgroundColor: (route.color.length > 7 ? route.color.slice(0, 7) : route.color) + '12',
          ...Shadows.md,
          shadowColor: route.color,
          shadowOpacity: 0.2,
        },
      ]}
      onPressIn={() => { scale.value = withSpring(0.96, { damping: 20, stiffness: 400 }); }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 18, stiffness: 300 });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
    >
      <View style={s.cardTop}>
        <View style={[s.dot, { backgroundColor: route.color }]} />
        <Text style={s.cardRouteLabel}>Ruta</Text>
        {canFav && (
          <Pressable
            style={s.favBtn}
            onPress={(e) => {
              e.stopPropagation?.();
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              toggleRouteFav(route);
            }}
            hitSlop={8}
          >
            <Heart
              size={18}
              strokeWidth={isFav ? 0 : 2}
              fill={isFav ? T.accent : 'transparent'}
              color={isFav ? T.accent : T.textTertiary}
            />
          </Pressable>
        )}
      </View>
      <Text style={s.cardName} numberOfLines={2}>{route.name}</Text>
      <View style={s.cardEndpoints}>
        <View style={s.endpointRow}>
          <View style={[s.endpointDot, { backgroundColor: T.success }]} />
          <Text style={s.endpointText} numberOfLines={1}>
            {stops?.[0]?.name ?? 'Inicio'}
          </Text>
        </View>
        <ChevronRight size={14} strokeWidth={2.2} color={T.textTertiary} />
        <View style={s.endpointRow}>
          <View style={[s.endpointDot, { backgroundColor: T.error }]} />
          <Text style={s.endpointText} numberOfLines={1}>
            {stops?.[stops.length - 1]?.name ?? 'Fin'}
          </Text>
        </View>
      </View>
      {stops && isSelected && (
        <View style={s.badge}>
          <Text style={s.badgeText}>{stops.length} paradas</Text>
        </View>
      )}
    </AnimatedPressable>
  );
}

export const RouteSelector = memo(function RouteSelector({
  routes,
  selectedRouteId,
  stops,
  onSelectRoute,
}: RouteSelectorProps) {
  return (
    <View style={s.container}>
      <Text style={s.title}>Rutas del Polibus</Text>
      <ScrollView
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        contentContainerStyle={s.scroll}
      >
        {routes.map((route) => (
          <RouteCard
            key={route.id}
            route={route}
            isSelected={selectedRouteId === route.id}
            stops={selectedRouteId === route.id ? stops : undefined}
            onPress={() => onSelectRoute(route)}
          />
        ))}
      </ScrollView>
    </View>
  );
});

const s = StyleSheet.create({
  container: { gap: 10 },
  title: { fontSize: 15, fontWeight: '700', color: T.textPrimary },
  scroll: { gap: 10, paddingBottom: 4 },
  card: {
    backgroundColor: T.surface,
    borderRadius: Sizes.radiusLg,
    padding: 16,
    gap: 10,
    borderWidth: 2,
    borderColor: T.cardBorder,
    ...Shadows.sm,
  },
  cardTop: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  dot: {
    width: 10, height: 10, borderRadius: 5,
    ...Shadows.xs,
  },
  cardRouteLabel: {
    fontSize: 10, fontWeight: '700', color: T.textTertiary,
    textTransform: 'uppercase', letterSpacing: 1,
  },
  cardName: { fontSize: 14, fontWeight: '700', color: T.textPrimary },
  cardEndpoints: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  endpointRow: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5,
  },
  endpointDot: {
    width: 8, height: 8, borderRadius: 4,
    ...Shadows.xs,
  },
  endpointText: {
    fontSize: 10, fontWeight: '600', color: T.textSecondary, flex: 1,
  },
  badge: {
    backgroundColor: T.primaryMuted,
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 10, fontWeight: '700', color: T.primary,
  },
  favBtn: {
    marginLeft: 'auto',
    width: 32, height: 32, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },
});
