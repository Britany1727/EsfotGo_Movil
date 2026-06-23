import * as SecureStore from 'expo-secure-store';
import { httpClient } from '@/services/http-client';
import { AppError } from '@/core/errors/app-error';
import type { Tutoria, TutoriaEnrollment, TutoriaStatus } from '../domain/tutoria.entity';
// note: TutoriaStatus used in STATUS_MAP and normalizeStatus
import { isDevMode } from '@/core/config/env';

const AUTH_TOKEN_KEY = 'esfotgo_jwt_token';

// ─── DTOs (formato backend real, evidenciado por la web) ───

interface TutoriaResponseDto {
  _id: string;
  docente?: string;
  oficina?: string;
  informacion?: string;
  titulo?: string;
  fecha?: string;
  duracion?: number;
  cupo_maximo?: number;
  inscritos?: number;
  creado_por?: string;
  horarios?: { dia: string; horaInicio: string; horaFin: string }[];
  estado?: string;
  created_at?: string;
  updated_at?: string;
}

// ─── Mappers ────────────────────────────────────────────────

const STATUS_MAP: Record<string, TutoriaStatus> = {
  programada: 'programada', pendiente: 'pendiente', finalizada: 'finalizada', cancelada: 'cancelada',
  scheduled: 'programada', pending: 'pendiente', completed: 'finalizada', cancelled: 'cancelada',
  Programada: 'programada', Pendiente: 'pendiente', Finalizada: 'finalizada', Cancelada: 'cancelada',
  PROGRAMADA: 'programada', PENDIENTE: 'pendiente', FINALIZADA: 'finalizada', CANCELADA: 'cancelada',
};

function normalizeStatus(raw: string | undefined): TutoriaStatus {
  return STATUS_MAP[raw ?? ''] ?? 'programada';
}

function mapDtoToTutoria(dto: TutoriaResponseDto): Tutoria {
  const horarios = (dto.horarios ?? []).map((h) => ({
    dia: h.dia,
    horaInicio: h.horaInicio,
    horaFin: h.horaFin,
  }));
  const firstHorario = horarios[0];
  return {
    id: dto._id,
    title: dto.titulo ?? dto.informacion?.slice(0, 50) ?? '',
    subject: dto.docente ?? '',
    description: dto.informacion ?? undefined,
    date: dto.fecha ?? new Date().toISOString().slice(0, 10),
    time: firstHorario ? `${firstHorario.horaInicio} - ${firstHorario.horaFin}` : '',
    duration: dto.duracion ?? 60,
    location: dto.oficina ?? undefined,
    maxStudents: dto.cupo_maximo ?? 20,
    enrolledCount: dto.inscritos ?? 0,
    horarios,
    status: normalizeStatus(dto.estado),
    createdBy: dto.creado_por ?? '',
    createdAt: dto.created_at ?? new Date().toISOString(),
    updatedAt: dto.updated_at ?? new Date().toISOString(),
  };
}

function mapTutoriaToBackendDto(input: Omit<Tutoria, 'id' | 'createdAt' | 'updatedAt' | 'enrolledCount'>): Record<string, unknown> {
  return {
    docente: input.subject,
    oficina: input.location ?? '',
    informacion: input.description ?? input.title,
    titulo: input.title,
    fecha: input.date,
    duracion: input.duration,
    cupo_maximo: input.maxStudents,
    creado_por: input.createdBy || undefined,
    horarios: (input.horarios && input.horarios.length > 0)
      ? input.horarios.map((h) => ({ dia: h.dia, horaInicio: h.horaInicio, horaFin: h.horaFin }))
      : [{ dia: 'Lunes', horaInicio: '08:00', horaFin: '10:00' }],
  };
}

function mapTutoriaUpdateToBackendDto(input: Partial<Tutoria>): Record<string, unknown> {
  const dto: Record<string, unknown> = {};
  if (input.subject !== undefined) dto.docente = input.subject;
  if (input.location !== undefined) dto.oficina = input.location;
  if (input.description !== undefined || input.title !== undefined) dto.informacion = input.description ?? input.title;
  if (input.title !== undefined) dto.titulo = input.title;
  if (input.date !== undefined) dto.fecha = input.date;
  if (input.duration !== undefined) dto.duracion = input.duration;
  if (input.maxStudents !== undefined) dto.cupo_maximo = input.maxStudents;
  if (input.createdBy !== undefined) dto.creado_por = input.createdBy;
  if (input.horarios !== undefined) {
    dto.horarios = input.horarios.map((h) => ({ dia: h.dia, horaInicio: h.horaInicio, horaFin: h.horaFin }));
  }
  return dto;
}

