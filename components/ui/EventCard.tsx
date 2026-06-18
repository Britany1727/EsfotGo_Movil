import React, { useCallback, useRef } from 'react';
import {
  View, Text, Pressable, StyleSheet, Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { MapPin, Clock } from 'lucide-react-native';
import { LightTheme as T, Sizes, Shadows, Typography } from '@/constants/design-system';
import type { Event } from '@/features/events/domain/event.entity';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = SCREEN_W - Sizes.paddingMd * 2;

const MONTHS = [
  'ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN',
  'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC',
];

const CATEGORY_LABEL: Record<string, string> = {
  academico: 'Academico',
  cultural: 'Cultural',
  deportivo: 'Deportes',
  tecnologico: 'Software & Tech',
  institucional: 'Institucional',
};

interface EventCardProps {
  event: Event;
  onPress?: (event: Event) => void;
  onAction?: () => void;
  actionLabel?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function EventCard({ event, onPress, onAction, actionLabel }: EventCardProps) {
  const scale = useSharedValue(1);
  const pressStartRef = useRef(0);
  const date = new Date(event.startDate);
  const day = date.getDate();
  const month = MONTHS[date.getMonth()] ?? '';
  const category = CATEGORY_LABEL[event.category ?? ''] ?? event.category ?? 'Evento';
  const time = date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    pressStartRef.current = Date.now();
    scale.value = withSpring(0.97, { damping: 24, stiffness: 360 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 20, stiffness: 300 });
    const duration = Date.now() - pressStartRef.current;
    if (duration < 80) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.(event);
  };

  const handleAction = useCallback(() => {
    onAction?.();
  }, [onAction]);

  return (
    <AnimatedPressable
      style={[styles.card, cardStyle]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      pressRetentionOffset={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <View style={styles.imageWrap}>
        <Image
          source={
            event.imageUrl
              ? { uri: event.imageUrl }
              : require('@/assets/images/partial-react-logo.png')
          }
          style={styles.image}
          contentFit="cover"
          transition={300}
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.25)', 'rgba(0,0,0,0.85)']}
          style={styles.gradient}
        />
        <View style={styles.dateBadge}>
          <Text style={styles.dateMonth}>{month}</Text>
          <Text style={styles.dateDay}>{day}</Text>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.categoryBadge}>
          <Text style={styles.category} numberOfLines={1}>
            {category.toUpperCase()}
          </Text>
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {event.title}
        </Text>
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Clock size={13} strokeWidth={2} color="rgba(255,255,255,0.7)" />
            <Text style={styles.metaText}>{time}</Text>
          </View>
          <View style={styles.metaItem}>
            <MapPin size={13} strokeWidth={2} color="rgba(255,255,255,0.7)" />
            <Text style={styles.metaText} numberOfLines={1}>
              {event.location ?? 'EPN'}
            </Text>
          </View>
        </View>

        {actionLabel && (
          <Pressable
            style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.8 }]}
            onPress={handleAction}
          >
            <Text style={styles.actionText}>{actionLabel}</Text>
          </Pressable>
        )}
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_W,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: Sizes.gapLg,
    alignSelf: 'center',
    backgroundColor: T.backgroundCard,
    ...Shadows.xl,
  },
  imageWrap: {
    position: 'relative',
    width: '100%',
    aspectRatio: 16 / 9,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  dateBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    minWidth: 52,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    ...Shadows.sm,
  },
  dateMonth: {
    fontSize: 11,
    fontWeight: '700',
    color: T.highlight,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  dateDay: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 28,
  },
  body: {
    padding: Sizes.paddingMd,
    gap: 8,
    backgroundColor: '#0F1117',
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: T.highlight + '18',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: T.highlight + '35',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  category: {
    fontSize: 10,
    fontWeight: '700',
    color: T.highlight,
    letterSpacing: 1.5,
  },
  title: {
    ...Typography.h4,
    color: '#FFFFFF',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    ...Typography.caption,
    color: 'rgba(255,255,255,0.7)',
  },
  actionBtn: {
    backgroundColor: T.accent,
    borderRadius: Sizes.radiusSm,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: Sizes.gapXs,
    ...Shadows.sm,
  },
  actionText: {
    ...Typography.button,
    color: '#FFFFFF',
    fontSize: 15,
  },
});
