import { z } from 'zod';

export const eventCategorySchema = z.enum([
  'academico',
  'cultural',
  'deportivo',
  'tecnologico',
  'institucional',
]);

export const eventFormSchema = z
  .object({
    title: z
      .string()
      .min(3, 'El título debe tener al menos 3 caracteres')
      .max(150, 'El título no debe exceder 150 caracteres'),
    description: z
      .string()
      .min(10, 'La descripción debe tener al menos 10 caracteres')
      .max(2000, 'La descripción no debe exceder 2000 caracteres'),
    location: z
      .string()
      .min(3, 'La ubicación debe tener al menos 3 caracteres')
      .max(200, 'La ubicación no debe exceder 200 caracteres'),
    category: eventCategorySchema,
    imageUrl: z
      .string()
      .url('Debe ser una URL válida')
      .optional()
      .or(z.literal('')),
    startDate: z.string().min(1, 'La fecha de inicio es requerida'),
    startTime: z.string().min(1, 'La hora de inicio es requerida'),
    endDate: z
      .string()
      .optional()
      .or(z.literal('')),
    endTime: z
      .string()
      .optional()
      .or(z.literal('')),
    organizer: z
      .string()
      .min(1, 'El organizador es obligatorio')
      .max(100, 'El organizador no debe exceder 100 caracteres'),
  })
  .refine(
    (data) => {
      if (!data.endDate || !data.endTime) return true;
      const start = new Date(`${data.startDate}T${data.startTime}:00`);
      const end = new Date(`${data.endDate}T${data.endTime}:00`);
      return end > start;
    },
    {
      message: 'La fecha de fin debe ser posterior a la de inicio',
      path: ['endDate'],
    }
  );

export type EventFormInput = z.infer<typeof eventFormSchema>;
export type EventFormCategory = z.infer<typeof eventCategorySchema>;

export const EVENT_CATEGORY_OPTIONS: {
  value: EventFormCategory;
  label: string;
  emoji: string;
}[] = [
  { value: 'academico', label: 'Académico', emoji: '📚' },
  { value: 'cultural', label: 'Cultural', emoji: '🎭' },
  { value: 'deportivo', label: 'Deportivo', emoji: '⚽' },
  { value: 'tecnologico', label: 'Tecnológico', emoji: '💻' },
  { value: 'institucional', label: 'Institucional', emoji: '🏛️' },
];
