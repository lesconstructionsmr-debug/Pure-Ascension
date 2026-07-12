/**
 * ProfileEditScreen
 * Wraps OnboardingQuestionnaireScreen en mode édition.
 * Accessible depuis Profil → "Modifier mon profil".
 */
import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { OnboardingQuestionnaireScreen } from '../OnboardingQuestionnaireScreen';
import { UserProfile } from '../../data';
import { colors } from '../../theme/theme';

interface Props {
  onBack:          () => void;
  onSave:          (profile: UserProfile) => void;
  currentProfile?: Partial<UserProfile>;
}

export const ProfileEditScreen: React.FC<Props> = ({ onBack, onSave, currentProfile }) => (
  <OnboardingQuestionnaireScreen
    onBack={onBack}
    onComplete={onSave}
    initialProfile={currentProfile}
    editMode
  />
);

export default ProfileEditScreen;
