import React, { useEffect, useRef } from 'react';
import { Animated, View, ViewStyle } from 'react-native';
import { colors, duration as dur } from '../theme/theme';

export interface ProgressProps { value: number; trackColor?: string; fillColor?: string; height?: number; animated?: boolean; style?: ViewStyle; }

export const Progress: React.FC<ProgressProps> = ({ value, trackColor=colors.ink[200], fillColor=colors.clay[500], height=8, animated=true, style }) => {
  const width = useRef(new Animated.Value(0)).current;
  const clamped = Math.min(100, Math.max(0, value));
  useEffect(() => {
    animated ? Animated.timing(width,{toValue:clamped,duration:dur.slow,useNativeDriver:false}).start() : width.setValue(clamped);
  }, [clamped, animated]);
  return (
    <View style={[{ overflow:'hidden', width:'100%', height, borderRadius:height/2, backgroundColor:trackColor }, style]} accessibilityRole="progressbar" accessibilityValue={{min:0,max:100,now:clamped}}>
      <Animated.View style={{ position:'absolute', left:0, top:0, height, borderRadius:height/2, backgroundColor:fillColor, width:width.interpolate({inputRange:[0,100],outputRange:['0%','100%']}) }} />
    </View>
  );
};
export default Progress;
