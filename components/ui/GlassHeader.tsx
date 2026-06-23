import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useAnimatedStyle, interpolate, Extrapolation, type SharedValue,
} from 'react-native-reanimated';
import { Menu } from 'lucide-react-native';
import { LightTheme as T, Sizes, Typography, Shadows } from '@/constants/design-system';

interface GlassHeaderProps {
  scrollY: SharedValue<number>;
  userName?: string;
  userInitials?: string;
  userAvatar?: string | null;
  onAvatarPress?: () => void;
  onMenuPress?: () => void;
}

const HEADER_HEIGHT = 80;

export function GlassHeader({
  scrollY,
  userName,
  userInitials,
  userAvatar,
  onAvatarPress,
  onMenuPress,
}: GlassHeaderProps) {
  const headerStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, HEADER_HEIGHT, HEADER_HEIGHT * 1.5],
      [1, 1, 0],
      Extrapolation.CLAMP
    );
    const translateY = interpolate(
      scrollY.value,
      [0, HEADER_HEIGHT],
      [0, -HEADER_HEIGHT / 2],
      Extrapolation.CLAMP
    );
    return { opacity, transform: [{ translateY }] };
  });

  return (
    <Animated.View style={[styles.header, headerStyle]}>
      <Pressable onPress={onMenuPress} style={styles.iconBtn}>
        <Menu size={22} strokeWidth={2} color={T.primary} />
      </Pressable>

      <Text style={styles.brand}>ESFOTgo</Text>

      <Pressable onPress={onAvatarPress}>
        {userAvatar ? (
          <Image source={{ uri: userAvatar }} style={styles.avatar} contentFit="cover" transition={300} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{userInitials ?? 'U'}</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: HEADER_HEIGHT,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Sizes.paddingMd, paddingTop: 8,
    backgroundColor: T.surfaceGlass,
    zIndex: 50,
    borderBottomWidth: 1, borderBottomColor: T.divider,
    ...Shadows.sm,
  },
  iconBtn: {
    width: 60, height: 60,
    justifyContent: 'center', alignItems: 'center',
  },
  brand: {
    ...Typography.h4, color: T.primary, fontWeight: '800',
  },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 2, borderColor: T.primaryMuted,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: T.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: T.primaryLight + '30',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: T.primary,
  },
});
