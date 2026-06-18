import React from 'react';
import {
  View, Text, Pressable, StyleSheet,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Star } from 'lucide-react-native';
import { LightTheme as T, Sizes, Shadows, Typography } from '@/constants/design-system';

export interface Building {
  id: string;
  name: string;
  code?: string;
  description?: string;
  category: 'edificio' | 'aula' | 'laboratorio' | 'oficina' | 'otro';
  floor?: number;
  capacity?: number;
  icon?: string;
  isFavorite?: boolean;
}

interface BuildingCardProps {
  building: Building;
  onPress?: () => void;
  onMapPress?: () => void;
  onFavoritePress?: () => void;
  animationDelay?: number;
}

const CATEGORY_CONFIG: Record<Building['category'], { icon: string; label: string; color: string }> = {
  edificio: { icon: '🏫', label: 'Edificio', color: '#042c5c' },
  aula: { icon: '📚', label: 'Aula', color: '#1a4a8a' },
  laboratorio: { icon: '🔬', label: 'Laboratorio', color: '#059669' },
  oficina: { icon: '🏢', label: 'Oficina', color: '#827372' },
  otro: { icon: '📍', label: 'Otro', color: '#fabb54' },
};

export function BuildingCard({
  building,
  onPress,
  onMapPress,
  onFavoritePress,
  animationDelay = 0,
}: BuildingCardProps) {
  const cfg = CATEGORY_CONFIG[building.category];

  return (
    <Animated.View entering={FadeInDown.delay(animationDelay).duration(400)}>
      <Pressable
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}
        onPress={onPress}
        delayPressIn={100}
        pressRetentionOffset={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <View style={[styles.iconWrap, { backgroundColor: cfg.color + '14' }]}>
          <Text style={[styles.iconLetter, { color: cfg.color }]}>
            {cfg.label.charAt(0)}
          </Text>
        </View>

        <View style={styles.content}>
          <View style={styles.topRow}>
            <View style={[styles.categoryBadge, { backgroundColor: cfg.color + '14' }]}>
              <Text style={[styles.categoryText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
            {building.code && (
              <Text style={styles.code}>{building.code}</Text>
            )}
          </View>
          <Text style={styles.name} numberOfLines={1}>{building.name}</Text>
          {building.description && (
            <Text style={styles.description} numberOfLines={2}>{building.description}</Text>
          )}
          <View style={styles.metaRow}>
            {building.floor !== undefined && (
              <Text style={styles.meta}>Piso {building.floor}</Text>
            )}
            {building.capacity !== undefined && (
              <Text style={styles.meta}>Cap. {building.capacity}</Text>
            )}
          </View>
        </View>

        <View style={styles.actions}>
          {onFavoritePress && (
            <Pressable
              style={styles.actionBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onFavoritePress();
              }}
              hitSlop={8}
            >
              <Star
                size={16}
                strokeWidth={2}
                color={building.isFavorite ? T.highlight : T.textTertiary}
                fill={building.isFavorite ? T.highlight : 'transparent'}
              />
            </Pressable>
          )}
          {onMapPress && (
            <Pressable
              style={[styles.actionBtn, styles.mapBtn]}
              onPress={onMapPress}
            >
              <Text style={styles.mapBtnText}>Ver</Text>
            </Pressable>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: T.surfaceGlass,
    borderRadius: Sizes.radiusXl,
    padding: Sizes.paddingMd,
    marginBottom: Sizes.gapMd,
    gap: 12,
    borderWidth: 1, borderColor: T.cardBorder,
    ...Shadows.md,
  },
  iconWrap: {
    width: 48, height: 48, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  iconLetter: {
    fontSize: 20, fontWeight: '800',
  },
  content: { flex: 1, gap: 4 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  categoryBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  categoryText: {
    ...Typography.overline, letterSpacing: 0.5,
  },
  code: {
    ...Typography.caption, color: T.textTertiary,
  },
  name: {
    ...Typography.body, color: T.textPrimary, fontWeight: '700',
  },
  description: {
    ...Typography.bodySm, color: T.textSecondary, lineHeight: 18,
  },
  metaRow: { flexDirection: 'row', gap: 10, marginTop: 2 },
  meta: { ...Typography.caption, color: T.textTertiary },
  actions: { alignItems: 'center', gap: 8 },
  actionBtn: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: T.inputBg,
  },
  mapBtn: {
    backgroundColor: T.primary, paddingHorizontal: 12,
    width: 'auto' as any, ...Shadows.sm,
  },
  mapBtnText: {
    ...Typography.caption, fontWeight: '700', color: '#FFFFFF',
  },
});
