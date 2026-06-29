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
import { useState, useCallback, useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
  Easing,
} from 'react-native-reanimated';
import {
  step1EmailSchema,
  step2PasswordSchema,
  step3ProfileSchema,
  getPasswordStrength,
} from '@/features/auth/domain/auth.schema';
import type {
  Step1EmailInput,
  Step2PasswordInput,
  Step3ProfileInput,
  PasswordStrength,
} from '@/features/auth/domain/auth.schema';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'expo-router';
import { AppError } from '@/core/errors/app-error';
import Toast from 'react-native-toast-message';
import * as Haptics from 'expo-haptics';
import { LightTheme as T, Sizes, Shadows, Typography } from '@/constants/design-system';
import { Check } from 'lucide-react-native';
import { useInstitutionalLookup } from '../application/institutional-lookup.hook';

type Step = 1 | 2 | 3;
type RegisterRole = 'estudiante' | 'docente';

const STEP_TITLES: Record<Step, string> = {
  1: 'Tu correo institucional',
  2: 'Crea una contraseña segura',
  3: 'Completa tu perfil',
};

const STEP_SUBTITLES: Record<Step, string> = {
  1: 'Ingresa tu correo de la Escuela Politécnica Nacional',
  2: 'Elige una contraseña fuerte para proteger tu cuenta',
  3: 'Cuéntanos quién eres',
};

const ROLE_LABELS: { role: RegisterRole; label: string }[] = [
  { role: 'estudiante', label: 'Estudiante' },
  { role: 'docente', label: 'Docente' },
];

const TOTAL_STEPS = 3;

export function RegistrationForm() {
  const router = useRouter();
  const signUp = useAuthStore((s) => s.signUp);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [step, setStep] = useState<Step>(1);
  const [serverError, setServerError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<RegisterRole>('estudiante');

  const [emailValue, setEmailValue] = useState('');
  const [passwordValue, setPasswordValue] = useState('');
  const [prefillNombre, setPrefillNombre] = useState('');
  const [prefillApellido, setPrefillApellido] = useState('');

  const { lookup } = useInstitutionalLookup();

  const progressWidth = useSharedValue(0);
  const stepOpacity = useSharedValue(1);

  const updateProgress = useCallback(
    (newStep: Step) => {
      progressWidth.value = withTiming((newStep / TOTAL_STEPS) * 100, {
        duration: 400,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
      });
    },
    [progressWidth]
  );

  useEffect(() => {
    updateProgress(step);
  }, [step, updateProgress]);

  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  const goNext = useCallback(() => {
    if (step < 3) {
      stepOpacity.value = withSequence(
        withTiming(0, { duration: 150 }),
        withTiming(1, { duration: 300 })
      );
      setStep((s) => (s + 1) as Step);
    }
  }, [step, stepOpacity]);

  const goBack = useCallback(() => {
    if (step > 1) {
      setServerError(null);
      setStep((s) => (s - 1) as Step);
    }
  }, [step]);

  return (
    <View style={styles.container}>
      {/* Progress indicator */}
      <View style={styles.progressContainer}>
        <Animated.View style={[styles.progressBar, progressBarStyle]} />
      </View>
      <View style={styles.stepIndicator}>
        {([1, 2, 3] as Step[]).map((s) => (
          <View
            key={s}
            style={[
              styles.stepDot,
              s === step && styles.stepDotActive,
              s < step && styles.stepDotCompleted,
            ]}
          />
        ))}
      </View>

      {/* Step header */}
      <Animated.View
        key={`header-${step}`}
        entering={SlideInRight.duration(300).easing(Easing.bezier(0.4, 0, 0.2, 1))}
        exiting={SlideOutLeft.duration(200)}
        style={styles.stepHeader}
      >
        <Text style={styles.stepTitle}>{STEP_TITLES[step]}</Text>
        <Text style={styles.stepSubtitle}>{STEP_SUBTITLES[step]}</Text>
      </Animated.View>

      {/* Role selector */}
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

      {/* Server error */}
      {serverError && (
        <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{serverError}</Text>
        </Animated.View>
      )}

      {/* Step content */}
      <Animated.View
        key={`content-${step}`}
        entering={SlideInRight.duration(350).easing(Easing.bezier(0.4, 0, 0.2, 1))}
        exiting={SlideOutLeft.duration(200)}
        style={styles.stepContent}
      >
        {step === 1 && (
          <Step1Email
            defaultValue={emailValue}
            onValid={(email) => {
              setEmailValue(email);
              goNext();
              lookup(email, selectedRole)
                .then((result) => {
                  if (result) {
                    setPrefillNombre(result.nombre);
                    setPrefillApellido(result.apellido);
                  }
                })
                .catch(() => {});
            }}
          />
        )}
        {step === 2 && (
          <Step2Password
            defaultValue={passwordValue}
            onValid={(password) => {
              setPasswordValue(password);
              goNext();
            }}
            onBack={goBack}
          />
        )}
        {step === 3 && (
          <Step3Profile
            isLoading={isLoading}
            prefillNombre={prefillNombre}
            prefillApellido={prefillApellido}
            onSubmit={async (data) => {
              setServerError(null);
              try {
                await signUp({
                  email: emailValue,
                  password: passwordValue,
                  confirmPassword: passwordValue,
                  nombre: data.nombre,
                  apellido: data.apellido,
                  telefono: data.telefono,
                  acceptTerms: true,
                }, selectedRole);
                Toast.show({ type: 'success', text1: 'Registro exitoso', text2: 'Te has registrado exitosamente' });
                setTimeout(() => router.replace('/auth/login'), 1500);
              } catch (error) {
                if (error instanceof AppError) {
                  setServerError(error.toUserMessage());
                } else {
                  setServerError('Error al crear la cuenta. Intenta de nuevo.');
                }
              }
            }}
            onBack={goBack}
          />
        )}
      </Animated.View>
    </View>
  );
}

// ─── Step 1: Email ───

function Step1Email({
  defaultValue,
  onValid,
}: {
  defaultValue: string;
  onValid: (email: string) => void;
}) {
  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<Step1EmailInput>({
    resolver: zodResolver(step1EmailSchema),
    defaultValues: { email: defaultValue },
    mode: 'onChange',
  });

  const email = watch('email');

  return (
    <View style={styles.stepForm}>
      <View style={styles.field}>
        <Text style={styles.label}>Correo electrónico</Text>
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
              autoFocus
              onBlur={onBlur}
              onChangeText={(text) => onChange(text.toLowerCase().trim())}
              value={value}
            />
          )}
        />
        {errors.email && (
          <Animated.Text entering={FadeIn} style={styles.errorText}>
            {errors.email.message}
          </Animated.Text>
        )}
      </View>

      <View style={styles.domainBadge}>
        <Text style={styles.domainBadgeText}>@epn.edu.ec</Text>
        <Text style={styles.domainBadgeHint}>Solo correos institucionales</Text>
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, (!email || errors.email) && styles.buttonDisabled]}
        onPress={handleSubmit((data) => onValid(data.email))}
        disabled={!email || !!errors.email}
        activeOpacity={0.8}
      >
        <Text style={styles.primaryButtonText}>Continuar</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Step 2: Password ───

