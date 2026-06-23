import { z } from 'zod';

export const UserRowSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  apellido: z.string().min(1, 'El apellido es obligatorio'),
  email: z.string().min(1, 'Email requerido').email('Email inválido'),
  cedula: z.string().regex(/^\d{10}$/, 'La cédula debe tener 10 dígitos'),
  role: z.enum(['estudiante', 'docente', 'administrador']).optional().default('estudiante'),
  telefono: z.string().optional(),
});

export const PoiRowSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  descripcion: z.string().optional(),
  categoria: z.enum(['aula', 'oficina', 'laboratorio', 'servicio', 'otro']),
  latitud: z.preprocess(
    (v) => parseFloat(String(v)),
    z.number().min(-90, 'Latitud debe ser >= -90').max(90, 'Latitud debe ser <= 90')
  ),
  longitud: z.preprocess(
    (v) => parseFloat(String(v)),
    z.number().min(-180, 'Longitud debe ser >= -180').max(180, 'Longitud debe ser <= 180')
  ),
  piso: z.preprocess(
    (v) => (v === '' || v === undefined ? undefined : parseInt(String(v), 10)),
    z.number().int().optional()
  ),
});

export type UserRowInput = z.infer<typeof UserRowSchema>;
export type PoiRowInput = z.infer<typeof PoiRowSchema>;
