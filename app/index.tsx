import { isDevMode } from '@/core/config/env';
import { useAuthStore } from '@/store/auth.store';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect } from 'expo-router';
import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const { width: W, height: H } = Dimensions.get('window');
const DURATION = 2200;

export default function SplashAndRedirect() {
  const user = useAuthStore((s) => s.user);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const [done, setDone] = React.useState(false);

  // Animation values
  const logoScale = useSharedValue(0.4);
  const logoOpacity = useSharedValue(0);
  const logoRotate = useSharedValue(-8);
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(20);
  const taglineOpacity = useSharedValue(0);
  const dotsOpacity = useSharedValue(0);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [
      { scale: logoScale.value },
      { rotate: `${logoRotate.value}deg` },
    ],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
  }));

  const dotsStyle = useAnimatedStyle(() => ({
    opacity: dotsOpacity.value,
  }));

  const handleDone = React.useCallback(() => {
    setDone(true);
  }, []);

  useEffect(() => {
    // Logo appears with bounce
    logoOpacity.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) });
    logoScale.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.back(1.4)) });
    logoRotate.value = withTiming(0, { duration: 700, easing: Easing.out(Easing.cubic) });

    // App name slides up
    textOpacity.value = withDelay(400, withTiming(1, { duration: 500 }));
    textTranslateY.value = withDelay(400, withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) }));

    // Tagline and dots appear
    taglineOpacity.value = withDelay(700, withTiming(1, { duration: 400 }));
    dotsOpacity.value = withDelay(900, withTiming(1, { duration: 300 }));

    // After full animation, signal done
    const timer = setTimeout(() => {
      runOnJS(handleDone)();
    }, DURATION);

    return () => clearTimeout(timer);
  }, []);

  // Redirect once animation is done AND auth is initialized
  if (done && isInitialized) {
    if (isDevMode() && !user) {
      console.log('[Splash] Modo dev sin usuario → dev-login');
      return <Redirect href="/auth/dev-login" />;
    }
    if (user) {
      console.log('[Splash] Usuario autenticado → drawer');
      return <Redirect href="/(drawer)/(tabs)" />;
    }
    console.log('[Splash] Sin autenticación → login');
    return <Redirect href="/auth/login" />;
  }

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#042c5c', '#0a4488', '#042c5c']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative circles */}
      <View style={[styles.circle, styles.circle1]} />
      <View style={[styles.circle, styles.circle2]} />
      <View style={[styles.circle, styles.circle3]} />

      {/* Center content */}
      <View style={styles.center}>
        {/* Logo mark */}
        <Animated.View style={[styles.logoWrap, logoStyle]}>
          <View style={styles.logoRing}>
            <View style={styles.logoInner}>
              <Text style={styles.logoLetters}>EPN</Text>
            </View>
          </View>

          {/* Accent dot */}
          <View style={styles.accentDot} />
        </Animated.View>

        {/* App name */}
        <Animated.View style={[styles.nameWrap, textStyle]}>
          <Text style={styles.appName}>
            ESFOT <Text style={styles.appNameAccent}>Go</Text>
          </Text>
        </Animated.View>

        {/* Tagline */}
        <Animated.Text style={[styles.tagline, taglineStyle]}>
          Tu guía inteligente para navegar el campus.
        </Animated.Text>

        {/* Loading dots */}
        <Animated.View style={[styles.dotsRow, dotsStyle]}>
          {[0, 1, 2].map((i) => (
            <LoadingDot key={i} delay={i * 150} />
          ))}
        </Animated.View>
      </View>

      {/* Bottom brand */}
      <View style={styles.bottomBrand}>
        <Text style={styles.epnLabel}>Escuela Politécnica Nacional</Text>
        <Text style={styles.esfotLabel}>ESFOT · Tecnólogos</Text>
      </View>
    </View>
  );
}

function LoadingDot({ delay }: { delay: number }) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withSequence(
        withTiming(1, { duration: 400 }),
        withTiming(0.3, { duration: 400 }),
      )
    );
    const interval = setInterval(() => {
      opacity.value = withDelay(
        delay,
        withSequence(
          withTiming(1, { duration: 400 }),
          withTiming(0.3, { duration: 400 }),
        )
      );
    }, 1200);
    return () => clearInterval(interval);
  }, [delay]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return <Animated.View style={[styles.dot, style]} />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#042c5c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circle: {
    position: 'absolute',
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  circle1: {
    width: W * 1.4,
    height: W * 1.4,
    top: -W * 0.6,
    left: -W * 0.2,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  circle2: {
    width: W * 0.8,
    height: W * 0.8,
    bottom: H * 0.05,
    right: -W * 0.3,
    backgroundColor: 'rgba(235,47,38,0.05)',
    borderColor: 'rgba(235,47,38,0.08)',
  },
  circle3: {
    width: W * 0.5,
    height: W * 0.5,
    bottom: H * 0.1,
    left: -W * 0.15,
    backgroundColor: 'rgba(250,187,84,0.04)',
    borderColor: 'rgba(250,187,84,0.06)',
  },
  center: {
    alignItems: 'center',
    gap: 16,
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  logoRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  logoInner: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: '#eb2f26',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#eb2f26',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 12,
  },
  logoLetters: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 3,
  },
  accentDot: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fabb54',
    borderWidth: 3,
    borderColor: '#042c5c',
    shadowColor: '#fabb54',
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 6,
  },
  nameWrap: {
    alignItems: 'center',
  },
  appName: {
    fontSize: 42,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  appNameAccent: {
    color: '#fabb54',
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    letterSpacing: 0.3,
    maxWidth: 260,
    lineHeight: 20,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fabb54',
  },
  bottomBrand: {
    position: 'absolute',
    bottom: 44,
    alignItems: 'center',
    gap: 4,
  },
  epnLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  esfotLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