function Step2Password({
  defaultValue,
  onValid,
  onBack,
}: {
  defaultValue: string;
  onValid: (password: string) => void;
  onBack: () => void;
}) {
  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<Step2PasswordInput>({
    resolver: zodResolver(step2PasswordSchema),
    defaultValues: { password: defaultValue, confirmPassword: '' },
    mode: 'onChange',
  });

  const password = watch('password');
  const strength: PasswordStrength | null = password ? getPasswordStrength(password) : null;

  return (
    <View style={styles.stepForm}>
      {/* Password strength meter */}
      {strength && (
        <Animated.View entering={FadeIn.duration(300)} style={styles.strengthContainer}>
          <View style={styles.strengthBarBg}>
            <Animated.View
              style={[
                styles.strengthBarFill,
                {
                  width: `${(strength.score / 4) * 100}%`,
                  backgroundColor: strength.color,
                },
              ]}
            />
          </View>
          <Text style={[styles.strengthLabel, { color: strength.color }]}>
            {strength.label}
          </Text>
          <View style={styles.checksGrid}>
            {strength.checks.map((check) => (
              <View key={check.label} style={styles.checkRow}>
                <View
                  style={[
                    styles.checkDot,
                    check.passed ? styles.checkDotPassed : styles.checkDotFailed,
                  ]}
                />
                <Text
                  style={[
                    styles.checkLabel,
                    check.passed ? styles.checkLabelPassed : styles.checkLabelFailed,
                  ]}
                >
                  {check.label}
                </Text>
              </View>
            ))}
          </View>
        </Animated.View>
      )}

      <View style={styles.field}>
        <Text style={styles.label}>Contraseña</Text>
        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <RNTextInput
              style={[styles.input, errors.password && styles.inputError]}
              placeholder="Crea una contraseña fuerte (mín. 12 caracteres)"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              autoFocus
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
          )}
        />
        {errors.password && (
          <Animated.Text entering={FadeIn} style={styles.errorText}>
            {errors.password.message}
          </Animated.Text>
        )}
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
          <Animated.Text entering={FadeIn} style={styles.errorText}>
            {errors.confirmPassword.message}
          </Animated.Text>
        )}
      </View>

      <View style={styles.stepActions}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <Text style={styles.secondaryButtonText}>Atrás</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.primaryButton,
            styles.buttonHalf,
            (errors.password || errors.confirmPassword) && styles.buttonDisabled,
          ]}
          onPress={handleSubmit((data) => onValid(data.password))}
          disabled={!!errors.password || !!errors.confirmPassword}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>Continuar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Step 3: Profile ───

