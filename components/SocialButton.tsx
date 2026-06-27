import React from 'react';
import {
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  View,
} from 'react-native';

interface Props {
  label: string;
  /** Single-character brand glyph shown in the leading badge (e.g. "G", "" for Apple). */
  badge: string;
  backgroundColor: string;
  textColor: string;
  /** Badge text color; defaults to textColor. */
  badgeColor?: string;
  /** Renders a subtle border — used for the white Google button so it reads on a light background. */
  bordered?: boolean;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}

/**
 * Brand-styled sign-in button used in the provider column on WelcomeScreen. Keeps the screen
 * declarative: one <SocialButton> per provider, styled to match the mockup.
 */
const SocialButton = ({
  label,
  badge,
  backgroundColor,
  textColor,
  badgeColor,
  bordered,
  onPress,
  disabled,
  loading,
}: Props) => {
  const containerStyle: ViewStyle = {
    backgroundColor,
    ...(bordered ? {borderWidth: 1, borderColor: '#dadce0'} : {}),
  };
  const labelStyle: TextStyle = {color: textColor};

  return (
    <TouchableOpacity
      style={[styles.button, containerStyle, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}>
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <>
          <View style={styles.badge}>
            <Text style={[styles.badgeText, {color: badgeColor ?? textColor}]}>
              {badge}
            </Text>
          </View>
          <Text style={[styles.label, labelStyle]}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
    minHeight: 52,
  },
  disabled: {
    opacity: 0.6,
  },
  badge: {
    width: 28,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 18,
    fontWeight: '700',
  },
  label: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 28,
  },
});

export default SocialButton;
