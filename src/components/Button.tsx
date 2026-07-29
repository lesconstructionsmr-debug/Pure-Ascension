import React, { useCallback, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, ActivityIndicator, ViewStyle, PressableProps } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, fontFamily, fontSize, radius, spacing } from '../theme/theme';

export type ButtonVariant = 'primary'|'accent'|'secondary'|'ghost'|'soft';
export type ButtonSize    = 'sm'|'md'|'lg';
export interface ButtonProps extends Omit<PressableProps,'style'> {
  variant?: ButtonVariant; size?: ButtonSize; label: string;
  iconLeft?: React.ReactNode; iconRight?: React.ReactNode;
  fullWidth?: boolean; loading?: boolean; disabled?: boolean; style?: ViewStyle;
}

const vBg:  Record<ButtonVariant, ViewStyle> = { primary: { backgroundColor: colors.sage[500] }, accent: { backgroundColor: colors.clay[500] }, secondary: { backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.ink[200] }, ghost: { backgroundColor: 'transparent' }, soft: { backgroundColor: colors.sage[100] } };
const vFg:  Record<ButtonVariant, string>    = { primary: colors.white, accent: colors.white, secondary: colors.ink[900], ghost: colors.sage[600], soft: colors.sage[700] };
const sPad: Record<ButtonSize, ViewStyle>    = { sm: { paddingHorizontal: spacing[4], paddingVertical: spacing[2] }, md: { paddingHorizontal: spacing[6], paddingVertical: spacing[3] }, lg: { paddingHorizontal: spacing[8], paddingVertical: spacing[4] } };
const sFnt: Record<ButtonSize, number>       = { sm: fontSize.sm, md: fontSize.base, lg: fontSize.md };
const sMin: Record<ButtonSize, number>       = { sm: 36, md: 44, lg: 52 };

export const Button: React.FC<ButtonProps> = ({ variant='primary', size='md', label, iconLeft, iconRight, fullWidth=false, loading=false, disabled=false, style, onPress, ...rest }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const ty    = useRef(new Animated.Value(0)).current;
  const pi = useCallback(() => { Animated.parallel([Animated.timing(scale,{toValue:0.99,duration:80,useNativeDriver:true}),Animated.timing(ty,{toValue:1,duration:80,useNativeDriver:true})]).start(); },[]);
  const po = useCallback(() => { Animated.parallel([Animated.timing(scale,{toValue:1,duration:180,useNativeDriver:true}),Animated.timing(ty,{toValue:0,duration:180,useNativeDriver:true})]).start(); },[]);
  const isDisabled = disabled || loading;

  const handlePress = useCallback((e: any) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (err) {}
    onPress?.(e);
  }, [onPress]);

  return (
    <Pressable onPress={handlePress} onPressIn={pi} onPressOut={po} disabled={isDisabled} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: isDisabled }} {...rest}>
      <Animated.View style={[{ flexDirection:'row', alignItems:'center', justifyContent:'center', borderRadius:radius.pill, minHeight:sMin[size] }, vBg[variant], sPad[size], fullWidth&&{width:'100%'}, isDisabled&&{opacity:0.45}, { transform:[{scale},{translateY:ty}] }, style]}>
        {loading ? <ActivityIndicator size="small" color={variant==='secondary'||variant==='ghost'?colors.sage[500]:colors.white} />
          : <>{iconLeft&&<View style={{marginRight:spacing[2]}}>{iconLeft}</View>}
              <Text style={{ fontFamily:fontFamily.hanken.semiBold, fontSize:sFnt[size], color:vFg[variant], letterSpacing:0.1 }} numberOfLines={1}>{label}</Text>
              {iconRight&&<View style={{marginLeft:spacing[2]}}>{iconRight}</View>}</>}
      </Animated.View>
    </Pressable>
  );
};
export default Button;
