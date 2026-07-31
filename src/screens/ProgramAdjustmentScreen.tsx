import React, { useState } from 'react';
import {
  Pressable, SafeAreaView, ScrollView, StyleSheet,
  Text, View, ActivityIndicator
} from 'react-native';
import { ArrowLeft, Sparkles, AlertCircle, Check, RefreshCw, Dumbbell, ShieldAlert, Target } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, fontFamily, fontSize, spacing, radius, shadows } from '../theme/theme';
import { useProgramStore } from '../store/useProgramStore';
import { regenerateTailoredProgram, type RegenerationOptions } from '../services/programService';
import { auth } from '../services/firebase';
import { showAlert } from '../utils/alert';

interface Props {
  navigation: any;
}

export const ProgramAdjustmentScreen: React.FC<Props> = ({ navigation }) => {
  const { program, profile, setProgram } = useProgramStore();
  
  // Step state
  const [selectedFrictions, setSelectedFrictions] = useState<string[]>([]);
  const [selectedFocus, setSelectedFocus] = useState<string[]>(['fullbody']);
  const [selectedGym, setSelectedGym] = useState<any>(program?.gymAccess || 'halteres');
  const [frequency, setFrequency] = useState<number>(program?.frequency ?? 3);
  const [intensity, setIntensity] = useState<'light' | 'moderate' | 'intense'>('moderate');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!program) {
    return (
      <SafeAreaView style={st.safe}>
        <View style={st.header}>
          <Pressable onPress={() => navigation.goBack()} style={st.backBtn} accessibilityRole="button">
            <ArrowLeft size={20} color={colors.ink[700]} />
          </Pressable>
          <Text style={st.headerTitle}>Régénération du Plan</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={st.emptyState}>
          <AlertCircle size={48} color={colors.clay[500]} />
          <Text style={st.emptyText}>Aucun programme actif à régénérer.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const toggleFriction = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedFrictions(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleFocus = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedFocus(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleRegenerate = async () => {
    setLoading(true);
    try {
      const uid = auth.currentUser?.uid || 'local_user';
      const options: RegenerationOptions = {
        frictionPoints: selectedFrictions,
        focusAreas: selectedFocus,
        gymAccess: selectedGym,
        frequency: frequency as any,
        intensity,
      };

      const newTailoredProgram = await regenerateTailoredProgram(uid, program, options, profile || undefined);
      
      // Mise à jour immédiate du store d'état local Zustand
      setProgram(newTailoredProgram);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSuccess(true);
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (err) {
      console.error('Erreur régénération plan:', err);
      showAlert('Erreur', 'Impossible de régénérer le plan. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={st.safe}>
      {/* Header */}
      <View style={st.header}>
        <Pressable onPress={() => navigation.goBack()} style={st.backBtn} accessibilityRole="button">
          <ArrowLeft size={20} color={colors.ink[700]} />
        </Pressable>
        <Text style={st.headerTitle}>Régénérer mon Plan 🔄</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
        {/* Intro Banner */}
        <View style={st.introCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Sparkles size={20} color={colors.sage[600]} />
            <Text style={st.introTitle}>Recalibrage Sur-Mesure</Text>
          </View>
          <Text style={st.introSub}>
            Indique ce qui ne te convient pas dans ton plan actuel. Notre moteur IA va reconstruire une structure de séances parfaitement adaptée à tes préférences et ton rythme.
          </Text>
        </View>

        {/* 1. Points de friction / Inconforts */}
        <View style={st.section}>
          <View style={st.sectionHeader}>
            <ShieldAlert size={18} color={colors.clay[500]} />
            <Text style={st.sectionTitle}>1. Qu'est-ce qui ne te convient pas actuellement ?</Text>
          </View>
          <View style={st.optionsGrid}>
            {[
              { id: 'too-complex', label: 'Exercices trop complexes', sub: 'Préférence pour des mouvements plus simples' },
              { id: 'too-long', label: 'Séances trop longues (>45 min)', sub: 'Besoin d\'un format plus rapide & dense' },
              { id: 'high-impact', label: 'Trop de sauts / d\'impacts', sub: 'Protection des articulations (genoux/dos)' },
              { id: 'no-equipment', label: 'Manque de matériel spécifique', sub: 'Adapter aux équipements disponibles' },
              { id: 'too-intense', label: 'Fatigue / Courbatures excessives', sub: 'Besoin d\'un rythme de récupération plus doux' },
            ].map(opt => {
              const active = selectedFrictions.includes(opt.id);
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => toggleFriction(opt.id)}
                  style={[st.cardChoice, active && st.cardChoiceSelected]}
                  accessibilityRole="button"
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[st.choiceLabel, active && { color: colors.sage[800] }]}>{opt.label}</Text>
                    <Text style={st.choiceSub}>{opt.sub}</Text>
                  </View>
                  <View style={[st.checkbox, active && st.checkboxActive]}>
                    {active && <Check size={14} color="#fff" strokeWidth={3} />}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* 2. Zones de Focus Musculaire */}
        <View style={st.section}>
          <View style={st.sectionHeader}>
            <Target size={18} color={colors.sage[600]} />
            <Text style={st.sectionTitle}>2. Quels sont tes objectifs prioritaires ?</Text>
          </View>
          <View style={st.optionsGrid}>
            {[
              { id: 'glutes-legs', label: 'Fessiers & Cuisses', sub: 'Priorité au bas du corps & galbe' },
              { id: 'upper-body', label: 'Haut du Corps & Bras', sub: 'Développement des épaules, dos & bras' },
              { id: 'core-abs', label: 'Sangle Abdominale & Posture', sub: 'Renforcement du transverse & taille' },
              { id: 'fullbody', label: 'Équilibre Global (Full Body)', sub: 'Développement harmonieux de tout le corps' },
            ].map(opt => {
              const active = selectedFocus.includes(opt.id);
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => toggleFocus(opt.id)}
                  style={[st.cardChoice, active && st.cardChoiceSelected]}
                  accessibilityRole="button"
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[st.choiceLabel, active && { color: colors.sage[800] }]}>{opt.label}</Text>
                    <Text style={st.choiceSub}>{opt.sub}</Text>
                  </View>
                  <View style={[st.checkbox, active && st.checkboxActive]}>
                    {active && <Check size={14} color="#fff" strokeWidth={3} />}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* 3. Équipement & Fréquence */}
        <View style={st.section}>
          <View style={st.sectionHeader}>
            <Dumbbell size={18} color={colors.ink[700]} />
            <Text style={st.sectionTitle}>3. Équipement disponible & Fréquence</Text>
          </View>

          <Text style={st.subHeading}>Matériel principal :</Text>
          <View style={{ gap: spacing[2] }}>
            {[
              { id: 'poids-du-corps', label: 'Poids du corps / Maison', sub: 'Aucun matériel nécessaire' },
              { id: 'kettlebell-board', label: 'Kettlebells & Push-up Board 🏋️', sub: 'Swings, Goblet Squats, Prises modulaires & Core' },
              { id: 'halteres', label: 'Haltères & Élastiques', sub: 'Équipement maison classique' },
              { id: 'salle-complete', label: 'Salle de sport complète', sub: 'Accès aux machines & barres' },
            ].map(gym => {
              const active = selectedGym === gym.id;
              return (
                <Pressable
                  key={gym.id}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedGym(gym.id);
                  }}
                  style={[st.cardChoice, active && st.cardChoiceSelected]}
                  accessibilityRole="button"
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[st.choiceLabel, active && { color: colors.sage[800] }]}>{gym.label}</Text>
                    <Text style={st.choiceSub}>{gym.sub}</Text>
                  </View>
                  <View style={[st.radio, active && { borderColor: colors.sage[500] }]}>
                    {active && <View style={st.radioDot} />}
                  </View>
                </Pressable>
              );
            })}
          </View>

          <Text style={[st.subHeading, { marginTop: spacing[3] }]}>Fréquence d'entraînement :</Text>
          <View style={st.freqRow}>
            {[2, 3, 4, 5, 6].map(f => (
              <Pressable
                key={f}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setFrequency(f);
                }}
                style={[st.freqChip, frequency === f && st.freqChipActive]}
              >
                <Text style={[st.freqText, frequency === f && st.freqTextActive]}>{f}</Text>
                <Text style={[st.freqLabelText, frequency === f && st.freqLabelTextActive]}>jours/sem</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Submit */}
        {success ? (
          <View style={st.successCard}>
            <Check size={24} color={colors.sage[700]} />
            <Text style={st.successText}>Nouveau plan généré & installé avec succès !</Text>
          </View>
        ) : (
          <Pressable
            onPress={handleRegenerate}
            disabled={loading}
            style={[st.submitBtn, loading && st.submitBtnDisabled]}
            accessibilityRole="button"
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <RefreshCw size={18} color="#fff" />
                <Text style={st.submitBtnText}>Générer mon nouveau plan sur-mesure</Text>
              </View>
            )}
          </Pressable>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fbf8f3' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing[4], paddingVertical: spacing[3],
    borderBottomWidth: 1, borderBottomColor: colors.ink[100],
    backgroundColor: '#fff'
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: fontFamily.spectral.bold, fontSize: fontSize.lg, color: colors.ink[900] },
  scroll: { padding: spacing[4], gap: spacing[5] },
  introCard: {
    backgroundColor: colors.sage[50], borderRadius: radius.xl, padding: spacing[4],
    borderWidth: 1, borderColor: colors.sage[200], gap: 6
  },
  introTitle: { fontFamily: fontFamily.hanken.bold, fontSize: fontSize.base, color: colors.sage[900] },
  introSub: { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.sm, color: colors.sage[800], lineHeight: 20 },
  section: { gap: spacing[3] },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontFamily: fontFamily.spectral.bold, fontSize: fontSize.base, color: colors.ink[900] },
  subHeading: { fontFamily: fontFamily.hanken.semiBold, fontSize: fontSize.sm, color: colors.ink[700] },
  optionsGrid: { gap: spacing[2.5] },
  cardChoice: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[3],
    padding: spacing[3.5], borderRadius: radius.lg,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.ink[200],
    ...shadows.sm
  },
  cardChoiceSelected: { borderColor: colors.sage[500], borderWidth: 2, backgroundColor: colors.sage[50] },
  choiceLabel: { fontFamily: fontFamily.hanken.bold, fontSize: fontSize.sm, color: colors.ink[900] },
  choiceSub: { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.xs, color: colors.ink[600], marginTop: 1 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.ink[300], alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: colors.sage[500], borderColor: colors.sage[500] },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.ink[300], alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.sage[500] },
  freqRow: { flexDirection: 'row', gap: spacing[2] },
  freqChip: {
    flex: 1, alignItems: 'center', paddingVertical: spacing[2.5],
    borderRadius: radius.lg, backgroundColor: '#fff',
    borderWidth: 1.5, borderColor: colors.ink[200]
  },
  freqChipActive: { backgroundColor: colors.sage[500], borderColor: colors.sage[500] },
  freqText: { fontFamily: fontFamily.spectral.bold, fontSize: fontSize.lg, color: colors.ink[900] },
  freqTextActive: { color: '#fff' },
  freqLabelText: { fontFamily: fontFamily.hanken.regular, fontSize: 10, color: colors.ink[500] },
  freqLabelTextActive: { color: colors.sage[100] },
  submitBtn: {
    backgroundColor: colors.clay[500], height: 52, borderRadius: radius.pill,
    alignItems: 'center', justifyContent: 'center', marginTop: spacing[3], ...shadows.md
  },
  submitBtnDisabled: { backgroundColor: colors.ink[300], opacity: 0.7 },
  submitBtnText: { fontFamily: fontFamily.hanken.bold, fontSize: fontSize.base, color: '#fff' },
  successCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.sage[50], borderRadius: radius.lg, borderWidth: 1, borderColor: colors.sage[200],
    padding: spacing[4], marginTop: spacing[4]
  },
  successText: { fontFamily: fontFamily.hanken.bold, fontSize: fontSize.sm, color: colors.sage[800] },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing[3], paddingVertical: 100 },
  emptyText: { fontFamily: fontFamily.hanken.medium, fontSize: fontSize.base, color: colors.ink[500] }
});

export default ProgramAdjustmentScreen;
