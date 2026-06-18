import React, { memo, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import type { LocationObject } from 'expo-location';

interface UserMarkerProps {
  location: LocationObject;
  showHeading?: boolean;
}

const AnimatedView = Animated.createAnimatedComponent(View);

function PulseRing() {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.35);

  useEffect(() => {
    scale.value = withRepeat(
      withTiming(1.6, { duration: 1800 }),
      -1,
      false,
    );
    opacity.value = withRepeat(
      withTiming(0, { duration: 1600 }),
      -1,
      false,
    );
  }, [scale, opacity]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <AnimatedView style={[styles.pulseRing, animStyle]} />
  );
}

export const UserMarker = memo(
  function UserMarker({ location, showHeading = true }: UserMarkerProps) {
    const { latitude, longitude, heading } = location.coords;

    return (
      <Marker
        coordinate={{ latitude, longitude }}
        title="Mi ubicacion"
        rotation={showHeading ? (heading ?? 0) : 0}
        anchor={{ x: 0.5, y: 0.5 }}
        tracksViewChanges={true}
        zIndex={200}
      >
        <PulseRing />
        <View style={styles.outer}>
          <View style={styles.inner}>
            <View style={styles.dot} />
          </View>
          <View style={styles.arrow} />
        </View>
      </Marker>
    );
  },
  (prev, next) =>
    prev.location.coords.latitude === next.location.coords.latitude &&
    prev.location.coords.longitude === next.location.coords.longitude &&
    prev.location.coords.heading === next.location.coords.heading,
);

const styles = StyleSheet.create({
  pulseRing: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 51, 160, 0.15)',
  },
  outer: {
    width: 28,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0, 32, 91, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#00205B',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  arrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#00205B',
    marginTop: -1,
  },
});
