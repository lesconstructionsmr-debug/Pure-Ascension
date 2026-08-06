import React, { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Pressable, SafeAreaView, ScrollView, StyleSheet,
  Text, View, Linking, ActivityIndicator, TextInput, Modal, Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { showAlert } from '../utils/alert';
import {
  Bell, ChevronRight, ClipboardList, History, Lock,
  Sparkles, Target, Zap, CheckCircle, RefreshCw, Activity, LogOut, Users, Watch, Edit3, Scale
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, fontFamily, fontSize, lineHeight, spacing, radius, shadows } from '../theme/theme';
import { Avatar }          from '../components/Avatar';
import { Card }            from '../components/Card';
import { ReferralModal }   from '../components/ReferralModal';
import { AscensionCardModal } from '../components/AscensionCardModal';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { useLanguage } from '../context/LanguageContext';
import { useDailyProgress } from '../context/DailyProgressContext';
import { useProgramStore } from '../store/useProgramStore';
import { useWorkoutHistoryStore } from '../store/useWorkoutHistoryStore';
import { auth, db }        from '../services/firebase';
import { logOut }          from '../services/authService';
import { doc, onSnapshot, updateDoc, setDoc, collection, addDoc, serverTimestamp, query, getDocs, orderBy, deleteDoc } from 'firebase/firestore';

/* ─── Constantes Strava ──────────────────────────────────────────────────── */
const STRAVA_ORANGE = '#FC4C02';
const STRAVA_AUTH_URL = Platform.OS === 'web'
  ? '/.netlify/functions/strava-auth'
  : 'https://pure-ascension.netlify.app/.netlify/functions/strava-auth';

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface StravaActivity {
  name: string;
  type: string;
  distance: number;
  movingTime: number;
  totalElevation: number;
  averageHeartrate?: number;
  calories?: number;
  startDate: string;
}

interface StravaData {
  connected: boolean;
  athleteId?: number;
  lastSyncAt?: string;
  lastActivities?: StravaActivity[];
  totalEAT?: number;
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function relativeDate(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (diff === 0) return 'Aujourd\'hui';
  if (diff === 1) return 'Hier';
  return `Il y a ${diff} jours`;
}

/* ─── Sous-composant : Bouton / Carte Strava ──────────────────────────────── */
const StravaSection: React.FC<{
  stravaData: StravaData | null;
  loading: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onRefresh: () => void;
}> = ({ stravaData, loading, onConnect, onDisconnect, onRefresh }) => {

  if (loading) {
    return (
      <View style={st.stravaLoadingCard}>
        <ActivityIndicator size="small" color={colors.clay[500]} />
        <Text style={{ fontFamily: fontFamily.hanken.regular, fontSize: fontSize.sm, color: colors.ink[600] }}>
          Vérification Strava…
        </Text>
      </View>
    );
  }

  if (stravaData?.connected) {
    return (
      <View style={{ gap: spacing[3] }}>
        <View style={st.stravaConnected}>
          <View style={st.stravaConnectedLeft}>
            <View style={st.stravaIcon}>
              <Text style={{ fontSize: 18 }}>🏃</Text>
            </View>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
                <CheckCircle size={14} color="#22c55e" strokeWidth={2.5} />
                <Text style={st.stravaConnectedTitle}>Strava connecté</Text>
              </View>
              {stravaData.lastSyncAt && (
                <Text style={st.stravaConnectedSub}>
                  Sync : {relativeDate(stravaData.lastSyncAt)}
                </Text>
              )}
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: spacing[2] }}>
            <Pressable onPress={onRefresh} style={st.stravaIconBtn} accessibilityRole="button" accessibilityLabel="Actualiser Strava">
              <RefreshCw size={15} color={colors.ink[600]} />
            </Pressable>
            <Pressable onPress={onDisconnect} style={[st.stravaIconBtn, { backgroundColor: '#fef2f2' }]} accessibilityRole="button" accessibilityLabel="Déconnecter Strava">
              <Text style={{ fontSize: 13, color: '#ef4444' }}>✕</Text>
            </Pressable>
          </View>
        </View>

        {stravaData.totalEAT !== undefined && stravaData.totalEAT > 0 && (
          <View style={st.eatBadge}>
            <Zap size={14} color={colors.clay[500]} />
            <Text style={st.eatBadgeText}>
              <Text style={{ fontFamily: fontFamily.hanken.bold }}>
                {stravaData.totalEAT} kcal
              </Text>
              {' '}brûlées aujourd'hui (Strava)
            </Text>
          </View>
        )}
      </View>
    );
  }

  // Bouton CTA Terre Cuite avec icône coureur : 'Connecter Strava'
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onConnect();
      }}
      style={st.stravaClayBtn}
      accessibilityRole="button"
      accessibilityLabel="Connecter Strava"
    >
      <View style={st.stravaClayLeft}>
        <View style={st.runnerIconCircle}>
          <Activity size={20} color="#fff" strokeWidth={2.2} />
        </View>
        <View>
          <Text style={st.stravaClayTitle}>Connecter Strava</Text>
          <Text style={st.stravaClaySub}>Sync automatique · Activités sportives</Text>
        </View>
      </View>
      <ChevronRight size={20} color="#fff" />
    </Pressable>
  );
};

