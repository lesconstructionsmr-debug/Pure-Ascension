/**
 * WearablesScreen — Écran d'administration des montres connectées (Apple Watch & Garmin).
 * Pure Ascension — Expo SDK 56
 */
import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Watch, ArrowLeft, CheckCircle2, RefreshCw, Zap, Shield } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, fontFamily, fontSize, radius, shadows, spacing } from '../theme/theme';
import { useWearableStore } from '../store/useWearableStore';
import { requestAppleHealthPermissions, disconnectAppleWatch, syncAppleHealthMetrics } from '../services/appleHealthService';
import { syncGarminMetrics, disconnectGarmin } from '../services/garminSyncService';
import { auth } from '../services/firebase';

export const WearablesScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const {
    appleWatchConnected,
    garminConnected,
    currentHeartRate,
    todaySteps,
    todayActiveKcal,
    lastSyncTimestamp,
  } = useWearableStore();

  const [loadingApple, setLoadingApple] = useState(false);
  const [loadingGarmin, setLoadingGarmin] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);

  const handleAppleToggle = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}

    if (appleWatchConnected) {
      disconnectAppleWatch();
      return;
    }

    setLoadingApple(true);
    const success = await requestAppleHealthPermissions();
    setLoadingApple(false);

    if (success) {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {}
    }
  };

  const handleGarminToggle = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}

    if (garminConnected) {
      disconnectGarmin();
      return;
    }

    setLoadingGarmin(true);
    const uid = auth.currentUser?.uid || 'guest';
    const res = await syncGarminMetrics(uid);
    setLoadingGarmin(false);

    if (res.success) {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {}
    }
  };

  const handleManualSync = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (e) {}

    setSyncingAll(true);
    if (appleWatchConnected) {
      await syncAppleHealthMetrics();
    }
    if (garminConnected) {
      const uid = auth.currentUser?.uid || 'guest';
      await syncGarminMetrics(uid);
    }
    setSyncingAll(false);
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.header}>
          <Pressable onPress={() => navigation.goBack()} style={s.backBtn} hitSlop={12}>
            <ArrowLeft size={20} color={colors.ink[900]} />
          </Pressable>
          <Text style={s.headerTitle}>Montres & Appareils</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Hero Section */}
        <View style={s.heroBox}>
          <Watch size={32} color={colors.sand[100]} />
          <Text style={s.heroTitle}>Synchronisation Capteurs & Montres</Text>
          <Text style={s.heroSub}>
            Connectez votre Apple Watch ou votre montre Garmin pour mesurer automatiquement votre pouls, vos pas et vos calories actives pendant vos séances.
          </Text>
        </View>

        {/* Statut Global */}
        {(appleWatchConnected || garminConnected) && (
          <View style={s.statusCard}>
            <View style={s.statusHeader}>
              <Text style={s.statusTitle}>DONNÉES EN DIRECT</Text>
              {lastSyncTimestamp && (
                <Text style={s.syncTime}>
                  Dernière synchro : {new Date(lastSyncTimestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              )}
            </View>

            <View style={s.metricsRow}>
              <View style={s.metricItem}>
                <Text style={s.metricVal}>{currentHeartRate > 0 ? `${currentHeartRate}` : '—'}</Text>
                <Text style={s.metricLabel}>BPM Pouls</Text>
              </View>

              <View style={s.metricDivider} />

              <View style={s.metricItem}>
                <Text style={s.metricVal}>{todaySteps.toLocaleString('fr-FR')}</Text>
                <Text style={s.metricLabel}>Pas du jour</Text>
              </View>

              <View style={s.metricDivider} />

              <View style={s.metricItem}>
                <Text style={s.metricVal}>{todayActiveKcal} kcal</Text>
                <Text style={s.metricLabel}>Dépense active</Text>
              </View>
            </View>

            <Pressable style={s.syncBtn} onPress={handleManualSync} disabled={syncingAll}>
              {syncingAll ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <>
                  <RefreshCw size={16} color={colors.white} />
                  <Text style={s.syncBtnText}>Synchroniser maintenant</Text>
                </>
              )}
            </Pressable>
          </View>
        )}

        {/* Section Apple Watch */}
        <View style={s.deviceCard}>
          <View style={s.deviceHeader}>
            <View style={s.deviceTitleRow}>
              <View style={[s.deviceIconBox, { backgroundColor: '#1A271E' }]}>
                <Watch size={20} color={colors.sage[400]} />
              </View>
              <View>
                <Text style={s.deviceName}>Apple Watch & HealthKit</Text>
                <Text style={s.deviceSub}>Pouls en direct, pas & énergie active iOS</Text>
              </View>
            </View>
            {appleWatchConnected && <CheckCircle2 size={20} color={colors.sage[500]} />}
          </View>

          <Pressable
            style={[s.toggleBtn, appleWatchConnected && s.toggleBtnConnected]}
            onPress={handleAppleToggle}
            disabled={loadingApple}
          >
            {loadingApple ? (
              <ActivityIndicator color={appleWatchConnected ? colors.ink[900] : colors.white} size="small" />
            ) : (
              <Text style={[s.toggleBtnText, appleWatchConnected && s.toggleBtnTextConnected]}>
                {appleWatchConnected ? 'Déconnecter Apple Watch' : 'Connecter Apple Watch'}
              </Text>
            )}
          </Pressable>
        </View>

        {/* Section Garmin Connect */}
        <View style={s.deviceCard}>
          <View style={s.deviceHeader}>
            <View style={s.deviceTitleRow}>
              <View style={[s.deviceIconBox, { backgroundColor: '#2B201A' }]}>
                <Zap size={20} color={colors.clay[400]} />
              </View>
              <View>
                <Text style={s.deviceName}>Garmin Connect</Text>
                <Text style={s.deviceSub}>Synchronisation automatique Garmin Webhook API</Text>
              </View>
            </View>
            {garminConnected && <CheckCircle2 size={20} color={colors.sage[500]} />}
          </View>

          <Pressable
            style={[s.toggleBtn, garminConnected && s.toggleBtnConnected]}
            onPress={handleGarminToggle}
            disabled={loadingGarmin}
          >
            {loadingGarmin ? (
              <ActivityIndicator color={garminConnected ? colors.ink[900] : colors.white} size="small" />
            ) : (
              <Text style={[s.toggleBtnText, garminConnected && s.toggleBtnTextConnected]}>
                {garminConnected ? 'Déconnecter Garmin' : 'Connecter Garmin Connect'}
              </Text>
            )}
          </Pressable>
        </View>

        {/* Confidentialité & Sécurité */}
        <View style={s.privacyNotice}>
          <Shield size={16} color={colors.sage[600]} />
          <Text style={s.privacyText}>
            Vos données de santé restent 100% confidentielles, chiffrées et protégées. Elles sont utilisées exclusivement pour affiner vos métriques d'effort et de récupération.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.sand[50],
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[8],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[3],
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  headerTitle: {
    fontFamily: fontFamily.hanken.bold,
    fontSize: fontSize.lg,
    color: colors.ink[900],
  },
  heroBox: {
    backgroundColor: '#1E2A22',
    borderRadius: radius.xl,
    padding: spacing[5],
    alignItems: 'center',
    marginVertical: spacing[3],
    gap: spacing[2],
  },
  heroTitle: {
    fontFamily: fontFamily.spectral.medium,
    fontSize: fontSize.lg,
    color: colors.sand[100],
    textAlign: 'center',
  },
  heroSub: {
    fontFamily: fontFamily.hanken.regular,
    fontSize: fontSize.xs,
    color: colors.sage[200],
    textAlign: 'center',
    lineHeight: 18,
  },
  statusCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing[4],
    marginBottom: spacing[4],
    ...shadows.sm,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  statusTitle: {
    fontFamily: fontFamily.hanken.bold,
    fontSize: 10,
    color: colors.clay[600],
    letterSpacing: 1.5,
  },
  syncTime: {
    fontFamily: fontFamily.hanken.regular,
    fontSize: 10,
    color: colors.ink[400],
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: spacing[2],
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricVal: {
    fontFamily: fontFamily.spectral.medium,
    fontSize: fontSize.lg,
    color: colors.ink[900],
  },
  metricLabel: {
    fontFamily: fontFamily.hanken.regular,
    fontSize: 10,
    color: colors.ink[400],
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.ink[200],
  },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: colors.sage[600],
    height: 42,
    borderRadius: radius.input,
    marginTop: spacing[3],
  },
  syncBtnText: {
    fontFamily: fontFamily.hanken.semiBold,
    fontSize: fontSize.xs,
    color: colors.white,
  },
  deviceCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing[4],
    marginBottom: spacing[3],
    ...shadows.sm,
  },
  deviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  deviceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    flex: 1,
  },
  deviceIconBox: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceName: {
    fontFamily: fontFamily.hanken.semiBold,
    fontSize: fontSize.sm,
    color: colors.ink[900],
  },
  deviceSub: {
    fontFamily: fontFamily.hanken.regular,
    fontSize: 10,
    color: colors.ink[400],
    marginTop: 1,
  },
  toggleBtn: {
    height: 42,
    borderRadius: radius.input,
    backgroundColor: colors.sage[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBtnConnected: {
    backgroundColor: colors.sand[100],
    borderWidth: 1,
    borderColor: colors.ink[200],
  },
  toggleBtnText: {
    fontFamily: fontFamily.hanken.semiBold,
    fontSize: fontSize.xs,
    color: colors.white,
  },
  toggleBtnTextConnected: {
    color: colors.ink[900],
  },
  privacyNotice: {
    flexDirection: 'row',
    gap: spacing[2.5],
    backgroundColor: colors.sage[50],
    borderRadius: radius.md,
    padding: spacing[3.5],
    alignItems: 'flex-start',
    marginTop: spacing[2],
  },
  privacyText: {
    flex: 1,
    fontFamily: fontFamily.hanken.regular,
    fontSize: 11,
    color: colors.sage[800],
    lineHeight: 16,
  },
});
