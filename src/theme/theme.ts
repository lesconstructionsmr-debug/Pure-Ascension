// ─────────────────────────────────────────────────────────────
//  Pure Ascension — Design Tokens (source of truth)
// ─────────────────────────────────────────────────────────────

export const colors = {
  sage: {
    50:  '#F1F5EF',
    100: '#E0E9DC',
    200: '#C5D6BE',
    300: '#A3BE9A',
    400: '#7FA075',
    500: '#5E8455',
    600: '#4A6B43',
    700: '#3A5435',
    800: '#2D4029',
    900: '#22301F',
  },
  clay: {
    50:  '#FCF2ED',
    100: '#F4DECF',
    200: '#E7BEA6',
    300: '#D99E7C',
    400: '#C88260',
    500: '#B96A45',
    600: '#9C5436',
    700: '#7C422C',
  },
  sand: {
    50:  '#FBF8F3',
    100: '#F4EEE3',
    200: '#EAE0CF',
    300: '#DCCDB4',
    400: '#C8B9A0',
  },
  ink: {
    900: '#1E2A22',
    800: '#2A3B2D',
    700: '#3A4C3C',
    600: '#566459',
    500: '#6E7A70',
    400: '#929D94',
    300: '#BABFBB',
    200: '#D6DAD5',
    100: '#EAECEA',
  },
  info: {
    50:  '#EEF7FB',
    100: '#D5EDF5',
    500: '#4E7384',
    600: '#3E5C6B',
  },
  status: {
    success:      '#4A6B43',
    successSoft:  '#E0E9DC',
    warning:      '#C2872E',
    warningSoft:  '#F8EDDA',
    danger:       '#B4452F',
    dangerSoft:   '#F8E0DB',
    info:         '#4E7384',
    infoSoft:     '#DDF0F5',
  },
  white:       '#FFFFFF',
  transparent: 'transparent',
} as const;

import { Platform } from 'react-native';

export const fontFamily = {
  spectral: {
    // iOS: Georgia (système). Éviter 'System' (n'existe pas → texte invisible).
    regular:       Platform.OS === 'ios' ? 'Georgia' : 'Spectral_400Regular',
    medium:        Platform.OS === 'ios' ? 'Georgia-Bold' : 'Spectral_500Medium',
    bold:          Platform.OS === 'ios' ? 'Georgia-Bold' : 'Spectral_500Medium',
    regularItalic: Platform.OS === 'ios' ? 'Georgia-Italic' : 'Spectral_400Regular_Italic',
    mediumItalic:  Platform.OS === 'ios' ? 'Georgia-BoldItalic' : 'Spectral_500Medium_Italic',
  },
  hanken: {
    // iOS: omettre une famille inventée — laisser le défaut SF via undefined casté en string vide côté style si besoin
    regular: Platform.OS === 'ios' ? 'Helvetica Neue' : 'HankenGrotesk_400Regular',
    medium:  Platform.OS === 'ios' ? 'Helvetica Neue' : 'HankenGrotesk_500Medium',
    semiBold:Platform.OS === 'ios' ? 'Helvetica Neue' : 'HankenGrotesk_600SemiBold',
    bold:    Platform.OS === 'ios' ? 'Helvetica Neue' : 'HankenGrotesk_700Bold',
  },
} as const;

export const fontSize = {
  xs:    10,
  sm:    12,
  base:  14,
  md:    16,
  lg:    18,
  xl:    22,
  '2xl': 26,
  '3xl': 32,
  '4xl': 40,
} as const;

export const lineHeight = {
  tight:   1.20,
  snug:    1.35,
  normal:  1.50,
  relaxed: 1.65,
} as const;

export const letterSpacing = {
  eyebrow: 2.16,
  tight:   -0.3,
  normal:  0,
  wide:    0.5,
} as const;

export const spacing = {
  0:    0,
  0.5:  2,
  1:    4,
  1.5:  6,
  2:    8,
  2.5:  10,
  3:    12,
  4:    16,
  5:    20,
  6:    24,
  7:    28,
  8:    32,
  10:   40,
  12:   48,
  14:   56,
  16:   64,
} as const;

export const radius = {
  sm:    4,
  md:    8,
  input: 12,
  lg:    16,
  xl:    20,
  card:  28,
  pill:  999,
  full:  999,
} as const;

export const shadows = {
  none: { shadowColor: 'transparent', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
  sm:   { shadowColor: '#1E2A22', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4,  elevation: 2 },
  md:   { shadowColor: '#1E2A22', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 4 },
  lg:   { shadowColor: '#1E2A22', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.10, shadowRadius: 20, elevation: 8 },
} as const;

export const duration = {
  fast:   140,
  normal: 240,
  slow:   360,
  lazy:   420,
} as const;

export const zIndex = {
  base: 0, card: 10, overlay: 100, modal: 200, toast: 300,
} as const;

export const semantic = {
  bg:        colors.sand[50],
  bgCard:    colors.white,
  text:      colors.ink[900],
  textMuted: colors.ink[600],
  textLight: colors.ink[500],
  border:    colors.ink[200],
  primary:   colors.sage[500],
  accent:    colors.clay[500],
} as const;

const theme = { colors, fontFamily, fontSize, lineHeight, letterSpacing, spacing, radius, shadows, duration, zIndex, semantic } as const;
export default theme;
