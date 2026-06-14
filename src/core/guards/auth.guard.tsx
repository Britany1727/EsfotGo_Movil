import { Redirect } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuthContext } from '@/providers/auth-provider';
import { DarkTheme as T } from '@/constants/design-system';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { isAuthenticated, isLoading, isSessionValid } = useAuthContext();

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={T.primary} />
      </View>
    );
  }

  if (!isAuthenticated || !isSessionValid) {
    console.log('[AuthGuard] Acceso denegado — isAuthenticated:', isAuthenticated, 'isSessionValid:', isSessionValid);
    if (fallback) return <>{fallback}</>;
    return <Redirect href="/auth/login" />;
  }

  return <>{children}</>;
}

export function GuestGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, isSessionValid } = useAuthContext();

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={T.primary} />
      </View>
    );
  }

  if (isAuthenticated && isSessionValid) {
    console.log('[GuestGuard] Usuario ya autenticado — redirigiendo al drawer');
    return <Redirect href="/(drawer)/(tabs)" />;
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: T.surface,
  },
});
