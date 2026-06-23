import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { MapPin, Settings as SettingsIcon, RefreshCw } from 'lucide-react-native';
import { useLocationPermission } from '@/hooks/use-location-permission';
import { LightTheme as T, Sizes, Shadows, Typography } from '@/constants/design-system';

interface GpsPermissionPromptProps {
  onGranted?: () => void;
  onSkip?: () => void;
  variant?: 'overlay' | 'inline';
}

export function GpsPermissionPrompt({
  onGranted,
  onSkip,
  variant = 'overlay',
}: GpsPermissionPromptProps) {
  const {
    status,
    canAskAgain,
    isLoading: permLoading,
    requestPermission,
    retryPermission,
    openSettings,
  } = useLocationPermission();

  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    if (status === 'granted') {
      onGranted?.();
    }
  }, [status, onGranted]);

  if (permLoading && status === 'idle') return null;

  if (status === 'granted') return null;

  const handleRequest = async () => {
    setIsRequesting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await requestPermission();
    setIsRequesting(false);
  };

  const handleRetry = async () => {
    setIsRequesting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await retryPermission();
    setIsRequesting(false);
  };

  const handleSettings = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    openSettings();
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSkip?.();
  };

  const buttonDisabled = isRequesting || permLoading;

  const renderContent = () => (
    <Animated.View
      entering={FadeInDown.duration(400)}
      style={variant === 'overlay' ? styles.overlay : styles.inline}
    >
      <View style={variant === 'overlay' ? styles.card : styles.inlineCard}>
        <View style={styles.iconContainer}>
          {status === 'blocked' ? (
            <SettingsIcon size={36} strokeWidth={1.8} color={T.warning} />
          ) : (
            <MapPin size={36} strokeWidth={1.8} color={T.primary} />
          )}
        </View>

        <Text style={styles.title}>
          {status === 'blocked'
            ? 'Ubicación requerida'
            : status === 'denied'
              ? 'Permiso denegado'
              : 'Activar ubicación'}
        </Text>

        <Text style={styles.description}>
          {status === 'blocked'
            ? 'El acceso a ubicación fue denegado permanentemente. Ábrelo desde la configuración del dispositivo para usar esta función.'
            : status === 'denied'
              ? 'Esta función necesita acceso a tu ubicación. ¿Reintentar?'
              : 'Para mostrarte el mapa del campus, las rutas y ayudarte a navegar por la EPN.'}
        </Text>

        <View style={benefitsStyles.benefits}>
          <BenefitItem text="Mapa interactivo del campus" />
          <BenefitItem text="Rutas de Polibus en tiempo real" />
          <BenefitItem text="Navegación por el campus" />
        </View>

        {status === 'blocked' ? (
          <Pressable
            style={styles.primaryButton}
            onPress={handleSettings}
            disabled={buttonDisabled}
          >
            {isRequesting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <SettingsIcon size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.primaryButtonText}>Abrir configuración</Text>
              </>
            )}
          </Pressable>
        ) : status === 'denied' ? (
          <Pressable
            style={styles.primaryButton}
            onPress={handleRetry}
            disabled={buttonDisabled}
          >
            {isRequesting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <RefreshCw size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.primaryButtonText}>Reintentar</Text>
              </>
            )}
          </Pressable>
        ) : (
          <Pressable
            style={styles.primaryButton}
            onPress={handleRequest}
            disabled={buttonDisabled}
          >
            {isRequesting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Permitir acceso</Text>
            )}
          </Pressable>
        )}

        {onSkip && status !== 'blocked' && (
          <Pressable style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipButtonText}>Ahora no</Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );

  if (variant === 'overlay') {
    return (
      <Animated.View style={styles.overlayRoot} exiting={FadeOut.duration(200)}>
        {renderContent()}
      </Animated.View>
    );
  }

  return renderContent();
}

function BenefitItem({ text }: { text: string }) {
  return (
    <View style={benefitsStyles.benefit}>
      <View style={benefitsStyles.benefitDot} />
      <Text style={benefitsStyles.benefitText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlayRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    backgroundColor: T.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    flex: 1,
    backgroundColor: T.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  inline: {
    padding: 16,
  },
  card: {
    backgroundColor: T.surfaceGlass,
    borderRadius: Sizes.radiusXl,
    padding: 28,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: T.cardBorder,
    ...Shadows.xl,
  },
  inlineCard: {
    backgroundColor: T.surfaceGlass,
    borderRadius: Sizes.radiusXl,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: T.cardBorder,
    ...Shadows.lg,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: T.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...Typography.h3,
    color: T.textPrimary,
    textAlign: 'center',
  },
  description: {
    ...Typography.body,
    color: T.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
  },
  primaryButton: {
    backgroundColor: T.primary,
    borderRadius: Sizes.radiusSm,
    padding: 16,
    width: '100%',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    ...Shadows.md,
    shadowColor: T.primary,
    shadowOpacity: 0.3,
  },
  primaryButtonText: {
    ...Typography.button,
    color: '#FFFFFF',
    fontSize: 16,
  },
  skipButton: {
    padding: 8,
    width: '100%',
    alignItems: 'center',
  },
  skipButtonText: {
    ...Typography.bodySm,
    color: T.textTertiary,
  },
});

const benefitsStyles = StyleSheet.create({
  benefits: {
    width: '100%',
    gap: 10,
    backgroundColor: T.surface,
    borderRadius: Sizes.radiusMd,
    padding: 14,
    borderWidth: 1,
    borderColor: T.cardBorder,
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  benefitDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: T.primary,
  },
  benefitText: {
    ...Typography.bodySm,
    color: T.textSecondary,
  },
});