function Step3Profile({
  isLoading,
  onSubmit,
  onBack,
  prefillNombre = '',
  prefillApellido = '',
}: {
  isLoading: boolean;
  onSubmit: (data: Step3ProfileInput) => Promise<void>;
  onBack: () => void;
  prefillNombre?: string;
  prefillApellido?: string;
}) {
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<Step3ProfileInput>({
    resolver: zodResolver(step3ProfileSchema),
    defaultValues: { nombre: prefillNombre, apellido: prefillApellido, telefono: '', acceptTerms: false },
    mode: 'onChange',
  });

  useEffect(() => {
    if (prefillNombre || prefillApellido) {
      reset((formValues) => ({
        ...formValues,
        ...(prefillNombre && !formValues.nombre ? { nombre: prefillNombre } : {}),
        ...(prefillApellido && !formValues.apellido ? { apellido: prefillApellido } : {}),
      }));
    }
  }, [prefillNombre, prefillApellido, reset]);

  return (
    <View style={styles.stepForm}>
      <View style={styles.field}>
        <Text style={styles.label}>Nombre</Text>
        <Controller
          control={control}
          name="nombre"
          render={({ field: { onChange, onBlur, value } }) => (
            <RNTextInput
              style={[styles.input, errors.nombre && styles.inputError]}
              placeholder="Ej: Juan"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="words"
              autoFocus
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
          )}
        />
        {errors.nombre && (
          <Animated.Text entering={FadeIn} style={styles.errorText}>
            {errors.nombre.message}
          </Animated.Text>
        )}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Apellido</Text>
        <Controller
          control={control}
          name="apellido"
          render={({ field: { onChange, onBlur, value } }) => (
            <RNTextInput
              style={[styles.input, errors.apellido && styles.inputError]}
              placeholder="Ej: Pérez"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="words"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
          )}
        />
        {errors.apellido && (
          <Animated.Text entering={FadeIn} style={styles.errorText}>
            {errors.apellido.message}
          </Animated.Text>
        )}
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
        {errors.telefono && (
          <Animated.Text entering={FadeIn} style={styles.errorText}>
            {errors.telefono.message}
          </Animated.Text>
        )}
      </View>

      {/* Terms checkbox */}
      <Controller
        control={control}
        name="acceptTerms"
        render={({ field: { onChange, value } }) => (
          <Pressable
            style={styles.termsRow}
            onPress={() => onChange(!value)}
          >
            <View style={[styles.checkbox, value && styles.checkboxChecked]}>
              {value && <Check size={14} strokeWidth={3} color="#FFFFFF" />}
            </View>
            <Text style={styles.termsText}>
              Acepto los{' '}
              <Text style={styles.termsLink}>Términos y Condiciones</Text> y la{' '}
              <Text style={styles.termsLink}>Política de Privacidad</Text> de la EPN
            </Text>
          </Pressable>
        )}
      />
      {errors.acceptTerms && (
        <Animated.Text entering={FadeIn} style={styles.errorText}>
          {errors.acceptTerms.message}
        </Animated.Text>
      )}

      <View style={styles.stepActions}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <Text style={styles.secondaryButtonText}>Atrás</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.primaryButton,
            styles.buttonHalf,
            isLoading && styles.buttonDisabled,
          ]}
          onPress={handleSubmit(onSubmit)}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>Crear cuenta</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ───

