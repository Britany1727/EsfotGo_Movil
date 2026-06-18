import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { useBusInterpolation } from '@/features/polibus/application/bus.hooks';
import type { BusLocation } from '@/features/polibus/domain/route.entity';
import { LightTheme as T, Shadows } from '@/constants/design-system';
import { Bus } from 'lucide-react-native';

interface Props {
  bus: BusLocation;
  color?: string;
}

export function BusMarker({ bus, color = T.primary }: Props) {
  const coord = useBusInterpolation(bus, true);

  if (!coord) return null;

  return (
    <Marker
      coordinate={coord}
      anchor={{ x: 0.5, y: 0.5 }}
      rotation={bus.heading}
      tracksViewChanges={true}
      zIndex={100}
    >
      <View style={[styles.container, { backgroundColor: color }]}>
        <Bus size={18} strokeWidth={2.2} color="#FFFFFF" />
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#FFFFFF',
    ...Shadows.md,
  },
});
