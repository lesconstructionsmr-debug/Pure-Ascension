/**
 * OnboardingDiagnosticScreen — Étape 2 du tunnel.
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
}

const TOTAL_STEPS = 11;

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
export const OnboardingDiagnosticScreen: React.FC<Props> = ({ onBack, onComplete }) => {
  const [step, setStep] = useState(1);
  const slideAnim = useRef(new Animated.Value(0)).current;

  // ── Réponses ──
  const [firstName, setFirstName]       = useState('');
  const [goal, setGoal]                 = useState<{ main: MainGoal; label: string } | null>(null);
  const [sex, setSex]                   = useState<Sex | null>(null);
  const [age, setAge]                   = useState(30);
  const [heightFt, setHeightFt]         = useState('');
  const [heightIn, setHeightIn]         = useState('');
  const [weightLb, setWeightLb]         = useState('');
  const [activity, setActivity]         = useState<ActivityLevel | null>(null);
  const [experience, setExperience]     = useState<TrainingExperience | null>(null);
  const [equipment, setEquipment]       = useState<Equipment[]>([]);
  const [diets, setDiets]               = useState<string[]>([]);
  const [allergies, setAllergies]       = useState('');
  const [frequency, setFrequency]       = useState<TrainingFrequency | 0>(0);
  const [morphotype, setMorphotype]     = useState<Morphotype | null>(null);

  const name = firstName.trim();

  const animate = () => {
    slideAnim.setValue(24);
    Animated.timing(slideAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start();
  };
  const goNext = () => {
    if (step < TOTAL_STEPS) { setStep(s => s + 1); animate(); }
    else handleComplete();
  };
  const goPrev = () => {
    if (step > 1) { setStep(s => s - 1); animate(); }
    else onBack();
  };

  const toggleEquipment = (id: Equipment) =>
    setEquipment(prev => prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]);

  const toggleDiet = (id: string) =>
    setDiets(prev => {
      if (id === 'aucune') return prev.includes('aucune') ? [] : ['aucune'];
      const next = prev.filter(d => d !== 'aucune');
      return next.includes(id) ? next.filter(d => d !== id) : [...next, id];
    });

  const canContinue = (): boolean => {
    switch (step) {
      case 1:  return name.length >= 2;
      case 2:  return goal !== null;
      case 3:  return sex !== null;
      case 4:  return age >= 14 && age <= 90;
      case 5:  return Number(heightFt) >= 4 && Number(heightFt) <= 7 && Number(weightLb) >= 70 && Number(weightLb) <= 500;
      case 6:  return activity !== null;
      case 7:  return experience !== null;
      case 8:  return equipment.length > 0;
      case 9:  return true;  // restrictions optionnelles
      case 10: return frequency >= 2;
      case 11: return true;  // morphotype optionnel
      default: return true;
    }
  };

  const handleComplete = () => {
    // Conversion impérial → métrique (formules Mifflin-St Jeor en cm/kg)
    const heightCm = Math.round(Number(heightFt) * 30.48 + Number(heightIn || 0) * 2.54);
    const weightKg = Math.round(Number(weightLb.replace(',', '.')) * 0.45359 * 10) / 10;

    // Équipement → accès salle (le plus complet gagne)
    const gymAccess = equipment.includes('gym') ? 'full'
                    : equipment.includes('halteres') ? 'limited'
                    : 'home';

    const dietaryRestrictions = diets.filter(d => d !== 'aucune') as DietaryRestriction[];

    onComplete({
      firstName: name,
      sex: sex ?? 'nsp',
      age,
      heightCm,
      currentWeightKg: weightKg,
      morphotype: morphotype ?? undefined,
      experience: experience!,
      mainGoal: goal!.main,
      goalLabel: goal!.label,
      frequency: frequency as TrainingFrequency,
      gymAccess,
      equipment,
      sessionDuration: 45,
      activityLevel: activity!,
      dietaryRestrictions,
      allergies: allergies.trim() || undefined,
      healthConditions: '',
    });
  };

  /* ── Titres conversationnels ── */
  const titles: Record<number, { title: string; sub: string }> = {
    1:  { title: 'Commençons par ton prénom.', sub: 'Pour personnaliser ton programme du début à la fin.' },
    2:  { title: name ? `${name}, parlons de ton objectif.` : 'Parlons de ton objectif.', sub: 'Tout ton programme sera construit autour de ça.' },
    3:  { title: 'Ton sexe biologique ?', sub: 'Il influence directement tes besoins caloriques.' },
    4:  { title: 'Ton âge ?', sub: 'Ton métabolisme évolue avec les années — on en tient compte.' },
    5:  { title: 'Ta taille et ton poids ?', sub: 'Pour calculer tes besoins précis (formule Mifflin-St Jeor).' },
    6:  { title: 'Ton quotidien, il ressemble à quoi ?', sub: 'Ton niveau d\'activité hors entraînement.' },
    7:  { title: 'Ton expérience d\'entraînement ?', sub: 'On adapte l\'intensité et la progression à ton niveau.' },
    8:  { title: 'Ton équipement disponible ?', sub: 'Sélectionne tout ce qui s\'applique — les exercices s\'adaptent.' },
    9:  { title: 'Des restrictions alimentaires ?', sub: 'Ton plan nutrition les respectera à 100 %.' },
    10: { title: name ? `${name}, combien de jours par semaine ?` : 'Combien de jours par semaine ?', sub: 'Sois réaliste — la constance bat l\'intensité.' },
    11: { title: 'Dernier détail : ton type morphologique ?', sub: 'Optionnel — ça affine la répartition de tes macros.' },
  };

  const progress = step / TOTAL_STEPS;
  const meta = titles[step];

  return (
    <SafeAreaView style={st.safe}>
      {/* Header + progress */}
      <View style={st.header}>
        <Pressable style={st.backBtn} onPress={goPrev} accessibilityRole="button" accessibilityLabel="Retour">
          <ChevronLeft size={22} color={colors.ink[700]} strokeWidth={2} />
        </Pressable>
        <View style={st.headerCenter}>
          <Text style={st.headerTitle}>Ton diagnostic</Text>
          <Text style={st.headerSub}>Question {step} sur {TOTAL_STEPS}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>
      <View style={st.progressTrack}>
        <View style={[st.progressFill, { width: `${progress * 100}%` as any }]} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={st.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          <Animated.View style={{ transform: [{ translateY: slideAnim }] }}>
            {/* Titre conversationnel */}
            <View style={st.stepHeader}>
              <Text style={st.stepTitle}>{meta.title}</Text>
              <Text style={st.stepSub}>{meta.sub}</Text>
            </View>

            {/* ── Q1 Prénom ── */}
            {step === 1 && (
              <View style={st.body}>
                <TextInput
                  style={st.nameInput}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="Ton prénom"
                  placeholderTextColor={colors.ink[400]}
                  autoCapitalize="words"
                  autoFocus
                  maxLength={30}
                  onSubmitEditing={() => canContinue() && goNext()}
                />
              </View>
            )}

            {/* ── Q2 Objectif ── */}
            {step === 2 && (
              <View style={st.body}>
                {([
                  { main: 'gras',   label: 'Perte de gras',      sub: 'Réduire ta masse grasse durablement' },
                  { main: 'muscle', label: 'Prise de masse',     sub: 'Construire du muscle et du volume' },
                  { main: 'tone',   label: 'Remise en forme',    sub: 'Retrouver énergie, tonus et mobilité' },
                  { main: 'force',  label: 'Performance',        sub: 'Repousser tes charges et tes records' },
                  { main: 'tone',   label: 'Bien-être général',  sub: 'Bouger mieux, dormir mieux, te sentir mieux' },
                ] as { main: MainGoal; label: string; sub: string }[]).map(opt => (
                  <OptionCard
                    key={opt.label}
                    label={opt.label}
                    sublabel={opt.sub}
                    selected={goal?.label === opt.label}
                    onPress={() => setGoal({ main: opt.main, label: opt.label })}
                  />
                ))}
              </View>
            )}

            {/* ── Q3 Sexe ── */}
            {step === 3 && (
              <View style={st.body}>
                {([
                  { id: 'homme', label: 'Homme' },
                  { id: 'femme', label: 'Femme' },
                  { id: 'nsp',   label: 'Préfère ne pas dire' },
                ] as { id: Sex; label: string }[]).map(opt => (
                  <OptionCard
                    key={opt.id}
                    label={opt.label}
                    selected={sex === opt.id}
                    onPress={() => setSex(opt.id)}
                  />
                ))}
              </View>
            )}

            {/* ── Q4 Âge ── */}
            {step === 4 && (
              <View style={st.body}>
                <Stepper value={age} onChange={setAge} min={14} max={90} unit="ans" />
              </View>
            )}

            {/* ── Q5 Taille + Poids ── */}
            {step === 5 && (
              <View style={st.body}>
                <Text style={st.fieldLabel}>Ta taille</Text>
                <View style={st.rowFields}>
                  <UnitInput value={heightFt} onChange={setHeightFt} unit="pi" placeholder="5" flex={1} />
                  <UnitInput value={heightIn} onChange={setHeightIn} unit="po" placeholder="7" flex={1} />
                </View>
                <Text style={st.fieldLabel}>Ton poids</Text>
                <UnitInput value={weightLb} onChange={setWeightLb} unit="lb" placeholder="160" />
              </View>
            )}

            {/* ── Q6 Activité ── */}
            {step === 6 && (
              <View style={st.body}>
                {([
                  { id: 'sedentaire', label: 'Sédentaire',       sub: 'Travail de bureau, peu de marche' },
                  { id: 'leger',      label: 'Légèrement actif', sub: 'Marche quotidienne, debout régulièrement' },
                  { id: 'actif',      label: 'Actif',            sub: 'En mouvement une bonne partie de la journée' },
                  { id: 'tres-actif', label: 'Très actif',       sub: 'Travail physique ou sport quasi quotidien' },
                ] as { id: ActivityLevel; label: string; sub: string }[]).map(opt => (
                  <OptionCard
                    key={opt.id}
                    label={opt.label}
                    sublabel={opt.sub}
                    selected={activity === opt.id}
                    onPress={() => setActivity(opt.id)}
                  />
                ))}
              </View>
            )}

            {/* ── Q7 Expérience ── */}
            {step === 7 && (
              <View style={st.body}>
                {([
                  { id: 'débutante',     label: 'Débutant·e',    sub: 'Moins d\'un an d\'entraînement régulier' },
                  { id: 'intermédiaire', label: 'Intermédiaire', sub: '1 à 3 ans, mouvements de base maîtrisés' },
                  { id: 'avancée',       label: 'Avancé·e',      sub: '3 ans et plus, progression structurée' },
                ] as { id: TrainingExperience; label: string; sub: string }[]).map(opt => (
                  <OptionCard
                    key={opt.id}
                    label={opt.label}
                    sublabel={opt.sub}
                    selected={experience === opt.id}
                    onPress={() => setExperience(opt.id)}
                  />
                ))}
              </View>
            )}

            {/* ── Q8 Équipement (multi) ── */}
            {step === 8 && (
              <View style={st.body}>
                {([
                  { id: 'gym',         label: 'Gym complète',            sub: 'Machines, barres, câbles' },
                  { id: 'halteres',    label: 'Maison avec haltères',    sub: 'Haltères, banc, kettlebell' },
                  { id: 'poids-corps', label: 'Aucun équipement',        sub: 'Poids de corps uniquement' },
                  { id: 'bandes',      label: 'Bandes élastiques',       sub: 'Élastiques de résistance' },
                ] as { id: Equipment; label: string; sub: string }[]).map(opt => (
                  <Pressable
                    key={opt.id}
                    onPress={() => toggleEquipment(opt.id)}
                    style={[st.optionCard, equipment.includes(opt.id) && st.optionCardSelected]}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: equipment.includes(opt.id) }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[st.optionLabel, equipment.includes(opt.id) && { color: colors.sage[600] }]}>{opt.label}</Text>
                      <Text style={st.optionSub}>{opt.sub}</Text>
                    </View>
                    <View style={[st.checkbox, equipment.includes(opt.id) && st.checkboxOn]}>
                      {equipment.includes(opt.id) && <Check size={13} color="#fff" strokeWidth={2.5} />}
                    </View>
                  </Pressable>
                ))}
              </View>
            )}

            {/* ── Q9 Restrictions (multi) ── */}
            {step === 9 && (
              <View style={st.body}>
                <View style={st.chipsWrap}>
                  {[
                    { id: 'aucune',       label: 'Aucune' },
                    { id: 'végétarien',   label: 'Végétarien·ne' },
                    { id: 'végétalien',   label: 'Végan·e' },
                    { id: 'sans-gluten',  label: 'Sans gluten' },
                    { id: 'sans-lactose', label: 'Sans lactose' },
                  ].map(opt => (
                    <MultiChip
                      key={opt.id}
                      label={opt.label}
                      selected={diets.includes(opt.id)}
                      onPress={() => toggleDiet(opt.id)}
                    />
                  ))}
                </View>
                <View style={st.allergyCard}>
                  <Text style={st.fieldLabel}>Allergies ? (optionnel)</Text>
                  <TextInput
                    style={st.allergyInput}
                    value={allergies}
                    onChangeText={setAllergies}
                    placeholder="Ex : arachides, fruits de mer…"
                    placeholderTextColor={colors.ink[400]}
                    multiline
                  />
                </View>
              </View>
            )}

            {/* ── Q10 Fréquence ── */}
            {step === 10 && (
              <View style={st.body}>
                <View style={st.freqRow}>
                  {([2, 3, 4, 5, 6] as TrainingFrequency[]).map(f => (
                    <Pressable
                      key={f}
                      onPress={() => setFrequency(f)}
                      style={[st.freqChip, frequency === f && st.freqChipOn]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: frequency === f }}
                    >
                      <Text style={[st.freqNum, frequency === f && { color: '#fff' }]}>{f}</Text>
                      <Text style={[st.freqLabel, frequency === f && { color: colors.sage[100] }]}>jours</Text>
                    </Pressable>
                  ))}
                </View>
                {frequency >= 2 && (
                  <View style={st.hintCard}>
                    <Text style={st.hintText}>
                      {frequency <= 3
                        ? 'Parfait pour bâtir l\'habitude. Chaque séance comptera.'
                        : frequency <= 5
                        ? 'Bon équilibre entre stimulation et récupération.'
                        : 'Programme exigeant — la récupération sera clé. 💪'}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* ── Q11 Morphotype (bonus) ── */}
            {step === 11 && (
              <View style={st.body}>
                {([
                  { id: 'ectomorphe',  label: 'Ectomorphe',  sub: 'Mince naturellement, difficulté à prendre du poids' },
                  { id: 'mesomorphe',  label: 'Mésomorphe',  sub: 'Athlétique naturellement, prend du muscle facilement' },
                  { id: 'endomorphe',  label: 'Endomorphe',  sub: 'Prend du poids facilement, ossature plus large' },
                ] as { id: Morphotype; label: string; sub: string }[]).map(opt => (
                  <OptionCard
                    key={opt.id}
                    label={opt.label}
                    sublabel={opt.sub}
                    selected={morphotype === opt.id}
                    onPress={() => setMorphotype(opt.id)}
                  />
                ))}
                <Pressable onPress={() => { setMorphotype(null); handleComplete(); }} style={st.skipLink} accessibilityRole="button">
                  <Text style={st.skipLinkText}>Je ne sais pas — passer</Text>
                </Pressable>
              </View>
            )}
          </Animated.View>

          {/* Navigation */}
          <View style={st.navRow}>
            <Button
              variant="primary"
              size="lg"
              label={step === TOTAL_STEPS ? 'Générer mon programme' : 'Continuer'}
              fullWidth
              disabled={!canContinue()}
              onPress={goNext}
              iconRight={<ChevronRight size={18} color="#fff" strokeWidth={2} />}
            />
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

/* ─── Styles ─────────────────────────────────────────────────────────────── */
const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.sand[50] },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing[5], paddingVertical: spacing[4] },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.ink[100], alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontFamily: fontFamily.hanken.semiBold, fontSize: fontSize.base, color: colors.ink[900] },
  headerSub:   { fontFamily: fontFamily.hanken.regular,  fontSize: fontSize.xs,   color: colors.ink[500] },

  progressTrack: { height: 4, backgroundColor: colors.ink[100] },
  progressFill:  { height: 4, backgroundColor: colors.sage[500], borderRadius: 2 },

  scroll: { paddingHorizontal: spacing[5], paddingTop: spacing[6] },

  stepHeader: { gap: spacing[2], marginBottom: spacing[6] },
  stepTitle:  { fontFamily: fontFamily.spectral.medium, fontSize: fontSize['2xl'], color: colors.ink[900], lineHeight: fontSize['2xl'] * lineHeight.snug },
  stepSub:    { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.base, color: colors.ink[600], lineHeight: fontSize.base * lineHeight.relaxed },

  body: { gap: spacing[3] },

  nameInput: {
    fontFamily: fontFamily.spectral.medium, fontSize: fontSize['2xl'], color: colors.ink[900],
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.ink[200],
    borderRadius: radius.lg, paddingHorizontal: spacing[5], paddingVertical: spacing[4],
  },

  optionCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[4],
    padding: spacing[4], borderRadius: radius.lg,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.ink[200],
    ...shadows.sm,
  },
  optionCardSelected: { borderColor: colors.sage[500], borderWidth: 2, backgroundColor: colors.sage[50] },
  optionLabel: { fontFamily: fontFamily.hanken.semiBold, fontSize: fontSize.base, color: colors.ink[900] },
  optionSub:   { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.sm, color: colors.ink[600], marginTop: 2 },
  radio:    { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.ink[300], alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.sage[500] },
  checkbox:   { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.ink[300], alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: colors.sage[500], borderColor: colors.sage[500] },

  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[6], paddingVertical: spacing[4] },
  stepperBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.ink[200], alignItems: 'center', justifyContent: 'center', ...shadows.sm },
  stepperValueWrap: { alignItems: 'center', minWidth: 100 },
  stepperValue: { fontFamily: fontFamily.spectral.medium, fontSize: 56, color: colors.ink[900] },
  stepperUnit:  { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.base, color: colors.ink[500] },

  fieldLabel: { fontFamily: fontFamily.hanken.semiBold, fontSize: fontSize.sm, color: colors.ink[700] },
  rowFields:  { flexDirection: 'row', gap: spacing[3] },
  unitField: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.ink[200],
    borderRadius: radius.md, paddingHorizontal: spacing[4], height: 56,
  },
  unitFieldFocused: { borderColor: colors.sage[500] },
  unitInput: { flex: 1, fontFamily: fontFamily.spectral.medium, fontSize: fontSize.xl, color: colors.ink[900], padding: 0 },
  unitLabel: { fontFamily: fontFamily.hanken.medium, fontSize: fontSize.base, color: colors.ink[500] },

  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[1],
    paddingHorizontal: spacing[4], paddingVertical: spacing[2] + 2,
    borderRadius: radius.pill, backgroundColor: '#fff',
    borderWidth: 1.5, borderColor: colors.ink[200],
  },
  chipSelected: { backgroundColor: colors.sage[500], borderColor: colors.sage[500] },
  chipText: { fontFamily: fontFamily.hanken.medium, fontSize: fontSize.sm, color: colors.ink[700] },

  allergyCard: { gap: spacing[2], marginTop: spacing[2] },
  allergyInput: {
    fontFamily: fontFamily.hanken.regular, fontSize: fontSize.base, color: colors.ink[800],
    minHeight: 72, textAlignVertical: 'top',
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.ink[200],
    borderRadius: radius.md, padding: spacing[3],
  },

  freqRow: { flexDirection: 'row', gap: spacing[2] },
  freqChip: {
    flex: 1, alignItems: 'center', paddingVertical: spacing[4],
    borderRadius: radius.lg, backgroundColor: '#fff',
    borderWidth: 1.5, borderColor: colors.ink[200],
  },
  freqChipOn: { backgroundColor: colors.sage[500], borderColor: colors.sage[500] },
  freqNum:   { fontFamily: fontFamily.spectral.medium, fontSize: fontSize['2xl'], color: colors.ink[900] },
  freqLabel: { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.xs, color: colors.ink[500] },

  hintCard: { backgroundColor: colors.sage[50], borderRadius: radius.md, padding: spacing[3] },
  hintText: { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.sm, color: colors.sage[700], textAlign: 'center' },

  skipLink: { alignItems: 'center', paddingVertical: spacing[3] },
  skipLinkText: { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.sm, color: colors.ink[500], textDecorationLine: 'underline' },

  navRow: { marginTop: spacing[6] },
});

export default OnboardingDiagnosticScreen;
