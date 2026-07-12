/**
 * OnboardingSlidesScreen
 * 4 slides d'introduction présentant les piliers de Pure Ascension.
 * Navigation par bouton (compatible web + mobile).
 */
import React, { useRef, useState } from 'react';
import {
  Animated, Pressable,
  SafeAreaView, StyleSheet, Text, View,
} from 'react-native';
import {
  Leaf, UtensilsCrossed, Dumbbell, TrendingUp,
  ChevronRight, Sparkles,
} from 'lucide-react-native';
import { colors, fontFamily, fontSize, lineHeight, spacing, radius } from '../theme/theme';
import { Button } from '../components/Button';

/* ─── Slide data ─────────────────────────────────────────────────────────── */
const SLIDES = [
  {
    id: '1',
    bg:    colors.sage[800],
    accent:colors.sage[300],
    icon:  Leaf,
    tag:   'BIENVENUE',
    title: 'Un programme pensé\npour toi,',
    titleItalic: 'pas pour tout le monde.',
    body:  'Pure Ascension adapte chaque plan à ton corps, ton niveau et tes objectifs — semaine après semaine.',
  },
  {
    id: '2',
    bg:    colors.clay[700],
    accent:colors.clay[200],
    icon:  UtensilsCrossed,
    tag:   'NUTRITION',
    title: 'Des repas équilibrés',
    titleItalic: 'que tu veux vraiment manger.',
    body:  'Plan repas hebdomadaire, recettes détaillées, macros calculées automatiquement selon ton déficit ou surplus.',
  },
  {
    id: '3',
    bg:    colors.ink[900],
    accent:colors.sage[400],
    icon:  Dumbbell,
    tag:   'ENTRAÎNEMENT',
    title: 'Des séances guidées',
    titleItalic: 'à ton rythme.',
    body:  'Programme de force ou cardio, timer de repos intégré, progression de charge automatique. 30 à 60 min par session.',
  },
  {
    id: '4',
    bg:    '#2D3F35',
    accent:colors.sage[200],
    icon:  TrendingUp,
    tag:   'SUIVI',
    title: 'Vois tes progrès',
    titleItalic: 'chaque semaine.',
    body:  'Historique détaillé, graphes de progression, rituels de bien-être et bilan hebdomadaire pour rester motivé·e.',
  },
] as const;

/* ─── Props ──────────────────────────────────────────────────────────────── */
interface Props { onDone: () => void; }

