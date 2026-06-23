import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation, useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { BookOpen, MapPin, ChevronRight } from 'lucide-react-native';
import { useCampusLocations } from '@/features/map/application/map.hooks';
import type { CampusLocation } from '@/features/map/domain/location.entity';
import { LightTheme as T, Typography, Sizes, Shadows } from '@/constants/design-system';
import { GlassHeader } from '@/components/ui/GlassHeader';
import { EmptyState } from '@/components/ui/EmptyState';

export default function AulasScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { data: locations, isLoading } = useCampusLocations();

  const aulas = useMemo(
    () => (locations ?? []).filter((l) => l.category === 'aulas'),
    [locations],
  );

  const handlePress = (item: CampusLocation) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/map',
      params: { locationId: item.id },
    } as any);
  };

  return (
    <View style={styles.root}>
      <GlassHeader
        scrollY={{ value: 0 } as any}
        onAvatarPress={() => router.push('/profile' as any)}
        onMenuPress={() => (navigation as any).openDrawer()}
      />
      <View style={styles.header}>
        <Text style={styles.title}>Aulas</Text>
        <Text style={styles.subtitle}>
          {aulas.length} aula{aulas.length !== 1 ? 's' : ''} disponible{aulas.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={T.primary} />
        </View>
      ) : (
        <FlashList
          data={aulas}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(index * 50).duration(400)}>
              <Pressable
                style={styles.card}
                onPress={() => handlePress(item)}
                delayPressIn={80}
              >
                <View style={styles.iconWrap}>
                  <BookOpen size={20} strokeWidth={2} color={T.info} />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
                  <View style={styles.coordRow}>
                    <MapPin size={12} strokeWidth={1.8} color={T.textTertiary} />
                    <Text style={styles.coordText}>
                      {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                    </Text>
                  </View>
                </View>
                <ChevronRight size={18} strokeWidth={1.8} color={T.textTertiary} />
              </Pressable>
            </Animated.View>
          )}
          estimatedItemSize={72}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              icon={<BookOpen size={36} strokeWidth={1.5} color={T.textTertiary} />}
              title="Sin aulas"
              subtitle="No se encontraron ubicaciones de tipo aula"
              delay={100}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.background },
  header: {
    paddingHorizontal: Sizes.paddingMd,
    paddingTop: 72,
    paddingBottom: Sizes.gapMd,
    gap: 4,
  },
  title: { ...Typography.h2, color: T.textPrimary },
  subtitle: { ...Typography.body, color: T.textSecondary },
  list: { paddingHorizontal: Sizes.paddingMd, paddingBottom: 40 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: T.surface,
    borderRadius: Sizes.radiusLg,
    padding: 14, gap: 12,
    marginBottom: 8,
    borderWidth: 1, borderColor: T.cardBorder,
    ...Shadows.sm,
  },
  iconWrap: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: T.infoBg,
    justifyContent: 'center', alignItems: 'center',
  },
  cardInfo: { flex: 1, gap: 3 },
  cardName: { ...Typography.body, fontWeight: '700', color: T.textPrimary },
  coordRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  coordText: { ...Typography.caption, color: T.textTertiary },
  centered: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
  },
});
