import * as SecureStore from 'expo-secure-store';
import { expressClient } from '@/services/express/api-client';
import { AuthError } from '@/core/errors/app-error';
import type { User } from '@/core/types';
import type { IAuthRepository, RegistrationResult } from '../domain/auth.repository';
import type { LoginInput, RegisterInput, UpdateProfileInput } from '../domain/auth.schema';
import { mapUserDtoToUser } from '@/services/express/adapters/mongo-mappers';
import type { UserDto } from '@/services/express/adapters/mongo-dtos';

const AUTH_TOKEN_KEY = 'esfotgo_jwt_token';
const AUTH_USER_KEY = 'esfotgo_jwt_user';
const AUTH_REFRESH_KEY = 'esfotgo_jwt_refresh';

interface LoginResponse { token: string; user: UserDto; refreshToken?: string; }
interface RegisterResponse { msg: string; emailConfirmationRequired?: boolean; user?: UserDto; }
interface ProfileResponse { _id: string; nombre: string; apellido?: string; email: string; telefono?: string; rol?: string; imagen?: string; }

export class ExpressAuthRepository implements IAuthRepository {
  async signIn(input: LoginInput): Promise<{ user: User; token: string }> {
    console.log('[ExpressRepo] signIn:', input.email);
    const { data, error } = await expressClient.post<LoginResponse>(
      '/estudiantes/login',
      { email: input.email.toLowerCase().trim(), password: input.password }
    );
    if (error || !data) {
      console.log('[ExpressRepo] signIn error:', error);
      throw new AuthError(error ?? 'Credenciales inválidas');
    }
    console.log('[ExpressRepo] signIn exitoso');
    await SecureStore.setItemAsync(AUTH_TOKEN_KEY, data.token);
    if (data.refreshToken) {
      await SecureStore.setItemAsync(AUTH_REFRESH_KEY, data.refreshToken);
    }
    await SecureStore.setItemAsync(AUTH_USER_KEY, JSON.stringify(data.user));
    return { user: mapUserDtoToUser(data.user), token: data.token };
  }

