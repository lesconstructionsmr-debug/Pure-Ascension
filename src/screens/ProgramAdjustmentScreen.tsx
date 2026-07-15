import React, { useState } from 'react';
import {
  Pressable, SafeAreaView, ScrollView, StyleSheet,
  Text, View, ActivityIndicator
} from 'react-native';
import { ArrowLeft, Sparkles, AlertCircle, Check } from 'lucide-react-native';
import { colors, fontFamily, fontSize, spacing, radius, shadows } from '../theme/theme';
import { useProgramStore } from '../store/useProgramStore';
import { adjustProgram } from '../services/programService';
import { auth } from '../services/firebase';

interface Props {
  navigation: any;
}

export const ProgramAdjustmentScreen: React.FC<Props> = ({ navigation }) => {
  const { program, setProgram } = useProgramStore();
  const [feedback, setFeedback] = useState<'too-easy' | 'perfect' | 'too-hard' | null>(null);
  const [frequency, setFrequency] = useState<number>(program?.frequency ?? 3);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!program) {
    return (
      <SafeAreaView style={st.safe}>
        <View style={st.header}>
          <Pressable onPress={() => navigation.goBack()} style={st.backBtn} accessibilityRole="button">
            <ArrowLeft size={20} color={colors.ink[700]} />
          </Pressable>
          <Text style={st.headerTitle}>Ajustement du Programme</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={st.emptyState}>
          <AlertCircle size={48} color={colors.clay[500]} />
          <Text style={st.emptyText}>Aucun programme actif à ajuster.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleAdjust = async () => {
    if (!feedback) return;
    setLoading(true);
    try {
      const uid = auth.currentUser?.uid;
      if (uid) {
        const adjusted = await adjustProgram(uid, program, feedback, frequency);
        setProgram(adjusted);
        setSuccess(true);
        setTimeout(() => {
          navigation.goBack();
        }, 1500);
      }
    } catch (err) {
      console.error(err);
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
        <Text style={st.headerTitle}>Ajustement du Programme</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
        <View style={st.introCard}>
          <Sparkles size={20} color={colors.sage[600]} />
          <Text style={st.introTitle}>Optimisation par IA</Text>
          <Text style={st.introSub}>
            Évaluez vos dernières 3 semaines d'entraînement. Notre IA recalibre le volume (nombre de répétitions) et la structure de vos séances pour maximiser vos résultats.
          </Text>
        </View>

        {/* Feedback Section */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>1. Comment trouvez-vous l'intensité globale ?</Text>
          <View style={st.feedbackContainer}>
            {[
              { id: 'too-easy', label: 'Trop facile', sub: 'Je ne ressens pas assez de fatigue musculaire.' },
              { id: 'perfect', label: 'Parfait', sub: 'Bonne fatigue sans être épuisé.' },
              { id: 'too-hard', label: 'Trop difficile', sub: 'Difficulté à finir les répétitions / courbatures extrêmes.' }
            ].map(opt => (
              <Pressable
                key={opt.id}
                onPress={() => setFeedback(opt.id as any)}
                style={[st.feedbackCard, feedback === opt.id && st.feedbackCardSelected]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[st.feedbackLabel, feedback === opt.id && { color: colors.sage[700] }]}>{opt.label}</Text>
                  <Text style={st.feedbackSub}>{opt.sub}</Text>
                </View>
                <View style={[st.radio, feedback === opt.id && { borderColor: colors.sage[500] }]}>
                  {feedback === opt.id && <View style={st.radioDot} />}
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Frequency Section */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>2. Souhaitez-vous modifier le nombre de jours d'entraînement ?</Text>
          <View style={st.freqRow}>
            {[2, 3, 4, 5, 6].map(f => (
              <Pressable
                key={f}
                onPress={() => setFrequency(f)}
                style={[st.freqChip, frequency === f && st.freqChipActive]}
              >
                <Text style={[st.freqText, frequency === f && st.freqTextActive]}>{f}</Text>
                <Text style={[st.freqLabelText, frequency === f && st.freqLabelTextActive]}>jours</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Submit */}
        {success ? (
          <View style={st.successCard}>
            <Check size={24} color={colors.sage[700]} />
            <Text style={st.successText}>Programme réajusté avec succès !</Text>
          </View>
        ) : (
          <Pressable
            onPress={handleAdjust}
            disabled={!feedback || loading}
            style={[st.submitBtn, (!feedback || loading) && st.submitBtnDisabled]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={st.submitBtnText}>Régénérer mon programme</Text>
            )}
          </Pressable>
        )}
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
    borderWidth: 1, borderColor: colors.sage[200], gap: 4
  },
  introTitle: { fontFamily: fontFamily.hanken.bold, fontSize: fontSize.base, color: colors.sage[800] },
  introSub: { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.sm, color: colors.sage[700], lineHeight: 20 },
  section: { gap: spacing[3] },
  sectionTitle: { fontFamily: fontFamily.spectral.bold, fontSize: fontSize.base, color: colors.ink[900] },
  feedbackContainer: { gap: spacing[3] },
  feedbackCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[4],
    padding: spacing[4], borderRadius: radius.lg,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.ink[200],
    ...shadows.sm
  },
  feedbackCardSelected: { borderColor: colors.sage[500], borderWidth: 2, backgroundColor: colors.sage[50] },
  feedbackLabel: { fontFamily: fontFamily.hanken.semiBold, fontSize: fontSize.base, color: colors.ink[900] },
  feedbackSub: { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.sm, color: colors.ink[600], marginTop: 2 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.ink[300], alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.sage[500] },
  freqRow: { flexDirection: 'row', gap: spacing[2] },
  freqChip: {
    flex: 1, alignItems: 'center', paddingVertical: spacing[3],
    borderRadius: radius.lg, backgroundColor: '#fff',
    borderWidth: 1.5, borderColor: colors.ink[200]
  },
  freqChipActive: { backgroundColor: colors.sage[500], borderColor: colors.sage[500] },
  freqText: { fontFamily: fontFamily.spectral.medium, fontSize: fontSize.lg, color: colors.ink[900] },
  freqTextActive: { color: '#fff' },
  freqLabelText: { fontFamily: fontFamily.hanken.regular, fontSize: 10, color: colors.ink[500] },
  freqLabelTextActive: { color: colors.sage[100] },
  submitBtn: {
    backgroundColor: colors.sage[600], height: 50, borderRadius: radius.pill,
    alignItems: 'center', justifyContent: 'center', marginTop: spacing[4], ...shadows.md
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
