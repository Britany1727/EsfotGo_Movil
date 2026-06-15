import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { ExpressAuthRepository } from '@/services/express/express-repositories';
import type { ExpressUser, ExpressLoginInput } from '@/services/express/express-types';

const EXPRESS_TOKEN_KEY = 'esfotgo_jwt_token';
const EXPRESS_USER_KEY = 'epn_express_user';

interface ExpressAuthState {
  expressUser: ExpressUser | null;
  expressToken: string | null;
  isLoading: boolean;
  isInitialized: boolean;

  initializeExpress: () => Promise<void>;
  loginEstudiante: (input: ExpressLoginInput) => Promise<ExpressUser>;
  loginDocente: (input: ExpressLoginInput) => Promise<ExpressUser>;
  loginAdmin: (input: ExpressLoginInput) => Promise<ExpressUser>;
  logoutExpress: () => Promise<void>;
  loadStoredExpressSession: () => Promise<ExpressUser | null>;
  getExpressToken: () => string | null;
}

const authRepo = new ExpressAuthRepository();

async function doLogin(
  loginFn: (input: ExpressLoginInput) => ReturnType<typeof authRepo.loginEstudiante>,
  input: ExpressLoginInput,
  set: (partial: Partial<ExpressAuthState>) => void
): Promise<ExpressUser> {
  set({ isLoading: true });
  try {
    const res = await loginFn(input);
    if (res.error || !res.data) {
      console.log('[ExpressAuth] Login error:', res.error);
      throw new Error(res.error ?? 'Error al iniciar sesión');
    }

    const token = res.data.token;
    if (!token) throw new Error('Token no recibido del servidor');

    // El login ya devuelve todos los campos del perfil — no es necesario GET /perfil
    const raw = res.data as unknown as Record<string, unknown>;
    const user: ExpressUser = {
      _id: (raw._id as string) ?? '',
      nombre: (raw.nombre as string) ?? '',
      apellido: raw.apellido as string | undefined,
      email: (raw.email as string) ?? input.email,
      telefono: raw.telefono as string | undefined,
      rol: (raw.rol as ExpressUser['rol']) ?? 'estudiante',
      imagen: raw.imagen as string | undefined,
    };

    console.log('[ExpressAuth] Login exitoso:', user.email);

    await SecureStore.setItemAsync(EXPRESS_TOKEN_KEY, token);
    await SecureStore.setItemAsync(EXPRESS_USER_KEY, JSON.stringify(user));
    set({ expressUser: user, expressToken: token });
    return user;
  } catch (err) {
    console.log('[ExpressAuth] Excepción en login:', (err as Error)?.message ?? err);
    throw err;
  } finally {
    set({ isLoading: false });
  }
}

export const useExpressAuthStore = create<ExpressAuthState>((set, get) => ({
  expressUser: null,
  expressToken: null,
  isLoading: false,
  isInitialized: false,

  initializeExpress: async () => {
    try {
      set({ isLoading: true });
      console.log('[ExpressAuth] Inicializando...');
      const user = await get().loadStoredExpressSession();
      if (user) {
        console.log('[ExpressAuth] Sesión express restaurada para:', user.email);
        set({ expressUser: user });
      } else {
        console.log('[ExpressAuth] Sin sesión express almacenada');
      }
    } catch (err) {
      console.log('[ExpressAuth] Error en initializeExpress:', (err as Error)?.message ?? err);
    } finally {
      set({ isLoading: false, isInitialized: true });
    }
  },

  loginEstudiante: (input: ExpressLoginInput) =>
    doLogin((i) => authRepo.loginEstudiante(i), input, set),

  loginAdmin: (input: ExpressLoginInput) =>
    doLogin((i) => authRepo.loginAdmin(i), input, set),

  loginDocente: (input: ExpressLoginInput) =>
    doLogin((i) => authRepo.loginDocente(i), input, set),

  logoutExpress: async () => {
    console.log('[ExpressAuth] logoutExpress...');
    try {
      await SecureStore.deleteItemAsync(EXPRESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(EXPRESS_USER_KEY);
    } catch (err) {
      console.log('[ExpressAuth] Error limpiando SecureStore:', (err as Error)?.message ?? err);
    }
    set({ expressUser: null, expressToken: null });
  },

  loadStoredExpressSession: async () => {
    try {
      const token = await SecureStore.getItemAsync(EXPRESS_TOKEN_KEY);
      const userJson = await SecureStore.getItemAsync(EXPRESS_USER_KEY);

      if (token && userJson) {
        const user = JSON.parse(userJson) as ExpressUser;
        set({ expressToken: token });
        return user;
      }
      return null;
    } catch {
      return null;
    }
  },

  getExpressToken: () => {
    return get().expressToken;
  },
}));
