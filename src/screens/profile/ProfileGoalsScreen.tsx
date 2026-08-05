import React, { useState, useEffect } from 'react';
import {
  Pressable, SafeAreaView, ScrollView,
  StyleSheet, Text, View, Modal, TextInput, KeyboardAvoidingView, Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChevronLeft, Edit3, Target, Activity, Droplets, Moon, Compass, Check, X, Plus, Minus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, fontFamily, fontSize, lineHeight, spacing, radius, shadows } from '../../theme/theme';
import { Progress } from '../../components/Progress';
import { Button }   from '../../components/Button';
import { showAlert } from '../../utils/alert';
import { auth, db }  from '../../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

import { useProgramStore } from '../../store/useProgramStore';
import { generateProgram } from '../../services/programService';
import { saveUserProfileAndProgram } from '../../services/dbService';
import type { UserProfile } from '../../data';

interface Props { onBack: () => void; isNewUser?: boolean; }

export interface GoalItem {
  id: string;
  label: string;
  current: number;
  target: number;
  unit: string;
  color: string;
  iconName: 'target' | 'activity' | 'droplets' | 'moon';
}

const STORAGE_KEY = '@pure_ascension_user_goals_v1';

const DEFAULT_GOALS: GoalItem[] = [
  {
    id: 'weight',
    label: 'Objectif poids',
    current: 150,
    target: 140,
    unit: 'lbs',
    color: colors.clay[500],
    iconName: 'target',
  },
  {
    id: 'workout',
    label: 'Séances / semaine',
    current: 0,
    target: 4,
    unit: 'séances',
    color: colors.sage[500],
    iconName: 'activity',
  },
  {
    id: 'water',
    label: 'Hydratation quotidienne',
    current: 1.8,
    target: 2.5,
    unit: 'L',
    color: colors.status.info,
    iconName: 'droplets',
  },
  {
    id: 'sleep',
    label: 'Sommeil quotidien',
    current: 7.0,
    target: 8.0,
    unit: 'h',
    color: colors.ink[600],
    iconName: 'moon',
  },
];

const EmptyGoals: React.FC = () => (
  <View style={{ flex:1, alignItems:'center', justifyContent:'center', paddingHorizontal:spacing[8], paddingVertical:spacing[12], gap:spacing[4] }}>
    <View style={{ width:72, height:72, borderRadius:36, backgroundColor:colors.clay[50], alignItems:'center', justifyContent:'center' }}>
      <Compass size={32} color={colors.clay[500]} strokeWidth={1.5} />
    </View>
    <Text style={{ fontFamily:fontFamily.spectral.medium, fontSize:fontSize.xl, color:colors.ink[900], textAlign:'center' }}>Tes objectifs arrivent</Text>
    <Text style={{ fontFamily:fontFamily.hanken.regular, fontSize:fontSize.base, color:colors.ink[500], textAlign:'center', lineHeight:fontSize.base*lineHeight.relaxed }}>
      Une fois ton premier programme démarré, tes objectifs personnels s'afficheront ici avec ton avancement en temps réel.
    </Text>
  </View>
);

