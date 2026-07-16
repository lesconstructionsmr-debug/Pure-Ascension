import React, { useState, useEffect, useCallback } from 'react';
import {
  Pressable, SafeAreaView, ScrollView, StyleSheet,
  Text, View, Linking, ActivityIndicator, Alert, TextInput, Modal
} from 'react-native';
import {
  Bell, ChevronRight, ClipboardList, History, Lock,
  Sparkles, Target, Zap, CheckCircle, RefreshCw, Activity, LogOut
} from 'lucide-react-native';
import { colors, fontFamily, fontSize, lineHeight, spacing, radius, shadows } from '../theme/theme';
import { Avatar }          from '../components/Avatar';
import { Card }            from '../components/Card';
import { Stat }            from '../components/Stat';
import { Button }          from '../components/Button';
import { useProgramStore } from '../store/useProgramStore';
import { useStreak }       from '../hooks/useStreak';
import { auth, db }        from '../services/firebase';
import { logOut }          from '../services/authService';
import { doc, getDoc, onSnapshot, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';

/* ─── Constantes Strava ──────────────────────────────────────────────────── */
const STRAVA_ORANGE = '#FC4C02';
const STRAVA_AUTH_URL = '/.netlify/functions/strava-auth';

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface StravaActivity {
  name: string;
  type: string;
  distance: number;      // mètres
  movingTime: number;    // secondes
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
  totalEAT?: number;    // calories brûlées aujourd'hui
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function formatDistance(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`;
}
function formatDuration(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m} min`;
}
function sportEmoji(type: string): string {
  const map: Record<string, string> = {
    Run: '🏃', Ride: '🚴', TrailRun: '🏔️', Walk: '🚶',
    Swim: '🏊', WeightTraining: '💪', Yoga: '🧘', Hike: '🥾',
  };
  return map[type] || '⚡';
}
function relativeDate(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (diff === 0) return 'Aujourd\'hui';
  if (diff === 1) return 'Hier';
  return `Il y a ${diff} jours`;
}

/* ─── Sous-composant : Bandeau Strava ─────────────────────────────────────── */
const StravaBanner: React.FC<{
  stravaData: StravaData | null;
  loading: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onRefresh: () => void;
}> = ({ stravaData, loading, onConnect, onDisconnect, onRefresh }) => {

  if (loading) {
    return (
      <Card elevation="sm" padding={spacing[5]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
          <ActivityIndicator size="small" color={STRAVA_ORANGE} />
          <Text style={{ fontFamily: fontFamily.hanken.regular, fontSize: fontSize.sm, color: colors.ink[600] }}>
            Vérification Strava…
          </Text>
        </View>
      </Card>
    );
  }

  if (stravaData?.connected) {
    return (
      <View style={{ gap: spacing[3] }}>
        {/* Statut connecté */}
        <View style={st.stravaConnected}>
          <View style={st.stravaConnectedLeft}>
            <View style={st.stravaIcon}>
              <Text style={{ fontSize: 18 }}>🚴</Text>
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

        {/* EAT du jour (Dépense calorique réelle) */}
        {stravaData.totalEAT !== undefined && stravaData.totalEAT > 0 && (
          <View style={st.eatBadge}>
            <Zap size={14} color={STRAVA_ORANGE} />
            <Text style={st.eatBadgeText}>
              <Text style={{ fontFamily: fontFamily.hanken.bold }}>
                {stravaData.totalEAT} kcal
              </Text>
              {' '}brûlées aujourd\'hui (EAT réel Strava)
            </Text>
          </View>
        )}

        {/* Dernières activités */}
        {stravaData.lastActivities && stravaData.lastActivities.length > 0 && (
          <View style={{ gap: spacing[2] }}>
            <Text style={st.activitiesLabel}>Dernières activités</Text>
            {stravaData.lastActivities.slice(0, 3).map((act, i) => (
              <View key={i} style={st.activityRow}>
                <Text style={{ fontSize: 20 }}>{sportEmoji(act.type)}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={st.activityName} numberOfLines={1}>{act.name}</Text>
                  <Text style={st.activityMeta}>
                    {formatDistance(act.distance)} · {formatDuration(act.movingTime)}
                    {act.averageHeartrate ? ` · ♥ ${Math.round(act.averageHeartrate)} bpm` : ''}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={st.activityDate}>{relativeDate(act.startDate)}</Text>
                  {act.calories && (
                    <Text style={st.activityCal}>{act.calories} kcal</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  }

  // Non connecté
  return (
    <Pressable onPress={onConnect} style={st.stravaConnectBtn} accessibilityRole="button" accessibilityLabel="Connecter Strava">
      <View style={st.stravaConnectLeft}>
        <View style={st.stravaConnectIcon}>
          <Activity size={20} color="#fff" />
        </View>
        <View>
          <Text style={st.stravaConnectTitle}>Connecter Strava</Text>
          <Text style={st.stravaConnectSub}>Sync automatique · Calories EAT réelles</Text>
        </View>
      </View>
      <ChevronRight size={18} color="rgba(255,255,255,0.7)" />
    </Pressable>
  );
};

/* ─── Réglages navigation ────────────────────────────────────────────────── */
const SETTINGS = [
  { id: 's-0', route: 'EditProfile',   icon: <ClipboardList size={20} color={colors.clay[500]} strokeWidth={2} />, label: 'Mon programme & profil' },
  { id: 's-1', route: 'Goals',         icon: <Target        size={20} color={colors.sage[500]} strokeWidth={2} />, label: 'Mes objectifs' },
  { id: 's-2', route: 'History',       icon: <History       size={20} color={colors.sage[500]} strokeWidth={2} />, label: 'Historique' },
  { id: 's-3', route: 'Notifications', icon: <Bell          size={20} color={colors.sage[500]} strokeWidth={2} />, label: 'Notifications' },
  { id: 's-4', route: 'Rituals',       icon: <Sparkles      size={20} color={colors.clay[500]} strokeWidth={2} />, label: "Rituels d'équilibre" },
  { id: 's-5', route: null,            icon: <Lock          size={20} color={colors.ink[500]}  strokeWidth={2} />, label: 'Confidentialité' },
] as const;

const BetaBadge: React.FC = () => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.clay[50], borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: colors.clay[200] }}>
    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.clay[500] }} />
    <Text style={{ fontFamily: fontFamily.hanken.bold, fontSize: 10, color: colors.clay[600], letterSpacing: 1.5 }}>BÊTA v0.1</Text>
  </View>
);

/* ─── Écran Profil ───────────────────────────────────────────────────────── */
export const ProfileScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const program = useProgramStore(s => s.program);
  const storeName = useProgramStore(s => s.userName);
  const storeEmail = useProgramStore(s => s.userEmail);
  const { streak } = useStreak();
  const isNewUser   = true;
  const displayName = storeName || 'Mon profil';
  const displayEmail= storeEmail || '';
  const sessions = 0;
  const wLabel   = '— kg';

  /* Feedback state */
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackCategory, setFeedbackCategory] = useState<'bug' | 'suggestion' | 'autre'>('suggestion');
  const [feedbackSending, setFeedbackSending] = useState(false);

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
      Alert.alert('Merci !', 'Ton retour a bien été envoyé à l\'équipe de Pure Ascension.');
      setFeedbackText('');
      setFeedbackModalVisible(false);
    } catch (err) {
      console.error('Erreur envoi feedback:', err);
      Alert.alert('Erreur', 'Impossible d\'envoyer le retour. Réessaye.');
    } finally {
      setFeedbackSending(false);
    }
  };

  /* Strava state */
  const [stravaData, setStravaData] = useState<StravaData | null>(null);
  const [stravaLoading, setStravaLoading] = useState(true);

  /* ── Écoute temps réel du statut Strava depuis Firestore ── */
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

  /* ── Connexion Strava — ouverture du flux OAuth ── */
  const handleConnectStrava = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      Alert.alert('Connexion requise', 'Veuillez vous connecter à votre compte Pure Ascension.');
      return;
    }

    try {
      setStravaLoading(true);
      const res = await fetch(`${STRAVA_AUTH_URL}?uid=${uid}`);
      const data = await res.json();

      if (data.url) {
        // Sur le web → window.location, sur mobile → Linking
        if (typeof window !== 'undefined') {
          window.location.href = data.url;
        } else {
          await Linking.openURL(data.url);
        }
      } else {
        throw new Error('URL OAuth Strava non reçue');
      }
    } catch (err: any) {
      setStravaLoading(false);
      Alert.alert('Erreur Strava', err.message || 'Impossible d\'initier la connexion Strava.');
    }
  }, []);

  /* ── Déconnexion Strava ── */
  const handleDisconnectStrava = useCallback(() => {
    Alert.alert(
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
              Alert.alert('Erreur', 'Impossible de déconnecter Strava.');
            }
          }
        },
      ]
    );
  }, []);

  /* ── Actualisation manuelle ── */
  const handleRefreshStrava = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    setStravaLoading(true);
    // Le webhook Strava sync automatiquement — ici on simule juste un rechargement
    setTimeout(() => setStravaLoading(false), 1200);
  }, []);

  /* ── Gestion du retour OAuth (URL ?strava=success|error) ── */
  useEffect(() => {
    const checkOAuthReturn = () => {
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams(window.location.search);
      const stravaStatus = params.get('strava');
      if (stravaStatus === 'success') {
        Alert.alert('🚴 Strava connecté !', 'Vos activités seront synchronisées automatiquement.');
        window.history.replaceState({}, '', window.location.pathname);
      } else if (stravaStatus === 'error') {
        const msg = params.get('msg') || 'unknown';
        Alert.alert('Erreur Strava', `La connexion a échoué (${msg}). Réessayez.`);
        window.history.replaceState({}, '', window.location.pathname);
      }
    };
    checkOAuthReturn();
  }, []);

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.screenTitle} accessibilityRole="header">Profil</Text>

        {/* ── Carte profil ─────────────────────────────────────────────── */}
        <Card elevation="md" padding={spacing[6]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[4], marginBottom: spacing[5] }}>
            <Avatar name={displayName} size={64} ring ringColor={colors.clay[300]} />
            <View style={{ flex: 1, gap: spacing[1] }}>
              <Text style={{ fontFamily: fontFamily.spectral.medium, fontSize: fontSize.xl, color: colors.ink[900], lineHeight: fontSize.xl * lineHeight.snug }}>{displayName}</Text>
              <Text style={{ fontFamily: fontFamily.hanken.regular, fontSize: fontSize.sm, color: colors.ink[600] }}>
                {displayEmail || (program ? `Programme ${program.name}` : 'Diagnostic à compléter')}
              </Text>
            </View>
          </View>
          <View style={{ height: 1, backgroundColor: colors.ink[200], marginBottom: spacing[5] }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' }}>
            <Stat value={streak}   label="Jours" />
            <View style={{ width: 1, height: 40, backgroundColor: colors.ink[200] }} />
            <Stat value={wLabel}   label="Évolution" />
            <View style={{ width: 1, height: 40, backgroundColor: colors.ink[200] }} />
            <Stat value={sessions} label="Séances" />
          </View>
        </Card>

        {/* ── Section Strava ────────────────────────────────────────────── */}
        <View style={{ gap: spacing[3] }}>
          <Text style={{ fontFamily: fontFamily.hanken.semiBold, fontSize: fontSize.md, color: colors.ink[900] }}>
            Intégration sport
          </Text>
          <StravaBanner
            stravaData={stravaData}
            loading={stravaLoading}
            onConnect={handleConnectStrava}
            onDisconnect={handleDisconnectStrava}
            onRefresh={handleRefreshStrava}
          />
        </View>

        {/* ── Réglages ─────────────────────────────────────────────────── */}
        <View style={{ gap: spacing[3] }}>
          <Text style={{ fontFamily: fontFamily.hanken.semiBold, fontSize: fontSize.md, color: colors.ink[900] }}>Réglages</Text>
          <Card elevation="sm" padding={0} style={{ overflow: 'hidden' }}>
            {SETTINGS.map((item, idx, arr) => (
              <View key={item.id}>
                <Pressable
                  onPress={() => item.route && navigation?.navigate(item.route, { isNewUser })}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  style={({ pressed }) => [
                    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing[5], paddingVertical: spacing[4], gap: spacing[4], minHeight: 56 },
                    pressed && { backgroundColor: colors.sand[100] }
                  ]}
                >
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.sand[100], alignItems: 'center', justifyContent: 'center' }}>{item.icon}</View>
                  <Text style={{ flex: 1, fontFamily: fontFamily.hanken.medium, fontSize: fontSize.base, color: colors.ink[900] }}>{item.label}</Text>
                  <ChevronRight size={18} color={colors.ink[500]} strokeWidth={2} />
                </Pressable>
                {idx < arr.length - 1 && <View style={{ height: 1, backgroundColor: colors.ink[200], marginLeft: spacing[5] + 36 + spacing[4] }} />}
              </View>
            ))}
          </Card>
        </View>

        {/* ── Feedback Bêta ──────────────────────────────────────────────── */}
        <Card elevation="sm" padding={spacing[4]} style={{ borderColor: colors.sage[300], borderWidth: 1.5, backgroundColor: colors.sage[50] }}>
          <Pressable onPress={() => setFeedbackModalVisible(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }} accessibilityRole="button">
            <ClipboardList size={22} color={colors.sage[600]} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fontFamily.hanken.bold, fontSize: fontSize.base, color: colors.sage[900] }}>
                Donner mon avis / Signaler un bug
              </Text>
              <Text style={{ fontFamily: fontFamily.hanken.regular, fontSize: fontSize.xs, color: colors.sage[700], marginTop: 2 }}>
                Une suggestion, une idée ou un problème technique ? Dis-le nous !
              </Text>
            </View>
            <ChevronRight size={18} color={colors.sage[600]} />
          </Pressable>
        </Card>

        {/* ── Bouton Déconnexion ────────────────────────────────────────── */}
        <Pressable
          onPress={async () => {
            try {
              await logOut();
            } catch (err) {
              Alert.alert('Erreur', 'Impossible de se déconnecter.');
            }
          }}
          accessibilityRole="button"
          accessibilityLabel="Se déconnecter"
          style={({ pressed }) => [
            {
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: spacing[4],
              borderRadius: radius.xl,
              backgroundColor: '#fff',
              borderWidth: 1.5,
              borderColor: colors.clay[200],
              gap: spacing[2],
              marginTop: spacing[1],
            },
            pressed && { backgroundColor: colors.clay[50] }
          ]}
        >
          <LogOut size={18} color={colors.clay[500]} strokeWidth={2} />
          <Text style={{ fontFamily: fontFamily.hanken.bold, fontSize: fontSize.base, color: colors.clay[600] }}>
            Se déconnecter de Pure Ascension
          </Text>
        </Pressable>

        {/* ── Badge bêta ───────────────────────────────────────────────── */}
        <View style={{ alignItems: 'center', gap: spacing[2] }}>
          <BetaBadge />
          <Text style={{ fontFamily: fontFamily.hanken.regular, fontSize: fontSize.xs, color: colors.ink[400], textAlign: 'center' }}>Accès bêta · Pure Ascension</Text>
        </View>
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
            placeholder="Dis-nous tout (ex: le bouton d'ajout de repas ne réagit pas, j'adorerais avoir une option...)"
            placeholderTextColor={colors.ink[400]}
            multiline
          />

          <Button
            variant="primary"
            size="lg"
            label="Envoyer mon retour"
            fullWidth
            loading={feedbackSending}
            disabled={!feedbackText.trim()}
            onPress={handleSubmitFeedback}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
};

