import React from 'react';
import { Modal, View, Text, StyleSheet, Pressable, ScrollView, SafeAreaView } from 'react-native';
import { X, Sparkles, Dumbbell, UtensilsCrossed, Clock, Target, Layers, HelpCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, fontFamily, fontSize, lineHeight, spacing, radius, shadows } from '../theme/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  defaultKcal?: number;
}

export const BeginnerGuideModal: React.FC<Props> = ({ visible, onClose, defaultKcal = 2800 }) => {
  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={st.safe}>
        {/* Header */}
        <View style={st.header}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Sparkles size={18} color={colors.clay[500]} />
              <Text style={st.headerTitle}>Guide Pédagogique Débutant</Text>
            </View>
            <Text style={st.headerSub}>Comprendre simplement le « Pourquoi » de chaque exercice & repas</Text>
          </View>
          <Pressable style={st.closeBtn} onPress={onClose} accessibilityRole="button">
            <X size={20} color={colors.ink[700]} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>

          {/* Intro Box */}
          <View style={st.introBox}>
            <Text style={st.introTitle}>L'entraînement et la nutrition sans jargon 💡</Text>
            <Text style={st.introText}>
              Pour progresser sereinement, il est essentiel de comprendre pourquoi tu fais chaque mouvement et pourquoi tu consommes une certaine quantité de nourriture. Voici les réponses simples aux questions clés.
            </Text>
          </View>

          {/* Section 1 : Nutrition */}
          <View style={st.sectionCard}>
            <View style={st.sectionHeader}>
              <UtensilsCrossed size={20} color={colors.sage[600]} />
              <Text style={st.sectionTitle}>1. La Nutrition & les Calories ({defaultKcal} kcal)</Text>
            </View>

            <View style={st.qaItem}>
              <Text style={st.question}>Pourquoi viser un quota précis (ex: {defaultKcal} kcal) ?</Text>
              <Text style={st.answer}>
                Tes calories sont le carburant de ton corps. Si tu manges trop peu, ton métabolisme ralentit et ton corps brûle du muscle. Si tu manges trop, l'excès est stocké sous forme de graisse. Ce quota sur-mesure donne à ton corps l'énergie exacte pour se transformer tout en restant au sommet de sa vitalité.
              </Text>
            </View>

            <View style={st.qaItem}>
              <Text style={st.question}>À quoi servent les Protéines, Glucides et Lipides (Macros) ?</Text>
              <Text style={st.answer}>
                • <Text style={st.bold}>Protéines</Text> : La matière première pour reconstruire et renforcer tes fibres musculaires après l'effort.{'\n'}
                • <Text style={st.bold}>Glucides</Text> : L'essence de ton moteur. Ils alimentent tes séances d'entraînement et ton cerveau.{'\n'}
                • <Text style={st.bold}>Lipides</Text> : Les bonnes graisses qui protègent tes articulations et régulent tes hormones.
              </Text>
            </View>
          </View>

          {/* Section 2 : Entraînement */}
          <View style={st.sectionCard}>
            <View style={st.sectionHeader}>
              <Dumbbell size={20} color={colors.clay[500]} />
              <Text style={st.sectionTitle}>2. L'Entraînement & la Technique</Text>
            </View>

            <View style={st.qaItem}>
              <Text style={st.question}>C'est quoi le Tempo (ex: 3-1-1-0) ?</Text>
              <Text style={st.answer}>
                C'est le rythme d'exécution : 3 secondes pour descendre avec contrôle, 1 seconde de pause en bas, 1 seconde pour remonter dynamiquement. Prendre 3 secondes pour descendre est le secret #1 pour construire du muscle efficacement tout en préservant tes articulations.
              </Text>
            </View>

            <View style={st.qaItem}>
              <Text style={st.question}>Comment mesurer le RPE (Effort Perçu de 1 à 10) ?</Text>
              <Text style={st.answer}>
                Le RPE mesure la difficulté sans stresser :{'\n'}
                • <Text style={st.bold}>RPE 7-8</Text> : Effort intense mais maîtrisé (tu pourrais encore faire 2 ou 3 répétitions).{'\n'}
                • <Text style={st.bold}>RPE 9</Text> : Très difficile (1 seule répétition en réserve).{'\n'}
                Pas besoin de te blesser : la régularité et la bonne posture priment toujours sur le poids.
              </Text>
            </View>

            <View style={st.qaItem}>
              <Text style={st.question}>Pourquoi diviser la séance en 4 Phases (P1 à P4) ?</Text>
              <Text style={st.answer}>
                • <Text style={st.bold}>Phase 1</Text> : Prépare tes articulations et tes muscles à l'effort.{'\n'}
                • <Text style={st.bold}>Phase 2</Text> : Travail de force sur le mouvement principal quand ton énergie est maximale.{'\n'}
                • <Text style={st.bold}>Phase 3</Text> : Exercices accessoires pour affiner les muscles cibles.{'\n'}
                • <Text style={st.bold}>Phase 4</Text> : Décompression et retour au calme pour démarrer la récupération.
              </Text>
            </View>
          </View>

          {/* Bottom Button */}
          <Pressable
            style={st.doneBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onClose();
            }}
          >
            <Text style={st.doneBtnText}>J'ai compris · Démarrer sereinement</Text>
          </Pressable>

        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const st = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FBF8F3',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.sand[300],
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontFamily: fontFamily.spectral.bold,
    fontSize: fontSize.lg,
    color: colors.ink[900],
  },
  headerSub: {
    fontFamily: fontFamily.hanken.regular,
    fontSize: fontSize.xs,
    color: colors.ink[600],
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.sand[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    padding: spacing[4],
    gap: spacing[4],
  },
  introBox: {
    backgroundColor: colors.sage[100],
    borderRadius: radius.lg,
    padding: spacing[4],
    borderLeftWidth: 4,
    borderLeftColor: colors.sage[600],
  },
  introTitle: {
    fontFamily: fontFamily.hanken.bold,
    fontSize: fontSize.md,
    color: colors.sage[900],
    marginBottom: 4,
  },
  introText: {
    fontFamily: fontFamily.hanken.regular,
    fontSize: fontSize.sm,
    color: colors.sage[800],
    lineHeight: 20,
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: radius.xl,
    padding: spacing[4],
    gap: spacing[3],
    borderWidth: 1,
    borderColor: colors.sand[300],
    ...shadows.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.sand[200],
    paddingBottom: spacing[2],
  },
  sectionTitle: {
    fontFamily: fontFamily.spectral.bold,
    fontSize: fontSize.md,
    color: colors.ink[900],
  },
  qaItem: {
    gap: 4,
  },
  question: {
    fontFamily: fontFamily.hanken.bold,
    fontSize: fontSize.sm,
    color: colors.ink[800],
    lineHeight: 18,
  },
  answer: {
    fontFamily: fontFamily.hanken.regular,
    fontSize: fontSize.xs,
    color: colors.ink[600],
    lineHeight: 18,
  },
  bold: {
    fontFamily: fontFamily.hanken.bold,
    color: colors.ink[900],
  },
  doneBtn: {
    backgroundColor: colors.clay[500],
    borderRadius: radius.xl,
    paddingVertical: spacing[3.5],
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[2],
    marginBottom: spacing[6],
  },
  doneBtnText: {
    fontFamily: fontFamily.hanken.bold,
    fontSize: fontSize.sm,
    color: '#fff',
  },
});
