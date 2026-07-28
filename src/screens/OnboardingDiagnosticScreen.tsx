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
export const OnboardingDiagnosticScreen: React.FC<Props> = ({ onBack, onComplete, initialName }) => {
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
  const [frequency, setFrequency]       = useState<TrainingFrequency | 0>(0);
  const [morphotype, setMorphotype]     = useState<Morphotype | null>(null);
  const [healthCondition, setHealthCondition] = useState<string>('aucune');
  const [cardioSports, setCardioSports]       = useState<('course' | 'velo' | 'trail' | 'general')[]>([]);
  const [digestiveSymptoms, setDigestiveSymptoms] = useState<string[]>([]);
  const [deepWhy, setDeepWhy]                 = useState('');

  // Dériver le sport principal (premier sélectionné, ou 'general' par défaut)
  const cardioSport = cardioSports[0] ?? 'general';

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

  // Q9 — Multi-sélection sport cardio
  const toggleCardioSport = (id: 'course' | 'velo' | 'trail' | 'general') =>
    setCardioSports(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );

  const toggleDigestiveSymptom = (id: string) =>
    setDigestiveSymptoms(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );

  const canContinue = (): boolean => {
    switch (step) {
      case 1:  return name.length >= 2;
      case 2:  return goal !== null && sex !== null && Number(ageStr) >= 14 && Number(ageStr) <= 100;
      case 3:  return Number(heightFt) >= 4 && Number(heightFt) <= 7 && Number(weightLb) >= 70 && Number(weightLb) <= 500 && experience !== null;
      case 4:  return equipment.length > 0 && frequency >= 2;
      case 5:  return activity !== null;
      case 6:  return cardioSports.length > 0;
      case 7:  return true; // Restrictions alimentaires (optionnel)
      default: return true;
    }
  };

  const handleComplete = () => {
    try {
      // Conversion impérial → métrique (formules Mifflin-St Jeor en cm/kg)
      const heightCm = Math.round(Number(heightFt || 5) * 30.48 + Number(heightIn || 0) * 2.54);
      const weightKg = Math.round(Number((weightLb || '150').replace(',', '.')) * 0.45359 * 10) / 10;
      const targetKg = targetLb
        ? Math.round(Number(targetLb.replace(',', '.')) * 0.45359 * 10) / 10
        : undefined;

      // Équipement → accès salle (le plus complet gagne)
      const gymAccess = equipment.includes('gym') ? 'full'
                      : equipment.includes('halteres') ? 'limited'
                      : 'home';

      const dietaryRestrictions = diets.filter(d => d !== 'aucune') as DietaryRestriction[];

      onComplete({
        firstName: name || 'Ami',
        sex: sex ?? 'nsp',
        age: Number(ageStr) || 30,
        heightCm,
        currentWeightKg: weightKg,
        targetWeightKg: targetKg,
        morphotype: morphotype ?? undefined,
        experience: experience ?? 'débutante',
        mainGoal: goal?.main || 'muscle',
        goalLabel: goal?.label || 'Prise de muscle',
        frequency: (frequency || 3) as TrainingFrequency,
        gymAccess,
        equipment: equipment || [],
        sessionDuration: 45,
        activityLevel: activity || 'leger',
        dietaryRestrictions,
        allergies: allergies.trim() || undefined,
        healthConditions: healthCondition || 'aucune',
        cardioSport: cardioSports[0] ?? 'general', // sport principal
        sportDiscipline: cardioSports.filter(s => s !== 'general').join(', ') || 'Général', // tous les sports sélectionnés
        digestiveSymptoms: digestiveSymptoms || [],
        deepWhy: deepWhy.trim() || 'Non renseigné',
      });
    } catch (err: any) {
      console.error('Erreur lors de la complétion du diagnostic :', err);
      alert('Une erreur est survenue lors de la création de votre profil. Veuillez réessayer.');
    }
  };

  /* ── Titres conversationnels ── */
  const titles: Record<number, { title: string; sub: string }> = {
    1:  { title: 'Commençons par ton prénom.', sub: 'Pour personnaliser ton programme du début à la fin.' },
    2:  { title: name ? `${name}, définis ton profil.` : 'Définis ton profil.', sub: 'Sélectionne ton objectif principal, ton genre et ton âge.' },
    3:  { title: 'Mesures & niveau ?', sub: 'Indique ta taille, ton poids (actuel et cible) et ton niveau d\'expérience.' },
    4:  { title: 'Matériel & fréquence ?', sub: 'Sélectionne ton équipement et le nombre de jours d\'entraînement.' },
    5:  { title: 'Ton quotidien, il ressemble à quoi ?', sub: 'Ton niveau d\'activité hors entraînement.' },
    6:  { title: 'Ta discipline cardio favorite ?', sub: 'Pour structurer tes zones cardiaques et ton cardio.' },
    7:  { title: 'Des restrictions alimentaires ?', sub: 'Ton plan nutrition les respectera à 100 %.' },
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
          <Text style={st.headerTitle}>Ton profil fitness</Text>
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

            {/* ── Q2 Objectif, Sexe & Âge regroupés ── */}
            {step === 2 && (
              <View style={[st.body, { gap: spacing[4] }]}>
                <View style={{ gap: spacing[2] }}>
                  <Text style={st.fieldLabel}>Quel est ton objectif principal ?</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing[2], paddingBottom: 4 }}>
                    {([
                      { main: 'gras',   label: 'Perte de gras' },
                      { main: 'muscle', label: 'Prise de masse' },
                      { main: 'tone',   label: 'Remise en forme' },
                      { main: 'force',  label: 'Performance' },
                      { main: 'tone',   label: 'Bien-être général' },
                    ] as { main: MainGoal; label: string }[]).map(opt => {
                      const isSelected = goal?.label === opt.label;
                      return (
                        <Pressable
                          key={opt.label}
                          onPress={() => setGoal({ main: opt.main, label: opt.label })}
                          style={[
                            st.chipOption,
                            isSelected && { backgroundColor: colors.sage[500], borderColor: colors.sage[500] }
                          ]}
                        >
                          <Text style={[st.chipOptionText, isSelected && { color: '#fff', fontFamily: fontFamily.hanken.bold }]}>
                            {opt.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>

                <View style={{ gap: spacing[2] }}>
                  <Text style={st.fieldLabel}>Ton genre biologique (pour le BMR)</Text>
                  <View style={{ flexDirection: 'row', gap: spacing[2] }}>
                    {([
                      { id: 'homme', label: 'Homme' },
                      { id: 'femme', label: 'Femme' },
                      { id: 'nsp',   label: 'Préfère ne pas dire' },
                    ] as { id: Sex; label: string }[]).map(opt => {
                      const isSelected = sex === opt.id;
                      return (
                        <Pressable
                          key={opt.id}
                          onPress={() => setSex(opt.id)}
                          style={[
                            st.chipOption,
                            { flex: 1 },
                            isSelected && { backgroundColor: colors.sage[500], borderColor: colors.sage[500] }
                          ]}
                        >
                          <Text style={[st.chipOptionText, isSelected && { color: '#fff', fontFamily: fontFamily.hanken.bold }]}>
                            {opt.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <View style={{ gap: spacing[2] }}>
                  <Text style={st.fieldLabel}>Quel est ton âge ?</Text>
                  <UnitInput value={ageStr} onChange={setAgeStr} unit="ans" placeholder="30" />
                </View>
              </View>
            )}

            {/* ── Q3 Taille + Poids + Poids Cible + Expérience ── */}
            {step === 3 && (
              <View style={[st.body, { gap: spacing[4] }]}>
                {/* Taille */}
                <View style={{ gap: spacing[2] }}>
                  <Text style={st.fieldLabel}>Ta taille (Système Impérial)</Text>
                  <View style={st.rowFields}>
                    <UnitInput value={heightFt} onChange={setHeightFt} unit="pi" placeholder="5" flex={1} />
                    <UnitInput value={heightIn} onChange={setHeightIn} unit="po" placeholder="7" flex={1} />
                  </View>
                </View>

                {/* Poids */}
                <View style={{ gap: spacing[2] }}>
                  <Text style={st.fieldLabel}>Ton poids actuel et poids cible (lb)</Text>
                  <View style={st.rowFields}>
                    <UnitInput value={weightLb} onChange={setWeightLb} unit="actuel (lb)" placeholder="150" flex={1} />
                    <UnitInput value={targetLb} onChange={setTargetLb} unit="cible (lb)" placeholder="140" flex={1} />
                  </View>
                </View>

                {/* Expérience */}
                <View style={{ gap: spacing[2] }}>
                  <Text style={st.fieldLabel}>Quel est ton niveau d'expérience ?</Text>
                  <View style={{ flexDirection: 'row', gap: spacing[2] }}>
                    {([
                      { id: 'débutante',     label: 'Débutant·e' },
                      { id: 'intermédiaire', label: 'Intermédiaire' },
                      { id: 'avancée',       label: 'Avancé·e' },
                    ] as { id: TrainingExperience; label: string }[]).map(opt => {
                      const isSelected = experience === opt.id;
                      return (
                        <Pressable
                          key={opt.id}
                          onPress={() => setExperience(opt.id)}
                          style={[
                            st.chipOption,
                            { flex: 1 },
                            isSelected && { backgroundColor: colors.sage[500], borderColor: colors.sage[500] }
                          ]}
                        >
                          <Text style={[st.chipOptionText, isSelected && { color: '#fff', fontFamily: fontFamily.hanken.bold }]}>
                            {opt.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </View>
            )}

            {/* ── Q4 Matériel & Fréquence regroupés ── */}
            {step === 4 && (
              <View style={[st.body, { gap: spacing[4] }]}>
                {/* Équipement (multi) */}
                <View style={{ gap: spacing[2] }}>
                  <Text style={st.fieldLabel}>Quel équipement as-tu à disposition ? (Multi-choix)</Text>
                  <View style={st.chipsWrap}>
                    {([
                      { id: 'gym',         label: '🏋️ Gym complète' },
                      { id: 'halteres',    label: '💪 Haltères/Banc' },
                      { id: 'poids-corps', label: '🏃 Poids du corps' },
                      { id: 'bandes',      label: '🎗️ Bandes élastiques' },
                    ] as { id: Equipment; label: string }[]).map(opt => {
                      const isSelected = equipment.includes(opt.id);
                      return (
                        <Pressable
                          key={opt.id}
                          onPress={() => toggleEquipment(opt.id)}
                          style={[
                            st.chipOption,
                            isSelected && { backgroundColor: colors.sage[500], borderColor: colors.sage[500] }
                          ]}
                        >
                          <Text style={[st.chipOptionText, isSelected && { color: '#fff', fontFamily: fontFamily.hanken.bold }]}>
                            {opt.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* Fréquence */}
                <View style={{ gap: spacing[2] }}>
                  <Text style={st.fieldLabel}>Combien de jours souhaites-tu t'entraîner ?</Text>
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
                </View>
              </View>
            )}

            {/* ── Q5 Activité ── */}
            {step === 5 && (
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

            {/* ── Q6 Cardio Sport ── */}
            {step === 6 && (
              <View style={st.body}>
                <Text style={{ fontFamily: fontFamily.hanken.regular, fontSize: fontSize.sm, color: colors.ink[500], marginBottom: spacing[1] }}>
                  Plusieurs choix possibles ✓
                </Text>
                {([
                  { id: 'course',  label: '🏃 Course à pied', sub: 'Optimiser mes temps de course, endurance et VO2 max' },
                  { id: 'velo',    label: '🚴 Vélo de route / Cyclisme', sub: 'Puissance sur le vélo, endurance et cardio ciblé (FC -5 bpm)' },
                  { id: 'trail',   label: '🏔️ Trail / Course en nature', sub: 'Résistance musculaire en montée et endurance extrême' },
                  { id: 'general', label: '💪 Général / Musculation', sub: 'Cardio général et entretien physique standard' },
                ] as { id: 'course' | 'velo' | 'trail' | 'general'; label: string; sub: string }[]).map(opt => (
                  <Pressable
                    key={opt.id}
                    onPress={() => toggleCardioSport(opt.id)}
                    style={[st.optionCard, cardioSports.includes(opt.id) && st.optionCardSelected]}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: cardioSports.includes(opt.id) }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[st.optionLabel, cardioSports.includes(opt.id) && { color: colors.sage[600] }]}>{opt.label}</Text>
                      <Text style={st.optionSub}>{opt.sub}</Text>
                    </View>
                    <View style={[st.radio, cardioSports.includes(opt.id) && { borderColor: colors.sage[500], backgroundColor: colors.sage[500] }]}>
                      {cardioSports.includes(opt.id) && <Check size={12} color="#fff" strokeWidth={3} />}
                    </View>
                  </Pressable>
                ))}
              </View>
            )}

            {/* ── Q7 Restrictions (multi) ── */}
            {step === 7 && (
              <View style={st.body}>
                <View style={st.chipsWrap}>
                  {[
                    { id: 'aucune',       label: 'Aucune' },
                    { id: 'végétarien',   label: 'Végétarien·ne' },
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
                {diets.length > 0 && !diets.includes('aucune') && (
                  <View style={st.allergyCard}>
                    <Text style={st.fieldLabel}>Allergies spécifiques ? (Optionnel)</Text>
                    <TextInput
                      style={st.allergyInput}
                      value={allergies}
                      onChangeText={setAllergies}
                      placeholder="Ex : arachides, fruits de mer…"
                      placeholderTextColor={colors.ink[400]}
                      multiline
                    />
                  </View>
                )}
                
                <View style={[st.allergyCard, { marginTop: spacing[6] }]}>
                  <Text style={st.fieldLabel}>Quelle est la raison profonde qui te pousse à te transformer aujourd'hui ?</Text>
                  <TextInput
                    style={st.allergyInput}
                    value={deepWhy}
                    onChangeText={setDeepWhy}
                    placeholder="Écris ici ton pourquoi profond (ex: retrouver l'énergie pour jouer avec mes enfants, me réconcilier avec mon reflet dans le miroir...)"
                    placeholderTextColor={colors.ink[400]}
                    multiline
                  />
                  <View style={st.hintCard}>
                    <Text style={st.hintText}>
                      💡 La méthode des "5 Pourquoi" montre que notre vraie motivation est toujours émotionnelle et personnelle, pas seulement esthétique. Pose-toi la question plusieurs fois !
                    </Text>
                  </View>
                </View>
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
            <Text style={{ fontFamily: fontFamily.hanken.regular, fontSize: 11, color: colors.ink[500], textAlign: 'center', marginTop: 12, lineHeight: 15 }}>
              Pure Ascension est un outil de coaching fitness et nutrition. Il ne remplace pas un avis médical professionnel.
            </Text>
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
  fieldOptional: { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.xs, color: colors.ink[400] },
  targetHint:     { backgroundColor: colors.sage[50], borderRadius: radius.md, padding: spacing[3] },
  targetHintText: { fontFamily: fontFamily.hanken.medium, fontSize: fontSize.sm, color: colors.sage[700], textAlign: 'center' },
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

  securityAlert: { backgroundColor: '#fdf2e9', borderRadius: radius.md, padding: spacing[4], borderWidth: 1, borderColor: '#f5c299', marginTop: spacing[3] },
  securityAlertText: { fontFamily: fontFamily.hanken.medium, fontSize: fontSize.sm, color: '#c4661f', lineHeight: 20, textAlign: 'center' },

  chipOption: {
    paddingHorizontal: spacing[4], paddingVertical: spacing[3],
    borderRadius: radius.md, backgroundColor: '#fff',
    borderWidth: 1.5, borderColor: colors.ink[200],
    alignItems: 'center', justifyContent: 'center',
  },
  chipOptionText: {
    fontFamily: fontFamily.hanken.medium,
    fontSize: fontSize.base, color: colors.ink[700],
  },
});

export default OnboardingDiagnosticScreen;
