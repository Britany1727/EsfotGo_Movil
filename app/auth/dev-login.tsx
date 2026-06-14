import { TEST_CREDENTIALS } from "@/core/dev/mock-data";
import { MockAuth, MockExpressAuth } from "@/core/dev/mock-services";
import { useExpressAuthStore } from "@/services/express/express-auth.store";
import { useAuthStore } from "@/store/auth.store";
import { useRouter } from "expo-router";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function DevLoginScreen() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const isLoading = useAuthStore((s) => s.isLoading);

  const handleDevLogin = async (role: "estudiante" | "docente" | "admin") => {
    const creds = TEST_CREDENTIALS[role];

    try {
      const result = await MockAuth.signIn(creds.email, creds.password);
      setSession(result.user, result.token);

      try {
        const expressResult = await MockExpressAuth.loginEstudiante(
          creds.email,
          creds.password,
        );
        useExpressAuthStore.setState({
          expressUser: expressResult.user,
          expressToken: expressResult.token,
        });
      } catch {
        // Express mock optional
      }

      router.replace("/(drawer)/(tabs)");
    } catch {
      // Ignore
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.container}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>🛠️ MODO DESARROLLO</Text>
        </View>

        <Text style={styles.title}>Acceso Rápido</Text>
        <Text style={styles.subtitle}>
          Selecciona un perfil para ingresar sin necesidad de backend. Los datos
          son simulados.
        </Text>

        <View style={styles.cardList}>
          <DevCard
            emoji="🎓"
            role="Estudiante"
            email={TEST_CREDENTIALS.estudiante.email}
            color="#1B6BB0"
            onPress={() => handleDevLogin("estudiante")}
            isLoading={isLoading}
          />
          <DevCard
            emoji="👨‍🏫"
            role="Docente"
            email={TEST_CREDENTIALS.docente.email}
            color="#7C3AED"
            onPress={() => handleDevLogin("docente")}
            isLoading={isLoading}
          />
          <DevCard
            emoji="🛡️"
            role="Administrador"
            email={TEST_CREDENTIALS.admin.email}
            color="#DC2626"
            onPress={() => handleDevLogin("admin")}
            isLoading={isLoading}
          />
        </View>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => router.replace("/(drawer)/(tabs)")}
          activeOpacity={0.7}
        >
          <Text style={styles.skipText}>Entrar sin sesión (modo invitado)</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function DevCard({
  emoji,
  role,
  email,
  color,
  onPress,
  isLoading,
}: {
  emoji: string;
  role: string;
  email: string;
  color: string;
  onPress: () => void;
  isLoading: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: color }]}
      onPress={onPress}
      disabled={isLoading}
      activeOpacity={0.7}
    >
      <View style={[styles.cardEmoji, { backgroundColor: color + "15" }]}>
        <Text style={styles.cardEmojiText}>{emoji}</Text>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardRole}>{role}</Text>
        <Text style={styles.cardEmail}>{email}</Text>
      </View>
      <Text style={[styles.cardArrow, { color }]}>→</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    backgroundColor: "#F3F4F6",
  },
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 60,
    gap: 16,
    maxWidth: 440,
    width: "100%",
    alignSelf: "center",
  },
  badge: {
    backgroundColor: "#FEF3C7",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: "center",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#92400E",
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    marginTop: -8,
  },
  cardList: {
    gap: 12,
    marginTop: 8,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 4,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardEmoji: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  cardEmojiText: {
    fontSize: 24,
  },
  cardInfo: {
    flex: 1,
    gap: 2,
  },
  cardRole: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  cardEmail: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  cardArrow: {
    fontSize: 22,
    fontWeight: "700",
  },
  skipButton: {
    marginTop: 16,
    padding: 14,
    alignItems: "center",
  },
  skipText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
});
