import { httpClient, ApiResponse } from '@/services/http-client';
import type {
  ExpressLoginInput,
  ExpressLoginResult,
  ExpressRegisterInput,
  ExpressUser,
  Aula,
  Oficina,
  ExpressEvento,
} from './express-types';

export class ExpressAuthRepository {
  async loginEstudiante(input: ExpressLoginInput): Promise<ApiResponse<ExpressLoginResult>> {
    return httpClient.post<ExpressLoginResult>('/estudiantes/login', input);
  }

  async loginDocente(input: ExpressLoginInput): Promise<ApiResponse<ExpressLoginResult>> {
    return httpClient.post<ExpressLoginResult>('/docente/login', input);
  }

  async loginAdmin(input: ExpressLoginInput): Promise<ApiResponse<ExpressLoginResult>> {
    return httpClient.post<ExpressLoginResult>('/admin/login', input);
  }

  async registerEstudiante(input: ExpressRegisterInput): Promise<ApiResponse<{ msg: string }>> {
    return httpClient.post<{ msg: string }>('/estudiantes/registro', {
      ...input,
      nombre: input.nombre ?? '',
    });
  }

  async getProfile(token: string): Promise<ApiResponse<ExpressUser>> {
    return httpClient.get<ExpressUser>('/perfil', token);
  }

  async updateProfile(
    id: string,
    data: Partial<ExpressUser>,
    token: string
  ): Promise<ApiResponse<{ msg: string }>> {
    return httpClient.put<{ msg: string }>(`/actualizarperfil/${id}`, data, token);
  }

  async updatePassword(
    id: string,
    passwordactual: string,
    passwordnuevo: string,
    token: string
  ): Promise<ApiResponse<{ msg: string }>> {
    return httpClient.put<{ msg: string }>(
      `/actualizarpassword/${id}`,
      { passwordactual, passwordnuevo },
      token
    );
  }

  async recoverPassword(email: string): Promise<ApiResponse<{ msg: string }>> {
    return httpClient.post<{ msg: string }>('/recuperarpassword', { email });
  }
}

export class ExpressAulasRepository {
  async getAulas(token?: string): Promise<ApiResponse<Aula[]>> {
    return httpClient.get<Aula[]>('/aulas', token);
  }

  async getAulaById(id: string, token?: string): Promise<ApiResponse<Aula>> {
    return httpClient.get<Aula>(`/veraula/${id}`, token);
  }
}

export class ExpressAdminAulasRepository {
  async createAula(data: Partial<Aula>, token: string): Promise<ApiResponse<{ msg: string }>> {
    return httpClient.post<{ msg: string }>('/admin/aula', data, token);
  }

  async updateAula(id: string, data: Partial<Aula>, token: string): Promise<ApiResponse<{ msg: string }>> {
    return httpClient.put<{ msg: string }>(`/admin/actualizaraula/${id}`, data, token);
  }

  async deleteAula(id: string, token: string): Promise<ApiResponse<{ msg: string }>> {
    return httpClient.delete<{ msg: string }>(`/admin/eliminaraula/${id}`, token);
  }
}

export class ExpressOficinasRepository {
  async getOficinas(token?: string): Promise<ApiResponse<Oficina[]>> {
    return httpClient.get<Oficina[]>('/oficinas', token);
  }

  async getOficinaById(id: string, token?: string): Promise<ApiResponse<Oficina>> {
    return httpClient.get<Oficina>(`/veroficina/${id}`, token);
  }
}

export class ExpressAdminOficinasRepository {
  async createOficina(data: Partial<Oficina>, token: string): Promise<ApiResponse<{ msg: string }>> {
    return httpClient.post<{ msg: string }>('/admin/oficina', data, token);
  }

  async updateOficina(id: string, data: Partial<Oficina>, token: string): Promise<ApiResponse<{ msg: string }>> {
    return httpClient.put<{ msg: string }>(`/admin/actualizaroficina/${id}`, data, token);
  }

  async deleteOficina(id: string, token: string): Promise<ApiResponse<{ msg: string }>> {
    return httpClient.delete<{ msg: string }>(`/admin/eliminaroficina/${id}`, token);
  }
}

export class ExpressEventosRepository {
  async getEventos(): Promise<ApiResponse<ExpressEvento[]>> {
    return httpClient.get<ExpressEvento[]>('/eventos');
  }

  async getEventoById(id: string): Promise<ApiResponse<ExpressEvento>> {
    return httpClient.get<ExpressEvento>(`/verevento/${id}`);
  }
}
