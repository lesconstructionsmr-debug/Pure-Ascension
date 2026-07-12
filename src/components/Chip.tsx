import React, { useCallback, useRef } from 'react';
import { Animated, Pressable, Text, View, ViewStyle } from 'react-native';
import { X } from 'lucide-react-native';
import { colors, fontFamily, fontSize, radius, spacing } from '../theme/theme';

export interface ChipProps { label: string; selected?: boolean; removable?: boolean; onPress?: () => void; onRemove?: () => void; disabled?: boolean; style?: ViewStyle; }

export const Chip: React.FC<ChipProps> = ({ label, selected=false, removable=false, onPress, onRemove, disabled=false, style }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const pi = useCallback(() => Animated.timing(scale,{toValue:0.97,duration:80,useNativeDriver:true}).start(),[]);
  const po = useCallback(() => Animated.timing(scale,{toValue:1,duration:180,useNativeDriver:true}).start(),[]);
  return (
    <Pressable onPress={onPress} onPressIn={pi} onPressOut={po} disabled={disabled} accessibilityRole="button" accessibilityState={{ selected, disabled }}>
      <Animated.View style={[{ flexDirection:'row', alignItems:'center', paddingHorizontal:spacing[4], paddingVertical:spacing[2], borderRadius:radius.pill, minHeight:36, borderWidth:1.5 }, selected?{backgroundColor:colors.sage[500],borderColor:colors.sage[500]}:{backgroundColor:colors.white,borderColor:colors.ink[200]}, disabled&&{opacity:0.45}, {transform:[{scale}]}, style]}>
        <Text style={{ fontFamily:fontFamily.hanken.medium, fontSize:fontSize.sm, color:selected?colors.white:colors.ink[600] }} numberOfLines={1}>{label}</Text>
        {removable && <Pressable onPress={onRemove} hitSlop={{top:8,right:8,bottom:8,left:4}}><View style={{marginLeft:spacing[1.5]}}><X size={12} color={selected?colors.white:colors.ink[500]} strokeWidth={2} /></View></Pressable>}
      </Animated.View>
    </Pressable>
  );
};
export default Chip;
