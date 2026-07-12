import React from 'react';
import { Text, View, ViewStyle } from 'react-native';
import { colors, fontFamily, fontSize, spacing } from '../theme/theme';

export interface StatProps { value: string|number; label: string; unit?: string; style?: ViewStyle; align?: 'left'|'center'|'right'; }

export const Stat: React.FC<StatProps> = ({ value, label, unit, style, align='center' }) => (
  <View style={[{ alignItems:'center' }, style]}>
    <View style={{ flexDirection:'row', alignItems:'flex-end', gap:2 }}>
      <Text style={{ fontFamily:fontFamily.spectral.medium, fontSize:fontSize['3xl'], color:colors.ink[900], lineHeight:36, textAlign:align }}>{value}</Text>
      {unit && <Text style={{ fontFamily:fontFamily.hanken.medium, fontSize:fontSize.md, color:colors.ink[500], paddingBottom:4, textAlign:align }}>{unit}</Text>}
    </View>
    <Text style={{ fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.xs, color:colors.ink[600], textTransform:'uppercase', letterSpacing:1.4, marginTop:spacing[0.5], textAlign:align }}>{label}</Text>
  </View>
);
export default Stat;