/* ─── Component ──────────────────────────────────────────────────────────── */
export const OnboardingSlidesScreen: React.FC<Props> = ({ onDone }) => {
  const [index, setIndex] = useState(0);
  const dotAnims = useRef(SLIDES.map((_, i) => new Animated.Value(i === 0 ? 1 : 0))).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const isLast = index === SLIDES.length - 1;
  const slide  = SLIDES[index];
  const Icon   = slide.icon;

  const animateDot = (idx: number) => {
    dotAnims.forEach((anim, i) => {
      Animated.timing(anim, {
        toValue: i === idx ? 1 : 0,
        duration: 250,
        useNativeDriver: false,
      }).start();
    });
  };

  const goTo = (idx: number) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => {
      setIndex(idx);
      animateDot(idx);
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  };

  return (
    <SafeAreaView style={[st.safe, { backgroundColor: slide.bg }]}>

      {/* Skip button */}
      <View style={st.topRow}>
        <View style={{ flex: 1 }} />
        <Pressable onPress={onDone} style={st.skipBtn} accessibilityRole="button" accessibilityLabel="Passer l'intro">
          <Text style={[st.skipText, { color: slide.accent }]}>Passer</Text>
        </Pressable>
      </View>

      {/* Slide content — fade in/out on transition */}
      <Animated.View style={[st.slide, { opacity: fadeAnim }]}>

        {/* Illustration area */}
        <View style={[st.illustrationArea, { backgroundColor: slide.accent + '22' }]}>
          <View style={[st.iconCircle, { backgroundColor: slide.accent + '33' }]}>
            <View style={[st.iconCircleInner, { backgroundColor: slide.accent + '55' }]}>
              <Icon size={48} color={slide.accent} strokeWidth={1.2} />
            </View>
          </View>
          <View style={[st.decoTopRight,  { backgroundColor: slide.accent + '44' }]} />
          <View style={[st.decoBottomLeft,{ backgroundColor: slide.accent + '22' }]} />
        </View>

        {/* Text */}
        <View style={st.textArea}>
          <Text style={[st.tag, { color: slide.accent }]}>{slide.tag}</Text>
          <Text style={[st.title, { color: '#fff' }]}>
            {slide.title + '\n'}
            <Text style={[st.titleItalic, { color: slide.accent }]}>
              {slide.titleItalic}
            </Text>
          </Text>
          <Text style={[st.body, { color: slide.accent + 'CC' }]}>{slide.body}</Text>
        </View>

      </Animated.View>

      {/* Dots + CTA */}
      <View style={st.bottomArea}>
        {/* Pagination dots */}
        <View style={st.dotsRow}>
          {SLIDES.map((_, i) => (
            <Pressable key={i} onPress={() => goTo(i)} accessibilityRole="button">
              <Animated.View
                style={[
                  st.dot,
                  { backgroundColor: slide.accent },
                  {
                    width: dotAnims[i].interpolate({
                      inputRange: [0, 1],
                      outputRange: [8, 24],
                    }),
                    opacity: dotAnims[i].interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.35, 1],
                    }),
                  },
                ]}
              />
            </Pressable>
          ))}
        </View>

        {/* Next / Done button */}
        {isLast ? (
          <Button
            variant="primary"
            size="lg"
            label="Découvrir les plans"
            fullWidth
            onPress={onDone}
            iconRight={<Sparkles size={18} color="#fff" strokeWidth={2} />}
          />
        ) : (
          <View style={st.nextRow}>
            <Pressable
              style={[st.nextBtn, { backgroundColor: slide.accent }]}
              onPress={() => goTo(index + 1)}
              accessibilityRole="button"
              accessibilityLabel="Slide suivante"
            >
              <ChevronRight size={24} color={slide.bg} strokeWidth={2.5} />
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

/* ─── Styles ─────────────────────────────────────────────────────────────── */
const st = StyleSheet.create({
  safe:    { flex: 1 },

  topRow:  {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing[5], paddingTop: spacing[2],
  },
  skipBtn: { paddingHorizontal: spacing[3], paddingVertical: spacing[2] },
  skipText:{ fontFamily: fontFamily.hanken.medium, fontSize: fontSize.sm },

  slide: { flex: 1 },

  illustrationArea: {
    height: 300, alignItems: 'center', justifyContent: 'center',
    margin: spacing[5], borderRadius: radius.xl, position: 'relative',
  },
  iconCircle: {
    width: 160, height: 160, borderRadius: 80,
    alignItems: 'center', justifyContent: 'center',
  },
  iconCircleInner: {
    width: 120, height: 120, borderRadius: 60,
    alignItems: 'center', justifyContent: 'center',
  },
  decoTopRight: {
    position: 'absolute', top: 24, right: 24,
    width: 48, height: 48, borderRadius: 24,
  },
  decoBottomLeft: {
    position: 'absolute', bottom: 24, left: 24,
    width: 80, height: 80, borderRadius: 40,
  },

  textArea: { paddingHorizontal: spacing[6], gap: spacing[3] },
  tag:   {
    fontFamily: fontFamily.hanken.semiBold, fontSize: fontSize.xs,
    letterSpacing: 2, textTransform: 'uppercase',
  },
  title: {
    fontFamily: fontFamily.spectral.regular,
    fontSize: fontSize['2xl'],
    lineHeight: fontSize['2xl'] * lineHeight.snug,
  },
  titleItalic: { fontFamily: fontFamily.spectral.mediumItalic },
  body:  {
    fontFamily: fontFamily.hanken.regular, fontSize: fontSize.base,
    lineHeight: fontSize.base * lineHeight.relaxed,
  },

  bottomArea: {
    paddingHorizontal: spacing[5], paddingBottom: spacing[8], gap: spacing[6],
  },
  dotsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  dot:     { height: 8, borderRadius: 4 },

  nextRow: { alignItems: 'flex-end' },
  nextBtn: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
  },
});

export default OnboardingSlidesScreen;
