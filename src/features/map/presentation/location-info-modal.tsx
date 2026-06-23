import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  ScrollView,
  Dimensions,
} from 'react-native';
import Animated, { FadeIn, SlideInUp, FadeOut } from 'react-native-reanimated';
import { X } from 'lucide-react-native';
import { PannellumViewer } from './pannellum-viewer';
import { getCategoryConfig } from '@/features/map/application/map.hooks';
import type { CampusLocation } from '@/features/map/domain/location.entity';
import { LightTheme as T, Sizes, Typography } from '@/constants/design-system';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
  location: CampusLocation;
  onClose: () => void;
}

export function LocationInfoModal({ location, onClose }: Props) {
  const config = getCategoryConfig(location.category);
  const hasMedia = !!(location.image || location.image360 || location.imageUrl);
  const is360 = location.mediaType === '360' || !!location.image360;
  const imageSrc = location.image360 || location.image || location.imageUrl;

  const renderContent = () => {
    if (!hasMedia || !imageSrc) {
      return (
        <View style={styles.noMedia}>
          <Text style={styles.noMediaIcon}>📷</Text>
          <Text style={styles.noMediaText}>
            No hay contenido multimedia disponible para este lugar.
          </Text>
        </View>
      );
    }

    if (is360) {
      return <PannellumViewer imageUrl={imageSrc} />;
    }

    return (
      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollInner}
        showsVerticalScrollIndicator={false}
      >
        <Image
          source={{ uri: imageSrc }}
          style={styles.normalImage}
          resizeMode="contain"
        />
        {location.description && (
          <Text style={styles.description}>{location.description}</Text>
        )}
      </ScrollView>
    );
  };

  return (
    <Animated.View
      entering={FadeIn.duration(250)}
      exiting={FadeOut.duration(200)}
      style={styles.overlay}
    >
      <Animated.View
        entering={SlideInUp.springify().damping(22).stiffness(200)}
        style={styles.container}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconWrap, { backgroundColor: config.color + '18' }]}>
              <Text style={[styles.iconLetter, { color: config.color }]}>
                {config.label.charAt(0)}
              </Text>
            </View>
            <View style={styles.headerT}>
              <Text style={styles.title} numberOfLines={2}>{location.name}</Text>
              <View style={[styles.badge, { backgroundColor: config.color + '18' }]}>
                <Text style={[styles.badgeT, { color: config.color }]}>{config.label}</Text>
              </View>
            </View>
          </View>
          <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={12}>
            <X size={22} strokeWidth={2.2} color={T.textPrimary} />
          </Pressable>
        </View>

        <View style={styles.mediaContainer}>
          {renderContent()}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
    zIndex: 1000, elevation: 1000,
  },
  container: {
    height: SCREEN_HEIGHT * 0.78,
    backgroundColor: T.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Sizes.paddingLg,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: T.divider,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginRight: 12,
  },
  iconWrap: {
    width: 48, height: 48, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  iconLetter: { fontSize: 22, fontWeight: '800' },
  headerT: { flex: 1, gap: 4 },
  title: { ...Typography.h4, color: T.textPrimary },
  badge: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 10, alignSelf: 'flex-start',
  },
  badgeT: { fontSize: 11, fontWeight: '700' },
  closeBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: T.surfaceBorder,
    justifyContent: 'center', alignItems: 'center',
  },
  mediaContainer: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    padding: Sizes.paddingLg,
    gap: 16,
    paddingBottom: 32,
  },
  normalImage: {
    width: '100%',
    height: 260,
    borderRadius: Sizes.radiusMd,
    backgroundColor: T.surface,
  },
  description: {
    ...Typography.body,
    color: T.textSecondary,
    lineHeight: 22,
  },
  noMedia: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Sizes.paddingXl,
    gap: 12,
  },
  noMediaIcon: {
    fontSize: 48,
  },
  noMediaText: {
    ...Typography.body,
    color: T.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
