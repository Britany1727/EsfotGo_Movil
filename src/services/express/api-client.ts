import { env } from '@/core/config/env';

const BASE_URL = env.EXPO_PUBLIC_API_BASE_URL;

interface RequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  body?: unknown;
  token?: string | null;
  formData?: FormData;
}

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
}

function unwrapResponse<T>(raw: unknown): { data: T | null; error: string | null; consumed: boolean } {
  if (raw && typeof raw === 'object' && 'success' in raw) {
    const wrapped = raw as { success: boolean; data: unknown; message?: string };
    if (!wrapped.success) {
      return { data: null, error: wrapped.message ?? 'Error del servidor', consumed: true };
    }
    return { data: wrapped.data as T, error: null, consumed: true };
  }
  return { data: raw as T, error: null, consumed: false };
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(config: RequestConfig): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${config.path}`;
    const headers: Record<string, string> = {};

    if (!config.formData) {
      headers['Content-Type'] = 'application/json';
    }

    if (config.token) {
      headers['Authorization'] = `Bearer ${config.token}`;
    }

    try {
      console.log(`[ApiClient] ${config.method} ${config.path}`);
      const response = await fetch(url, {
        method: config.method,
        headers,
        body: config.formData ?? (config.body ? JSON.stringify(config.body) : undefined),
      });

      const contentType = response.headers.get('content-type');
      let raw: unknown = null;

      if (contentType?.includes('application/json')) {
        raw = await response.json();
      }

      // Unwrap backend response wrapper { success, data, message }
      const { data, error, consumed } = unwrapResponse<T>(raw);

      if (consumed && error) {
        console.log(`[ApiClient] ${config.method} ${config.path} → ${response.status} (wrapper error):`, error);
        return { data: null, error, status: response.status };
      }

      console.log(`[ApiClient] ${config.method} ${config.path} → ${response.status}${!response.ok ? ' (error)' : ''}`);

      if (!response.ok) {
        const errorMsg =
          (raw as Record<string, unknown>)?.message as string ??
          (raw as Record<string, unknown>)?.msg as string ??
          `Error ${response.status}`;
        console.log(`[ApiClient] Error body:`, errorMsg);
        return { data: null, error: errorMsg, status: response.status };
      }

      return { data, error: null, status: response.status };
    } catch (error) {
      const message =
        error instanceof TypeError && error.message === 'Network request failed'
          ? 'Error de conexión. Verifica tu internet.'
          : 'Error inesperado al comunicarse con el servidor.';

      console.log(`[ApiClient] ${config.method} ${config.path} → EXCEPCIÓN:`, (error as Error)?.message ?? error);
      return { data: null, error: message, status: 0 };
    }
  }

  get<T>(path: string, token?: string | null): Promise<ApiResponse<T>> {
    return this.request<T>({ method: 'GET', path, token });
  }

  post<T>(path: string, body?: unknown, token?: string | null): Promise<ApiResponse<T>> {
    return this.request<T>({ method: 'POST', path, body, token });
  }

  put<T>(path: string, body?: unknown, token?: string | null): Promise<ApiResponse<T>> {
    return this.request<T>({ method: 'PUT', path, body, token });
  }

  delete<T>(path: string, token?: string | null): Promise<ApiResponse<T>> {
    return this.request<T>({ method: 'DELETE', path, token });
  }

  upload<T>(path: string, formData: FormData, token?: string | null): Promise<ApiResponse<T>> {
    return this.request<T>({ method: 'POST', path, formData, token });
  }
}

export const expressClient = new ApiClient();
