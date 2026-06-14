import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';
import { useGpsPermission } from '@/hooks/use-gps-permission';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

export function GpsPermissionPrompt() {
  const router = useRouter();
  const { status, requestPermission } = useGpsPermission();

  useEffect(() => {
    if (status === 'granted') {
      const timer = setTimeout(() => {
        router.replace('/(drawer)/(tabs)');
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [status, router]);

  if (status === 'granted' || status === 'idle') return null;

  const handleAccept = async () => {
    const granted = await requestPermission();
    if (granted) {
      // Will auto-navigate via useEffect
    }
  };

  const handleSkip = () => {
    router.replace('/(drawer)/(tabs)');
  };

  return (
    <Animated.View
      entering={ZoomIn.duration(400)}
      exiting={FadeOut.duration(200)}
      style={styles.overlay}
    >
      <Animated.View entering={FadeIn.delay(200)} style={styles.card}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>📍</Text>
        </View>

        <Text style={styles.title}>Activar ubicación</Text>
        <Text style={styles.description}>
          Para mostrarte el mapa del campus, las rutas del Polibús en tiempo real y ayudarte a navegar por la Escuela Politécnica Nacional.
        </Text>

        <View style={styles.benefits}>
          <BenefitItem text="Mapa interactivo del campus" />
          <BenefitItem text="Rutas de Polibús en tiempo real" />
          <BenefitItem text="Ubicaciones de edificios y servicios" />
        </View>

        <TouchableOpacity
          style={styles.acceptButton}
          onPress={handleAccept}
          activeOpacity={0.8}
        >
          <Text style={styles.acceptButtonText}>Permitir ubicación</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          activeOpacity={0.7}
        >
          <Text style={styles.skipButtonText}>Ahora no</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

function BenefitItem({ text }: { text: string }) {
  return (
    <View style={styles.benefit}>
      <Text style={styles.benefitDot}>•</Text>
      <Text style={styles.benefitText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 36,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  benefits: {
    width: '100%',
    gap: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  benefitDot: {
    color: '#00205B',
    fontSize: 16,
    fontWeight: '700',
  },
  benefitText: {
    fontSize: 13,
    color: '#374151',
  },
  acceptButton: {
    backgroundColor: '#00205B',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    alignItems: 'center',
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  skipButton: {
    padding: 8,
    width: '100%',
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500',
  },
});