const styles = StyleSheet.create({
  container: { gap: 24 },
  progressContainer: {
    height: 4, backgroundColor: T.surfaceBorder,
    borderRadius: 2, overflow: 'hidden',
  },
  progressBar: {
    height: '100%', backgroundColor: T.primary, borderRadius: 2,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  stepDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: T.textMuted,
  },
  stepDotActive: { backgroundColor: T.primary, width: 24 },
  stepDotCompleted: { backgroundColor: T.success },

  stepHeader: { gap: 4 },
  stepTitle: { ...Typography.h2, color: T.textPrimary },
  stepSubtitle: {
    ...Typography.body, color: T.textSecondary, lineHeight: 20,
  },

  stepContent: { minHeight: 280 },
  stepForm: { gap: 20 },

  field: { gap: 6 },
  label: {
    ...Typography.bodySm, fontWeight: '600', color: T.textPrimary,
  },
  input: {
    backgroundColor: T.inputBg, borderWidth: 1.5, borderColor: T.inputBorder,
    borderRadius: Sizes.radiusSm, padding: 16,
    fontSize: 15, color: T.inputText,
  },
  inputError: { borderColor: T.error, backgroundColor: T.errorBg },
  errorText: { ...Typography.caption, color: T.error, marginTop: 2 },

  domainBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: T.primaryMuted, borderRadius: Sizes.radiusSm,
    padding: 12, gap: 8,
  },
  domainBadgeText: { ...Typography.bodySm, fontWeight: '700', color: T.primary },
  domainBadgeHint: { ...Typography.caption, color: T.textSecondary },

  strengthContainer: {
    backgroundColor: T.surface, borderRadius: Sizes.radiusMd,
    padding: 16, borderWidth: 1, borderColor: T.cardBorder,
    gap: 10,
  },
  strengthBarBg: {
    height: 6, backgroundColor: T.surfaceBorder,
    borderRadius: 3, overflow: 'hidden',
  },
  strengthBarFill: { height: '100%', borderRadius: 3 },
  strengthLabel: { ...Typography.bodySm, fontWeight: '700', textAlign: 'center' },
  checksGrid: { gap: 6 },
  checkRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  checkDot: { width: 6, height: 6, borderRadius: 3 },
  checkDotPassed: { backgroundColor: T.success },
  checkDotFailed: { backgroundColor: T.textMuted },
  checkLabel: { fontSize: 12 },
  checkLabelPassed: { color: T.success },
  checkLabelFailed: { color: T.textTertiary },

  termsRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: 10, paddingVertical: 4,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 2, borderColor: T.inputBorder,
    justifyContent: 'center', alignItems: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: T.primary, borderColor: T.primary,
  },
  termsText: {
    flex: 1, fontSize: 13, color: T.textSecondary, lineHeight: 18,
  },
  termsLink: { color: T.primary, fontWeight: '600' },

  stepActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  primaryButton: {
    flex: 1, backgroundColor: T.primary, borderRadius: Sizes.radiusSm,
    padding: 16, alignItems: 'center',
    ...Shadows.md, shadowColor: T.primary, shadowOpacity: 0.3,
  },
  buttonHalf: { flex: 1 },
  primaryButtonText: { ...Typography.button, color: '#FFFFFF', fontSize: 16 },
  buttonDisabled: { opacity: 0.5 },
  secondaryButton: {
    padding: 16, borderRadius: Sizes.radiusSm,
    borderWidth: 1.5, borderColor: T.inputBorder,
    alignItems: 'center', backgroundColor: T.surface,
  },
  secondaryButtonText: {
    ...Typography.body, color: T.textSecondary, fontWeight: '600',
  },

  roleRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  roleChip: {
    flex: 1, paddingVertical: 11, borderRadius: Sizes.radiusSm,
    borderWidth: 1.5, borderColor: T.inputBorder,
    alignItems: 'center', backgroundColor: T.surface,
    ...Shadows.sm,
  },
  roleChipActive: {
    borderColor: T.primary, backgroundColor: T.primaryMuted,
    ...Shadows.md, shadowColor: T.primary, shadowOpacity: 0.15,
  },
  roleChipText: { ...Typography.bodySm, fontWeight: '600', color: T.textSecondary },
  roleChipTextActive: { color: T.primary },

  errorBanner: {
    backgroundColor: T.errorBg, borderRadius: Sizes.radiusSm,
    padding: 12, borderLeftWidth: 4, borderLeftColor: T.error,
  },
  errorBannerText: { ...Typography.bodySm, color: T.error, lineHeight: 20 },
});
