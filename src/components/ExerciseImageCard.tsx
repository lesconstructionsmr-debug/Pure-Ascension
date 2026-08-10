import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, fontFamily, fontSize, radius, spacing, shadows } from '../theme/theme';
import { getExerciseImageSource } from '../services/exerciseImageService';
import { getExerciseBiomechanics } from '../utils/biomechanics';

interface ExerciseImageCardProps {
  exerciseName: string;
  height?: number;
  showDetails?: boolean;
}

export const ExerciseImageCard: React.FC<ExerciseImageCardProps> = ({
  exerciseName,
  height = 180,
  showDetails = true,
}) => {
  const imageSource = getExerciseImageSource(exerciseName);
  const bio = getExerciseBiomechanics(exerciseName);

  return (
    <View style={[s.container, { height }]}>
      <Image
        source={imageSource}
        style={s.image}
        resizeMode="cover"
        accessibilityLabel={`Illustration biomécanique pour ${exerciseName}`}
      />
      {showDetails && (
        <View style={s.overlay}>
          <View style={s.tagGroup}>
            <View style={s.patternBadge}>
              <Text style={s.patternText}>{bio.movementPattern.toUpperCase()}</Text>
            </View>
            <View style={s.musclesBadge}>
              <Text style={s.musclesText}>{bio.primaryMuscles[0] || 'Polyarticulaire'}</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.sand[200],
    borderWidth: 1,
    borderColor: colors.sand[300],
    position: 'relative',
    ...shadows.sm,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing[3],
    backgroundColor: 'rgba(28, 36, 29, 0.4)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tagGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  patternBadge: {
    backgroundColor: colors.sage[600],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  patternText: {
    fontFamily: fontFamily.hanken.bold,
    fontSize: 9,
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  musclesBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  musclesText: {
    fontFamily: fontFamily.hanken.semiBold,
    fontSize: 10,
    color: colors.ink[900],
  },
});
