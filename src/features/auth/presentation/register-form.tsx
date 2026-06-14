import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  View,
  Text,
  TextInput as RNTextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { registerSchema } from '@/features/auth/domain/auth.schema';
import type { RegisterInput } from '@/features/auth/domain/auth.schema';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { AppError } from '@/core/errors/app-error';

type RegisterRole = 'estudiante' | 'docente';

const ROLE_LABELS: { role: RegisterRole; label: string }[] = [
  { role: 'estudiante', label: 'Estudiante' },
  { role: 'docente', label: 'Docente' },
];

export function RegisterForm() {
  const router = useRouter();
  const signUp = useAuthStore((s) => s.signUp);
  const isLoading = useAuthStore((s) => s.isLoading);
  const [serverError, setServerError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<RegisterRole>('estudiante');

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      nombre: '',
      apellido: '',
      telefono: '',
    },
  });

  const onSubmit = async (data: RegisterInput) => {
    setServerError(null);
    try {
      const result = await signUp(data, selectedRole);
      if (result.emailConfirmationRequired) {
        router.replace('/auth/verify');
      } else {
        router.replace('/(drawer)/(tabs)');
      }
    } catch (error) {
      if (error instanceof AppError) {
        setServerError(error.toUserMessage());
      } else {
        setServerError('Error al crear la cuenta. Intenta de nuevo.');
      }
    }
  };

  return (
    <View style={styles.container}>
      {serverError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{serverError}</Text>
        </View>
      )}

      {/* Role selector — matches web registration */}
      <View style={styles.roleRow}>
        {ROLE_LABELS.map(({ role, label }) => (
          <Pressable
            key={role}
            style={[styles.roleChip, selectedRole === role && styles.roleChipActive]}
            onPress={() => setSelectedRole(role)}
          >
            <Text style={[styles.roleChipText, selectedRole === role && styles.roleChipTextActive]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Nombre</Text>
        <Controller
          control={control}
          name="nombre"
          render={({ field: { onChange, onBlur, value } }) => (
            <RNTextInput
              style={[styles.input, errors.nombre && styles.inputError]}
              placeholder="Tu nombre"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="words"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
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
              placeholder="Tu apellido"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="words"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
          )}
        />
        {errors.apellido && <Text style={styles.errorText}>{errors.apellido.message}</Text>}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Teléfono</Text>
        <Controller
          control={control}
          name="telefono"
          render={({ field: { onChange, onBlur, value } }) => (
            <RNTextInput
              style={[styles.input, errors.telefono && styles.inputError]}
              placeholder="0991234567"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
              maxLength={10}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
          )}
        />
        {errors.telefono && <Text style={styles.errorText}>{errors.telefono.message}</Text>}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Correo institucional</Text>
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <RNTextInput
              style={[styles.input, errors.email && styles.inputError]}
              placeholder="usuario@epn.edu.ec"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
          )}
        />
        {errors.email && <Text style={styles.errorText}>{errors.email.message}</Text>}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Contraseña</Text>
        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <RNTextInput
              style={[styles.input, errors.password && styles.inputError]}
              placeholder="Mínimo 12 caracteres, una mayúscula y un número"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
          )}
        />
        {errors.password && <Text style={styles.errorText}>{errors.password.message}</Text>}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Confirmar contraseña</Text>
        <Controller
          control={control}
          name="confirmPassword"
          render={({ field: { onChange, onBlur, value } }) => (
            <RNTextInput
              style={[styles.input, errors.confirmPassword && styles.inputError]}
              placeholder="Repite tu contraseña"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
          )}
        />
        {errors.confirmPassword && (
          <Text style={styles.errorText}>{errors.confirmPassword.message}</Text>
        )}
      </View>

      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={handleSubmit(onSubmit)}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Crear cuenta</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 20,
  },
  roleRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  roleChip: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#D1D5DB',
    alignItems: 'center', backgroundColor: '#F9FAFB',
  },
  roleChipActive: { borderColor: '#1B6BB0', backgroundColor: '#EFF6FF' },
  roleChipText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  roleChipTextActive: { color: '#1B6BB0' },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  errorBannerText: {
    color: '#991B1B',
    fontSize: 14,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#111827',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
  },
  button: {
    backgroundColor: '#1B6BB0',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
