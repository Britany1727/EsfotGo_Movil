import { Drawer } from 'expo-router/drawer';
import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  User, CalendarDays, Star, MapPin, BookOpen, Shield, Map,
  Upload, GraduationCap, MessageCircle, Settings2, HelpCircle, LogOut, X,
} from 'lucide-react-native';
import { useAuthStore } from '@/store/auth.store';
import { UserEntity } from '@/features/auth/domain/user.entity';
import { LightTheme as T, Typography, Sizes, Shadows } from '@/constants/design-system';

function CustomDrawerContent() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const secureLogout = useAuthStore((s) => s.secureLogout);
  const ue = user ? new UserEntity(user) : null;
  const isAdmin = user?.role === 'administrador' || user?.role === 'gestor';
  const isDocente = user?.role === 'docente';
  const isEstudiante = user?.role === 'estudiante';

  const handleLogout = async () => {
    await secureLogout();
    router.replace('/auth/login');
  };

  const items: { Icon: React.ComponentType<any>; label: string; route: string; color?: string }[] = [
    { Icon: User, label: 'Mi Perfil', route: '/profile', color: T.primary },
    { Icon: CalendarDays, label: 'Mis Eventos', route: '/events', color: T.info },
    { Icon: Star, label: 'Favoritos', route: '/favorites', color: T.highlight },
    { Icon: BookOpen, label: 'Aulas', route: '/aulas', color: T.info },
    ...(isAdmin ? [
      { Icon: Shield, label: 'Panel Administrador', route: '/admin', color: T.accent },
      { Icon: Map, label: 'Mapa Admin', route: '/admin-map', color: T.primary },
      { Icon: Upload, label: 'Carga Masiva', route: '/bulk-upload', color: T.success },
    ] : []),
    ...(isDocente ? [{ Icon: GraduationCap, label: 'Tutorias', route: '/tutorias', color: T.highlight }] : []),
    ...(isEstudiante ? [{ Icon: GraduationCap, label: 'Agendar Tutorias', route: '/tutorias', color: T.primary }] : []),
    { Icon: MessageCircle, label: 'Chat', route: '/chat', color: T.primary },
    { Icon: Settings2, label: 'Configuracion', route: '/config', color: T.textSecondary },
    { Icon: HelpCircle, label: 'Ayuda', route: '/help', color: T.textSecondary },
  ];

  return (
    <View style={styles.drawer}>
      <View style={styles.header}>
        <Pressable
          style={styles.closeBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(drawer)/(tabs)');
            }
          }}
        >
          <X size={16} strokeWidth={2.2} color={T.textSecondary} />
        </Pressable>

        <View style={styles.profileSection}>
          {(user as any)?.avatarUrl ? (
            <Image source={{ uri: (user as any).avatarUrl }} style={styles.avatar} contentFit="cover" transition={300} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{ue?.initials ?? 'U'}</Text>
            </View>
          )}
          <View style={styles.profileInfo}>
            <Text style={styles.userName}>{ue?.displayName ?? 'Usuario'}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            {user?.role && (
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>
                  {user.role === 'administrador' ? 'Administrador' : user.role === 'docente' ? 'Docente' : 'Estudiante'}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <ScrollView style={styles.itemsScroll} contentContainerStyle={styles.itemsContent}>
        {items.map((item) => (
          <Pressable
            key={item.label}
            style={({ pressed }) => [
              styles.item,
              pressed && { backgroundColor: T.pressed },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push(item.route as any);
            }}
          >
            <View style={[styles.itemIconWrap, { backgroundColor: (item.color ?? T.primary) + '18' }]}>
              <item.Icon size={18} strokeWidth={1.8} color={item.color ?? T.primary} />
            </View>
            <Text style={styles.itemLabel}>{item.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <Pressable
        style={({ pressed }) => [
          styles.logoutBtn,
          pressed && { backgroundColor: T.pressed },
        ]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          handleLogout();
        }}
      >
        <View style={[styles.logoutIconWrap, { backgroundColor: T.errorBg }]}>
          <LogOut size={18} strokeWidth={1.8} color={T.error} />
        </View>
        <Text style={styles.logoutText}>Cerrar Sesion</Text>
      </Pressable>
    </View>
  );
}

export default function DrawerLayout() {
  return (
    <Drawer
      drawerContent={() => <CustomDrawerContent />}
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          backgroundColor: T.background,
          width: 300,
        },
      }}
    >
      <Drawer.Screen name="(tabs)" />
      <Drawer.Screen name="admin" />
      <Drawer.Screen name="admin-map" />
      <Drawer.Screen name="tutorias" />
      <Drawer.Screen name="config" />
      <Drawer.Screen name="help" />
      <Drawer.Screen name="favorites" />
      <Drawer.Screen name="bulk-upload" />
      <Drawer.Screen name="chat" />
      <Drawer.Screen name="aulas" />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  drawer: {
    flex: 1,
    backgroundColor: T.background,
  },
  header: {
    padding: Sizes.paddingLg,
    paddingTop: 52,
    borderBottomWidth: 1,
    borderBottomColor: T.divider,
    backgroundColor: T.surfaceGlass,
  },
  closeBtn: {
    alignSelf: 'flex-end',
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: T.surfaceBorder,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: Sizes.gapMd,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    borderWidth: 3, borderColor: T.primaryMuted,
  },
  avatarPlaceholder: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: T.primaryMuted,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: T.primaryLight + '30',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800',
    color: T.primary,
  },
  profileInfo: {
    flex: 1,
    gap: 3,
  },
  userName: {
    ...Typography.h4,
    color: T.textPrimary,
  },
  userEmail: {
    ...Typography.caption,
    color: T.textSecondary,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: T.primaryMuted,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '700',
    color: T.primary,
    textTransform: 'capitalize',
  },
  itemsScroll: {
    flex: 1,
  },
  itemsContent: {
    paddingVertical: Sizes.gapSm,
  },
  item: {
    flexDirection: 'row', alignItems: 'center',
    gap: 14,
    paddingHorizontal: Sizes.paddingLg,
    paddingVertical: 13,
    borderRadius: Sizes.radiusSm,
    marginHorizontal: Sizes.paddingSm,
  },
  itemIconWrap: {
    width: 36, height: 36, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  itemLabel: {
    ...Typography.body,
    color: T.textPrimary,
    fontWeight: '500',
  },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center',
    gap: 14,
    paddingHorizontal: Sizes.paddingLg,
    paddingVertical: 16,
    borderTopWidth: 1, borderTopColor: T.divider,
    backgroundColor: T.surfaceGlass,
  },
  logoutIconWrap: {
    width: 36, height: 36, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  logoutText: {
    ...Typography.body,
    color: T.error,
    fontWeight: '600',
  },
});
