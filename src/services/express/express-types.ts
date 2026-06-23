export type ExpressRole = 'admin' | 'docente' | 'user' | 'estudiante';

export interface ExpressUser {
  _id: string;
  nombre: string;
  apellido?: string;
  email: string;
  direccion?: string;
  telefono?: string;
  rol: ExpressRole;
  imagen?: string;
}

export interface ExpressLoginInput {
  email: string;
  password: string;
}

export interface ExpressLoginResult {
  token: string;
  _id: string;
  id?: string;
}

export interface ExpressProfileResult {
  _id: string;
  nombre: string;
  apellido?: string;
  email: string;
  telefono?: string;
  rol?: string;
  imagen?: string;
}

export interface ExpressRegisterInput {
  email: string;
  password: string;
  nombre?: string;
  apellido?: string;
}

export interface Aula {
  _id: string;
  nombre: string;
  capacidad?: number;
  ubicacion?: string;
  estado?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Oficina {
  _id: string;
  nombre: string;
  descripcion?: string;
  ubicacion?: string;
  horario?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ExpressEvento {
  _id: string;
  nombre: string;
  informacion: string;
  ubicacion?: string;
  fecha: string;
  hora: string;
  organizador: string;
  imagen?: string;
}
