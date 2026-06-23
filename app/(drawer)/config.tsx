import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Pressable,
} from 'react-native';
import Animated, {
  FadeInDown, useSharedValue, useAnimatedScrollHandler,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useNavigation, useRouter } from 'expo-router';
import {
  Bell, CalendarDays, Bus, Map, MapPin, Settings2, User, KeyRound,
  Mail, HelpCircle, ChevronRight, LogOut, Star,
} from 'lucide-react-native';
import { LightTheme as T, Sizes, Shadows, Typography } from '@/constants/design-system';
import { GlassHeader } from '@/components/ui/GlassHeader';
import { useAuthStore } from '@/store/auth.store';

// ─── Setting Row ───
function SettingRow({
  icon: Icon, label, value, onPress, rightElement, isLast = false,
}: {
  icon: React.ComponentType<any>;
  label: string;
  value?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  isLast?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.row, isLast && styles.rowLast,
        pressed && onPress && { backgroundColor: T.pressed },
      ]}
      onPress={() => {
        if (onPress) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }
      }}
      disabled={!onPress && !rightElement}
    >
      <View style={styles.rowIconWrap}>
        <Icon size={18} strokeWidth={1.8} color={T.primary} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowRight}>
        {value && <Text style={styles.rowValue}>{value}</Text>}
        {rightElement}
        {onPress && !rightElement && (
          <ChevronRight size={18} strokeWidth={1.8} color={T.textTertiary} />
        )}
      </View>
    </Pressable>
  );
}

// ─── Settings Group ───
function SettingGroup({
  title, icon: Icon, children, delay = 0,
}: { title: string; icon: React.ComponentType<any>; children: React.ReactNode; delay?: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(400)} style={styles.group}>
      <View style={styles.groupHeader}>
        <Icon size={16} strokeWidth={2} color={T.primary} />
        <Text style={styles.groupTitle}>{title}</Text>
      </View>
      <View style={styles.groupCard}>
        {children}
      </View>
    </Animated.View>
  );
}

