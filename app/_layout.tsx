import { AuthProvider } from '@/providers/auth-provider';
import { QueryProvider } from '@/providers/query-provider';
import { ErrorBoundary } from '@/core/components/error-boundary';
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <QueryProvider>
        <AuthProvider>
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="auth/login" options={{ headerShown: false }} />
            <Stack.Screen name="auth/register" options={{ title: 'Crear cuenta' }} />
            <Stack.Screen name="auth/recover" options={{ title: 'Recuperar contraseña' }} />
            <Stack.Screen name="auth/verify" options={{ headerShown: false }} />
            <Stack.Screen name="auth/reset-password" options={{ title: 'Nueva contraseña' }} />
            <Stack.Screen name="auth/express-login" options={{ title: 'Acceso Institucional' }} />
            <Stack.Screen name="auth/dev-login" options={{ headerShown: false }} />
            <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
          </Stack>
        </AuthProvider>
      </QueryProvider>
    </ErrorBoundary>
  );
}
