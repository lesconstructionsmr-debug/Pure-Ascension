/**
 * OnboardingQuizScreen — Étape 2 du tunnel.
 * 10 questions + morphotype (bonus), une par écran, format conversationnel.
 * Collecté AVANT le signup : le profil est retourné au parent qui le garde
 * en mémoire jusqu'à la création du compte.
 *
 * Unités : saisie en pi/po + lb (habitudes québécoises), converties en
 * cm/kg avant stockage — les formules (Mifflin-St Jeor) sont métriques.
 */
import React, { useRef, useState } from 'react';
import {
  Animated, KeyboardAvoidingView, Platform, Pressable,
  SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { ChevronLeft, ChevronRight, Check, Minus, Plus } from 'lucide-react-native';
import { colors, fontFamily, fontSize, lineHeight, spacing, radius, shadows } from '../theme/theme';
import { Button } from '../components/Button';
import type {
  UserProfile, MainGoal, Sex, ActivityLevel, TrainingExperience,
  Equipment, Morphotype, TrainingFrequency, DietaryRestriction,
} from '../data';

/* ─── Props ──────────────────────────────────────────────────────────────── */
interface Props {
  onBack:     () => void;
  onComplete: (profile: UserProfile) => void;
  initialName?: string;
}

const TOTAL_STEPS = 7;

/* ─── Option card (choix unique) ─────────────────────────────────────────── */
function OptionCard({ label, sublabel, selected, onPress }: {
  label: string; sublabel?: string; selected: boolean; onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[st.optionCard, selected && st.optionCardSelected]}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
    >
      <View style={{ flex: 1 }}>
        <Text style={[st.optionLabel, selected && { color: colors.sage[600] }]}>{label}</Text>
        {sublabel ? <Text style={st.optionSub}>{sublabel}</Text> : null}
      </View>
      <View style={[st.radio, selected && { borderColor: colors.sage[500] }]}>
        {selected && <View style={st.radioDot} />}
      </View>
    </Pressable>
  );
}