/* ─── Styles ─────────────────────────────────────────────────────────────── */
const st = StyleSheet.create({
  // Strava connecté
  stravaConnected: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: radius.xl,
    padding: spacing[4], borderWidth: 1.5, borderColor: '#22c55e',
    ...shadows.sm,
  },
  stravaConnectedLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  stravaIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center' },
  stravaConnectedTitle: { fontFamily: fontFamily.hanken.bold, fontSize: fontSize.base, color: colors.ink[900] },
  stravaConnectedSub:   { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.xs, color: colors.ink[500], marginTop: 2 },
  stravaIconBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.ink[100], alignItems: 'center', justifyContent: 'center',
  },

  // EAT badge
  eatBadge: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[2],
    backgroundColor: '#fff7ed', borderRadius: radius.lg,
    paddingHorizontal: spacing[4], paddingVertical: spacing[2],
    borderWidth: 1, borderColor: '#fed7aa',
  },
  eatBadgeText: { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.sm, color: '#9a3412' },

  // Activités
  activitiesLabel: {
    fontFamily: fontFamily.hanken.semiBold, fontSize: fontSize.xs,
    color: colors.ink[500], textTransform: 'uppercase', letterSpacing: 0.8,
  },
  activityRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[3],
    backgroundColor: '#fff', borderRadius: radius.lg,
    padding: spacing[3], borderWidth: 1, borderColor: colors.ink[150] ?? colors.ink[200],
    ...shadows.sm,
  },
  activityName: { fontFamily: fontFamily.hanken.semiBold, fontSize: fontSize.sm, color: colors.ink[900] },
  activityMeta: { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.xs, color: colors.ink[500], marginTop: 2 },
  activityDate: { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.xs, color: colors.ink[500] },
  activityCal:  { fontFamily: fontFamily.hanken.bold,    fontSize: fontSize.xs, color: STRAVA_ORANGE, marginTop: 2 },

  // Bouton connexion
  stravaConnectBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: STRAVA_ORANGE, borderRadius: radius.xl,
    padding: spacing[4], ...shadows.md,
  },
  stravaConnectLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  stravaConnectIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
  },
  stravaConnectTitle: { fontFamily: fontFamily.hanken.bold, fontSize: fontSize.base, color: '#fff' },
  stravaConnectSub:   { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.xs, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
});

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: colors.sand[50] },
  scroll:      { flex: 1 },
  content:     { paddingHorizontal: spacing[5], paddingTop: spacing[6], gap: spacing[5] },
  screenTitle: { fontFamily: fontFamily.spectral.medium, fontSize: fontSize['3xl'], color: colors.ink[900] },
});

export default ProfileScreen;
