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
import { Sparkles, ChevronRight } from 'lucide-react-native';
import { colors, fontFamily, fontSize, lineHeight, spacing, radius } from '../theme/theme';
import { Button } from '../components/Button';
import { SlidePreview, PreviewVariant } from '../components/SlidePreview';

/* ─── Slide data ─────────────────────────────────────────────────────────
 * 1 phrase max par slide — on sette les attentes en 15 secondes.
 * `preview` = mini-aperçu natif de l'écran réel (voir SlidePreview).   */
const SLIDES = [
  {
    id: '1',
    bg:    colors.sage[800],
    accent:colors.sage[300],
    preview: 'diagnostic' as PreviewVariant,
    tag:   'ÉTAPE 1',
    title: 'Réponds à',
    titleItalic: '10 questions simples.',
    body:  '2 minutes, pas plus.',
  },
  {
    id: '2',
    bg:    colors.ink[900],
    accent:colors.sage[400],
    preview: 'generation' as PreviewVariant,
    tag:   'ÉTAPE 2',
    title: 'Notre IA crée ton programme',
    titleItalic: 'sur mesure.',
    body:  'Entraînement, calories et macros calculés pour toi.',
  },
  {
    id: '3',
    bg:    colors.clay[700],
    accent:colors.clay[200],
    preview: 'dashboard' as PreviewVariant,
    tag:   'ÉTAPE 3',
    title: 'Entraînement + nutrition + bien-être,',
    titleItalic: 'tout au même endroit.',
    body:  'Ton tableau de bord personnel, chaque jour.',
  },
  {
    id: '4',
    bg:    '#2D3F35',
    accent:colors.sage[200],
    preview: null,
    tag:   'À TOI',
    title: 'Prêt·e ?',
    titleItalic: 'Ton programme t\'attend.',
    body:  '',
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

        {/* Illustration area — mini-aperçu natif de l'écran, ou icône finale */}
        <View style={[st.illustrationArea, { backgroundColor: slide.accent + '22' }]}>
          <View style={[st.decoTopRight,  { backgroundColor: slide.accent + '44' }]} />
          <View style={[st.decoBottomLeft,{ backgroundColor: slide.accent + '22' }]} />
          {slide.preview ? (
            <SlidePreview variant={slide.preview} />
          ) : (
            <View style={[st.iconCircle, { backgroundColor: slide.accent + '33' }]}>
              <View style={[st.iconCircleInner, { backgroundColor: slide.accent + '55' }]}>
                <Sparkles size={48} color={slide.accent} strokeWidth={1.2} />
              </View>
            </View>
          )}
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
            label="C'est parti"
            fullWidth
            onPress={onDone}
            iconRight={<ChevronRight size={18} color="#fff" strokeWidth={2} />}
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
    height: 220, alignItems: 'center', justifyContent: 'center',
    margin: spacing[4], borderRadius: radius.xl, position: 'relative',
  },
  iconCircle: {
    width: 120, height: 120, borderRadius: 60,
    alignItems: 'center', justifyContent: 'center',
  },
  iconCircleInner: {
    width: 90, height: 90, borderRadius: 45,
    alignItems: 'center', justifyContent: 'center',
  },
  decoTopRight: {
    position: 'absolute', top: 16, right: 16,
    width: 36, height: 36, borderRadius: 18,
  },
  decoBottomLeft: {
    position: 'absolute', bottom: 16, left: 16,
    width: 60, height: 60, borderRadius: 30,
  },

  textArea: { paddingHorizontal: spacing[6], gap: spacing[2] },
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