export default function ConfigScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const secureLogout = useAuthStore((s) => s.secureLogout);

  // Notification toggles
  const [notifEvents, setNotifEvents] = useState(true);
  const [notifPolibus, setNotifPolibus] = useState(true);
  const [notifNoticias, setNotifNoticias] = useState(false);

  // Map prefs
  const [mapUnits, setMapUnits] = useState<'metros' | 'km'>('metros');
  const [highQualityMap, setHighQualityMap] = useState(true);

  // Privacy
  const [shareLocation, setShareLocation] = useState(true);

  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  const handleLogout = useCallback(async () => {
    await secureLogout();
    router.replace('/auth/login');
  }, [secureLogout, router]);

  return (
    <View style={styles.root}>
      <GlassHeader
        scrollY={scrollY}
        onAvatarPress={() => router.push('/profile' as any)}
        onMenuPress={() => (navigation as any).openDrawer()}
      />

      <Animated.ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
          <Text style={styles.title}>Configuración</Text>
          <Text style={styles.subtitle}>Personaliza tu experiencia en ESFOT Go</Text>
        </Animated.View>

        {/* Notificaciones */}
        <SettingGroup title="Notificaciones" icon={Bell} delay={80}>
          <SettingRow icon={CalendarDays} label="Eventos del campus"
            rightElement={
              <Switch
                value={notifEvents}
                onValueChange={setNotifEvents}
                trackColor={{ false: T.inputBorder, true: T.primaryMuted }}
                thumbColor={notifEvents ? T.primary : T.textTertiary}
              />
            }
          />
          <SettingRow icon={Bus} label="Actualizaciones Polibus"
            rightElement={
              <Switch
                value={notifPolibus}
                onValueChange={setNotifPolibus}
                trackColor={{ false: T.inputBorder, true: T.primaryMuted }}
                thumbColor={notifPolibus ? T.primary : T.textTertiary}
              />
            }
          />
          <SettingRow icon={Bell} label="Noticias institucionales"
            isLast
            rightElement={
              <Switch
                value={notifNoticias}
                onValueChange={setNotifNoticias}
                trackColor={{ false: T.inputBorder, true: T.primaryMuted }}
                thumbColor={notifNoticias ? T.primary : T.textTertiary}
              />
            }
          />
        </SettingGroup>

        {/* Mapa */}
        <SettingGroup title="Mapa y Navegacion" icon={Map} delay={140}>
          <SettingRow icon={MapPin} label="Unidades de distancia"
            rightElement={
              <View style={styles.segmented}>
                {(['metros', 'km'] as const).map((u) => (
                  <TouchableOpacity
                    key={u}
                    style={[styles.segBtn, mapUnits === u && styles.segBtnActive]}
                    onPress={() => setMapUnits(u)}
                  >
                    <Text style={[styles.segText, mapUnits === u && styles.segTextActive]}>
                      {u}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            }
          />
          <SettingRow icon={Settings2} label="Mapa de alta calidad"
            isLast
            rightElement={
              <Switch
                value={highQualityMap}
                onValueChange={setHighQualityMap}
                trackColor={{ false: T.inputBorder, true: T.primaryMuted }}
                thumbColor={highQualityMap ? T.primary : T.textTertiary}
              />
            }
          />
        </SettingGroup>

        {/* Privacidad */}
        <SettingGroup title="Privacidad" icon={Settings2} delay={200}>
          <SettingRow icon={MapPin} label="Compartir mi ubicacion"
            rightElement={
              <Switch
                value={shareLocation}
                onValueChange={setShareLocation}
                trackColor={{ false: T.inputBorder, true: T.primaryMuted }}
                thumbColor={shareLocation ? T.primary : T.textTertiary}
              />
            }
          />
          <SettingRow icon={Settings2} label="Terminos y condiciones"
            onPress={() => {}}
            isLast
          />
        </SettingGroup>

        {/* Cuenta */}
        <SettingGroup title="Cuenta" icon={User} delay={260}>
          <SettingRow icon={KeyRound} label="Cambiar contrasena"
            onPress={() => router.push('/auth/recover' as any)}
          />
          <SettingRow icon={Mail} label="Actualizar correo"
            onPress={() => router.push('/profile' as any)}
            isLast
          />
        </SettingGroup>

        {/* Información */}
        <SettingGroup title="Informacion" icon={Settings2} delay={320}>
          <SettingRow icon={Star} label="Version de la app" value="1.0.0" />
          <SettingRow icon={Star} label="ESFOT - EPN" value="2025-2026" />
          <SettingRow icon={HelpCircle} label="Centro de ayuda"
            onPress={() => router.push('/help' as any)}
            isLast
          />
        </SettingGroup>

        {/* Logout */}
        <Animated.View entering={FadeInDown.delay(380).duration(400)} style={styles.logoutSection}>
          <Pressable
            style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.8 }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              handleLogout();
            }}
          >
            <LogOut size={18} strokeWidth={2} color={T.error} />
            <Text style={styles.logoutText}>Cerrar sesion</Text>
          </Pressable>
        </Animated.View>

        <View style={{ height: 100 }} />
      </Animated.ScrollView>
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
    paddingBottom: Sizes.gapMd,
    gap: 4,
  },
  title: { ...Typography.h2, color: T.textPrimary },
  subtitle: { ...Typography.body, color: T.textSecondary },

  group: {
    paddingHorizontal: Sizes.paddingMd,
    marginBottom: Sizes.gapLg,
    gap: Sizes.gapSm,
  },
  groupHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2,
  },
  groupTitle: {
    ...Typography.overline, color: T.primary,
  },
  groupCard: {
    backgroundColor: T.surfaceGlass,
    borderRadius: Sizes.radiusXl,
    borderWidth: 1, borderColor: T.cardBorder,
    ...Shadows.md,
  },

  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Sizes.paddingMd, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: T.divider,
    gap: 14, minHeight: 52,
  },
  rowLast: { borderBottomWidth: 0 },
  rowIconWrap: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: T.primaryMuted,
    justifyContent: 'center', alignItems: 'center',
  },
  rowLabel: { ...Typography.body, color: T.textPrimary, flex: 1, fontSize: 15 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowValue: { ...Typography.bodySm, color: T.textSecondary },

  segmented: {
    flexDirection: 'row', backgroundColor: T.inputBg,
    borderRadius: Sizes.radiusSm, padding: 3, gap: 2,
  },
  segBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: Sizes.radiusXs,
  },
  segBtnActive: { backgroundColor: T.primary, ...Shadows.sm },
  segText: { ...Typography.caption, color: T.textSecondary },
  segTextActive: { color: '#FFFFFF' },

  logoutSection: { paddingHorizontal: Sizes.paddingMd, marginTop: 4 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: T.errorBg,
    borderRadius: Sizes.radiusLg, padding: Sizes.paddingMd,
    borderWidth: 1, borderColor: T.error + '30',
    ...Shadows.sm,
  },
  logoutText: { ...Typography.button, color: T.error, fontSize: 15 },
});
