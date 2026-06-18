import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import Animated, { FadeIn, SlideInUp, FadeOut } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { AlertTriangle, X, Clock } from 'lucide-react-native';
import type { RestrictedZone } from '@/features/admin/domain/poi.entity';
import { LightTheme as T, Shadows, Sizes, Typography } from '@/constants/design-system';

const RESTRICTION_TYPE_LABELS: Record<string, string> = {
  acceso_restringido: 'Acceso restringido',
  construccion: 'Construcción',
  peatonal: 'Peatonal',
  emergencia: 'Emergencia',
  ambiental: 'Ambiental',
  seguridad: 'Seguridad',
  otro: 'Otro',
};

interface Props {
  zone: RestrictedZone;
  onClose: () => void;
}

export function RestrictedZoneInfoModal({ zone, onClose }: Props) {
  const typeLabel = RESTRICTION_TYPE_LABELS[zone.restrictionType] ?? zone.restrictionType;

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      style={s.overlay}
    >
      <Pressable style={s.backdrop} onPress={onClose} />
      <Animated.View
        entering={SlideInUp.springify().damping(22).stiffness(200)}
        style={s.sheet}
      >
        <View style={s.handle} />

        <View style={s.header}>
          <View style={s.warningIcon}>
            <AlertTriangle size={22} strokeWidth={2.2} color={T.error} />
          </View>
          <View style={s.headerT}>
            <Text style={s.warningLabel}>Zona Restringida</Text>
            <View style={s.typeBadge}>
              <Text style={s.typeBadgeText}>{typeLabel}</Text>
            </View>
          </View>
          <Pressable
            style={s.closeBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onClose();
            }}
            hitSlop={12}
          >
            <X size={20} strokeWidth={2.2} color={T.textSecondary} />
          </Pressable>
        </View>

        <View style={s.content}>
          <View style={s.field}>
            <Text style={s.label}>Nombre</Text>
            <Text style={s.value}>{zone.name}</Text>
          </View>

          {zone.description && (
            <View style={s.field}>
              <Text style={s.label}>Descripción</Text>
              <Text style={s.desc}>{zone.description}</Text>
            </View>
          )}

          {zone.activeSchedule && (
            <View style={s.scheduleRow}>
              <Clock size={14} strokeWidth={2} color={T.warning} />
              <Text style={s.scheduleText}>{zone.activeSchedule}</Text>
            </View>
          )}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'flex-end',
    zIndex: 998, elevation: 998,
  },
  backdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  sheet: {
    backgroundColor: T.surface,
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
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  warningIcon: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: T.errorBg,
    justifyContent: 'center', alignItems: 'center',
  },
  headerT: { flex: 1, gap: 4 },
  warningLabel: {
    ...Typography.h4, color: T.error, fontWeight: '800',
  },
  typeBadge: {
    backgroundColor: T.errorBg, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  typeBadgeText: {
    fontSize: 11, fontWeight: '700', color: T.error,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: T.surfaceBorder,
    justifyContent: 'center', alignItems: 'center',
  },
  content: {
    gap: 14,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 11, fontWeight: '700', color: T.textTertiary,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  value: {
    ...Typography.h4, color: T.textPrimary, fontSize: 16,
  },
  desc: {
    ...Typography.body, color: T.textSecondary, lineHeight: 22,
  },
  scheduleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: T.warningBg, borderRadius: 10,
    padding: 12,
  },
  scheduleText: {
    ...Typography.caption, color: T.warning, fontWeight: '600', flex: 1,
  },
});
