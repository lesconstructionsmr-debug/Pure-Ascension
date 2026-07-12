import React from 'react';
import { Image, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, fontFamily } from '../theme/theme';

export interface AvatarProps {
  name?: string; uri?: string; size?: number;
  ring?: boolean; ringColor?: string; style?: ViewStyle;
}

function getInitials(name: string): string {
  return name.trim().split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
}
function getBg(name: string): string {
  const hues = [colors.sage[400], colors.sage[600], colors.clay[300], colors.clay[500]];
  let h = 0; for (let i = 0; i < name.length; i++) h += name.charCodeAt(i);
  return hues[h % hues.length];
}

export const Avatar: React.FC<AvatarProps> = ({ name = '', uri, size = 44, ring = false, ringColor = colors.sage[400], style }) => {
  const br = size / 2;
  const rw = ring ? 2.5 : 0;
  const rg = ring ? 2   : 0;
  const outer = size + (rw + rg) * 2;
  return (
    <View style={[ring ? { width: outer, height: outer, borderRadius: outer / 2, borderWidth: rw, borderColor: ringColor, padding: rg, alignItems: 'center', justifyContent: 'center' } : { width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]} accessibilityLabel={name || 'Avatar'}>
      {uri
        ? <Image source={{ uri }} style={{ width: size, height: size, borderRadius: br, resizeMode: 'cover' }} />
        : <View style={{ width: size, height: size, borderRadius: br, backgroundColor: getBg(name), alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: fontFamily.hanken.bold, fontSize: size * 0.36, color: colors.white, textAlign: 'center', lineHeight: size }}>{getInitials(name)}</Text>
          </View>
      }
    </View>
  );
};
export default Avatar;