/* ─── Chip multi-select ──────────────────────────────────────────────────── */
function MultiChip({ label, selected, onPress }: {
  label: string; selected: boolean; onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[st.chip, selected && st.chipSelected]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
    >
      {selected && <Check size={13} color="#fff" strokeWidth={2.5} />}
      <Text style={[st.chipText, selected && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

/* ─── Stepper numérique (âge) ────────────────────────────────────────────── */
function Stepper({ value, onChange, min, max, unit }: {
  value: number; onChange: (v: number) => void; min: number; max: number; unit?: string;
}) {
  return (
    <View style={st.stepperRow}>
      <Pressable
        style={st.stepperBtn}
        onPress={() => onChange(Math.max(min, value - 1))}
        accessibilityRole="button" accessibilityLabel="Diminuer"
      >
        <Minus size={20} color={colors.ink[700]} strokeWidth={2.2} />
      </Pressable>
      <View style={st.stepperValueWrap}>
        <Text style={st.stepperValue}>{value}</Text>
        {unit ? <Text style={st.stepperUnit}>{unit}</Text> : null}
      </View>
      <Pressable
        style={st.stepperBtn}
        onPress={() => onChange(Math.min(max, value + 1))}
        accessibilityRole="button" accessibilityLabel="Augmenter"
      >
        <Plus size={20} color={colors.ink[700]} strokeWidth={2.2} />
      </Pressable>
    </View>
  );
}

/* ─── Champ numérique avec unité ─────────────────────────────────────────── */
function UnitInput({ value, onChange, unit, placeholder, flex }: {
  value: string; onChange: (v: string) => void; unit: string; placeholder: string; flex?: number;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[st.unitField, focused && st.unitFieldFocused, flex ? { flex } : null]}>
      <TextInput
        style={st.unitInput}
        value={value}
        onChangeText={t => onChange(t.replace(/[^0-9.,]/g, ''))}
        keyboardType="decimal-pad"
        placeholder={placeholder}
        placeholderTextColor={colors.ink[400]}
        maxLength={5}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      <Text style={st.unitLabel}>{unit}</Text>
    </View>
  );
}

/* ─── Component ──────────────────────────────────────────────────────────── */
export const OnboardingQuizScreen: React.FC<Props> = ({ onBack, onComplete, initialName }) => {
  const [step, setStep] = useState(initialName ? 2 : 1);
  const slideAnim = useRef(new Animated.Value(0)).current;

  // ── Réponses ──
  const [firstName, setFirstName]       = useState(initialName || '');
  const [goal, setGoal]                 = useState<{ main: MainGoal; label: string } | null>(null);
  const [sex, setSex]                   = useState<Sex | null>(null);
  const [ageStr, setAgeStr]             = useState('30');
  const [heightFt, setHeightFt]         = useState('');
  const [heightIn, setHeightIn]         = useState('');
  const [weightLb, setWeightLb]         = useState('');
  const [targetLb, setTargetLb]         = useState('');
  const [activity, setActivity]         = useState<ActivityLevel | null>(null);
  const [experience, setExperience]     = useState<TrainingExperience | null>(null);
  const [equipment, setEquipment]       = useState<Equipment[]>([]);
  const [diets, setDiets]               = useState<string[]>([]);
  const [allergies, setAllergies]       = useState('');
  const [frequency, setFrequency]       = useState<TrainingFrequency>(4);
  const [morphotype, setMorphotype]     = useState<Morphotype>('mesomorphe');
  const [bodyFat, setBodyFat]           = useState<string>('moyen');

  // ── Modale de sécurité médicale (anti-poursuite) ──
  const [securityModalVisible, setSecurityModalVisible] = useState(false);
  const [securityModalContent, setSecurityModalContent] = useState({ title: '', text: '' });

  // ── Validation par étape ──
  const canNext = (): boolean => {
    switch (step) {
      case 1: return firstName.trim().length > 0;
      case 2: return goal !== null;
      case 3: return sex !== null && parseInt(ageStr, 10) >= 16;
      case 4: return parseInt(weightLb, 10) > 0 && parseInt(targetLb, 10) > 0;
      case 5: return activity !== null && experience !== null;
      case 6: return equipment.length > 0;
      case 7: return true; // morphotype/fréquence optional/defaults
      default: return false;
    }
  };

  const animateNext = (nextStep: number) => {
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: -20, duration: 100, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start();
    setStep(nextStep);
  };

  const handleNext = () => {
    if (!canNext()) return;
    if (step < TOTAL_STEPS) {
      animateNext(step + 1);
    } else {
      finishQuiz();
    }
  };

  const handlePrev = () => {
    if (step > 1) {
      animateNext(step - 1);
    } else {
      onBack();
    }
  };

  const toggleEquipment = (eq: Equipment) => {
    setEquipment(prev =>
      prev.includes(eq) ? prev.filter(x => x !== eq) : [...prev, eq]
    );
  };

  const toggleDiet = (d: string) => {
    setDiets(prev =>
      prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]
    );
  };

  const finishQuiz = () => {
    try {
      // Conversion unités US ➔ Métrique
      const ft = parseFloat(heightFt) || 5;
      const inch = parseFloat(heightIn) || 8;
      const heightCm = Math.round((ft * 12 + inch) * 2.54);

      const wLb = parseFloat(weightLb) || 160;
      const tLb = parseFloat(targetLb) || 150;
      const weightKg = Math.round(wLb * 0.45359237);
      const targetWeightKg = Math.round(tLb * 0.45359237);

      const profile: UserProfile = {
        firstName: firstName.trim(),
        mainGoal: goal?.main || 'muscle',
        sex: sex || 'homme',
        age: parseInt(ageStr, 10) || 30,
        heightCm: heightCm || 173,
        currentWeightKg: weightKg || 73,
        targetWeightKg: targetWeightKg || 68,
        activityLevel: activity || 'modere',
        trainingExperience: experience || 'intermediaire',
        equipment: equipment.length ? equipment : ['haltères'],
        frequency: frequency,
        dietaryRestrictions: diets as DietaryRestriction[],
        allergies: allergies.trim() || undefined,
        morphotype: morphotype,
        bodyFatPercentage: bodyFat,
      };

      onComplete(profile);
    } catch (err) {
      console.error('Erreur lors de la complétion du quiz de profil fitness :', err);
    }
  };

  // ── Layout de la barre de progression ──
  const progressPct = Math.round((step / TOTAL_STEPS) * 100);

  return (
    <SafeAreaView style={st.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header : Flèche retour + Barre de progression + Étape N/7 */}
        <View style={st.header}>
          <Pressable onPress={handlePrev} style={st.backBtn} accessibilityRole="button" accessibilityLabel="Retour">
            <ChevronLeft size={22} color={colors.ink[800]} />
          </Pressable>

          <View style={st.progressTrack}>
            <View style={[st.progressBar, { width: `${progressPct}%` }]} />
          </View>

          <Text style={st.stepCounter}>{step}/{TOTAL_STEPS}</Text>
        </View>

        {/* Corps principal défilant */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={st.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{ flex: 1, transform: [{ translateX: slideAnim }] }}>
            {/* ÉTAPE 1 : Prénom */}
            {step === 1 && (
              <View style={st.stepBlock}>
                <Text style={st.eyebrow}>PROFIL FITNESS · 1/7</Text>
                <Text style={st.questionTitle}>Comment t'appelles-tu ?</Text>
                <Text style={st.questionSub}>
                  Ton coach personnalisé t'interpellera par ton prénom au quotidien.
                </Text>

                <TextInput
                  style={st.nameInput}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="Ex : Natasha"
                  placeholderTextColor={colors.ink[400]}
                  autoFocus
                  autoCapitalize="words"
                  returnKeyType="next"
                  onSubmitEditing={handleNext}
                />
              </View>
            )}

            {/* ÉTAPE 2 : Objectif principal */}
            {step === 2 && (
              <View style={st.stepBlock}>
                <Text style={st.eyebrow}>OBJECTIF · 2/7</Text>
                <Text style={st.questionTitle}>Quel est ton objectif prioritaire ?</Text>
                <Text style={st.questionSub}>
                  Sélectionne la cible principale de ton programme.
                </Text>

                <View style={{ gap: spacing[3] }}>
                  {[
                    { main: 'gras' as MainGoal, label: '🔥 Perte de gras & Définition', sub: 'Affiner la silhouette et brûler les graisses localisées.' },
                    { main: 'muscle' as MainGoal, label: '💪 Développement musculaire', sub: 'Prendre de la masse musculaire propre et galber le corps.' },
                    { main: 'tone' as MainGoal, label: '⚡ Recomposition athlétique', sub: 'Perdre du gras tout en tonifiant et en développant du muscle.' },
                    { main: 'force' as MainGoal, label: '🌿 Vitalité & Énergie au quotidien', sub: 'Retrouver la forme, la mobilité et une énergie constante.' },
                  ].map(item => (
                    <OptionCard
                      key={item.main}
                      label={item.label}
                      sublabel={item.sub}
                      selected={goal?.main === item.main}
                      onPress={() => setGoal(item)}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* ÉTAPE 3 : Sexe & Âge */}
            {step === 3 && (
              <View style={st.stepBlock}>
                <Text style={st.eyebrow}>PROFIL · 3/7</Text>
                <Text style={st.questionTitle}>Ton profil physique</Text>
                <Text style={st.questionSub}>
                  Ces données permettent de calculer ta dépense énergétique.
                </Text>

                <Text style={st.fieldLabel}>Sexe biologique</Text>
                <View style={{ flexDirection: 'row', gap: spacing[3], marginBottom: spacing[6] }}>
                  {[
                    { val: 'femme' as Sex, label: '👩 Femme' },
                    { val: 'homme' as Sex, label: '👨 Homme' },
                  ].map(item => (
                    <Pressable
                      key={item.val}
                      onPress={() => setSex(item.val)}
                      style={[
                        st.chipOption,
                        { flex: 1 },
                        sex === item.val && { borderColor: colors.sage[500], backgroundColor: colors.sage[50] }
                      ]}
                    >
                      <Text style={[st.chipOptionText, sex === item.val && { color: colors.sage[700], fontFamily: fontFamily.hanken.bold }]}>
                        {item.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={st.fieldLabel}>Âge</Text>
                <Stepper
                  value={parseInt(ageStr, 10) || 30}
                  onChange={v => setAgeStr(String(v))}
                  min={16}
                  max={90}
                  unit="ans"
                />
              </View>
            )}

            {/* ÉTAPE 4 : Taille & Poids */}
            {step === 4 && (
              <View style={st.stepBlock}>
                <Text style={st.eyebrow}>MENSURATIONS · 4/7</Text>
                <Text style={st.questionTitle}>Ta taille et tes poids</Text>
                <Text style={st.questionSub}>
                  Saisie rapide en pieds/pouces et livres (lbs).
                </Text>

                <Text style={st.fieldLabel}>Taille (pi / po)</Text>
                <View style={{ flexDirection: 'row', gap: spacing[3], marginBottom: spacing[5] }}>
                  <UnitInput value={heightFt} onChange={setHeightFt} unit="pi" placeholder="5" flex={1} />
                  <UnitInput value={heightIn} onChange={setHeightIn} unit="po" placeholder="8" flex={1} />
                </View>

                <View style={{ flexDirection: 'row', gap: spacing[3] }}>
                  <View style={{ flex: 1 }}>
                    <Text style={st.fieldLabel}>Poids actuel</Text>
                    <UnitInput value={weightLb} onChange={setWeightLb} unit="lbs" placeholder="160" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.fieldLabel}>Poids cible</Text>
                    <UnitInput value={targetLb} onChange={setTargetLb} unit="lbs" placeholder="145" />
                  </View>
                </View>
              </View>
            )}

            {/* ÉTAPE 5 : Niveau d'activité & Expérience */}
            {step === 5 && (
              <View style={st.stepBlock}>
                <Text style={st.eyebrow}>HYGIÈNE DE VIE · 5/7</Text>
                <Text style={st.questionTitle}>Activité & Expérience</Text>

                <Text style={st.fieldLabel}>Niveau d'activité quotidienne (hors entraînement)</Text>
                <View style={{ gap: spacing[2], marginBottom: spacing[5] }}>
                  {[
                    { val: 'sedentaire' as ActivityLevel, label: '🛋️ Sédentaire', sub: 'Bureau, très peu de marche.' },
                    { val: 'modere' as ActivityLevel, label: '🚶 Modéré', sub: 'Activité quotidienne moyenne, marche régulière.' },
                    { val: 'tres_actif' as ActivityLevel, label: '⚡ Très actif', sub: 'Métier physique ou beaucoup de déplacements.' },
                  ].map(item => (
                    <OptionCard
                      key={item.val}
                      label={item.label}
                      sublabel={item.sub}
                      selected={activity === item.val}
                      onPress={() => setActivity(item.val)}
                    />
                  ))}
                </View>

                <Text style={st.fieldLabel}>Expérience en entraînement</Text>
                <View style={{ gap: spacing[2] }}>
                  {[
                    { val: 'debutant' as TrainingExperience, label: '🌱 Débutant(e)', sub: 'Moins de 6 mois de pratique.' },
                    { val: 'intermediaire' as TrainingExperience, label: '🌿 Intermédiaire', sub: 'Entre 6 mois et 2 ans de régularité.' },
                    { val: 'avance' as TrainingExperience, label: '🌳 Avancé(e)', sub: 'Plus de 2 ans de pratique assidue.' },
                  ].map(item => (
                    <OptionCard
                      key={item.val}
                      label={item.label}
                      sublabel={item.sub}
                      selected={experience === item.val}
                      onPress={() => setExperience(item.val)}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* ÉTAPE 6 : Équipements disponibles */}
            {step === 6 && (
              <View style={st.stepBlock}>
                <Text style={st.eyebrow}>MATÉRIEL · 6/7</Text>
                <Text style={st.questionTitle}>De quel matériel disposes-tu ?</Text>
                <Text style={st.questionSub}>
                  Sélectionne tout ce à quoi tu as accès au quotidien.
                </Text>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2.5] }}>
                  {[
                    { id: 'poids_du_corps' as Equipment, label: '🤸 Poids du corps uniquement' },
                    { id: 'haltères' as Equipment, label: '🏋️ Haltères' },
                    { id: 'kettlebell' as Equipment, label: '🔔 Kettlebell' },
                    { id: 'elastiques' as Equipment, label: '🎗️ Élastiques de résistance' },
                    { id: 'banc' as Equipment, label: '🪑 Banc de musculation' },
                    { id: 'barre_tractions' as Equipment, label: '🪜 Barre de tractions' },
                    { id: 'salle_complete' as Equipment, label: '🏛️ Salle de sport complète' },
                  ].map(item => (
                    <MultiChip
                      key={item.id}
                      label={item.label}
                      selected={equipment.includes(item.id)}
                      onPress={() => toggleEquipment(item.id)}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* ÉTAPE 7 : Fréquence & Morphotype */}
            {step === 7 && (
              <View style={st.stepBlock}>
                <Text style={st.eyebrow}>PROGRAMME · 7/7</Text>
                <Text style={st.questionTitle}>Fréquence souhaitée</Text>
                <Text style={st.questionSub}>
                  Combien de séances par semaine peux-tu réaliser ?
                </Text>

                <View style={{ flexDirection: 'row', gap: spacing[2], marginBottom: spacing[6] }}>
                  {([2, 3, 4, 5] as TrainingFrequency[]).map(freq => (
                    <Pressable
                      key={freq}
                      onPress={() => setFrequency(freq)}
                      style={[
                        st.chipOption,
                        { flex: 1, paddingVertical: spacing[4] },
                        frequency === freq && { borderColor: colors.sage[500], backgroundColor: colors.sage[500] }
                      ]}
                    >
                      <Text style={[st.chipOptionText, frequency === freq && { color: '#fff', fontFamily: fontFamily.hanken.bold }]}>
                        {freq} x / sem
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={st.fieldLabel}>Morphotype d'apprentissage</Text>
                <View style={{ gap: spacing[2] }}>
                  {[
                    { val: 'ectomorphe' as Morphotype, label: '📐 Ectomorphe', sub: 'Structure fine, métabolisme rapide.' },
                    { val: 'mesomorphe' as Morphotype, label: '⚖️ Mésomorphe', sub: 'Structure athlétique, prise de muscle naturelle.' },
                    { val: 'endomorphe' as Morphotype, label: '🔴 Endomorphe', sub: 'Structure plus large, stockage des graisses facile.' },
                  ].map(item => (
                    <OptionCard
                      key={item.val}
                      label={item.label}
                      sublabel={item.sub}
                      selected={morphotype === item.val}
                      onPress={() => setMorphotype(item.val)}
                    />
                  ))}
                </View>
              </View>
            )}
          </Animated.View>
        </ScrollView>

        {/* Footer avec Bouton d'action principal */}
        <View style={st.footer}>
          <Button
            variant="primary"
            label={step === TOTAL_STEPS ? 'Générer mon programme' : 'Continuer'}
            disabled={!canNext()}
            onPress={handleNext}
          />
        </View>

        {/* Mention légale obligatoire (AGENTS.md) */}
        <View style={st.legalNoticeBox}>
          <Text style={st.legalNoticeText}>
            Pure Ascension est un outil de coaching fitness et nutrition. Il ne remplace pas un avis médical professionnel.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.sand[50] },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing[5], paddingTop: spacing[4], paddingBottom: spacing[3],
    gap: spacing[3],
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.ink[100], alignItems: 'center', justifyContent: 'center',
  },
  progressTrack: {
    flex: 1, height: 6, borderRadius: 3,
    backgroundColor: colors.ink[200], overflow: 'hidden',
  },
  progressBar: {
    height: '100%', backgroundColor: colors.sage[500], borderRadius: 3,
  },
  stepCounter: {
    fontFamily: fontFamily.hanken.medium, fontSize: fontSize.xs, color: colors.ink[500],
  },

  content: { paddingHorizontal: spacing[5], paddingTop: spacing[4], paddingBottom: spacing[6] },
  stepBlock: { gap: spacing[4] },

  eyebrow: {
    fontFamily: fontFamily.hanken.bold, fontSize: fontSize.xs,
    color: colors.clay[500], letterSpacing: 1.2, textTransform: 'uppercase',
  },
  questionTitle: {
    fontFamily: fontFamily.spectral.bold, fontSize: fontSize['2xl'], color: colors.ink[900],
  },
  questionSub: {
    fontFamily: fontFamily.hanken.regular, fontSize: fontSize.base, color: colors.ink[600],
    marginTop: -spacing[2], marginBottom: spacing[2], lineHeight: 22,
  },

  fieldLabel: {
    fontFamily: fontFamily.hanken.semiBold, fontSize: fontSize.sm, color: colors.ink[800],
    marginBottom: spacing[1],
  },
  nameInput: {
    backgroundColor: '#fff', borderRadius: radius.lg,
    borderWidth: 1.5, borderColor: colors.ink[300],
    paddingHorizontal: spacing[4], paddingVertical: spacing[3.5],
    fontFamily: fontFamily.hanken.bold, fontSize: fontSize.xl, color: colors.ink[900],
    ...shadows.sm,
  },

  optionCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: radius.lg,
    borderWidth: 1.5, borderColor: colors.ink[200],
    padding: spacing[4], gap: spacing[3],
    ...shadows.sm,
  },
  optionCardSelected: {
    borderColor: colors.sage[500], backgroundColor: colors.sage[50] + '40',
  },
  optionLabel: {
    fontFamily: fontFamily.hanken.semiBold, fontSize: fontSize.base, color: colors.ink[900],
  },
  optionSub: {
    fontFamily: fontFamily.hanken.regular, fontSize: fontSize.xs, color: colors.ink[500], marginTop: 2,
  },
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: colors.ink[300],
    alignItems: 'center', justifyContent: 'center',
  },
  radioDot: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: colors.sage[500],
  },

  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: spacing[4], paddingVertical: spacing[3],
    borderRadius: radius.pill, backgroundColor: '#fff',
    borderWidth: 1.5, borderColor: colors.ink[200],
  },
  chipSelected: {
    backgroundColor: colors.sage[600], borderColor: colors.sage[600],
  },
  chipText: {
    fontFamily: fontFamily.hanken.medium, fontSize: fontSize.sm, color: colors.ink[800],
  },

  stepperRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff', borderRadius: radius.xl,
    borderWidth: 1.5, borderColor: colors.ink[200],
    paddingVertical: spacing[2], paddingHorizontal: spacing[4], gap: spacing[4],
  },
  stepperBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.sand[100], alignItems: 'center', justifyContent: 'center',
  },
  stepperValueWrap: { flexDirection: 'row', alignItems: 'baseline', gap: 4, minWidth: 80, justifyContent: 'center' },
  stepperValue: { fontFamily: fontFamily.hanken.bold, fontSize: fontSize['3xl'], color: colors.ink[900] },
  stepperUnit: { fontFamily: fontFamily.hanken.medium, fontSize: fontSize.base, color: colors.ink[500] },

  unitField: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: radius.lg,
    borderWidth: 1.5, borderColor: colors.ink[200],
    paddingHorizontal: spacing[4], paddingVertical: spacing[3],
  },
  unitFieldFocused: { borderColor: colors.sage[500] },
  unitInput: {
    flex: 1, fontFamily: fontFamily.hanken.bold, fontSize: fontSize.xl, color: colors.ink[900],
  },
  unitLabel: {
    fontFamily: fontFamily.hanken.semiBold, fontSize: fontSize.sm, color: colors.ink[500],
  },

  footer: { paddingHorizontal: spacing[5], paddingVertical: spacing[3] },
  legalNoticeBox: {
    paddingHorizontal: spacing[5], paddingVertical: spacing[2],
    backgroundColor: colors.sand[100], borderTopWidth: 1, borderTopColor: colors.sand[200],
  },
  legalNoticeText: {
    fontFamily: fontFamily.hanken.regular, fontSize: 10, color: colors.ink[500], textAlign: 'center', lineHeight: 14,
  },

  chipOption: {
    paddingHorizontal: spacing[4], paddingVertical: spacing[3],
    borderRadius: radius.md, backgroundColor: '#fff',
    borderWidth: 1.5, borderColor: colors.ink[200],
    alignItems: 'center', justifyContent: 'center',
  },
  chipOptionText: {
    fontFamily: fontFamily.hanken.medium, fontSize: fontSize.base, color: colors.ink[700],
  },
});

export default OnboardingQuizScreen;
