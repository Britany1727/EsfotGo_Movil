// ============================================================
// Unified HTTP Client — Single export for all repositories
// ============================================================
// All repositories now use httpClient (axios with refresh token).
// Token is auto-attached via interceptor, no need to pass manually.
// ============================================================

import { HttpClient } from '@/services/express/http-client';
import { env } from '@/core/config/env';
import { useAuthStore } from '@/store/auth.store';

export const httpClient = new HttpClient({
  baseURL: env.EXPO_PUBLIC_API_BASE_URL,
  timeout: 15000,
  tokenKey: 'esfotgo_jwt_token',
  refreshTokenKey: 'esfotgo_jwt_refresh',
  refreshEndpoint: '/auth/refresh',
  onUnauthorized: () => {
    const { secureLogout } = useAuthStore.getState();
    secureLogout();
  },
});

export type { ApiResponse } from '@/services/express/http-client';
