import React from 'react';
import {
  Modal, View, Text, StyleSheet, Pressable, ScrollView,
} from 'react-native';
import { X, Target, Timer, Activity, Lightbulb } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, fontFamily, fontSize, lineHeight, spacing, radius, shadows } from '../theme/theme';
import { getExerciseBiomechanics } from '../utils/biomechanics';
import type { Exercise } from '../data';

interface Props {
  visible: boolean;
  exercise: Exercise | null;
  objectiveLabel?: string;
  onClose: () => void;
}

export const ExerciseDetailModal: React.FC<Props> = ({
  visible, exercise, objectiveLabel, onClose,
}) => {
  if (!exercise) return null;

  const bio = getExerciseBiomechanics(exercise.name);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.header}>
            <View style={{ flex: 1, paddingRight: spacing[3] }}>
              <Text style={s.eyebrow}>
                {objectiveLabel || bio.movementPattern.replace('_', ' ')} · RPE cible
              </Text>
              <Text style={s.title} numberOfLines={3}>{exercise.name}</Text>
            </View>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onClose();
              }}
              style={s.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Fermer"
            >
              <X size={20} color={colors.ink[700]} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
            <View style={s.statsRow}>
              <View style={s.statChip}>
                <Activity size={14} color={colors.sage[600]} />
                <Text style={s.statText}>{exercise.sets}×{exercise.reps}</Text>
              </View>
              <View style={s.statChip}>
                <Timer size={14} color={colors.clay[500]} />
                <Text style={s.statText}>{exercise.rest || `${bio.recommendedRestSec}s`}</Text>
              </View>
              <View style={s.statChip}>
                <Target size={14} color={colors.info[500]} />
                <Text style={s.statText}>{exercise.rpe || bio.rpeTarget}</Text>
              </View>
            </View>

            <View style={s.card}>
              <Text style={s.cardTitle}>Muscles ciblés</Text>
              <Text style={s.cardText}>
                {bio.primaryMuscles.join(' · ') || '—'}
              </Text>
              {bio.secondaryMuscles.length > 0 && (
                <Text style={s.cardSub}>Secondaires : {bio.secondaryMuscles.join(' · ')}</Text>
              )}
            </View>

            <View style={s.card}>
              <Text style={s.cardTitle}>Tempo</Text>
              <Text style={s.cardText}>{exercise.tempo || bio.tempoCode}</Text>
              <Text style={s.cardSub}>{bio.tempoDescription}</Text>
            </View>

            <View style={[s.card, s.tipCard]}>
              <View style={s.tipHeader}>
                <Lightbulb size={16} color={colors.sage[700]} />
                <Text style={s.cardTitle}>Exécution</Text>
              </View>
              <Text style={s.cardText}>
                {exercise.biomechanicsTip || exercise.notes || bio.biomechanicalTip}
              </Text>
            </View>

            {exercise.phaseName ? (
              <Text style={s.phaseHint}>Phase {exercise.phase} — {exercise.phaseName}</Text>
            ) : null}

            <View style={{ height: spacing[8] }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 42, 34, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.sand[50],
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '88%',
    paddingTop: spacing[4],
    ...shadows.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.ink[100],
  },
  eyebrow: {
    fontFamily: fontFamily.hanken.semiBold,
    fontSize: fontSize.xs,
    color: colors.sage[600],
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  title: {
    fontFamily: fontFamily.spectral.regular,
    fontSize: fontSize['2xl'],
    color: colors.ink[900],
    lineHeight: fontSize['2xl'] * lineHeight.snug,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.ink[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    gap: spacing[3],
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.ink[200],
    borderRadius: radius.pill,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  statText: {
    fontFamily: fontFamily.hanken.semiBold,
    fontSize: fontSize.sm,
    color: colors.ink[800],
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: radius.xl,
    padding: spacing[4],
    gap: spacing[1],
    ...shadows.sm,
  },
  tipCard: {
    backgroundColor: colors.sage[50],
    borderWidth: 1,
    borderColor: colors.sage[100],
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: 2,
  },
  cardTitle: {
    fontFamily: fontFamily.hanken.semiBold,
    fontSize: fontSize.sm,
    color: colors.ink[800],
  },
  cardText: {
    fontFamily: fontFamily.hanken.regular,
    fontSize: fontSize.base,
    color: colors.ink[700],
    lineHeight: fontSize.base * lineHeight.relaxed,
  },
  cardSub: {
    fontFamily: fontFamily.hanken.regular,
    fontSize: fontSize.sm,
    color: colors.ink[500],
    marginTop: 2,
  },
  phaseHint: {
    fontFamily: fontFamily.hanken.medium,
    fontSize: fontSize.xs,
    color: colors.ink[500],
    textAlign: 'center',
    marginTop: spacing[2],
  },
});

export default ExerciseDetailModal;
