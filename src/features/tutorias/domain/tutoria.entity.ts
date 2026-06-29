export interface Horario {
  dia: string;
  horaInicio: string;
  horaFin: string;
}

export type TutoriaStatus = 'programada' | 'pendiente' | 'finalizada' | 'cancelada';

export type EnrollmentStatus = 'pendiente' | 'aceptado' | 'rechazado';

export interface Tutoria {
  id: string;
  title: string;
  subject: string;
  docente?: string;
  description?: string;
  date: string;
  time: string;
  duration: number;
  location?: string;
  maxStudents: number;
  enrolledCount: number;
  horarios: Horario[];
  status: TutoriaStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TutoriaEnrollment {
  id: string;
  tutoriaId: string;
  studentId: string;
  estado: EnrollmentStatus;
  createdAt: string;
}

export interface DocenteInfo {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  imagen: string;
}

export interface EstudianteInfo {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  imagen: string;
}

export interface InscripcionTutoriaInfo {
  _id: string;
  titulo: string;
  horarios: Horario[];
  informacion: string;
  oficina: string;
}

export interface Inscripcion {
  _id: string;
  tutoria_id: InscripcionTutoriaInfo | string;
  estudiante_id: EstudianteInfo | string;
  estado: EnrollmentStatus;
  created_at: string;
}

export const ENROLLMENT_STATUS_COLORS: Record<EnrollmentStatus, string> = {
  pendiente: '#D97706',
  aceptado: '#059669',
  rechazado: '#DC2626',
};

export const ENROLLMENT_STATUS_LABELS: Record<EnrollmentStatus, string> = {
  pendiente: 'Pendiente',
  aceptado: 'Aceptado',
  rechazado: 'Rechazado',
};