/* ─── Écran Profil ───────────────────────────────────────────────────────── */
export const ProfileScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const program = useProgramStore(s => s.program);
  const storeName = useProgramStore(s => s.userName);
  const storeEmail = useProgramStore(s => s.userEmail);
  const isNewUser = !program;

  // Fallback defaults matching mockup user 'Natasha' / 'natasha.hoon@gmail.com'
  const displayName = storeName || 'Natasha';
  const displayEmail = storeEmail || 'natasha.hoon@gmail.com';

  /* Modals state & Daily progress */
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [showAscensionCardModal, setShowAscensionCardModal] = useState(false);
  const { mealsCount, workoutPct, waterGlasses, sleepScore, mentalCheckin, ascensionScore } = useDailyProgress();

  /* Stats state */
  const profile = useProgramStore(st => st.profile);
  const storeCompletedCount = useProgramStore(st => st.completedWorkoutsCount);
  const storeStreak = useProgramStore(st => st.streakDays);

  const [streakDays, setStreakDays] = useState(1);
  const localWorkoutHistory = useWorkoutHistoryStore(st => st.history);
  const [sessionsCount, setSessionsCount] = useState(localWorkoutHistory.length);
  const [weightEvolution, setWeightEvolution] = useState('—lb');

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const unsubUser = onSnapshot(doc(db, 'users', uid), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        if (d.streakDays !== undefined) {
          setStreakDays(d.streakDays);
        }
      }
    });

    const loadProgressStats = async () => {
      try {
        const progressRef = collection(db, 'users', uid, 'progress');
        const q = query(progressRef, orderBy('date', 'asc'));
        const snap = await getDocs(q);
        
        let completedWorkouts = 0;
        let weights: number[] = [];
        
        snap.forEach(docSnap => {
          const d = docSnap.data();
          if (d.workoutDone) {
            completedWorkouts += 1;
          }
          if (typeof d.weight === 'number' && d.weight > 0) {
            weights.push(d.weight);
          }
        });
        
        setSessionsCount(completedWorkouts);
        
        if (weights.length >= 2) {
          const change = weights[weights.length - 1] - weights[0];
          const sign = change > 0 ? '+' : '';
          setWeightEvolution(`${sign}${change.toFixed(1)} lb`);
        } else if (weights.length === 1) {
          setWeightEvolution('0.0 lb');
        } else {
          setWeightEvolution('—lb');
        }
      } catch (err) {
        console.error('Erreur chargement stats profil:', err);
      }
    };
    loadProgressStats();

    return () => unsubUser();
  }, [program]);

  // Dynamic reactive stats computation
  const displaySessions = Math.max(sessionsCount, localWorkoutHistory.length, storeCompletedCount);

  const displayStreak = (() => {
    if (!localWorkoutHistory.length) return Math.max(streakDays, storeStreak, 1);
    const uniqueDates = Array.from(new Set(localWorkoutHistory.map(w => w.dateKey))).sort().reverse();
    if (!uniqueDates.length) return Math.max(streakDays, storeStreak, 1);

    let count = 0;
    const now = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(now.getTime() - i * 86400000);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const key = `${year}-${month}-${day}`;
      if (uniqueDates.includes(key)) {
        count++;
      } else if (i > 0) {
        break;
      }
    }
    return Math.max(count, streakDays, storeStreak, 1);
  })();

  const KG_TO_LB = 2.20462262;
  const LB_TO_KG = 0.45359237;
  const weightLbs = profile?.currentWeightKg
    ? Math.round(Number(profile.currentWeightKg) * KG_TO_LB * 10) / 10
    : null;
  const displayWeight = weightLbs != null
    ? `${weightLbs} lbs`
    : weightEvolution !== '—lb' ? weightEvolution : '— lbs';

  /* Weight Modal State */
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [inputWeight, setInputWeight] = useState('');
  const [savingWeight, setSavingWeight] = useState(false);

  const handleSaveWeight = async () => {
    const lbs = parseFloat(inputWeight.replace(/[^0-9.,]/g, '').replace(',', '.'));
    if (isNaN(lbs) || lbs < 60 || lbs > 450) {
      showAlert('Poids invalide', 'Veuillez saisir un poids valide en lbs (ex: 165).');
      return;
    }
    const weightKg = Math.round(lbs * LB_TO_KG * 10) / 10;

    setSavingWeight(true);
    try {
      const updatedProfile = {
        ...(profile || {}),
        currentWeightKg: weightKg,
      };

      useProgramStore.getState().setProfile(updatedProfile as any);
      setWeightEvolution(`${lbs.toFixed(1)} lbs`);

      const uid = auth.currentUser?.uid;
      if (uid) {
        // 1. Mise à jour du document profil utilisateur Firestore (stockage en kg)
        await updateDoc(doc(db, 'users', uid), {
          currentWeightKg: weightKg,
          weight: weightKg,
          updatedAt: serverTimestamp(),
        }).catch(async () => {
          await setDoc(doc(db, 'users', uid), { currentWeightKg: weightKg, weight: weightKg }, { merge: true });
        });

        // 2. Journalisation dans l'historique de progression
        const todayISO = new Date().toISOString().split('T')[0];
        await addDoc(collection(db, 'users', uid, 'progress'), {
          date: todayISO,
          weight: weightKg,
          createdAt: serverTimestamp(),
        }).catch(() => {});
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showAlert('Poids mis à jour !', `Votre nouveau poids (${lbs} lbs) a été enregistré.`);
      setShowWeightModal(false);
    } catch (err) {
      console.error('Erreur enregistrement poids:', err);
      showAlert('Erreur', 'Impossible de sauvegarder le poids. Veuillez réessayer.');
    } finally {
      setSavingWeight(false);
    }
  };

  /* Feedback & Privacy state */
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackCategory, setFeedbackCategory] = useState<'bug' | 'suggestion' | 'autre'>('suggestion');
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [privacyVisible, setPrivacyVisible] = useState(false);

  const handleSubmitFeedback = async () => {
    if (!feedbackText.trim()) return;
    setFeedbackSending(true);
    try {
      const uid = auth.currentUser?.uid;
      await addDoc(collection(db, 'feedbacks'), {
        userId: uid || 'anonymous',
        userEmail: displayEmail,
        userName: displayName,
        category: feedbackCategory,
        text: feedbackText.trim(),
        createdAt: serverTimestamp(),
      });
      showAlert('Merci !', 'Ton retour a bien été envoyé à l\'équipe de Pure Ascension.');
      setFeedbackText('');
      setFeedbackModalVisible(false);
    } catch (err) {
      console.error('Erreur envoi feedback:', err);
      showAlert('Erreur', 'Impossible d\'envoyer le retour. Réessaye.');
    } finally {
      setFeedbackSending(false);
    }
  };

  /* Strava state */
  const [stravaData, setStravaData] = useState<StravaData | null>(null);
  const [stravaLoading, setStravaLoading] = useState(true);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) { setStravaLoading(false); return; }

    const unsub = onSnapshot(doc(db, 'users', uid), (snap) => {
      if (!snap.exists()) { setStravaLoading(false); return; }
      const d = snap.data();
      setStravaData({
        connected: !!d.stravaConnected,
        athleteId: d.stravaAthleteId,
        lastSyncAt: d.stravaLastSyncAt || d.updatedAt?.toDate?.()?.toISOString(),
        lastActivities: d.stravaLastActivities || [],
        totalEAT: d.stravaTodayEAT || 0,
      });
      setStravaLoading(false);
    }, (err) => {
      console.error('Erreur Strava onSnapshot Firestore:', err);
      setStravaLoading(false);
    });
    return () => unsub();
  }, []);

  const handleConnectStrava = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      showAlert('Connexion requise', 'Veuillez vous connecter à votre compte Pure Ascension.');
      return;
    }

    try {
      setStravaLoading(true);
      const isNative = Platform.OS !== 'web';
      const res = await fetch(`${STRAVA_AUTH_URL}?uid=${uid}&isNativeApp=${isNative}`);
      const data = await res.json();

      if (data.url) {
        if (Platform.OS === 'web') {
          window.location.href = data.url;
        } else {
          await Linking.openURL(data.url);
          setStravaLoading(false);
        }
      } else {
        throw new Error('URL OAuth Strava non reçue');
      }
    } catch (err: any) {
      setStravaLoading(false);
      showAlert('Erreur Strava', err.message || 'Impossible d\'initier la connexion Strava.');
    }
  }, []);

  const handleDisconnectStrava = useCallback(() => {
    showAlert(
      'Déconnecter Strava ?',
      'Vos activités ne seront plus synchronisées automatiquement.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnecter', style: 'destructive',
          onPress: async () => {
            const uid = auth.currentUser?.uid;
            if (!uid) return;
            try {
              await updateDoc(doc(db, 'users', uid), {
                stravaConnected: false,
                stravaAccessToken: null,
                stravaRefreshToken: null,
              });
            } catch (err) {
              showAlert('Erreur', 'Impossible de déconnecter Strava.');
            }
          }
        },
      ]
    );
  }, []);

  const handleRefreshStrava = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    setStravaLoading(true);
    setTimeout(() => setStravaLoading(false), 1200);
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined' || !window.location || !window.history) return;
      const params = new URLSearchParams(window.location.search);
      const stravaStatus = params.get('strava');
      if (stravaStatus === 'success') {
        showAlert('🚴 Strava connecté !', 'Vos activités seront synchronisées automatiquement.');
        window.history.replaceState({}, '', window.location.pathname);
      } else if (stravaStatus === 'error') {
        const msg = params.get('msg') || 'unknown';
        showAlert('Erreur Strava', `La connexion a échoué (${msg}). Réessayez.`);
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, []);

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* ── Header : Titre 'Profil' en grand + sous-titre en italique/serif *Profil* ── */}
        <View style={s.headerRow}>
          <Text style={s.screenTitle} accessibilityRole="header">Profil</Text>
          <Text style={s.screenSubtitle}>Profil</Text>
        </View>

        {/* ── Carte utilisateur : Avatar 'N', 'Natasha', 'natasha.hoon@gmail.com' ── */}
        <Card elevation="sm" padding={spacing[5]} style={s.userCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[4] }}>
            <Avatar name={displayName} size={60} ring ringColor={colors.clay[300]} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={s.userName}>{displayName}</Text>
              <Text style={s.userEmail}>{displayEmail}</Text>
            </View>
          </View>
        </Card>

        {/* ── Ligne de statistiques à 3 cartes blanches : Streak | Poids (Interactif) | Séances ── */}
        <View style={s.statsRow}>
          <View style={s.statWhiteCard}>
            <Text style={s.statVal}>{displayStreak}j</Text>
            <Text style={s.statLabel}>Streak</Text>
          </View>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              const currentVal = weightLbs != null ? String(weightLbs) : '';
              setInputWeight(currentVal);
              setShowWeightModal(true);
            }}
            style={({ pressed }) => [s.statWhiteCard, pressed && { opacity: 0.75, backgroundColor: colors.sage[50] }]}
            accessibilityRole="button"
            accessibilityLabel="Modifier le poids"
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Text style={s.statVal}>{displayWeight}</Text>
              <Edit3 size={12} color={colors.clay[500]} />
            </View>
            <Text style={[s.statLabel, { color: colors.clay[600], textDecorationLine: 'underline' }]}>Poids ✏️</Text>
          </Pressable>
          <View style={s.statWhiteCard}>
            <Text style={s.statVal}>{displaySessions}</Text>
            <Text style={s.statLabel}>Séance{displaySessions !== 1 ? 's' : ''}</Text>
          </View>
        </View>

        {/* ── Bouton CTA Terre Cuite avec icône coureur : 'Connecter Strava' ── */}
        <StravaSection
          stravaData={stravaData}
          loading={stravaLoading}
          onConnect={handleConnectStrava}
          onDisconnect={handleDisconnectStrava}
          onRefresh={handleRefreshStrava}
        />

        {/* ── Section 'PARAMÈTRES & LANGUE' ── */}
        <View style={s.sectionBlock}>
          <Text style={s.sectionEyebrow}>PARAMÈTRES & LANGUE / SETTINGS & LANGUAGE</Text>
          <Card elevation="sm" padding={spacing[4]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[3] }}>
              <Text style={{ fontFamily: fontFamily.hanken.bold, fontSize: fontSize.sm, color: colors.ink[900] }}>
                Langue de l'application / App Language
              </Text>
            </View>
            <LanguageSwitcher variant="full" />
          </Card>
        </View>

        {/* ── Section 'COMMUNAUTÉ & PARTAGE' ── */}
        <View style={s.sectionBlock}>
          <Text style={s.sectionEyebrow}>COMMUNAUTÉ & PARTAGE</Text>
          <View style={s.cardListContainer}>
            {/* Inviter un frère d'arme > */}
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setShowReferralModal(true);
              }}
              style={s.cardListRow}
              accessibilityRole="button"
            >
              <View style={s.iconCircleClay}>
                <Users size={18} color={colors.clay[500]} />
              </View>
              <Text style={s.cardListText}>Inviter un frère d'arme</Text>
              <ChevronRight size={18} color={colors.ink[400]} />
            </Pressable>

            <View style={s.cardListDivider} />

            {/* Carte d'Ascension Instagram > */}
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setShowAscensionCardModal(true);
              }}
              style={s.cardListRow}
              accessibilityRole="button"
            >
              <View style={s.iconCircleSage}>
                <Sparkles size={18} color={colors.sage[600]} />
              </View>
              <Text style={s.cardListText}>Carte d'Ascension Instagram</Text>
              <ChevronRight size={18} color={colors.ink[400]} />
            </Pressable>
          </View>
        </View>

        {/* ── Section 'RÉGLAGES' ── */}
        <View style={s.sectionBlock}>
          <Text style={s.sectionEyebrow}>RÉGLAGES</Text>
          <View style={s.cardListContainer}>
            {/* Mes objectifs > */}
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation?.navigate('Goals', { isNewUser });
              }}
              style={s.cardListRow}
              accessibilityRole="button"
            >
              <View style={s.iconCircleSage}>
                <Target size={18} color={colors.sage[600]} />
              </View>
              <Text style={s.cardListText}>Mes objectifs</Text>
              <ChevronRight size={18} color={colors.ink[400]} />
            </Pressable>

            <View style={s.cardListDivider} />

            {/* Rituels d'équilibre > */}
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation?.navigate('Rituals', { isNewUser });
              }}
              style={s.cardListRow}
              accessibilityRole="button"
            >
              <View style={s.iconCircleClay}>
                <Sparkles size={18} color={colors.clay[500]} />
              </View>
              <Text style={s.cardListText}>Rituels d'équilibre</Text>
              <ChevronRight size={18} color={colors.ink[400]} />
            </Pressable>

            <View style={s.cardListDivider} />

            {/* Notifications > */}
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation?.navigate('Notifications', { isNewUser });
              }}
              style={s.cardListRow}
              accessibilityRole="button"
            >
              <View style={s.iconCircleSage}>
                <Bell size={18} color={colors.sage[600]} />
              </View>
              <Text style={s.cardListText}>Notifications</Text>
              <ChevronRight size={18} color={colors.ink[400]} />
            </Pressable>

            <View style={s.cardListDivider} />

            {/* Montres & Appareils connectés > */}
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation?.navigate('Wearables');
              }}
              style={s.cardListRow}
              accessibilityRole="button"
            >
              <View style={s.iconCircleClay}>
                <Watch size={18} color={colors.clay[500]} />
              </View>
              <Text style={s.cardListText}>Montres & Appareils connectés</Text>
              <ChevronRight size={18} color={colors.ink[400]} />
            </Pressable>

            <View style={s.cardListDivider} />

            {/* Mon programme & profil > */}
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation?.navigate('EditProfile', { isNewUser });
              }}
              style={s.cardListRow}
              accessibilityRole="button"
            >
              <View style={s.iconCircleClay}>
                <ClipboardList size={18} color={colors.clay[500]} />
              </View>
              <Text style={s.cardListText}>Mon programme & profil</Text>
              <ChevronRight size={18} color={colors.ink[400]} />
            </Pressable>

            <View style={s.cardListDivider} />

            {/* Régénérer mon plan d'entraînement 🔄 > */}
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                navigation?.navigate('ProgramAdjustment');
              }}
              style={s.cardListRow}
              accessibilityRole="button"
            >
              <View style={s.iconCircleSage}>
                <RefreshCw size={18} color={colors.sage[600]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.cardListText}>Régénérer mon plan d'entraînement 🔄</Text>
                <Text style={{ fontFamily: fontFamily.hanken.regular, fontSize: 11, color: colors.sage[700], marginTop: 1 }}>
                  Recalibrer selon tes préférences & retours
                </Text>
              </View>
              <ChevronRight size={18} color={colors.ink[400]} />
            </Pressable>

            <View style={s.cardListDivider} />

            {/* Confidentialité > */}
            <Pressable
              onPress={() => setPrivacyVisible(true)}
              style={s.cardListRow}
              accessibilityRole="button"
            >
              <View style={s.iconCircleSand}>
                <Lock size={18} color={colors.ink[600]} />
              </View>
              <Text style={s.cardListText}>Confidentialité & CGU</Text>
              <ChevronRight size={18} color={colors.ink[400]} />
            </Pressable>
          </View>
        </View>

        {/* ── Feedback / Bug report ── */}
        <Pressable
          onPress={() => setFeedbackModalVisible(true)}
          style={s.feedbackCard}
          accessibilityRole="button"
        >
          <ClipboardList size={20} color={colors.sage[600]} />
          <Text style={s.feedbackText}>Donner mon avis / Signaler un bug</Text>
          <ChevronRight size={18} color={colors.sage[600]} />
        </Pressable>

        {/* ── Mention Légale Obligatoire ── */}
        <View style={s.legalNoticeBox}>
          <Text style={s.legalNoticeText}>
            Pure Ascension est un outil de coaching fitness et nutrition. Il ne remplace pas un avis médical professionnel.
          </Text>
        </View>

        {/* ── Bouton Déconnexion ── */}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            showAlert(
              'Déconnexion',
              'Êtes-vous sûr de vouloir vous déconnecter de Pure Ascension ?',
              [
                { text: 'Annuler', style: 'cancel' },
                {
                  text: 'Se déconnecter',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      useProgramStore.getState().clear();
                      await AsyncStorage.multiRemove([
                        '@active_workout_state',
                        '@calorie_data',
                        '@pure_ascension_grocery_list_v1',
                      ]).catch(() => {});
                      await logOut();
                      if (Platform.OS === 'web' && typeof window !== 'undefined') {
                        window.location.reload();
                      }
                    } catch (err) {
                      console.error('Erreur déconnexion:', err);
                      showAlert('Erreur', 'Impossible de se déconnecter. Réessayez.');
                    }
                  }
                }
              ]
            );
          }}
          style={({ pressed }) => [s.logoutBtn, pressed && { backgroundColor: colors.clay[50] }]}
          accessibilityRole="button"
        >
          <LogOut size={18} color={colors.clay[500]} strokeWidth={2} />
          <Text style={s.logoutBtnText}>Se déconnecter</Text>
        </Pressable>

        {/* ── Bouton Suppression de Compte ── */}
        <Pressable
          onPress={() => {
            showAlert(
              'Supprimer le compte',
              'Cette action supprimera définitivement tes données de progression, rituels et repas de Pure Ascension. Es-tu sûr·e de vouloir continuer ?',
              [
                { text: 'Annuler', style: 'cancel' },
                {
                  text: 'Supprimer mon compte',
                  style: 'destructive',
                  onPress: async () => {
                    const user = auth.currentUser;
                    if (user) {
                      try {
                        const uid = user.uid;
                        await deleteDoc(doc(db, 'users', uid));
                        await user.delete();
                        showAlert('Compte supprimé', 'Toutes vos données ont été purgées avec succès. À bientôt !');
                      } catch (err: any) {
                        console.error('Erreur suppression compte:', err);
                        if (err.code === 'auth/requires-recent-login') {
                          showAlert(
                            'Action requise',
                            'Pour supprimer ton compte, tu devez vous reconnecter récemment pour des raisons de sécurité.'
                          );
                        } else {
                          showAlert('Erreur', 'Impossible de supprimer le compte. Veuillez réessayer.');
                        }
                      }
                    }
                  }
                }
              ]
            );
          }}
          style={s.deleteAccountBtn}
          accessibilityRole="button"
        >
          <Text style={s.deleteAccountText}>Supprimer mon compte définitivement</Text>
        </Pressable>

        <View style={{ height: spacing[10] }} />
      </ScrollView>

      {/* Modal Feedback */}
      <Modal
        visible={feedbackModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => { setFeedbackModalVisible(false); setFeedbackText(''); }}
      >
        <View style={{ flex: 1, backgroundColor: '#fbf8f3', padding: spacing[5] }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[6] }}>
            <Text style={{ fontFamily: fontFamily.spectral.bold, fontSize: fontSize.xl, color: colors.ink[900] }}>
              Faire un retour
            </Text>
            <Pressable onPress={() => { setFeedbackModalVisible(false); setFeedbackText(''); }} accessibilityRole="button">
              <Text style={{ fontFamily: fontFamily.hanken.bold, fontSize: fontSize.sm, color: colors.ink[600] }}>
                Fermer
              </Text>
            </Pressable>
          </View>

          <Text style={{ fontFamily: fontFamily.hanken.semiBold, fontSize: fontSize.sm, color: colors.ink[800], marginBottom: spacing[2] }}>
            Catégorie
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing[2], marginBottom: spacing[5] }}>
            {(['suggestion', 'bug', 'autre'] as const).map(cat => {
              const active = feedbackCategory === cat;
              return (
                <Pressable
                  key={cat}
                  onPress={() => setFeedbackCategory(cat)}
                  style={[{
                    flex: 1, alignItems: 'center', paddingVertical: spacing[2.5], borderRadius: radius.md,
                    backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.ink[200]
                  }, active && { backgroundColor: colors.sage[500], borderColor: colors.sage[500] }]}
                >
                  <Text style={[{ fontFamily: fontFamily.hanken.medium, fontSize: fontSize.sm, color: colors.ink[600] }, active && { color: '#fff', fontFamily: fontFamily.hanken.bold }]}>
                    {cat === 'suggestion' ? '💡 Idée' : cat === 'bug' ? '🐛 Bug' : '❓ Autre'}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={{ fontFamily: fontFamily.hanken.semiBold, fontSize: fontSize.sm, color: colors.ink[800], marginBottom: spacing[2] }}>
            Ton message
          </Text>
          <TextInput
            style={{
              backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.ink[200], borderRadius: radius.lg,
              padding: spacing[3], height: 160, textAlignVertical: 'top', fontFamily: fontFamily.hanken.regular,
              fontSize: fontSize.base, color: colors.ink[900], marginBottom: spacing[6]
            }}
            value={feedbackText}
            onChangeText={setFeedbackText}
            placeholder="Dis-nous tout (ex: suggestion d'amélioration, idée...)"
            placeholderTextColor={colors.ink[400]}
            multiline
          />

          <Pressable
            disabled={!feedbackText.trim() || feedbackSending}
            onPress={handleSubmitFeedback}
            style={[{
              backgroundColor: colors.sage[500], paddingVertical: spacing[3.5], borderRadius: radius.lg, alignItems: 'center'
            }, !feedbackText.trim() && { opacity: 0.5 }]}
          >
            {feedbackSending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={{ fontFamily: fontFamily.hanken.bold, fontSize: fontSize.base, color: '#fff' }}>
                Envoyer mon retour
              </Text>
            )}
          </Pressable>
        </View>
      </Modal>

      {/* Modal Confidentialité */}
      <Modal
        visible={privacyVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPrivacyVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#fbf8f3', padding: spacing[5] }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[5] }}>
            <Text style={{ fontFamily: fontFamily.spectral.bold, fontSize: fontSize.xl, color: colors.ink[900] }}>
              Confidentialité & CGU
            </Text>
            <Pressable onPress={() => setPrivacyVisible(false)} accessibilityRole="button">
              <Text style={{ fontFamily: fontFamily.hanken.bold, fontSize: fontSize.sm, color: colors.ink[600] }}>
                Fermer
              </Text>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: spacing[4], paddingBottom: spacing[8] }}>
            <Text style={{ fontFamily: fontFamily.hanken.regular, fontSize: fontSize.sm, color: colors.ink[600] }}>
              Dernière mise à jour : Juillet 2026
            </Text>

            <View style={{ gap: spacing[1] }}>
              <Text style={{ fontFamily: fontFamily.hanken.bold, fontSize: fontSize.base, color: colors.ink[900] }}>
                1. Collecte des données
              </Text>
              <Text style={{ fontFamily: fontFamily.hanken.regular, fontSize: fontSize.sm, color: colors.ink[700], lineHeight: 20 }}>
                Pure Ascension collecte vos informations de profil de départ (nom, email, mensurations, objectifs physiques) ainsi que vos questionnaires de profil fitness pour personnaliser vos plans d'entraînements et de nutrition. Ces informations sont stockées de façon sécurisée sur nos serveurs.
              </Text>
              <Text style={{ fontFamily: fontFamily.hanken.medium, fontSize: fontSize.xs, color: colors.sage[600], marginTop: 8, fontStyle: 'italic' }}>
                Pure Ascension est un outil de coaching fitness et nutrition. Il ne remplace pas un avis médical professionnel.
              </Text>
            </View>

            <View style={{ gap: spacing[1] }}>
              <Text style={{ fontFamily: fontFamily.hanken.bold, fontSize: fontSize.base, color: colors.ink[900] }}>
                2. Intégrations tierces
              </Text>
              <Text style={{ fontFamily: fontFamily.hanken.regular, fontSize: fontSize.sm, color: colors.ink[700], lineHeight: 20 }}>
                • Strava : Synchronisation des activités d'entraînement.
                {"\n"}• Stripe : Facturation dynamique et sécurisée.
              </Text>
            </View>

            <View style={{ gap: spacing[1] }}>
              <Text style={{ fontFamily: fontFamily.hanken.bold, fontSize: fontSize.base, color: colors.ink[900] }}>
                3. Responsabilité & Santé
              </Text>
              <Text style={{ fontFamily: fontFamily.hanken.regular, fontSize: fontSize.sm, color: colors.ink[700], lineHeight: 20 }}>
                Les conseils d'entraînement et d'alimentation prodigués par l'application sont à titre indicatif et ne remplacent en aucun cas un avis médical professionnel.
              </Text>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Referral Modal */}
      <ReferralModal
        visible={showReferralModal}
        onClose={() => setShowReferralModal(false)}
      />

      {/* Ascension Card Modal */}
      <AscensionCardModal
        visible={showAscensionCardModal}
        onClose={() => setShowAscensionCardModal(false)}
        data={{
          userName: displayName !== 'Mon profil' ? displayName : 'Guerrier',
          ascensionScore,
          streakDays,
          workoutCompleted: workoutPct === 100,
          mealsCount,
          waterGlasses,
          sleepScore,
          mentalCheckin,
        }}
      />
      {/* Modal Modification du Poids */}
      <Modal
        visible={showWeightModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowWeightModal(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
        >
          <View style={{
            backgroundColor: '#fbf8f3',
            borderTopLeftRadius: radius['2xl'],
            borderTopRightRadius: radius['2xl'],
            padding: spacing[6],
            gap: spacing[5],
            ...shadows.lg,
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2.5] }}>
                <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: colors.clay[50], alignItems: 'center', justifyContent: 'center' }}>
                  <Scale size={20} color={colors.clay[500]} />
                </View>
                <View>
                  <Text style={{ fontFamily: fontFamily.spectral.bold, fontSize: fontSize.xl, color: colors.ink[900] }}>
                    Mettre à jour ton poids
                  </Text>
                  <Text style={{ fontFamily: fontFamily.hanken.regular, fontSize: fontSize.xs, color: colors.ink[600] }}>
                    Saisie en lbs · enregistré correctement pour ton programme
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => setShowWeightModal(false)}
                style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.ink[100], alignItems: 'center', justifyContent: 'center' }}
                accessibilityRole="button"
              >
                <Text style={{ fontFamily: fontFamily.hanken.bold, fontSize: fontSize.sm, color: colors.ink[600] }}>✕</Text>
              </Pressable>
            </View>

            <View style={{ gap: spacing[2] }}>
              <Text style={{ fontFamily: fontFamily.hanken.semiBold, fontSize: fontSize.sm, color: colors.ink[800] }}>
                Poids actuel (lbs)
              </Text>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#fff',
                borderWidth: 1.5,
                borderColor: colors.clay[300],
                borderRadius: radius.xl,
                paddingHorizontal: spacing[4],
                paddingVertical: spacing[3],
              }}>
                <TextInput
                  style={{
                    flex: 1,
                    fontFamily: fontFamily.hanken.bold,
                    fontSize: fontSize['2xl'],
                    color: colors.ink[900],
                  }}
                  value={inputWeight}
                  onChangeText={(t) => setInputWeight(t.replace(/[^0-9.,]/g, ''))}
                  keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
                  placeholder="ex: 165"
                  placeholderTextColor={colors.ink[400]}
                  autoFocus
                  returnKeyType="done"
                />
                <Text style={{ fontFamily: fontFamily.hanken.bold, fontSize: fontSize.base, color: colors.clay[500] }}>
                  lbs
                </Text>
              </View>
            </View>

            <Pressable
              disabled={!inputWeight.trim() || savingWeight}
              onPress={handleSaveWeight}
              style={({ pressed }) => [{
                backgroundColor: colors.clay[500],
                paddingVertical: spacing[4],
                borderRadius: radius.xl,
                alignItems: 'center',
                justify: 'center',
                ...shadows.sm,
              }, (!inputWeight.trim() || savingWeight) && { opacity: 0.5 }, pressed && { opacity: 0.85 }]}
              accessibilityRole="button"
            >
              {savingWeight ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={{ fontFamily: fontFamily.hanken.bold, fontSize: fontSize.base, color: '#fff' }}>
                  Enregistrer le poids ⚖️
                </Text>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

/* ─── Styles Strava ──────────────────────────────────────────────────────── */
const st = StyleSheet.create({
  stravaLoadingCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[3],
    backgroundColor: '#fff', borderRadius: radius.xl, padding: spacing[4],
    borderWidth: 1, borderColor: colors.ink[200], ...shadows.sm,
  },
  stravaConnected: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: radius.xl,
    padding: spacing[4], borderWidth: 1.5, borderColor: '#22c55e',
    ...shadows.sm,
  },
  stravaConnectedLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  stravaIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.clay[50], alignItems: 'center', justifyContent: 'center' },
  stravaConnectedTitle: { fontFamily: fontFamily.hanken.bold, fontSize: fontSize.base, color: colors.ink[900] },
  stravaConnectedSub: { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.xs, color: colors.ink[500], marginTop: 2 },
  stravaIconBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.ink[100], alignItems: 'center', justifyContent: 'center',
  },
  eatBadge: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[2],
    backgroundColor: colors.clay[50], borderRadius: radius.lg,
    paddingHorizontal: spacing[4], paddingVertical: spacing[2],
    borderWidth: 1, borderColor: colors.clay[200],
  },
  eatBadgeText: { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.sm, color: colors.clay[700] },

  /* Bouton CTA Terre Cuite avec icône coureur */
  stravaClayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.clay[500],
    borderRadius: radius.xl,
    padding: spacing[4],
    ...shadows.md,
  },
  stravaClayLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  runnerIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stravaClayTitle: { fontFamily: fontFamily.hanken.bold, fontSize: fontSize.base, color: '#fff' },
  stravaClaySub: { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.xs, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
});

