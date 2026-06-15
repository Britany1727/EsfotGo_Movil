import { create } from 'zustand';
import type { User } from '@/core/types';
import { AuthService } from '@/features/auth/services/auth.service';
import type { LoginInput, RegisterInput, UpdateProfileInput } from '@/features/auth/domain/auth.schema';
import { TokenCleanupService } from '@/core/auth/token-cleanup';
import { isDevMode } from '@/core/config/env';
import { MockAuth } from '@/core/dev/mock-services';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  isSessionValid: boolean;
  isRefreshing: boolean;

  registrationEmail: string | null;
  registrationStep: 'form' | 'verification' | 'complete';
  registrationError: string | null;

  gpsPermissionGranted: boolean;
  gpsPermissionDenied: boolean;

  unsubscribeAuth: (() => void) | null;

  initialize: () => Promise<void>;
  signIn: (input: LoginInput, rememberMe?: boolean) => Promise<void>;
  signUp: (input: RegisterInput, role?: 'estudiante' | 'docente') => Promise<{ emailConfirmationRequired: boolean }>;
  signOut: () => Promise<void>;
  secureLogout: () => Promise<void>;
  updateProfile: (input: UpdateProfileInput) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  recoverPassword: (email: string) => Promise<void>;
  verifyResetToken: (token: string) => Promise<boolean>;
  resetPassword: (token: string, password: string, confirmPassword: string) => Promise<void>;
  refreshToken: () => Promise<boolean>;
  validateCurrentSession: () => Promise<boolean>;

  resendVerificationEmail: () => Promise<void>;
  setRegistrationEmail: (email: string) => void;
  setRegistrationStep: (step: 'form' | 'verification' | 'complete') => void;
  setRegistrationError: (error: string | null) => void;
  resetRegistration: () => void;

  setGpsPermission: (granted: boolean) => void;

  setSession: (user: User | null, token: string | null) => void;
}

