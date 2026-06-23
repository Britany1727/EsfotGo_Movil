import type { ExpoConfig } from '@expo/config-types';

const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

const config: ExpoConfig = {
  name: "EsfotGo",
  slug: "EsfotGo",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/iconEsfotgo.png",
  scheme: "esfotgo",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.epn.esfotgo",
    infoPlist: {
      NSLocationWhenInUseUsageDescription: "ESFOTgo necesita tu ubicación para mostrarte el mapa del campus, rutas de Polibus y ayudarte a navegar.",
    },
    ...(apiKey ? { config: { googleMapsApiKey: apiKey } } : {}),
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    edgeToEdgeEnabled: true,
    package: "com.epn.esfotgo",
    predictiveBackGestureEnabled: false,
    permissions: ["ACCESS_FINE_LOCATION", "ACCESS_COARSE_LOCATION"],
    ...(apiKey ? { config: { googleMaps: { apiKey } } } : {}),
  },
  web: {
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        dark: { backgroundColor: "#000000" },
      },
    ],
    "expo-font",
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    eas: {
      projectId: "ac523029-cf0f-49b1-8449-550e39e5c6c9",
    },
  },
};

export default config;
