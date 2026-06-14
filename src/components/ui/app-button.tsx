import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, type TouchableOpacityProps } from 'react-native';
import { LightTheme as T, Sizes, Typography } from '@/constants/design-system';

interface AppButtonProps extends TouchableOpacityProps {
  label?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  isLoading?: boolean;
}

export function AppButton({
  label,
  variant = 'primary',
  size = 'md',
  icon,
  isLoading,
  disabled,
  style,
  ...props
}: AppButtonProps) {
  const isOutlineOrGhost = variant === 'outline' || variant === 'ghost';
  
  const getTextColor = () => {
    if (disabled && !isOutlineOrGhost) return T.textMuted;
    if (disabled && isOutlineOrGhost) return T.textTertiary;
    if (variant === 'primary') return '#FFFFFF';
    if (variant === 'danger') return T.error;
    if (variant === 'ghost') return T.primary;
    return T.textPrimary;
  };

  return (
    <TouchableOpacity
      style={[
        styles.base,
        styles[`variant_${variant}`],
        styles[`size_${size}`],
        disabled && styles.disabled,
        style
      ]}
      disabled={disabled || isLoading}
      activeOpacity={0.7}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={getTextColor()} />
      ) : (
        <>
          {icon && icon}
          {label ? (
            <Text style={[
              styles.textBase,
              styles[`textSize_${size}`],
              { color: getTextColor(), marginLeft: icon ? 6 : 0 }
            ]}>
              {label}
            </Text>
          ) : null}
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Sizes.radiusMd,
  },
  disabled: {
    opacity: 0.6,
  },
  // Variants
  variant_primary: {
    backgroundColor: T.primary,
  },
  variant_secondary: {
    backgroundColor: T.surfaceBorder,
  },
  variant_outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: T.primary,
  },
  variant_ghost: {
    backgroundColor: 'transparent',
  },
  variant_danger: {
    backgroundColor: T.errorBg,
  },
  // Sizes
  size_sm: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Sizes.radiusSm,
  },
  size_md: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    minHeight: 48,
  },
  size_lg: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    minHeight: 56,
  },
  // Typography
  textBase: {
    ...Typography.button,
  },
  textSize_sm: {
    fontSize: 13,
  },
  textSize_md: {
    fontSize: 15,
  },
  textSize_lg: {
    fontSize: 16,
  },
});
