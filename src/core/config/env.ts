import { z } from "zod";

const PRODUCTION_API_URL =
  "https://daring-serenity-production.up.railway.app/api";

const envSchema = z.object({
  EXPO_PUBLIC_DEV_MODE: z.string().optional().default("false"),
  EXPO_PUBLIC_API_BASE_URL: z.string().optional().default(PRODUCTION_API_URL),
});

export interface Env {
  EXPO_PUBLIC_DEV_MODE: string;
  EXPO_PUBLIC_API_BASE_URL: string;
}

function loadEnv(): Env {
  let devMode = "false";
  let apiBaseUrl = PRODUCTION_API_URL;

  try {
    devMode = String(process.env.EXPO_PUBLIC_DEV_MODE ?? "false");
    apiBaseUrl = String(
      process.env.EXPO_PUBLIC_API_BASE_URL ?? PRODUCTION_API_URL,
    );
  } catch {
    // Env vars not available at module evaluation time
  }

  const result = envSchema.safeParse({
    EXPO_PUBLIC_DEV_MODE: devMode,
    EXPO_PUBLIC_API_BASE_URL: apiBaseUrl,
  });

  if (!result.success) {
    return {
      EXPO_PUBLIC_DEV_MODE: "false",
      EXPO_PUBLIC_API_BASE_URL: PRODUCTION_API_URL,
    };
  }

  return result.data;
}

export const env = loadEnv();

export const isDevMode = (): boolean => {
  return env.EXPO_PUBLIC_DEV_MODE === "true";
};

export function validateEnvironment(): void {
  const errors: string[] = [];

  if (!env.EXPO_PUBLIC_API_BASE_URL) {
    errors.push("EXPO_PUBLIC_API_BASE_URL no configurada");
  }
  if (!process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY) {
    errors.push(
      "EXPO_PUBLIC_GOOGLE_MAPS_API_KEY no configurada — los mapas no funcionarán",
    );
  }
  if (isDevMode()) {
    console.warn(
      "⚠️  Modo desarrollo activado. La app usa mock data en algunos módulos.",
    );
  }

  if (errors.length > 0) {
    console.warn("⚠️  Advertencias de entorno:", errors.join("; "));
  }
}
