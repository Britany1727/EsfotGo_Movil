import { httpClient, ApiResponse } from '@/services/http-client';
import type { ManagedUser, ManagedUserType, ManagedUserStatus, CreateManagedUserInput } from '../domain/user-management.entity';
import { isDevMode } from '@/core/config/env';
import { MockData } from '@/core/dev/mock-services';

function parseStatus(value: unknown): ManagedUserStatus {
  if (typeof value === 'boolean') return value ? 'activo' : 'inactivo';
  if (typeof value === 'string') return value.toLowerCase() === 'inactivo' ? 'inactivo' : 'activo';
  return 'activo';
}

export class ExpressUserManagementRepository {
  async getEstudiantes(token: string): Promise<ApiResponse<ManagedUser[]>> {
    if (isDevMode()) {
      const users = await MockData.getManagedUsers('estudiante');
      return { data: users, error: null, status: 200 };
    }
    const res = await httpClient.get<Record<string, unknown>[]>('/estudiantes', token);
    if (res.error || !res.data) return { data: null, error: res.error, status: res.status };
    return { data: res.data.map(this.mapToManagedUser('estudiante')), error: null, status: res.status };
  }

  async getDocentes(token: string): Promise<ApiResponse<ManagedUser[]>> {
    if (isDevMode()) {
      const users = await MockData.getManagedUsers('docente');
      return { data: users, error: null, status: 200 };
    }
    const res = await httpClient.get<Record<string, unknown>[]>('/docentes', token);
    if (res.error || !res.data) return { data: null, error: res.error, status: res.status };
    return { data: res.data.map(this.mapToManagedUser('docente')), error: null, status: res.status };
  }

  async updateEstudiante(
    id: string,
    data: Partial<ManagedUser>,
    token: string
  ): Promise<ApiResponse<{ msg: string }>> {
    if (isDevMode()) return { data: { msg: 'Usuario actualizado' }, error: null, status: 200 };
    return httpClient.put(`/admin/actualizarEstudiante/${id}`, data, token);
  }

  async updateDocente(
    id: string,
    data: Partial<ManagedUser>,
    token: string
  ): Promise<ApiResponse<{ msg: string }>> {
    if (isDevMode()) return { data: { msg: 'Usuario actualizado' }, error: null, status: 200 };
    return httpClient.put(`/admin/actualizardocente/${id}`, data, token);
  }

  async deleteEstudiante(
    id: string,
    token: string
  ): Promise<ApiResponse<{ msg: string }>> {
    if (isDevMode()) return { data: { msg: 'Usuario eliminado' }, error: null, status: 200 };
    return httpClient.delete(`/admin/eliminarestudiante/${id}`, token);
  }

  async deleteDocente(
    id: string,
    token: string
  ): Promise<ApiResponse<{ msg: string }>> {
    if (isDevMode()) return { data: { msg: 'Usuario eliminado' }, error: null, status: 200 };
    return httpClient.delete(`/admin/eliminardocente/${id}`, token);
  }

  async createEstudiante(
    input: CreateManagedUserInput,
    token: string
  ): Promise<ApiResponse<{ msg: string }>> {
    if (isDevMode()) return { data: { msg: 'Estudiante creado' }, error: null, status: 201 };
    return httpClient.post('/admin/crearEstudiante', input, token);
  }

  async createDocente(
    input: CreateManagedUserInput,
    token: string
  ): Promise<ApiResponse<{ msg: string }>> {
    if (isDevMode()) return { data: { msg: 'Docente creado' }, error: null, status: 201 };
    return httpClient.post('/admin/crearDocente', input, token);
  }

  private mapToManagedUser(type: ManagedUserType) {
    return (row: Record<string, unknown>): ManagedUser => ({
      _id: row._id as string,
      nombre: (row.nombre as string) ?? '',
      apellido: (row.apellido as string) ?? undefined,
      email: (row.email as string) ?? '',
      direccion: (row.direccion as string) ?? undefined,
      telefono: (row.telefono as string) ?? undefined,
      rol: (row.rol as ManagedUser['rol']) ?? (type === 'docente' ? 'docente' : 'estudiante'),
      status: parseStatus(row.status),
      type,
      createdAt: (row.createdAt as string) ?? undefined,
      updatedAt: (row.updatedAt as string) ?? undefined,
    });
  }
}