/* ─── Styles Général Écran ────────────────────────────────────────────────── */
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.sand[50] },
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing[5], paddingTop: spacing[6], gap: spacing[5] },

  headerRow: { gap: 2 },
  screenTitle: { fontFamily: fontFamily.spectral.medium, fontSize: fontSize['3xl'], color: colors.ink[900] },
  screenSubtitle: { fontFamily: fontFamily.spectral.regularItalic, fontSize: fontSize.base, color: colors.sage[600] },

  userCard: { borderRadius: radius.xl, borderWidth: 1, borderColor: colors.ink[200] },
  userName: { fontFamily: fontFamily.spectral.bold, fontSize: fontSize.xl, color: colors.ink[900] },
  userEmail: { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.sm, color: colors.ink[600] },

  /* Ligne de statistiques à 3 cartes blanches */
  statsRow: { flexDirection: 'row', gap: spacing[3] },
  statWhiteCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: radius.xl,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[2],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.ink[200],
    gap: 4,
    ...shadows.sm,
  },
  statVal: { fontFamily: fontFamily.spectral.bold, fontSize: fontSize.xl, color: colors.ink[900] },
  statLabel: { fontFamily: fontFamily.hanken.semiBold, fontSize: fontSize.xs, color: colors.ink[500] },

  /* Sections */
  sectionBlock: { gap: spacing[2] },
  sectionEyebrow: { fontFamily: fontFamily.hanken.bold, fontSize: fontSize.xs, color: colors.ink[500], letterSpacing: 1.2 },

  cardListContainer: {
    backgroundColor: '#fff',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.ink[200],
    overflow: 'hidden',
    ...shadows.sm,
  },
  cardListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    gap: spacing[3],
  },
  cardListText: { flex: 1, fontFamily: fontFamily.hanken.bold, fontSize: fontSize.base, color: colors.ink[900] },
  cardListDivider: { height: 1, backgroundColor: colors.ink[100], marginLeft: spacing[4] + 36 + spacing[3] },

  iconCircleClay: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.clay[50], alignItems: 'center', justifyContent: 'center' },
  iconCircleSage: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.sage[50], alignItems: 'center', justifyContent: 'center' },
  iconCircleSand: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.sand[100], alignItems: 'center', justifyContent: 'center' },

  feedbackCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[3],
    backgroundColor: colors.sage[50], borderRadius: radius.xl, padding: spacing[4],
    borderWidth: 1.5, borderColor: colors.sage[200], ...shadows.sm,
  },
  feedbackText: { flex: 1, fontFamily: fontFamily.hanken.bold, fontSize: fontSize.sm, color: colors.sage[900] },

  legalNoticeBox: { padding: spacing[3], backgroundColor: colors.sand[100], borderRadius: radius.md, borderWidth: 1, borderColor: colors.sand[200] },
  legalNoticeText: { fontFamily: fontFamily.hanken.regular, fontSize: 10, color: colors.ink[500], textAlign: 'center', lineHeight: 14 },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: spacing[3.5], borderRadius: radius.xl, backgroundColor: '#fff',
    borderWidth: 1.5, borderColor: colors.clay[200], gap: spacing[2],
  },
  logoutBtnText: { fontFamily: fontFamily.hanken.bold, fontSize: fontSize.base, color: colors.clay[600] },

  deleteAccountBtn: { alignItems: 'center', paddingVertical: spacing[2] },
  deleteAccountText: { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.xs, color: colors.ink[400], textDecorationLine: 'underline' },
});

export default ProfileScreen;
