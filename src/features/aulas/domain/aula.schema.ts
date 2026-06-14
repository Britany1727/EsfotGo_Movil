import { z } from 'zod';

export const estadoAulaSchema = z.enum([
  'disponible',
  'ocupado',
  'mantenimiento',
]);

export const aulaFormSchema = z.object({
  nombre: z
    .string()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(100, 'El nombre no debe exceder 100 caracteres'),
  ubicacion: z
    .string()
    .min(2, 'La ubicación debe tener al menos 2 caracteres')
    .max(150, 'La ubicación no debe exceder 150 caracteres'),
  capacidad: z
    .string()
    .optional()
    .or(z.literal('')),
  estado: estadoAulaSchema,
});

export type AulaFormInput = z.infer<typeof aulaFormSchema>;
export type AulaEstado = z.infer<typeof estadoAulaSchema>;

export const ESTADO_AULA_OPTIONS: {
  value: AulaEstado;
  label: string;
  emoji: string;
}[] = [
  { value: 'disponible', label: 'Disponible', emoji: '🟢' },
  { value: 'ocupado', label: 'Ocupado', emoji: '🔴' },
  { value: 'mantenimiento', label: 'Mantenimiento', emoji: '🟡' },
];
