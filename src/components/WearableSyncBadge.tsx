/**
 * WearableSyncBadge — Badge de synchronisation en direct des montres connectées.
 * Pure Ascension — Expo SDK 56
 */
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Activity, Watch, RefreshCw } from 'lucide-react-native';
import { colors, fontFamily, fontSize, radius, spacing } from '../theme/theme';
import { useWearableStore } from '../store/useWearableStore';

interface Props {
  onPress?: () => void;
  compact?: boolean;
}

export const WearableSyncBadge: React.FC<Props> = ({ onPress, compact = false }) => {
  const { appleWatchConnected, garminConnected, currentHeartRate, todaySteps } = useWearableStore();

  const isConnected = appleWatchConnected || garminConnected;
  const deviceName = appleWatchConnected ? 'Apple Watch' : garminConnected ? 'Garmin' : null;

  if (!isConnected) {
    return null;
  }

  if (compact) {
    return (
      <Pressable style={st.badgeCompact} onPress={onPress}>
        <Activity size={12} color={colors.sage[400]} />
        <Text style={st.badgeCompactText}>{currentHeartRate > 0 ? `${currentHeartRate} BPM` : deviceName}</Text>
      </Pressable>
    );
  }

  return (
    <Pressable style={st.badgeCard} onPress={onPress}>
      <View style={st.leftRow}>
        <View style={st.iconBox}>
          <Watch size={16} color={colors.sage[400]} />
        </View>
        <View>
          <Text style={st.deviceTitle}>{deviceName} Connectée</Text>
          <Text style={st.metricsSub}>
            {currentHeartRate > 0 ? `❤️ ${currentHeartRate} BPM` : 'Synchro active'} • 👟 {todaySteps.toLocaleString('fr-FR')} pas
          </Text>
        </View>
      </View>
      <RefreshCw size={14} color={colors.sage[400]} />
    </Pressable>
  );
};

const st = StyleSheet.create({
  badgeCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: '#1E2A22',
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1],
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#2F4335',
  },
  badgeCompactText: {
    fontFamily: fontFamily.hanken.semiBold,
    fontSize: fontSize.xs,
    color: colors.sand[100],
  },
  badgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(26, 39, 30, 0.9)',
    borderRadius: radius.lg,
    paddingHorizontal: spacing[3.5],
    paddingVertical: spacing[2.5],
    borderWidth: 1,
    borderColor: 'rgba(94, 132, 85, 0.25)',
    marginVertical: spacing[1.5],
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2.5],
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: '#152119',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceTitle: {
    fontFamily: fontFamily.hanken.semiBold,
    fontSize: fontSize.xs,
    color: colors.sand[100],
  },
  metricsSub: {
    fontFamily: fontFamily.hanken.regular,
    fontSize: 10,
    color: colors.sage[300],
    marginTop: 1,
  },
});
