import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { colors, fontFamily, fontSize, radius, spacing } from '../theme/theme';

export interface InputProps extends TextInputProps {
  label?: string; hint?: string; error?: string;
  iconLeft?: React.ReactNode; iconRight?: React.ReactNode; containerStyle?: ViewStyle;
}

export const Input: React.FC<InputProps> = ({ label, hint, error, iconLeft, iconRight, containerStyle, ...rest }) => {
  const [focused, setFocused] = useState(false);
  const borderColor = error ? colors.status.danger : focused ? colors.sage[500] : colors.ink[200];
  return (
    <View style={[{ gap: spacing[1.5] }, containerStyle]}>
      {label && <Text style={{ fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.sm, color:colors.ink[900] }}>{label}</Text>}
      <View style={{ flexDirection:'row', alignItems:'center', borderWidth:1.5, borderRadius:radius.input, backgroundColor:colors.white, paddingHorizontal:spacing[4], minHeight:48, borderColor, ...(focused?{shadowColor:colors.sage[500],shadowOffset:{width:0,height:0},shadowOpacity:0.20,shadowRadius:6,elevation:2}:{}) }}>
        {iconLeft && <View style={{marginRight:spacing[2]}}>{iconLeft}</View>}
        <TextInput style={{ flex:1, fontFamily:fontFamily.hanken.regular, fontSize:fontSize.base, color:colors.ink[900], paddingVertical:spacing[3] }} placeholderTextColor={colors.ink[500]} selectionColor={colors.sage[500]}
          onFocus={e=>{setFocused(true);rest.onFocus?.(e);}} onBlur={e=>{setFocused(false);rest.onBlur?.(e);}}
          accessibilityLabel={label} accessibilityHint={hint} {...rest} />
        {iconRight && <View style={{marginLeft:spacing[2]}}>{iconRight}</View>}
      </View>
      {(hint||error) && <Text style={{ fontFamily:fontFamily.hanken.regular, fontSize:fontSize.xs, color:error?colors.status.danger:colors.ink[500] }}>{error??hint}</Text>}
    </View>
  );
};
export default Input;
