import React, { useEffect } from 'react';
import {
  View,
  Text,
  TextInput as RNTextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { ManagedUser, ManagedUserRole } from '@/features/admin/domain/user-management.entity';
import { RoleDropdown } from './role-dropdown';
import { DarkTheme as T, Shadows } from '@/constants/design-system';

const editUserSchema = z.object({
  nombre: z.string().min(2, 'Mínimo 2 caracteres').max(60, 'Máximo 60 caracteres'),
  apellido: z.string().max(60, 'Máximo 60 caracteres').optional().or(z.literal('')),
  email: z.string().min(1, 'El correo es requerido').email('Formato de correo inválido'),
  telefono: z.string().regex(/^[0-9]{0,10}$/, 'Máximo 10 dígitos').optional().or(z.literal('')),
  direccion: z.string().max(120, 'Máximo 120 caracteres').optional().or(z.literal('')),
});

type EditUserForm = z.infer<typeof editUserSchema>;

interface UserEditModalProps {
  visible: boolean;
  user: ManagedUser | null;
  isLoading: boolean;
  onSave: (user: ManagedUser, updates: Partial<ManagedUser>) => void;
  onClose: () => void;
}

export function UserEditModal({ visible, user, isLoading, onSave, onClose }: UserEditModalProps) {
  const [role, setRole] = React.useState<ManagedUserRole>('estudiante');

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditUserForm>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      nombre: '',
      apellido: '',
      email: '',
      telefono: '',
      direccion: '',
    },
  });

  useEffect(() => {
    if (user) {
      reset({
        nombre: user.nombre,
        apellido: user.apellido ?? '',
        email: user.email,
        telefono: user.telefono ?? '',
        direccion: user.direccion ?? '',
      });
      setRole(user.rol);
    }
  }, [user, reset]);

  if (!user) return null;

  const handleSave = (data: EditUserForm) => {
    if (!errors.nombre && !errors.email && !errors.telefono) {
      onSave(user, {
        nombre: data.nombre.trim(),
        apellido: data.apellido?.trim() || undefined,
        email: data.email.trim(),
        telefono: data.telefono?.trim() || undefined,
        direccion: data.direccion?.trim() || undefined,
        rol: role,
      });
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Editar usuario</Text>
          <TouchableOpacity onPress={handleSubmit(handleSave)} disabled={isLoading} activeOpacity={0.7}>
            <Text style={styles.saveText}>{isLoading ? '...' : 'Guardar'}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {isLoading && (
            <ActivityIndicator size="large" color={T.primary} style={styles.loader} />
          )}

          <View style={styles.field}>
            <Text style={styles.label}>Nombre</Text>
            <Controller
              control={control}
              name="nombre"
              render={({ field: { onChange, onBlur, value } }) => (
                <RNTextInput
                  style={[styles.input, errors.nombre && styles.inputError]}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Nombre"
                  placeholderTextColor={T.inputPlaceholder}
                />
              )}
            />
            {errors.nombre && <Text style={styles.errorText}>{errors.nombre.message}</Text>}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Apellido</Text>
            <Controller
              control={control}
              name="apellido"
              render={({ field: { onChange, onBlur, value } }) => (
                <RNTextInput
                  style={[styles.input, errors.apellido && styles.inputError]}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Apellido"
                  placeholderTextColor={T.inputPlaceholder}
                />
              )}
            />
            {errors.apellido && <Text style={styles.errorText}>{errors.apellido.message}</Text>}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Correo</Text>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <RNTextInput
                  style={[styles.input, errors.email && styles.inputError]}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="correo@ejemplo.com"
                  keyboardType="email-address"
                  placeholderTextColor={T.inputPlaceholder}
                />
              )}
            />
            {errors.email && <Text style={styles.errorText}>{errors.email.message}</Text>}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Teléfono</Text>
            <Controller
              control={control}
              name="telefono"
              render={({ field: { onChange, onBlur, value } }) => (
                <RNTextInput
                  style={[styles.input, errors.telefono && styles.inputError]}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="0991234567"
                  keyboardType="phone-pad"
                  placeholderTextColor={T.inputPlaceholder}
                />
              )}
            />
            {errors.telefono && <Text style={styles.errorText}>{errors.telefono.message}</Text>}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Dirección</Text>
            <Controller
              control={control}
              name="direccion"
              render={({ field: { onChange, onBlur, value } }) => (
                <RNTextInput
                  style={[styles.input, errors.direccion && styles.inputError]}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Dirección"
                  placeholderTextColor={T.inputPlaceholder}
                />
              )}
            />
            {errors.direccion && <Text style={styles.errorText}>{errors.direccion.message}</Text>}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Rol</Text>
            <RoleDropdown value={role} onChange={setRole} />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: T.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: T.surface,
    padding: 16,
    paddingTop: 56,
    ...Shadows.sm,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: T.textPrimary,
  },
  cancelText: {
    fontSize: 15,
    color: T.textSecondary,
  },
  saveText: {
    fontSize: 15,
    fontWeight: '700',
    color: T.primary,
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  loader: {
    marginBottom: 12,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: T.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: T.surface,
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: T.textPrimary,
    borderWidth: 1,
    borderColor: T.cardBorder,
  },
  inputError: {
    borderColor: T.error,
  },
  errorText: {
    color: T.error,
    fontSize: 12,
  },
});
