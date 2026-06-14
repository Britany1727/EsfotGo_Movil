import { Sizes, DarkTheme as T } from "@/constants/design-system";
import { AppError } from "@/core/errors/app-error";
import type { LoginInput } from "@/features/auth/domain/auth.schema";
import { loginSchema } from "@/features/auth/domain/auth.schema";
import { useExpressAuthStore } from "@/services/express/express-auth.store";
import { GlassButton, GlassInput } from "@/shared/components/premium";
import { useAuthStore } from "@/store/auth.store";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

type LoginRole = "estudiante" | "docente" | "admin";

const ERROR_MAP: Record<string, string> = {
  INVALID_CREDENTIALS: "Correo o contraseña incorrectos",
  EMAIL_NOT_CONFIRMED: "Confirma tu correo electrónico primero",
  RATE_LIMITED: "Demasiados intentos. Espera un momento.",
  USER_NOT_FOUND: "No existe cuenta con este correo",
  DEFAULT: "Error al iniciar sesión",
};

function mapError(e: unknown): string {
  if (e instanceof AppError) return ERROR_MAP[e.code] ?? e.toUserMessage();
  const m = (e as any)?.message ?? "";
  if (m.includes("Invalid login")) return ERROR_MAP.INVALID_CREDENTIALS;
  if (m.includes("not confirmed")) return ERROR_MAP.EMAIL_NOT_CONFIRMED;
  if (m.includes("rate") || m.includes("too many"))
    return ERROR_MAP.RATE_LIMITED;
  return ERROR_MAP.DEFAULT;
}

const ROLE_LABELS: { role: LoginRole; label: string }[] = [
  { role: "estudiante", label: "Estudiante" },
  { role: "docente", label: "Docente" },
  { role: "admin", label: "Administrador" },
];

export function LoginForm() {
  const router = useRouter();
  const loading = useAuthStore((s) => s.isLoading);
  const setSession = useAuthStore((s) => s.setSession);
  const loginEstudiante = useExpressAuthStore((s) => s.loginEstudiante);
  const loginDocente = useExpressAuthStore((s) => s.loginDocente);
  const loginAdmin = useExpressAuthStore((s) => s.loginAdmin);
  const [err, setErr] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);
  const [selectedRole, setSelectedRole] = useState<LoginRole>("estudiante");

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = useCallback(
    async (d: LoginInput) => {
      setErr(null);
      try {
        let user: { email: string; rol: string; _id: string };
        let token: string;

        // Route to correct endpoint based on role (matching web flow)
        switch (selectedRole) {
          case "admin": {
            const res = await loginAdmin(d);
            user = res;
            token = useExpressAuthStore.getState().expressToken ?? "";
            break;
          }
          case "docente": {
            const res = await loginDocente(d);
            user = res;
            token = useExpressAuthStore.getState().expressToken ?? "";
            break;
          }
          case "estudiante":
          default: {
            const res = await loginEstudiante(d);
            user = res;
            token = useExpressAuthStore.getState().expressToken ?? "";
            break;
          }
        }

        // Sync main auth store so AuthGuard recognizes the session
        const roleMap: Record<
          string,
          "estudiante" | "docente" | "administrador"
        > = {
          user: "estudiante",
          estudiante: "estudiante",
          docente: "docente",
          admin: "administrador",
        };
        setSession(
          {
            id: user._id,
            email: user.email,
            fullName: (user as any).nombre ?? null,
            role: roleMap[user.rol ?? selectedRole] ?? "estudiante",
            avatarUrl: null,
            phone: (user as any).telefono ?? null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          token,
        );

        router.replace(`/(drawer)/(tabs)?showGpsPrompt=1`);
      } catch (e) {
        setErr(mapError(e));
      }
    },
    [
      loginEstudiante,
      loginDocente,
      loginAdmin,
      selectedRole,
      setSession,
      router,
    ],
  );

  return (
    <View style={s.root}>
      {err && (
        <Animated.View entering={FadeIn} style={s.errBanner}>
          <Text style={s.errText}>{err}</Text>
        </Animated.View>
      )}

      {/* Role selector — matches web login */}
      <View style={s.roleRow}>
        {ROLE_LABELS.map(({ role, label }) => (
          <Pressable
            key={role}
            style={[s.roleChip, selectedRole === role && s.roleChipActive]}
            onPress={() => setSelectedRole(role)}
          >
            <Text
              style={[
                s.roleChipText,
                selectedRole === role && s.roleChipTextActive,
              ]}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <GlassInput
            icon="✉️"
            placeholder="usuario@epn.edu.ec"
            value={value}
            onChangeText={(t: string) => onChange(t.toLowerCase().trim())}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            onBlur={onBlur}
            error={errors.email?.message}
          />
        )}
      />
      {errors.email && <Text style={s.fieldErr}>{errors.email.message}</Text>}

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <GlassInput
            icon="🔒"
            placeholder="Contraseña"
            value={value}
            onChangeText={onChange}
            secureTextEntry={!showPw}
            onBlur={onBlur}
            error={errors.password?.message}
            rightElement={
              <TouchableOpacity onPress={() => setShowPw(!showPw)} hitSlop={8}>
                <Text style={{ fontSize: 18 }}>{showPw ? "🙈" : "👁️"}</Text>
              </TouchableOpacity>
            }
          />
        )}
      />
      {errors.password && (
        <Text style={s.fieldErr}>{errors.password.message}</Text>
      )}

      <GlassButton
        title="Iniciar sesión"
        onPress={handleSubmit(onSubmit)}
        loading={loading}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { gap: 16 },
  roleRow: { flexDirection: "row", gap: 8 },
  roleChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Sizes.radiusMd,
    borderWidth: 1.5,
    borderColor: T.inputBorder,
    alignItems: "center",
    backgroundColor: T.surface,
  },
  roleChipActive: { borderColor: T.primary, backgroundColor: T.primaryMuted },
  roleChipText: { fontSize: 13, fontWeight: "600", color: T.textSecondary },
  roleChipTextActive: { color: T.primary },
  errBanner: {
    backgroundColor: T.errorBg,
    borderRadius: Sizes.radiusSm,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: T.error,
  },
  errText: { color: T.error, fontSize: 13 },
  fieldErr: { color: T.error, fontSize: 11, marginTop: -12 },
});
