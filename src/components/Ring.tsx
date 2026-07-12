import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, fontFamily, fontSize } from '../theme/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface RingProps { value: number; size?: number; strokeWidth?: number; fillColor?: string; trackColor?: string; label?: string; sublabel?: string; style?: ViewStyle; }

export const Ring: React.FC<RingProps> = ({ value, size=72, strokeWidth=7, fillColor=colors.sage[500], trackColor=colors.ink[200], label, sublabel, style }) => {
  const clamped = Math.min(100, Math.max(0, value));
  const r = (size - strokeWidth) / 2;
  const cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(progress,{toValue:clamped,duration:600,useNativeDriver:false}).start(); }, [clamped]);
  const offset = progress.interpolate({ inputRange:[0,100], outputRange:[circ,0] });
  return (
    <View style={[{ width:size, height:size, alignItems:'center', justifyContent:'center' }, style]} accessibilityRole="progressbar" accessibilityValue={{min:0,max:100,now:clamped}}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={cx} cy={cy} r={r} stroke={trackColor} strokeWidth={strokeWidth} fill="transparent" />
        <AnimatedCircle cx={cx} cy={cy} r={r} stroke={fillColor} strokeWidth={strokeWidth} fill="transparent" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" rotation="-90" origin={`${cx},${cy}`} />
      </Svg>
      {(label||sublabel) && (
        <View style={{ position:'absolute', alignItems:'center', justifyContent:'center' }}>
          {label    && <Text style={{ fontFamily:fontFamily.spectral.medium, fontSize:size<60?fontSize.sm:fontSize.base, color:colors.ink[900], lineHeight:20 }}>{label}</Text>}
          {sublabel && <Text style={{ fontFamily:fontFamily.hanken.regular,  fontSize:size<60?8:fontSize.xs,  color:colors.ink[600], textAlign:'center', lineHeight:12 }}>{sublabel}</Text>}
        </View>
      )}
    </View>
  );
};
export default Ring;