export const ProfileGoalsScreen: React.FC<Props> = ({ onBack, isNewUser = false }) => {
  const [goals, setGoals] = useState<GoalItem[]>(DEFAULT_GOALS);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);

  // Form temporary edit state
  const [tempGoals, setTempGoals] = useState<GoalItem[]>(DEFAULT_GOALS);
  const [saving, setSaving] = useState(false);

  // Load goals on mount
  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      const currentProfile = useProgramStore.getState().profile;
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: GoalItem[] = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const updated = parsed.map(g => {
            if (g.id === 'workout' && currentProfile?.frequency) {
              return { ...g, target: currentProfile.frequency };
            }
            if (g.id === 'weight' && currentProfile?.targetWeightKg) {
              const kgToLb = (kg: number) => Math.round(Number(kg) * 2.20462262 * 10) / 10;
              return {
                ...g,
                current: currentProfile.currentWeightKg
                  ? kgToLb(currentProfile.currentWeightKg)
                  : g.current,
                target: kgToLb(currentProfile.targetWeightKg),
              };
            }
            return g;
          });
          setGoals(updated);
          setTempGoals(updated);
          return;
        }
      }

      if (currentProfile) {
        const kgToLb = (kg: number) => Math.round(Number(kg) * 2.20462262 * 10) / 10;
        const profileGoals: GoalItem[] = [
          {
            id: 'weight',
            label: 'Objectif de poids',
            current: currentProfile.currentWeightKg ? kgToLb(currentProfile.currentWeightKg) : 150,
            target: currentProfile.targetWeightKg ? kgToLb(currentProfile.targetWeightKg) : 140,
            unit: 'lbs',
            color: colors.clay[500],
            iconName: 'target',
          },
          {
            id: 'workout',
            label: 'Séances / semaine',
            current: useProgramStore.getState().completedWorkoutsCount || 0,
            target: currentProfile.frequency || 4,
            unit: 'séances',
            color: colors.sage[500],
            iconName: 'activity',
          },
          {
            id: 'water',
            label: 'Hydratation quotidienne',
            current: 1.8,
            target: Number(currentProfile.hydrationLevel) || 2.5,
            unit: 'L',
            color: colors.status.info,
            iconName: 'droplets',
          },
          {
            id: 'sleep',
            label: 'Sommeil quotidien',
            current: 7.0,
            target: 8.0,
            unit: 'h',
            color: colors.ink[600],
            iconName: 'moon',
          },
        ];
        setGoals(profileGoals);
        setTempGoals(profileGoals);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profileGoals)).catch(() => {});
        return;
      }

      // 2. Try Firestore if logged in
      const uid = auth.currentUser?.uid;
      if (uid) {
        try {
          const snap = await getDoc(doc(db, 'users', uid));
          if (snap.exists() && snap.data()?.userGoals) {
            const remoteGoals = snap.data().userGoals;
            if (Array.isArray(remoteGoals) && remoteGoals.length > 0) {
              setGoals(remoteGoals);
              setTempGoals(remoteGoals);
              await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(remoteGoals)).catch(() => {});
              return;
            }
          }
        } catch (fErr) {
          console.warn('Firestore goals load non-bloquant:', fErr);
        }
      }
    } catch (err) {
      console.warn('Erreur chargement objectifs:', err);
    }
  };

  const handleOpenEdit = (goalId?: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
    setTempGoals(JSON.parse(JSON.stringify(goals)));
    setSelectedGoalId(goalId || null);
    setEditModalVisible(true);
  };

  const handleUpdateTemp = (id: string, field: 'current' | 'target', delta: number) => {
    setTempGoals(prev => prev.map(g => {
      if (g.id !== id) return g;
      const step = g.unit === 'kg' || g.unit === 'lbs' || g.unit === 'L' || g.unit === 'h' ? 0.1 : 1;
      const rawVal = Math.max(0, g[field] + delta * step);
      const val = parseFloat(rawVal.toFixed(1));
      return { ...g, [field]: val };
    }));
  };

  const handleDirectInput = (id: string, field: 'current' | 'target', text: string) => {
    const num = parseFloat(text.replace(',', '.'));
    setTempGoals(prev => prev.map(g => (g.id === id ? { ...g, [field]: isNaN(num) ? 0 : num } : g)));
  };

  const handleSaveGoals = async () => {
    try {
      setSaving(true);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {}

      // 1. Update React state immediately
      setGoals(tempGoals);
      setEditModalVisible(false);

      // 2. Save locally in AsyncStorage (Always succeeds)
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tempGoals));

      // 3. Synchroniser la fréquence d'entraînement et le profil global
      const workoutGoal = tempGoals.find(g => g.id === 'workout');
      const weightGoal = tempGoals.find(g => g.id === 'weight');
      const waterGoal = tempGoals.find(g => g.id === 'water');

      const currentProfile = useProgramStore.getState().profile;
      if (currentProfile) {
        const newFreq = (workoutGoal ? Math.min(6, Math.max(2, Math.round(workoutGoal.target))) : currentProfile.frequency) as 2 | 3 | 4 | 5 | 6;
        const lbToKg = (lb: number) => Math.round(Number(lb) * 0.45359237 * 10) / 10;
        const updatedProfile: UserProfile = {
          ...currentProfile,
          frequency: newFreq,
          targetWeightKg: weightGoal ? lbToKg(weightGoal.target) : currentProfile.targetWeightKg,
          currentWeightKg: weightGoal ? lbToKg(weightGoal.current) : currentProfile.currentWeightKg,
          hydrationLevel: waterGoal ? waterGoal.target : currentProfile.hydrationLevel,
        };

        // Régénérer le programme complet avec les nouvelles séances
        const newProgram = generateProgram(updatedProfile);

        // Mettre à jour Zustand (state global) immédiatement
        useProgramStore.getState().setProfile(updatedProfile);
        useProgramStore.getState().setProgram(newProgram);

        // Synchroniser Firestore
        const uid = auth.currentUser?.uid;
        if (uid) {
          saveUserProfileAndProgram(uid, updatedProfile, newProgram, updatedProfile.mainGoal || 'muscle').catch(() => {});
        }
      }

      // 4. Sync with Firestore in background if logged in
      const uid = auth.currentUser?.uid;
      if (uid) {
        try {
          await setDoc(doc(db, 'users', uid), {
            userGoals: tempGoals,
            updatedAt: new Date().toISOString(),
          }, { merge: true });
        } catch (firestoreErr) {
          console.warn('Firestore goals sync non-bloquant:', firestoreErr);
        }
      }

      showAlert('🎯 Objectifs mis à jour !', 'Tes nouvelles cibles et ton programme ont été mis à jour avec succès.');
    } catch (err) {
      console.error('Erreur sauvegarde objectifs:', err);
      showAlert('Erreur', 'Impossible d\'enregistrer tes objectifs. Réessaie.');
    } finally {
      setSaving(false);
    }
  };

  const renderIcon = (iconName: string, color: string) => {
    switch (iconName) {
      case 'target': return <Target size={20} color={color} strokeWidth={1.8} />;
      case 'activity': return <Activity size={20} color={color} strokeWidth={1.8} />;
      case 'droplets': return <Droplets size={20} color={color} strokeWidth={1.8} />;
      case 'moon': return <Moon size={20} color={color} strokeWidth={1.8} />;
      default: return <Target size={20} color={color} strokeWidth={1.8} />;
    }
  };

  const computeProgress = (goal: GoalItem) => {
    if (goal.target <= 0) return 1;
    if (goal.id === 'weight') {
      // Weight progress calculation: assuming starting from target + 5 to target
      const diff = Math.max(0, goal.current - goal.target);
      if (diff === 0) return 1.0;
      return Math.min(1.0, Math.max(0.1, 1 - diff / 10));
    }
    return Math.min(1.0, Math.max(0, goal.current / goal.target));
  };

  const getHint = (goal: GoalItem) => {
    if (goal.id === 'weight') {
      const diff = parseFloat((goal.current - goal.target).toFixed(1));
      if (diff <= 0) return '🎉 Objectif poids atteint ! Félicitations.';
      return `${diff} lbs restants · ~${Math.ceil(diff * 1.5)} semaines au rythme recommandé`;
    }
    if (goal.id === 'workout') {
      const pct = Math.round((goal.current / (goal.target || 1)) * 100);
      return `Tu es à ${pct}% de ton objectif hebdomadaire`;
    }
    if (goal.id === 'water') {
      const diff = parseFloat((goal.target - goal.current).toFixed(1));
      if (diff <= 0) return '💧 Hydratation optimale atteinte aujourd\'hui !';
      return `${Math.round(diff * 1000)} ml restants aujourd'hui`;
    }
    if (goal.id === 'sleep') {
      if (goal.current >= goal.target) return '😴 Objectif de repos atteint !';
      return 'Tu t\'approches de ton objectif de sommeil';
    }
    return 'Objectif en cours';
  };

  return (
    <SafeAreaView style={s.safe}>
      {/* ── Header ── */}
      <View style={s.header}>
        <Pressable style={s.backBtn} onPress={onBack} accessibilityRole="button" accessibilityLabel="Retour">
          <ChevronLeft size={22} color={colors.ink[700]} strokeWidth={2} />
        </Pressable>
        <Text style={s.title}>Mes objectifs</Text>
        <Pressable
          style={[s.editBtn, editModalVisible && { backgroundColor: colors.sage[100] }]}
          onPress={() => handleOpenEdit()}
          accessibilityRole="button"
          accessibilityLabel="Modifier les objectifs"
        >
          <Edit3 size={18} color={colors.sage[700]} strokeWidth={2} />
        </Pressable>
      </View>

      {isNewUser ? (
        <EmptyGoals />
      ) : (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <Text style={s.subtitle}>
            Tes objectifs personnels avec ton avancement en temps réel.
          </Text>

          {goals.map((goal) => {
            const prog = computeProgress(goal);
            return (
              <Pressable
                key={goal.id}
                style={s.goalCard}
                onPress={() => handleOpenEdit(goal.id)}
                accessibilityRole="button"
              >
                <View style={s.goalTop}>
                  <View style={[s.goalIcon, { backgroundColor: goal.color + '1A' }]}>
                    {renderIcon(goal.iconName, goal.color)}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.goalLabel}>{goal.label}</Text>
                    <View style={s.goalValues}>
                      <Text style={[s.goalCurrent, { color: goal.color }]}>
                        {goal.current} {goal.unit}
                      </Text>
                      <Text style={s.goalSep}>/</Text>
                      <Text style={s.goalTarget}>
                        {goal.target} {goal.unit}
                      </Text>
                    </View>
                  </View>
                  <View style={s.rightAction}>
                    <Text style={s.goalPercent}>{Math.round(prog * 100)}%</Text>
                    <View style={s.miniPencil}>
                      <Edit3 size={14} color={colors.sage[600]} />
                    </View>
                  </View>
                </View>

                <Progress value={prog} fillColor={goal.color} trackColor={colors.ink[100]} height={6} />
                <Text style={s.goalHint}>{getHint(goal)}</Text>
              </Pressable>
            );
          })}

          {/* ── Bilan de la semaine ── */}
          <View style={s.weekCard}>
            <Text style={s.weekTitle}>Bilan de la semaine</Text>
            <View style={s.weekRow}>
              {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, i) => (
                <View key={i} style={s.weekDayCol}>
                  <View style={[s.weekDot, i < 4 && s.weekDotActive, i === 3 && s.weekDotToday]} />
                  <Text style={s.weekDay}>{day}</Text>
                </View>
              ))}
            </View>
            <Text style={s.weekCaption}>4 jours actifs sur 7 cette semaine · 🔥 4 jours de suite</Text>
          </View>

          {/* ── Mention Légale Obligatoire ── */}
          <View style={s.legalNoticeBox}>
            <Text style={s.legalNoticeText}>
              Pure Ascension est un outil de coaching fitness et nutrition. Il ne remplace pas un avis médical professionnel.
            </Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ── Modal Édition des Objectifs ── */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={s.modalOverlay}
        >
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={s.modalTitle}>Modifier tes objectifs</Text>
                <Text style={s.modalSub}>Ajuste tes valeurs actuelles et cibles</Text>
              </View>
              <Pressable
                style={s.closeModalBtn}
                onPress={() => setEditModalVisible(false)}
                accessibilityRole="button"
              >
                <X size={20} color={colors.ink[600]} />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {tempGoals.map((g) => {
                const isSelected = selectedGoalId === g.id;
                return (
                  <View
                    key={g.id}
                    style={[
                      s.modalItemBox,
                      isSelected && { borderColor: colors.sage[500], backgroundColor: colors.sage[50] + '40' }
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2] }}>
                      <View style={[s.miniIcon, { backgroundColor: g.color + '20' }]}>
                        {renderIcon(g.iconName, g.color)}
                      </View>
                      <Text style={s.modalItemLabel}>{g.label}</Text>
                    </View>

                    <View style={s.modalControlsRow}>
                      {/* Current value control */}
                      <View style={s.controlField}>
                        <Text style={s.fieldSub}>Actuel</Text>
                        <View style={s.stepperRow}>
                          <Pressable style={s.stepBtn} onPress={() => handleUpdateTemp(g.id, 'current', -1)}>
                            <Minus size={14} color={colors.ink[700]} />
                          </Pressable>
                          <TextInput
                            style={s.stepInput}
                            keyboardType="numeric"
                            value={String(g.current)}
                            onChangeText={(txt) => handleDirectInput(g.id, 'current', txt)}
                          />
                          <Pressable style={s.stepBtn} onPress={() => handleUpdateTemp(g.id, 'current', 1)}>
                            <Plus size={14} color={colors.ink[700]} />
                          </Pressable>
                          <Text style={s.unitText}>{g.unit}</Text>
                        </View>
                      </View>

                      {/* Target value control */}
                      <View style={s.controlField}>
                        <Text style={s.fieldSub}>Cible</Text>
                        <View style={s.stepperRow}>
                          <Pressable style={s.stepBtn} onPress={() => handleUpdateTemp(g.id, 'target', -1)}>
                            <Minus size={14} color={colors.ink[700]} />
                          </Pressable>
                          <TextInput
                            style={s.stepInput}
                            keyboardType="numeric"
                            value={String(g.target)}
                            onChangeText={(txt) => handleDirectInput(g.id, 'target', txt)}
                          />
                          <Pressable style={s.stepBtn} onPress={() => handleUpdateTemp(g.id, 'target', 1)}>
                            <Plus size={14} color={colors.ink[700]} />
                          </Pressable>
                          <Text style={s.unitText}>{g.unit}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            <View style={s.modalFooter}>
              <Button
                variant="clay"
                label={saving ? "Enregistrement..." : "Enregistrer les objectifs"}
                onPress={handleSaveGoals}
                disabled={saving}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.sand[50] },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing[5], paddingVertical: spacing[4], borderBottomWidth: 1, borderBottomColor: colors.ink[200] },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.ink[100], alignItems: 'center', justifyContent: 'center' },
  editBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.sage[50], alignItems: 'center', justifyContent: 'center' },
  title:  { flex: 1, textAlign: 'center', fontFamily: fontFamily.hanken.semiBold, fontSize: fontSize.lg, color: colors.ink[900] },

  scroll:   { paddingHorizontal: spacing[5], paddingTop: spacing[5] },
  subtitle: { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.base, color: colors.ink[600], marginBottom: spacing[6], lineHeight: fontSize.base * lineHeight.relaxed },

  goalCard:  { backgroundColor: '#fff', borderRadius: radius.xl, padding: spacing[5], marginBottom: spacing[4], gap: spacing[3], ...shadows.sm },
  goalTop:   { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  goalIcon:  { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  goalLabel: { fontFamily: fontFamily.hanken.medium, fontSize: fontSize.sm, color: colors.ink[500], marginBottom: 2 },
  goalValues: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  goalCurrent: { fontFamily: fontFamily.hanken.bold, fontSize: fontSize.xl },
  goalSep:   { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.base, color: colors.ink[400] },
  goalTarget: { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.base, color: colors.ink[500] },
  rightAction: { alignItems: 'flex-end', gap: 4 },
  goalPercent: { fontFamily: fontFamily.hanken.bold, fontSize: fontSize.lg, color: colors.sage[600] },
  miniPencil: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.sage[50], alignItems: 'center', justifyContent: 'center' },
  goalHint:  { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.xs, color: colors.ink[500] },

  weekCard:  { backgroundColor: '#fff', borderRadius: radius.xl, padding: spacing[5], gap: spacing[4], marginTop: spacing[2], marginBottom: spacing[4], ...shadows.sm },
  weekTitle: { fontFamily: fontFamily.hanken.semiBold, fontSize: fontSize.base, color: colors.ink[900] },
  weekRow:   { flexDirection: 'row', justifyContent: 'space-between' },
  weekDayCol: { alignItems: 'center', gap: spacing[2] },
  weekDot:   { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.ink[100] },
  weekDotActive: { backgroundColor: colors.sage[400] },
  weekDotToday:  { backgroundColor: colors.sage[600] },
  weekDay:   { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.xs, color: colors.ink[500] },
  weekCaption: { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.sm, color: colors.ink[600] },

  legalNoticeBox: { marginTop: spacing[2], marginBottom: spacing[6], paddingHorizontal: spacing[4], paddingVertical: spacing[3], backgroundColor: colors.sand[200] + '80', borderRadius: radius.lg, borderLeftWidth: 3, borderLeftColor: colors.sage[500] },
  legalNoticeText: { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.xs, color: colors.ink[600], lineHeight: fontSize.xs * lineHeight.relaxed },

  /* Modal Styles */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(26, 32, 28, 0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: radius['2xl'], borderTopRightRadius: radius['2xl'], padding: spacing[6], gap: spacing[4], ...shadows.lg },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { fontFamily: fontFamily.spectral.bold, fontSize: fontSize.xl, color: colors.ink[900] },
  modalSub: { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.sm, color: colors.ink[500] },
  closeModalBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.ink[100], alignItems: 'center', justifyContent: 'center' },

  modalItemBox: { backgroundColor: colors.sand[50], borderRadius: radius.lg, padding: spacing[4], marginBottom: spacing[3], borderWidth: 1.5, borderColor: colors.ink[200] },
  miniIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  modalItemLabel: { fontFamily: fontFamily.hanken.semiBold, fontSize: fontSize.base, color: colors.ink[900] },

  modalControlsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing[3] },
  controlField: { flex: 1, gap: 4 },
  fieldSub: { fontFamily: fontFamily.hanken.medium, fontSize: fontSize.xs, color: colors.ink[500] },
  stepperRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: radius.md, borderWidth: 1, borderColor: colors.ink[200], paddingHorizontal: 4, paddingVertical: 2 },
  stepBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.sand[200], alignItems: 'center', justifyContent: 'center' },
  stepInput: { flex: 1, textAlign: 'center', fontFamily: fontFamily.hanken.bold, fontSize: fontSize.base, color: colors.ink[900], paddingVertical: 2 },
  unitText: { fontFamily: fontFamily.hanken.medium, fontSize: fontSize.xs, color: colors.ink[500], paddingRight: 6 },

  modalFooter: { paddingTop: spacing[2] },
});

export default ProfileGoalsScreen;