  async signUp(input: RegisterInput): Promise<RegistrationResult> {
    console.log('[ExpressRepo] signUp:', input.email, input.nombre, input.apellido);
    const { data, error } = await expressClient.post<RegisterResponse>(
      '/estudiantes/registro',
      {
        email: input.email.toLowerCase().trim(),
        password: input.password,
        nombre: input.nombre.trim(),
        apellido: input.apellido.trim(),
        telefono: input.telefono,
      }
    );
    if (error || !data) {
      console.log('[ExpressRepo] signUp error:', error);
      throw new AuthError(error ?? 'Error al registrar');
    }
    console.log('[ExpressRepo] signUp exitoso');
    const user: User = {
      id: data.user?._id ?? '',
      email: input.email.toLowerCase().trim(),
      fullName: `${input.nombre.trim()} ${input.apellido.trim()}`,
      role: 'estudiante',
      avatarUrl: null,
      phone: input.telefono,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return { user, emailConfirmationRequired: data.emailConfirmationRequired ?? false };
  }

  async signUpDocente(input: RegisterInput): Promise<RegistrationResult> {
    console.log('[ExpressRepo] signUpDocente:', input.email);
    const { data, error } = await expressClient.post<RegisterResponse>(
      '/docente/registro',
      {
        email: input.email.toLowerCase().trim(),
        password: input.password,
        nombre: input.nombre.trim(),
        apellido: input.apellido.trim(),
        telefono: input.telefono,
      }
    );
    if (error || !data) {
      console.log('[ExpressRepo] signUpDocente error:', error);
      throw new AuthError(error ?? 'Error al registrar docente');
    }
    console.log('[ExpressRepo] signUpDocente exitoso');
    const user: User = {
      id: data.user?._id ?? '',
      email: input.email.toLowerCase().trim(),
      fullName: `${input.nombre.trim()} ${input.apellido.trim()}`,
      role: 'docente',
      avatarUrl: null,
      phone: input.telefono,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return { user, emailConfirmationRequired: data.emailConfirmationRequired ?? false };
  }

  async resendVerificationEmail(email: string): Promise<void> {
    await expressClient.post('/estudiantes/reenviar-verificacion', { email });
  }

  async checkEmailVerification(_email: string): Promise<boolean> {
    try {
      const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
      return !!token;
    } catch { return false; }
  }

  async signOut(): Promise<void> {
    try { await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY); } catch {}
    try { await SecureStore.deleteItemAsync(AUTH_REFRESH_KEY); } catch {}
    try { await SecureStore.deleteItemAsync(AUTH_USER_KEY); } catch {}
  }

  async getSession(): Promise<{ user: User; token: string } | null> {
    try {
      const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
      const userJson = await SecureStore.getItemAsync(AUTH_USER_KEY);
      if (!token) {
        console.log('[ExpressRepo] getSession: sin token');
        return null;
      }
      const { data, error } = await expressClient.get<ProfileResponse>('/perfil', token);
      if (error || !data) {
        console.log('[ExpressRepo] getSession: error al obtener perfil:', error, '— usando datos locales');
        if (userJson) {
          const stored = JSON.parse(userJson) as unknown as UserDto;
          return { user: mapUserDtoToUser(stored), token };
        }
        return null;
      }
      const user = mapUserDtoToUser(data as unknown as UserDto);
      await SecureStore.setItemAsync(AUTH_USER_KEY, JSON.stringify(user));
      return { user, token };
    } catch (err) {
      console.log('[ExpressRepo] getSession: excepción:', (err as Error)?.message ?? err);
      return null;
    }
  }

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<User> {
    const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
    console.log('[ExpressRepo] updateProfile:', userId);
    const payload: Record<string, unknown> = {};
    if (input.fullName) {
      const parts = input.fullName.trim().split(/\s+/);
      payload.nombre = parts[0] || '';
      payload.apellido = parts.slice(1).join(' ') || '';
    }
    if (input.phone) payload.telefono = input.phone;
    const { data, error } = await expressClient.put<ProfileResponse>(`/actualizarperfil/${userId}`, payload, token);
    if (error || !data) {
      console.log('[ExpressRepo] updateProfile error:', error);
      throw new AuthError(error ?? 'Error al actualizar perfil');
    }
    return mapUserDtoToUser(data as unknown as UserDto);
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
    console.log('[ExpressRepo] changePassword');
    const { error } = await expressClient.put('/actualizarperfil/cambiar-password', { currentPassword, newPassword }, token);
    if (error) {
      console.log('[ExpressRepo] changePassword error:', error);
      throw new AuthError(error);
    }
  }

  async recoverPassword(email: string): Promise<void> {
    const { error } = await expressClient.post('/estudiantes/recuperar-password', { email });
    if (error) throw new AuthError(error);
  }

  async verifyResetToken(token: string): Promise<boolean> {
    const { data, error } = await expressClient.get<{ msg: string }>(`/recuperarpassword/${token}`);
    if (error || !data) {
      console.log('[ExpressRepo] verifyResetToken: token inválido:', error);
      return false;
    }
    return true;
  }

  async resetPassword(token: string, password: string, confirmPassword: string): Promise<void> {
    const { error } = await expressClient.post(`/nuevopassword/${token}`, {
      password,
      confirmPassword,
    });
    if (error) throw new AuthError(error);
  }

  async refreshSession(): Promise<{ user: User; token: string } | null> {
    try {
      const refreshToken = await SecureStore.getItemAsync(AUTH_REFRESH_KEY);
      if (!refreshToken) {
        console.log('[ExpressRepo] refreshSession: sin refreshToken — usando getSession');
        return this.getSession();
      }

      console.log('[ExpressRepo] refreshSession: llamando /auth/refresh');
      const { data, error } = await expressClient.post<{ token: string; refreshToken?: string }>(
        '/auth/refresh',
        { refreshToken }
      );

      if (error || !data?.token) {
        console.log('[ExpressRepo] refreshSession: falló el refresh — usando getSession');
        return this.getSession();
      }

      await SecureStore.setItemAsync(AUTH_TOKEN_KEY, data.token);
      if (data.refreshToken) await SecureStore.setItemAsync(AUTH_REFRESH_KEY, data.refreshToken);

      const user = await this.getSession();
      if (user) return { user: user.user, token: data.token };
      return null;
    } catch (err) {
      console.log('[ExpressRepo] refreshSession: excepción:', (err as Error)?.message ?? err);
      return this.getSession();
    }
  }

  subscribeToAuthChanges(callback: (session: { user: User; token: string } | null) => void): () => void {
    const interval = setInterval(async () => {
      const session = await this.getSession();
      callback(session);
    }, 4 * 60 * 1000);
    return () => clearInterval(interval);
  }
}
