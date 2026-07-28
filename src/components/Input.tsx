import React, { useState, useRef } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle, Pressable } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { colors, fontFamily, fontSize, radius, spacing } from '../theme/theme';

export interface InputProps extends TextInputProps {
  label?: string;
  hint?: string;
  error?: string;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  containerStyle?: ViewStyle;
}

export const Input: React.FC<InputProps> = ({
  label,
  hint,
  error,
  iconLeft,
  iconRight,
  containerStyle,
  secureTextEntry,
  ...rest
}) => {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const isSecure = secureTextEntry && !showPassword;
  const borderColor = error ? colors.status.danger : focused ? colors.sage[500] : colors.ink[200];

  const handleContainerPress = () => {
    inputRef.current?.focus();
  };

  return (
    <View style={[{ gap: spacing[1.5] }, containerStyle]}>
      {label && (
        <Text
          onPress={handleContainerPress}
          style={{ fontFamily: fontFamily.hanken.semiBold, fontSize: fontSize.sm, color: colors.ink[900] }}
        >
          {label}
        </Text>
      )}
      <Pressable
        onPress={handleContainerPress}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1.5,
          borderRadius: radius.input,
          backgroundColor: colors.white,
          paddingHorizontal: spacing[4],
          minHeight: 48,
          borderColor,
          ...(focused
            ? {
                shadowColor: colors.sage[500],
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.2,
                shadowRadius: 6,
                elevation: 2,
              }
            : {}),
        }}
      >
        {iconLeft && (
          <View pointerEvents="none" style={{ marginRight: spacing[2] }}>
            {iconLeft}
          </View>
        )}

        <TextInput
          ref={inputRef}
          style={{
            flex: 1,
            fontFamily: fontFamily.hanken.regular,
            fontSize: fontSize.base,
            color: colors.ink[900],
            paddingVertical: spacing[3],
          }}
          placeholderTextColor={colors.ink[500]}
          selectionColor={colors.sage[500]}
          secureTextEntry={isSecure}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          accessibilityLabel={label}
          accessibilityHint={hint}
          {...rest}
        />

        {secureTextEntry ? (
          <Pressable
            onPress={() => setShowPassword((v) => !v)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{ marginLeft: spacing[2] }}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          >
            {showPassword ? (
              <EyeOff size={18} color={colors.ink[500]} strokeWidth={1.5} />
            ) : (
              <Eye size={18} color={colors.ink[500]} strokeWidth={1.5} />
            )}
          </Pressable>
        ) : (
          iconRight && (
            <View pointerEvents="none" style={{ marginLeft: spacing[2] }}>
              {iconRight}
            </View>
          )
        )}
      </Pressable>

      {(hint || error) && (
        <Text
          style={{
            fontFamily: fontFamily.hanken.regular,
            fontSize: fontSize.xs,
            color: error ? colors.status.danger : colors.ink[500],
          }}
        >
          {error ?? hint}
        </Text>
      )}
    </View>
  );
};

export default Input;
