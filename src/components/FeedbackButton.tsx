/**
 * FeedbackButton
 * Bouton flottant 💬 affiché sur tous les écrans en bêta.
 * Ouvre un modal avec deux options : bug ou suggestion.
 * Ouvre l'app mail avec un email pré-rempli.
 */
import React, { useRef, useState } from 'react';
import {
  Animated, Linking, Modal, Pressable,
  StyleSheet, Text, TouchableWithoutFeedback, View,
} from 'react-native';
import { MessageCircle, Bug, Lightbulb, X } from 'lucide-react-native';
import { colors, fontFamily, fontSize, spacing, radius, shadows } from '../theme/theme';

const FEEDBACK_EMAIL = 'info@novastructureai.com';

interface Option {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  subject: string;
  body: string;
}

const OPTIONS: Option[] = [
  {
    icon: <Bug size={22} color={colors.clay[500]} strokeWidth={1.8} />,
    title: 'Signaler un bug',
    subtitle: 'Quelque chose ne fonctionne pas',
    subject: '[Pure Ascension Bêta] Bug signalé',
    body: 'Décris le bug ici :\n\nÉcran concerné :\nCe qui s\'est passé :\nCe qui était attendu :\n\n— Envoyé depuis l\'app Pure Ascension',
  },
  {
    icon: <Lightbulb size={22} color={colors.sage[500]} strokeWidth={1.8} />,
    title: 'Donner un avis',
    subtitle: 'Idée, amélioration, ressenti',
    subject: '[Pure Ascension Bêta] Avis & suggestion',
    body: 'Mon avis sur l\'app :\n\nCe que j\'aime :\nCe que je changerais :\nCe qui me manque :\n\n— Envoyé depuis l\'app Pure Ascension',
  },
];

export const FeedbackButton: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const modalAnim = useRef(new Animated.Value(0)).current;

  const openModal = () => {
    setVisible(true);
    Animated.spring(modalAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 10 }).start();
  };

  const closeModal = () => {
    Animated.timing(modalAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => setVisible(false));
  };

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.88, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1,    duration: 120, useNativeDriver: true }),
    ]).start(openModal);
  };

  const sendFeedback = (opt: Option) => {
    closeModal();
    const uri = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(opt.subject)}&body=${encodeURIComponent(opt.body)}`;
    Linking.openURL(uri).catch(() => {});
  };

  return (
    <>
      {/* Bouton flottant */}
      <Animated.View style={[st.fab, { transform: [{ scale: scaleAnim }] }]}>
        <Pressable onPress={handlePress} accessibilityRole="button" accessibilityLabel="Donner un feedback">
          <MessageCircle size={22} color="#fff" strokeWidth={2} />
        </Pressable>
      </Animated.View>

      {/* Modal */}
      <Modal transparent visible={visible} animationType="none" onRequestClose={closeModal} statusBarTranslucent>
        <TouchableWithoutFeedback onPress={closeModal}>
          <View style={st.overlay}>
            <TouchableWithoutFeedback>
              <Animated.View style={[
                st.sheet,
                {
                  opacity: modalAnim,
                  transform: [{
                    translateY: modalAnim.interpolate({ inputRange: [0,1], outputRange: [40, 0] }),
                  }],
                },
              ]}>
                {/* Handle */}
                <View style={st.handle} />

                {/* Header */}
                <View style={st.sheetHeader}>
                  <View>
                    <Text style={st.sheetTitle}>Ton avis compte</Text>
                    <Text style={st.sheetSub}>Tu es en accès bêta — chaque retour améliore l'app.</Text>
                  </View>
                  <Pressable onPress={closeModal} style={st.closeBtn} accessibilityRole="button">
                    <X size={18} color={colors.ink[600]} strokeWidth={2} />
                  </Pressable>
                </View>

                {/* Options */}
                {OPTIONS.map((opt, i) => (
                  <Pressable
                    key={i}
                    style={({ pressed }) => [st.option, pressed && st.optionPressed]}
                    onPress={() => sendFeedback(opt)}
                    accessibilityRole="button"
                  >
                    <View style={st.optionIcon}>{opt.icon}</View>
                    <View style={st.optionBody}>
                      <Text style={st.optionTitle}>{opt.title}</Text>
                      <Text style={st.optionSub}>{opt.subtitle}</Text>
                    </View>
                  </Pressable>
                ))}

                {/* Beta badge */}
                <View style={st.betaRow}>
                  <View style={st.betaBadge}>
                    <Text style={st.betaText}>BÊTA v0.1</Text>
                  </View>
                  <Text style={st.betaLabel}>Pure Ascension · Accès bêta</Text>
                </View>
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
};

const st = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.sage[500],
    alignItems: 'center', justifyContent: 'center',
    zIndex: 999,
    ...shadows.md,
  },

  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[8],
    paddingTop: spacing[3],
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: colors.ink[200],
    alignSelf: 'center', marginBottom: spacing[5],
  },

  sheetHeader: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between', marginBottom: spacing[5],
    gap: spacing[3],
  },
  sheetTitle: {
    fontFamily: fontFamily.spectral.medium,
    fontSize: fontSize.xl, color: colors.ink[900],
  },
  sheetSub: {
    fontFamily: fontFamily.hanken.regular,
    fontSize: fontSize.sm, color: colors.ink[500],
    marginTop: spacing[1],
  },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.ink[100],
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },

  option: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[4],
    padding: spacing[4], borderRadius: radius.xl,
    backgroundColor: colors.sand[50],
    marginBottom: spacing[3],
    borderWidth: 1, borderColor: colors.ink[100],
  },
  optionPressed: { backgroundColor: colors.sand[100] },
  optionIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    ...shadows.sm,
  },
  optionBody:  { flex: 1 },
  optionTitle: { fontFamily: fontFamily.hanken.semiBold, fontSize: fontSize.base, color: colors.ink[900], marginBottom: 2 },
  optionSub:   { fontFamily: fontFamily.hanken.regular,  fontSize: fontSize.sm,   color: colors.ink[500] },

  betaRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[2],
    justifyContent: 'center', marginTop: spacing[2],
  },
  betaBadge: {
    backgroundColor: colors.clay[100], paddingHorizontal: spacing[2], paddingVertical: 2,
    borderRadius: radius.pill,
  },
  betaText:  { fontFamily: fontFamily.hanken.bold, fontSize: 9, color: colors.clay[600], letterSpacing: 1 },
  betaLabel: { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.xs, color: colors.ink[400] },
});

export default FeedbackButton;