// ─── Repository (rutas compatibles con la web) ─────────────

export class ExpressTutoriaRepository {
  private async token(): Promise<string | null> {
    try { return SecureStore.getItemAsync(AUTH_TOKEN_KEY); } catch { return null; }
  }

  async getAll(): Promise<Tutoria[]> {
    if (isDevMode()) return [];
    const t = await this.token();
    const { data, error } = await httpClient.get<TutoriaResponseDto[]>('/admin/tutorias', t);
    if (error) throw new AppError(error ?? 'Unknown API error', 'API_ERROR');
    return (data ?? []).map(mapDtoToTutoria);
  }

  async getById(id: string): Promise<Tutoria> {
    const t = await this.token();
    const { data, error } = await httpClient.get<TutoriaResponseDto>(`/admin/tutorias/${id}`, t);
    if (error || !data) throw new AppError(error ?? 'Tutoría no encontrada', 'API_ERROR');
    return mapDtoToTutoria(data);
  }

  async create(input: Omit<Tutoria, 'id' | 'createdAt' | 'updatedAt' | 'enrolledCount'>): Promise<Tutoria> {
    const t = await this.token();
    const dto = mapTutoriaToBackendDto(input);
    console.log('[ExpressTutoriaRepo] Creando tutoria:', input.title);
    const { data, error } = await httpClient.post<TutoriaResponseDto>('/admin/tutoria', dto, t);
    if (error || !data) {
      console.log('[ExpressTutoriaRepo] Error creando tutoria:', error);
      throw new AppError(error ?? 'Unknown API error', 'API_ERROR');
    }
    console.log('[ExpressTutoriaRepo] Tutoria creada:', data._id);
    return mapDtoToTutoria(data);
  }

  async update(id: string, input: Partial<Tutoria>): Promise<Tutoria> {
    const t = await this.token();
    const dto = mapTutoriaUpdateToBackendDto(input);
    console.log('[ExpressTutoriaRepo] Actualizando tutoria:', id);
    const { data, error } = await httpClient.put<TutoriaResponseDto>(`/admin/tutoria/${id}`, dto, t);
    if (error || !data) {
      console.log('[ExpressTutoriaRepo] Error actualizando tutoria:', error);
      throw new AppError(error ?? 'Unknown API error', 'API_ERROR');
    }
    console.log('[ExpressTutoriaRepo] Tutoria actualizada:', id);
    return mapDtoToTutoria(data);
  }

  async delete(id: string): Promise<void> {
    const t = await this.token();
    console.log('[ExpressTutoriaRepo] Eliminando tutoria:', id);
    const { error } = await httpClient.delete(`/admin/tutoria/${id}`, t);
    if (error) {
      console.log('[ExpressTutoriaRepo] Error eliminando tutoria:', error);
      throw new AppError(error ?? 'Unknown API error', 'API_ERROR');
    }
  }

  async getEnrollments(tutoriaId: string): Promise<TutoriaEnrollment[]> {
    const t = await this.token();
    const { data, error } = await httpClient.get<Record<string, unknown>[]>(`/admin/tutoria/${tutoriaId}/inscripciones`, t);
    if (error) return [];
    return (data ?? []).map((r) => ({
      id: r._id as string,
      tutoriaId: r.tutoria_id as string,
      studentId: r.estudiante_id as string,
      createdAt: (r.created_at as string) ?? '',
    }));
  }

  async enroll(tutoriaId: string, studentId: string): Promise<void> {
    const t = await this.token();
    const { error } = await httpClient.post(`/admin/tutoria/${tutoriaId}/inscribir`, { estudiante_id: studentId }, t);
    if (error) throw new AppError(error ?? 'Unknown API error', 'API_ERROR');
  }

  async unenroll(tutoriaId: string, studentId: string): Promise<void> {
    const t = await this.token();
    const { error } = await httpClient.delete(`/admin/tutoria/${tutoriaId}/inscribir?estudiante_id=${studentId}`, t);
    if (error) throw new AppError(error ?? 'Unknown API error', 'API_ERROR');
  }

  async isEnrolled(tutoriaId: string, studentId: string): Promise<boolean> {
    const enrollments = await this.getEnrollments(tutoriaId);
    return enrollments.some((e) => e.studentId === studentId);
  }
}
