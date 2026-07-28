import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Home, UtensilsCrossed, Dumbbell, User } from 'lucide-react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors, fontFamily } from '../theme/theme';

const TAB_ICONS: Record<string, React.FC<{ color: string; size: number; strokeWidth: number }>> = {
  Accueil: Home,
  Repas: UtensilsCrossed,
  Séances: Dumbbell,
  Profil: User,
};

export const BottomNav: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  return (
    <View style={styles.container}>
      {Platform.OS === 'ios' ? (
        <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
      ) : (
        <View style={styles.solidBg} />
      )}
      <View style={styles.content}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = options.tabBarLabel !== undefined
            ? (options.tabBarLabel as string)
            : options.title !== undefined
            ? options.title
            : route.name;

          const isFocused = state.index === index;
          const Icon = TAB_ICONS[route.name] || Home;
          const iconColor = isFocused ? colors.sage[600] : colors.ink[500];
          const strokeWidth = isFocused ? 2.4 : 1.8;

          const onPress = () => {
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            }

            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarButtonTestID}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tabButton}
              activeOpacity={0.7}
            >
              <View style={styles.iconContainer}>
                <Icon size={24} color={iconColor} strokeWidth={strokeWidth} />
                {isFocused && <View style={styles.activeDot} />}
              </View>
              <Text
                style={[
                  styles.label,
                  {
                    fontFamily: isFocused ? fontFamily.hanken.semiBold : fontFamily.hanken.regular,
                    color: isFocused ? colors.sage[600] : colors.ink[500],
                  },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 0.5,
    borderTopColor: colors.ink[200],
    elevation: 0,
  },
  solidBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(251, 248, 243, 0.96)',
  },
  content: {
    flexDirection: 'row',
    height: Platform.OS === 'ios' ? 82 : 64,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    paddingTop: 8,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.sage[600],
  },
  label: {
    fontSize: 10,
    letterSpacing: 0.3,
  },
});

export default BottomNav;
