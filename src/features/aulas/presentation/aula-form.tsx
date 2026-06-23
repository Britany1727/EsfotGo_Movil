import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  View, Text, TextInput as RNInput, Pressable,
  StyleSheet, ActivityIndicator, ScrollView,
} from 'react-native';
import { useState, useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import { aulaFormSchema, ESTADO_AULA_OPTIONS } from '../domain/aula.schema';
import type { AulaFormInput, AulaEstado } from '../domain/aula.schema';
import type { Aula } from '@/services/express/express-types';
import { useCreateAula, useUpdateAula } from '../application/aulas-admin.hooks';
import { LightTheme as T, Sizes, Shadows, Typography } from '@/constants/design-system';

interface AulaFormProps {
  onClose: () => void;
  onSuccess?: () => void;
  editData?: Aula;
}

export function AulaForm({ onClose, onSuccess, editData }: AulaFormProps) {
  const createMutation = useCreateAula();
  const updateMutation = useUpdateAula();
  const isEdit = !!editData;

  const { control, handleSubmit, formState: { errors, isDirty }, setValue } = useForm<AulaFormInput>({
    resolver: zodResolver(aulaFormSchema),
    defaultValues: {
      nombre: editData?.nombre ?? '',
      ubicacion: editData?.ubicacion ?? '',
      capacidad: editData?.capacidad?.toString() ?? '',
      estado: (editData?.estado as AulaEstado | undefined) ?? 'disponible',
    },
  });

  const [selectedEstado, setSelectedEstado] = useState<AulaEstado>(
    (editData?.estado as AulaEstado) ?? 'disponible'
  );

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const onSubmit = useCallback(async (data: AulaFormInput) => {
    try {
      const payload: Partial<Aula> = {
        nombre: data.nombre,
        ubicacion: data.ubicacion,
        capacidad: data.capacidad ? parseInt(data.capacidad, 10) : undefined,
        estado: data.estado,
      };

      if (isEdit && editData) {
        await updateMutation.mutateAsync({ id: editData._id, data: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }

      onSuccess?.();
      onClose();
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: error instanceof Error ? error.message : 'Ocurrió un error inesperado' });
    }
  }, [isEdit, editData, createMutation, updateMutation, onSuccess, onClose]);

  const handleEstadoSelect = useCallback((estado: AulaEstado) => {
    setSelectedEstado(estado);
    setValue('estado', estado, { shouldValidate: true, shouldDirty: true });
  }, [setValue]);

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <View style={styles.root}>
        {createMutation.isError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>
              {(createMutation.error as Error)?.message ?? 'Error al crear el aula'}
            </Text>
          </View>
        )}
        {updateMutation.isError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>
              {(updateMutation.error as Error)?.message ?? 'Error al actualizar el aula'}
            </Text>
          </View>
        )}

        <Field label="Nombre *" error={errors.nombre?.message}>
          <Controller control={control} name="nombre"
            render={({ field: { onChange, onBlur, value } }) => (
              <RNInput style={[styles.input, errors.nombre && styles.inputErr]}
                placeholder="Ej: Laboratorio de Cómputo 3" placeholderTextColor={T.inputPlaceholder}
                onBlur={onBlur} onChangeText={onChange} value={value} />
            )} />
        </Field>

        <Field label="Ubicación *" error={errors.ubicacion?.message}>
          <Controller control={control} name="ubicacion"
            render={({ field: { onChange, onBlur, value } }) => (
              <RNInput style={[styles.input, errors.ubicacion && styles.inputErr]}
                placeholder="Ej: Edificio ESFOT - Piso 1" placeholderTextColor={T.inputPlaceholder}
                onBlur={onBlur} onChangeText={onChange} value={value} />
            )} />
        </Field>

        <Field label="Capacidad" error={errors.capacidad?.message}>
          <Controller control={control} name="capacidad"
            render={({ field: { onChange, onBlur, value } }) => (
              <RNInput style={[styles.input, errors.capacidad && styles.inputErr]}
                placeholder="Ej: 30" placeholderTextColor={T.inputPlaceholder}
                keyboardType="numeric" onBlur={onBlur} onChangeText={onChange} value={value} />
            )} />
        </Field>

        <View style={styles.field}>
          <Text style={styles.label}>Estado</Text>
          <View style={styles.estadoRow}>
            {ESTADO_AULA_OPTIONS.map((opt) => (
              <Pressable key={opt.value}
                style={[styles.estadoChip, selectedEstado === opt.value && styles.estadoChipOn]}
                onPress={() => handleEstadoSelect(opt.value)}>
                <Text style={[styles.estadoChipText, selectedEstado === opt.value && styles.estadoChipTextOn]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
          {errors.estado && <Text style={styles.fieldErr}>{errors.estado.message}</Text>}
        </View>

        <Pressable style={[styles.btn, (!isDirty || isLoading) && styles.btnOff]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            handleSubmit(onSubmit)();
          }}
          disabled={!isDirty || isLoading}>
          {isLoading ? <ActivityIndicator color="#FFFFFF" /> :
            <Text style={styles.btnT}>{isEdit ? 'Guardar cambios' : 'Crear aula'}</Text>}
        </Pressable>
      </View>
    </ScrollView>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {error && <Text style={styles.fieldErr}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 40 },
  root: { gap: 20, padding: Sizes.paddingMd },
  errorBanner: { backgroundColor: T.errorBg, borderRadius: Sizes.radiusSm, padding: 12, borderLeftWidth: 3, borderLeftColor: T.error },
  errorText: { color: T.error, fontSize: 13 },
  field: { gap: 5 },
  label: { ...Typography.label, color: T.textSecondary, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: T.inputBg, borderWidth: 1.5, borderColor: T.inputBorder, borderRadius: Sizes.radiusMd, padding: 14, fontSize: 15, color: T.inputText },
  inputErr: { borderColor: T.error },
  fieldErr: { color: T.error, fontSize: 12 },
  estadoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  estadoChip: { backgroundColor: T.surface, borderRadius: Sizes.radiusFull, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: T.cardBorder },
  estadoChipOn: { backgroundColor: T.primaryMuted, borderColor: T.primary },
  estadoChipText: { fontSize: 13, fontWeight: '600', color: T.textSecondary },
  estadoChipTextOn: { color: T.primary },
  btn: {
    backgroundColor: T.primary, borderRadius: Sizes.radiusSm,
    padding: 16, alignItems: 'center', marginTop: 8,
    ...Shadows.md, shadowColor: T.primary, shadowOpacity: 0.3,
  },
  btnOff: { opacity: 0.5 },
  btnT: { ...Typography.button, color: '#FFFFFF' },
});
