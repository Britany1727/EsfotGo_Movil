import { Drawer } from 'expo-router/drawer';
import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/auth.store';
import { UserEntity } from '@/features/auth/domain/user.entity';
import { LightTheme as T, Typography, Sizes } from '@/constants/design-system';

function CustomDrawerContent() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const secureLogout = useAuthStore((s) => s.secureLogout);
  const ue = user ? new UserEntity(user) : null;
  const isAdmin = user?.role === 'administrador' || user?.role === 'gestor';
  const isDocente = user?.role === 'docente';

  const handleLogout = async () => {
    await secureLogout();
    router.replace('/auth/login');
  };

  const items: { icon: string; label: string; route: string; roles?: string[] }[] = [
    { icon: '👤', label: 'Mi Perfil', route: '/profile' },
    { icon: '📅', label: 'Mis Eventos', route: '/events' },
    { icon: '⭐', label: 'Favoritos', route: '/favorites' },
    { icon: '🏫', label: 'Edificios', route: '/map' },
    { icon: '📚', label: 'Aulas', route: '/map' },
    ...(isAdmin ? [
      { icon: '🛡️', label: 'Panel Administrador', route: '/admin' },
      { icon: '🗺️', label: 'Mapa Admin', route: '/admin-map' },
      { icon: '📤', label: 'Carga Masiva', route: '/bulk-upload' },
    ] : []),
    ...(isDocente ? [{ icon: '👨‍🏫', label: 'Tutorias', route: '/tutorias' }] : []),
    { icon: '💬', label: 'Chat', route: '/chat' },
    { icon: '⚙️', label: 'Configuracion', route: '/config' },
    { icon: '❓', label: 'Ayuda', route: '/help' },
  ];

  return (
    <View style={styles.drawer}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(drawer)/(tabs)');
            }
          }}
        >
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>

        <View style={styles.profileSection}>
          {(user as any)?.avatarUrl ? (
            <Image source={{ uri: (user as any).avatarUrl }} style={styles.avatar} />
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

      <View style={styles.items}>
        {items.map((item) => (
          <TouchableOpacity
            key={item.label}
            style={styles.item}
            onPress={() => {
              router.push(item.route as any);
            }}
            activeOpacity={0.6}
          >
            <Text style={styles.itemIcon}>{item.icon}</Text>
            <Text style={styles.itemLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={handleLogout}
        activeOpacity={0.7}
      >
        <Text style={styles.logoutIcon}>🚪</Text>
        <Text style={styles.logoutText}>Cerrar Sesion</Text>
      </TouchableOpacity>
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
    backgroundColor: T.surface,
  },
  closeBtn: {
    alignSelf: 'flex-end',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: T.neutralMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Sizes.gapMd,
  },
  closeBtnText: {
    fontSize: 14,
    color: T.textSecondary,
    fontWeight: '700',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: T.primaryMuted,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: T.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
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
  items: {
    paddingVertical: Sizes.gapSm,
    flex: 1,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: Sizes.paddingLg,
    paddingVertical: 14,
  },
  itemIcon: {
    fontSize: 20,
    width: 28,
  },
  itemLabel: {
    ...Typography.body,
    color: T.textPrimary,
    fontWeight: '500',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: Sizes.paddingLg,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: T.divider,
    backgroundColor: T.surface,
  },
  logoutIcon: {
    fontSize: 20,
    width: 28,
  },
  logoutText: {
    ...Typography.body,
    color: T.error,
    fontWeight: '600',
  },
});
