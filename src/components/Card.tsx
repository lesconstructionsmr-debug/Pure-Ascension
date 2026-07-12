import React, { useCallback, useRef } from 'react';
import { Animated, Pressable, View, ViewStyle } from 'react-native';
import { colors, radius, shadows, spacing } from '../theme/theme';

export type CardElevation = 'none'|'sm'|'md'|'lg';
export interface CardProps {
  children: React.ReactNode; elevation?: CardElevation; padding?: number;
  interactive?: boolean; onPress?: () => void; style?: ViewStyle; dark?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, elevation='sm', padding=spacing[5], interactive=false, onPress, style, dark=false }) => {
  const ty = useRef(new Animated.Value(0)).current;
  const pi = useCallback(() => { if (interactive) Animated.timing(ty,{toValue:-2,duration:140,useNativeDriver:true}).start(); },[interactive]);
  const po = useCallback(() => { if (interactive) Animated.timing(ty,{toValue:0,duration:200,useNativeDriver:true}).start(); },[interactive]);
  const base: ViewStyle = { padding, backgroundColor: dark ? colors.sage[800] : colors.white, borderRadius: radius.card, ...(elevation !== 'none' ? shadows[elevation] : {}) };
  if (interactive && onPress) return (
    <Pressable onPress={onPress} onPressIn={pi} onPressOut={po} accessibilityRole="button">
      <Animated.View style={[base, { transform:[{translateY:ty}] }, style]}>{children}</Animated.View>
    </Pressable>
  );
  return <View style={[base, style]}>{children}</View>;
};
export default Card;