const authService = AuthService.getInstance();

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: false,
  isInitialized: false,
  isSessionValid: false,
  isRefreshing: false,

  registrationEmail: null,
  registrationStep: 'form',
  registrationError: null,

  gpsPermissionGranted: false,
  gpsPermissionDenied: false,

  unsubscribeAuth: null,

  setSession: (user: User | null, token: string | null) => {
    set({ user, token, isSessionValid: !!user && !!token });
  },

  initialize: async () => {
    try {
      set({ isLoading: true });
      console.log('[AuthStore] Inicializando...');

      if (isDevMode()) {
        console.log('[AuthStore] Modo desarrollo — saltando restauración de sesión');
        set({ isLoading: false, isInitialized: true });
        return;
      }

      let initUser: User | null = null;
      let initToken: string | null = null;

      await authService.restoreSession.execute(
        (user, token) => {
          console.log('[AuthStore] Sesión restaurada para usuario');
          initUser = user;
          initToken = token;
        },
        () => {
          console.log('[AuthStore] No se encontró sesión previa');
        }
      );

      if (initUser && initToken) {
        set({ user: initUser, token: initToken, isSessionValid: true });
      }

      const unsubscribe = authService
        .getRepository()
        .subscribeToAuthChanges((session) => {
          if (session) {
            console.log('[AuthStore] Cambio de auth: sesión activa');
            set({ user: session.user, token: session.token, isSessionValid: true });
          } else {
            console.log('[AuthStore] Cambio de auth: sesión perdida');
            set({ user: null, token: null, isSessionValid: false });
          }
        });

      set({ unsubscribeAuth: unsubscribe as unknown as () => void });
    } catch (err) {
      console.log('[AuthStore] Error en initialize:', (err as Error)?.message ?? err);
      set({ user: null, token: null, isSessionValid: false });
    } finally {
      set({ isLoading: false, isInitialized: true });
      console.log('[AuthStore] Inicialización completada');
    }
  },

  signIn: async (input: LoginInput, rememberMe: boolean = false) => {
    set({ isLoading: true });
    console.log('[AuthStore] signIn:', 'rememberMe:', rememberMe);
    try {
      if (isDevMode()) {
        console.log('[AuthStore] Modo dev — usando MockAuth');
        const result = await MockAuth.signIn(input.email, input.password);
        set({ user: result.user, token: result.token, isSessionValid: true });
        return;
      }

      const result = await authService.signIn.execute(input);
      console.log('[AuthStore] signIn exitoso');
      set({ user: result.user, token: result.token, isSessionValid: true });
      await authService.persistSession.execute(rememberMe);
    } catch (err) {
      console.log('[AuthStore] Error en signIn:', (err as Error)?.message ?? err);
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  signUp: async (input: RegisterInput, role: 'estudiante' | 'docente' = 'estudiante') => {
    set({ isLoading: true, registrationError: null });
    console.log('[AuthStore] signUp:', 'role:', role);
    try {
      const result = await authService.registerUser.execute({
        email: input.email.toLowerCase().trim(),
        password: input.password,
        confirmPassword: input.confirmPassword,
        nombre: input.nombre,
        apellido: input.apellido,
        telefono: input.telefono,
        acceptTerms: true,
      }, role);

      console.log('[AuthStore] signUp completado, requiere verificación:', result.emailConfirmationRequired);

      if (result.emailConfirmationRequired) {
        set({
          registrationEmail: input.email.toLowerCase().trim(),
          registrationStep: 'verification',
        });
      } else {
        set({ registrationStep: 'complete' });
      }

      return { emailConfirmationRequired: result.emailConfirmationRequired };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error al crear la cuenta';
      console.log('[AuthStore] Error en signUp:', message);
      set({ registrationError: message });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    set({ isLoading: true });
    console.log('[AuthStore] signOut...');
    try {
      get().unsubscribeAuth?.();
      await authService.signOut.execute();
      console.log('[AuthStore] signOut completado');
    } catch (err) {
      console.log('[AuthStore] Error en signOut (continuando limpieza):', (err as Error)?.message ?? err);
    } finally {
      set({
        user: null, token: null, isSessionValid: false,
        registrationStep: 'form', registrationEmail: null,
        unsubscribeAuth: null, isLoading: false,
      });
    }
  },

  secureLogout: async () => {
    set({ isLoading: true });
    console.log('[AuthStore] secureLogout...');
    try {
      get().unsubscribeAuth?.();
      await authService.secureLogout.execute();
      console.log('[AuthStore] secureLogout completado');
    } catch (err) {
      console.log('[AuthStore] Error en secureLogout, usando fallback:', (err as Error)?.message ?? err);
      await TokenCleanupService.performSecureLogout();
    } finally {
      set({
        user: null, token: null, isSessionValid: false,
        registrationStep: 'form', registrationEmail: null,
        gpsPermissionGranted: false, gpsPermissionDenied: false,
        unsubscribeAuth: null, isLoading: false,
      });
    }
  },

  updateProfile: async (input: UpdateProfileInput) => {
    const currentUser = get().user;
    if (!currentUser) throw new Error('No autenticado');

    set({ isLoading: true });
    try {
      const updated = await authService.updateProfile.execute(currentUser.id, input);
      set({ user: updated });
    } finally {
      set({ isLoading: false });
    }
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    set({ isLoading: true });
    try {
      await authService.changePassword.execute(currentPassword, newPassword);
    } finally {
      set({ isLoading: false });
    }
  },

  recoverPassword: async (email: string) => {
    set({ isLoading: true });
    try {
      await authService.recoverPassword.execute(email);
    } finally {
      set({ isLoading: false });
    }
  },

  verifyResetToken: async (token: string) => {
    try {
      return await authService.verifyResetToken.execute(token);
    } catch {
      return false;
    }
  },

  resetPassword: async (token: string, password: string, confirmPassword: string) => {
    set({ isLoading: true });
    try {
      await authService.resetPassword.execute(token, password, confirmPassword);
    } finally {
      set({ isLoading: false });
    }
  },

  refreshToken: async () => {
    set({ isRefreshing: true });
    console.log('[AuthStore] refreshToken...');
    try {
      const session = await authService.refreshSession.execute();
      if (session) {
        console.log('[AuthStore] refreshToken exitoso');
        set({ user: session.user, token: session.token, isSessionValid: true });
        return true;
      }
      console.log('[AuthStore] refreshToken falló — sesión inválida');
      set({ user: null, token: null, isSessionValid: false });
      return false;
    } catch (err) {
      console.log('[AuthStore] Error en refreshToken:', (err as Error)?.message ?? err);
      set({ user: null, token: null, isSessionValid: false });
      return false;
    } finally {
      set({ isRefreshing: false });
    }
  },

  validateCurrentSession: async () => {
    try {
      const session = await authService.validateSession.execute();
      if (session) {
        set({ user: session.user, token: session.token, isSessionValid: true });
        return true;
      }
      console.log('[AuthStore] validateCurrentSession: sesión inválida');
      set({ user: null, token: null, isSessionValid: false });
      return false;
    } catch (err) {
      console.log('[AuthStore] Error en validateCurrentSession:', (err as Error)?.message ?? err);
      return false;
    }
  },

  resendVerificationEmail: async () => {
    const email = get().registrationEmail;
    if (!email) {
      set({ registrationError: 'No hay un correo pendiente de verificación' });
      return;
    }

    set({ isLoading: true, registrationError: null });
    try {
      await authService.resendVerification.execute(email);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error al reenviar el correo';
      set({ registrationError: message });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  setRegistrationEmail: (email: string) => set({ registrationEmail: email }),

  setRegistrationStep: (step: 'form' | 'verification' | 'complete') =>
    set({ registrationStep: step }),

  setRegistrationError: (error: string | null) => set({ registrationError: error }),

  resetRegistration: () =>
    set({
      registrationEmail: null,
      registrationStep: 'form',
      registrationError: null,
    }),

  setGpsPermission: (granted: boolean) =>
    set({
      gpsPermissionGranted: granted,
      gpsPermissionDenied: !granted,
    }),
}));
