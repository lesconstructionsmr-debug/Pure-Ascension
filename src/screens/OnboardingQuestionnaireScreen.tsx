/**
 * OnboardingQuestionnaireScreen
 * Questionnaire 9 questions → génère un profil UserProfile complet.
 * Utilisé à l'onboarding ET accessible depuis Profil (mode édition).
 */
import React, { useState, useRef } from 'react';
import {
  Animated, KeyboardAvoidingView, Platform, Pressable,
  SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import {
  ChevronLeft, ChevronRight, Check, Ruler, Scale,
  Percent, Trophy, Target, Calendar, Dumbbell,
  Leaf, Heart, Clock, AlertCircle,
} from 'lucide-react-native';
import {
  colors, fontFamily, fontSize, lineHeight, spacing, radius, shadows,
} from '../theme/theme';
import { Button } from '../components/Button';
import {
  UserProfile, TrainingExperience, MainGoal,
  TrainingFrequency, GymAccess, SessionDuration, DietaryRestriction,
} from '../data';

/* ─── Props ──────────────────────────────────────────────────────────────── */
interface Props {
  onBack:     () => void;
  onComplete: (profile: UserProfile) => void;
  /** Pré-remplir en mode édition */
  initialProfile?: Partial<UserProfile>;
  editMode?: boolean;
}

/* ─── Step config ────────────────────────────────────────────────────────── */
const TOTAL_STEPS = 9;

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
function OptionCard({
  label, sublabel, selected, color, onPress, icon,
}: {
  label: string; sublabel?: string; selected: boolean;
  color?: string; onPress: () => void; icon?: React.ReactNode;
}) {
  const c = color ?? colors.sage[500];
  return (
    <Pressable
      onPress={onPress}
      style={[
        st.optionCard,
        selected && { borderColor: c, borderWidth: 2, backgroundColor: c + '12' },
      ]}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
    >
      {icon && <View style={[st.optionIcon, { backgroundColor: c + '20' }]}>{icon}</View>}
      <View style={{ flex: 1 }}>
        <Text style={[st.optionLabel, selected && { color: c }]}>{label}</Text>
        {sublabel && <Text style={st.optionSub}>{sublabel}</Text>}
      </View>
      <View style={[st.radio, selected && { borderColor: c }]}>
        {selected && <View style={[st.radioDot, { backgroundColor: c }]} />}
      </View>
    </Pressable>
  );
}

function NumericInput({
  label, value, onChange, unit, min, max, hint,
}: {
  label: string; value: string; onChange: (v: string) => void;
  unit: string; min?: number; max?: number; hint?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={st.numericWrap}>
      <Text style={st.numericLabel}>{label}</Text>
      <View style={[st.numericField, focused && st.numericFieldFocused]}>
        <TextInput
          style={st.numericInput}
          value={value}
          onChangeText={onChange}
          keyboardType="decimal-pad"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="—"
          placeholderTextColor={colors.ink[400]}
          maxLength={6}
        />
        <Text style={st.numericUnit}>{unit}</Text>
      </View>
      {hint && <Text style={st.numericHint}>{hint}</Text>}
    </View>
  );
}

function ChipSelect({
  options, selected, onToggle, color,
}: {
  options: { id: string; label: string }[];
  selected: string[];
  onToggle: (id: string) => void;
  color?: string;
}) {
  const c = color ?? colors.sage[500];
  return (
    <View style={st.chipsWrap}>
      {options.map(opt => {
        const sel = selected.includes(opt.id);
        return (
          <Pressable
            key={opt.id}
            onPress={() => onToggle(opt.id)}
            style={[st.chip, sel && { backgroundColor: c, borderColor: c }]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: sel }}
          >
            {sel && <Check size={12} color="#fff" strokeWidth={2.5} />}
            <Text style={[st.chipText, sel && { color: '#fff' }]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────── */
export const OnboardingQuestionnaireScreen: React.FC<Props> = ({
  onBack, onComplete, initialProfile = {}, editMode = false,
}) => {
  const [step, setStep]     = useState(1);
  const slideAnim           = useRef(new Animated.Value(0)).current;

  // ── Form state ──
  const [heightCm,        setHeightCm]        = useState(String(initialProfile.heightCm        ?? ''));
  const [currentWeight,   setCurrentWeight]   = useState(String(initialProfile.currentWeightKg ?? ''));
  const [targetWeight,    setTargetWeight]     = useState(String(initialProfile.targetWeightKg  ?? ''));
  const [currentBF,       setCurrentBF]       = useState(String(initialProfile.currentBFPct    ?? ''));
  const [targetBF,        setTargetBF]        = useState(String(initialProfile.targetBFPct     ?? ''));
  const [experience,      setExperience]      = useState<TrainingExperience | ''>(initialProfile.experience ?? '');
  const [mainGoal,        setMainGoal]        = useState<MainGoal | ''>(initialProfile.mainGoal ?? '');
  const [frequency,       setFrequency]       = useState<TrainingFrequency | 0>(initialProfile.frequency ?? 0);
  const [gymAccess,       setGymAccess]       = useState<GymAccess | ''>(initialProfile.gymAccess ?? '');
  const [sessionDuration, setSessionDuration] = useState<SessionDuration | 0>(initialProfile.sessionDuration ?? 0);
  const [dietaryRestrictions, setDietaryRestrictions] = useState<DietaryRestriction[]>(initialProfile.dietaryRestrictions ?? []);
  const [healthConditions,    setHealthConditions]    = useState(initialProfile.healthConditions ?? '');
  const [otherNotes,          setOtherNotes]          = useState(initialProfile.otherNotes ?? '');
  // sportDiscipline vient de l'écran objectif (lecture seule dans le questionnaire)
  const sportDiscipline = initialProfile.sportDiscipline ?? '';

  const toggleDiet = (id: string) => {
    setDietaryRestrictions(prev =>
      prev.includes(id as DietaryRestriction)
        ? prev.filter(r => r !== id)
        : [...prev, id as DietaryRestriction]
    );
  };

  const animateStep = (dir: 1 | -1) => {
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: -dir * 30, duration: 120, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: dir * 30,  duration: 0,   useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0,          duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const goNext = () => {
    if (step < TOTAL_STEPS) { animateStep(1); setStep(s => s + 1); }
    else handleComplete();
  };
  const goPrev = () => {
    if (step > 1) { animateStep(-1); setStep(s => s - 1); }
    else onBack();
  };

  const canContinue = () => {
    switch (step) {
      case 1: return !!heightCm && Number(heightCm) > 40 && Number(heightCm) < 110;
      case 2: return !!currentWeight && !!targetWeight;
      case 3: return !!currentBF && !!targetBF;
      case 4: return !!experience;
      case 5: return !!mainGoal;
      case 6: return frequency > 0;
      case 7: return !!gymAccess;
      case 8: return true; // restrictions optionnelles
      case 9: return true; // santé optionnelle
      default: return true;
    }
  };

  const handleComplete = () => {
    const profile: UserProfile = {
      heightCm:            Number(heightCm),
      currentWeightKg:     Number(currentWeight),
      targetWeightKg:      Number(targetWeight),
      currentBFPct:        Number(currentBF),
      targetBFPct:         Number(targetBF),
      experience:          experience as TrainingExperience,
      mainGoal:            mainGoal as MainGoal,
      frequency:           frequency as TrainingFrequency,
      gymAccess:           gymAccess as GymAccess,
      sessionDuration:     sessionDuration as SessionDuration,
      dietaryRestrictions,
      healthConditions,
      otherNotes,
      ...(sportDiscipline ? { sportDiscipline } : {}),
    };
    onComplete(profile);
  };

  const progress = step / TOTAL_STEPS;

  // ── Step labels ──
  const stepMeta: Record<number, { icon: React.ReactNode; title: string; subtitle: string }> = {
    1: { icon: <Ruler size={20} color={colors.sage[500]} strokeWidth={1.8}/>,   title: 'Ta taille',           subtitle: 'Utilisée pour calculer ton IMC et tes besoins caloriques.' },
    2: { icon: <Scale size={20} color={colors.sage[500]} strokeWidth={1.8}/>,   title: 'Poids actuel & cible', subtitle: 'Pour établir la progression réaliste de ton programme.' },
    3: { icon: <Percent size={20} color={colors.clay[500]} strokeWidth={1.8}/>, title: 'Masse grasse',         subtitle: 'Optionnel — si tu connais tes chiffres, ils affinent le plan.' },
    4: { icon: <Trophy size={20} color={colors.status.warning} strokeWidth={1.8}/>, title: 'Expérience',         subtitle: 'Ton niveau détermine l\'intensité et la progressivité du programme.' },
    5: { icon: <Target size={20} color={colors.clay[500]} strokeWidth={1.8}/>,  title: 'Objectif principal',  subtitle: 'Tout le programme sera centré autour de cet objectif.' },
    6: { icon: <Calendar size={20} color={colors.sage[500]} strokeWidth={1.8}/>, title: 'Fréquence',          subtitle: 'Combien de fois par semaine peux-tu t\'entraîner ?' },
    7: { icon: <Dumbbell size={20} color={colors.ink[600]} strokeWidth={1.8}/>, title: 'Accès équipement',    subtitle: 'Les exercices seront adaptés à ce que tu as à disposition.' },
    8: { icon: <Leaf size={20} color={colors.status.success} strokeWidth={1.8}/>, title: 'Alimentation',        subtitle: 'Tes préférences et restrictions pour construire ton plan nutritionnel.' },
    9: { icon: <Heart size={20} color={colors.status.danger} strokeWidth={1.8}/>, title: 'Santé & bien-être',   subtitle: 'Toute condition à prendre en compte pour personnaliser ton programme.' },
  };

  const meta = stepMeta[step];

  return (
    <SafeAreaView style={st.safe}>
      {/* Header */}
      <View style={st.header}>
        <Pressable style={st.backBtn} onPress={goPrev} accessibilityRole="button">
          <ChevronLeft size={22} color={colors.ink[700]} strokeWidth={2} />
        </Pressable>
        <View style={st.headerCenter}>
          <Text style={st.headerTitle}>{editMode ? 'Mon profil' : 'Ton programme'}</Text>
          <Text style={st.headerSub}>Étape {step} sur {TOTAL_STEPS}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Progress bar */}
      <View style={st.progressTrack}>
        <Animated.View style={[st.progressFill, { width: `${progress * 100}%` as any }]} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={st.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Step header */}
          <Animated.View style={[st.stepHeader, { transform: [{ translateX: slideAnim }] }]}>
            <View style={st.stepIconBadge}>{meta.icon}</View>
            <Text style={st.stepTitle}>{meta.title}</Text>
            <Text style={st.stepSub}>{meta.subtitle}</Text>
          </Animated.View>

          {/* ── Step content ── */}
          <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>

            {/* Step 1 — Hauteur */}
            {step === 1 && (
              <View style={st.stepBody}>
                <NumericInput
                  label="Hauteur"
                  value={heightCm}
                  onChange={setHeightCm}
                  unit="in"
                  min={55}
                  max={85}
                  hint={"Ex : 65 in (5'5\")"}
                />
                <View style={st.refCard}>
                  <Text style={st.refTitle}>Pourquoi c'est important ?</Text>
                  <Text style={st.refText}>
                    Ta taille combinée à ton poids permet de calculer ton IMC, tes apports caloriques de maintien (TDEE) et d'ajuster les charges d'entraînement.
                  </Text>
                </View>
              </View>
            )}

            {/* Step 2 — Poids */}
            {step === 2 && (
              <View style={st.stepBody}>
                <NumericInput label="Poids actuel" value={currentWeight} onChange={setCurrentWeight} unit="lbs" hint="Ex : 150 lbs" />
                <NumericInput label="Poids cible"  value={targetWeight}  onChange={setTargetWeight}  unit="lbs" hint="Ex : 135 lbs" />
                {currentWeight && targetWeight && (
                  <View style={[st.infoChip, { backgroundColor: Number(targetWeight) < Number(currentWeight) ? colors.sage[50] : colors.info[50] }]}>
                    <Text style={[st.infoChipText, { color: Number(targetWeight) < Number(currentWeight) ? colors.sage[600] : colors.info[600] }]}>
                      {Number(targetWeight) < Number(currentWeight)
                        ? `Perte de ${(Number(currentWeight) - Number(targetWeight)).toFixed(1)} lbs visée`
                        : Number(targetWeight) > Number(currentWeight)
                        ? `Prise de ${(Number(targetWeight) - Number(currentWeight)).toFixed(1)} lbs visée`
                        : 'Maintien du poids'}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Step 3 — BF% */}
            {step === 3 && (
              <View style={st.stepBody}>
                <NumericInput label="BF% actuel" value={currentBF} onChange={setCurrentBF} unit="%" hint="Ex : 28 %" />
                <NumericInput label="BF% cible"  value={targetBF}  onChange={setTargetBF}  unit="%" hint="Ex : 22 %" />
                <View style={st.refCard}>
                  <Text style={st.refTitle}>🤔 Tu ne connais pas ton BF% ?</Text>
                  <Text style={st.refText}>
                    Pas de panique — laisse les champs vides ou mets une estimation. On peut utiliser des mesures de tour de taille/hanches pour t'aider à l'estimer.
                  </Text>
                </View>
                {/* BF% reference tables */}
                <View style={{ gap: spacing[3] }}>
                  <View style={st.tableCard}>
                    <Text style={st.tableTitle}>♀ Référence féminine</Text>
                    {[
                      { label:'Athlète',  range:'14–20 %', color: colors.sage[500] },
                      { label:'Fit',      range:'21–24 %', color: colors.info[500] },
                      { label:'Moyen',    range:'25–31 %', color: colors.status.warning },
                      { label:'Surpoids', range:'32 %+',   color: colors.clay[500] },
                    ].map(row => (
                      <View key={row.label} style={st.tableRow}>
                        <View style={[st.tableDot, { backgroundColor: row.color }]} />
                        <Text style={st.tableLabel}>{row.label}</Text>
                        <Text style={st.tableRange}>{row.range}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={st.tableCard}>
                    <Text style={st.tableTitle}>♂ Référence masculine</Text>
                    {[
                      { label:'Athlète',  range:'6–13 %',  color: colors.sage[500] },
                      { label:'Fit',      range:'14–17 %', color: colors.info[500] },
                      { label:'Moyen',    range:'18–25 %', color: colors.status.warning },
                      { label:'Surpoids', range:'26 %+',   color: colors.clay[500] },
                    ].map(row => (
                      <View key={row.label} style={st.tableRow}>
                        <View style={[st.tableDot, { backgroundColor: row.color }]} />
                        <Text style={st.tableLabel}>{row.label}</Text>
                        <Text style={st.tableRange}>{row.range}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {/* Step 4 — Expérience */}
            {step === 4 && (
              <View style={st.stepBody}>
                {([
                  { id:'débutante',      label:'Débutant(e)',    sub:'Moins de 1 an d\'entraînement régulier',              color: colors.status.success },
                  { id:'intermédiaire',  label:'Intermédiaire',  sub:'1–3 ans, maîtrise les mouvements de base',            color: colors.info[500] },
                  { id:'avancée',        label:'Avancé(e)',      sub:'3+ ans, progression méthodique et connaissance de soi', color: colors.clay[500] },
                ] as const).map(opt => (
                  <OptionCard
                    key={opt.id}
                    label={opt.label}
                    sublabel={opt.sub}
                    selected={experience === opt.id}
                    color={opt.color}
                    onPress={() => setExperience(opt.id)}
                  />
                ))}
              </View>
            )}

            {/* Step 5 — Objectif */}
            {step === 5 && (
              <View style={st.stepBody}>
                {([
                  { id:'muscle', label:'Gain musculaire',  sub:'Augmenter la masse et le volume musculaire',       color: colors.clay[500], icon: <Dumbbell size={18} color={colors.clay[500]} strokeWidth={1.8}/> },
                  { id:'gras',   label:'Perte de gras',    sub:'Réduire le taux de masse grasse durablement',      color: colors.sage[500], icon: <Target size={18} color={colors.sage[500]} strokeWidth={1.8}/> },
                  { id:'tone',   label:'Tonification',     sub:'Raffermir et définir sans prise de volume',        color: colors.info[500], icon: <Percent size={18} color={colors.info[500]} strokeWidth={1.8}/> },
                  { id:'force',  label:'Force',             sub:'Améliorer les performances et les charges soulevées', color: colors.status.warning, icon: <Trophy size={18} color={colors.status.warning} strokeWidth={1.8}/> },
                ] as const).map(opt => (
                  <OptionCard
                    key={opt.id}
                    label={opt.label}
                    sublabel={opt.sub}
                    selected={mainGoal === opt.id}
                    color={opt.color}
                    icon={opt.icon}
                    onPress={() => setMainGoal(opt.id)}
                  />
                ))}
              </View>
            )}

            {/* Step 6 — Fréquence */}
            {step === 6 && (
              <View style={st.stepBody}>
                {([
                  { val:3, label:'3× par semaine', sub:'Idéal pour débuter ou maintenir, 1 jour de repos entre chaque séance' },
                  { val:4, label:'4× par semaine', sub:'Bon équilibre intensité/récupération, permet une spécialisation' },
                  { val:5, label:'5× par semaine', sub:'Programme intensif, recommandé en intermédiaire/avancé(e)' },
                ] as const).map(opt => (
                  <OptionCard
                    key={opt.val}
                    label={opt.label}
                    sublabel={opt.sub}
                    selected={frequency === opt.val}
                    color={colors.sage[500]}
                    onPress={() => setFrequency(opt.val)}
                  />
                ))}
              </View>
            )}

            {/* Step 7 — Équipement */}
            {step === 7 && (
              <View style={st.stepBody}>
                {([
                  { id:'full',    label:'Salle complète',       sub:'Accès à tous les équipements : barres, machines, câbles…',  color: colors.ink[700] },
                  { id:'limited', label:'Équipement limité',    sub:'Haltères, barre olympique, rack — sans machines guidées',   color: colors.clay[500] },
                  { id:'home',    label:'À la maison',          sub:'Poids de corps, bandes élastiques, haltères légers',        color: colors.sage[500] },
                ] as const).map(opt => (
                  <OptionCard
                    key={opt.id}
                    label={opt.label}
                    sublabel={opt.sub}
                    selected={gymAccess === opt.id}
                    color={opt.color}
                    onPress={() => setGymAccess(opt.id)}
                  />
                ))}

                {/* Duration sub-question */}
                <View style={st.subSection}>
                  <Text style={st.subSectionTitle}>Durée par séance</Text>
                  <View style={st.durationRow}>
                    {([30, 45, 60] as const).map(dur => (
                      <Pressable
                        key={dur}
                        style={[st.durationChip, sessionDuration === dur && st.durationChipActive]}
                        onPress={() => setSessionDuration(dur)}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: sessionDuration === dur }}
                      >
                        <Clock size={14} color={sessionDuration === dur ? '#fff' : colors.ink[600]} strokeWidth={2} />
                        <Text style={[st.durationText, sessionDuration === dur && st.durationTextActive]}>
                          {dur} min
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {/* Step 8 — Restrictions alimentaires */}
            {step === 8 && (
              <View style={st.stepBody}>
                <Text style={st.chipSectionLabel}>Sélectionne tout ce qui s'applique à toi</Text>
                <ChipSelect
                  options={[
                    { id:'sans-gluten',  label:'Sans gluten'  },
                    { id:'sans-lactose', label:'Sans lactose' },
                    { id:'végétarien',   label:'Végétarien·ne'},
                    { id:'végétalien',   label:'Végétalien·ne'},
                    { id:'sans-noix',    label:'Sans noix'    },
                    { id:'halal',        label:'Halal'        },
                    { id:'casher',       label:'Casher'       },
                    { id:'sans-porc',    label:'Sans porc'    },
                  ]}
                  selected={dietaryRestrictions}
                  onToggle={toggleDiet}
                  color={colors.status.success}
                />
                <View style={st.refCard}>
                  <Text style={st.refTitle}>Aliments que tu n'aimes pas ?</Text>
                  <TextInput
                    style={st.textArea}
                    value={otherNotes}
                    onChangeText={setOtherNotes}
                    placeholder="Ex : je n'aime pas le brocoli, le foie, les œufs durs…"
                    placeholderTextColor={colors.ink[400]}
                    multiline
                    numberOfLines={3}
                  />
                </View>
                {dietaryRestrictions.length === 0 && !otherNotes && (
                  <View style={st.skipHint}>
                    <Text style={st.skipHintText}>Aucune restriction ? Parfait, tu peux passer à la suite ✓</Text>
                  </View>
                )}
              </View>
            )}

            {/* Step 9 — Santé */}
            {step === 9 && (
              <View style={st.stepBody}>
                <Text style={st.chipSectionLabel}>Conditions de santé à prendre en compte</Text>
                <ChipSelect
                  options={[
                    { id:'HTA',            label:'Hypertension (HTA)'     },
                    { id:'diabète',        label:'Diabète'                },
                    { id:'dos',            label:'Problème de dos'        },
                    { id:'genou',          label:'Problème de genou'      },
                    { id:'épaule',         label:'Problème d\'épaule'     },
                    { id:'grossesse',      label:'Post-partum / grossesse'},
                    { id:'thyroïde',       label:'Thyroïde'               },
                    { id:'pcos',           label:'SOPK / PCOS'            },
                  ]}
                  selected={healthConditions ? healthConditions.split(',') : []}
                  onToggle={(id) => {
                    const current = healthConditions ? healthConditions.split(',').filter(Boolean) : [];
                    const next = current.includes(id)
                      ? current.filter(c => c !== id)
                      : [...current, id];
                    setHealthConditions(next.join(','));
                  }}
                  color={colors.status.danger}
                />
                <View style={st.refCard}>
                  <TextInput
                    style={st.textArea}
                    value={otherNotes}
                    onChangeText={setOtherNotes}
                    placeholder="Autre condition ou précision… (optionnel)"
                    placeholderTextColor={colors.ink[400]}
                    multiline
                    numberOfLines={3}
                  />
                </View>
                <View style={[st.refCard, { backgroundColor: colors.status.warningSoft, borderColor: colors.status.warningSoft, borderWidth: 1 }]}>
                  <View style={{ flexDirection:'row', gap: spacing[2], alignItems:'flex-start' }}>
                    <AlertCircle size={16} color={colors.status.warning} strokeWidth={1.8} style={{ marginTop: 1 }} />
                    <Text style={[st.refText, { color: colors.status.warning }]}>
                      Ces informations personnalisent ton programme. Consulte toujours un médecin avant de commencer si tu as un antécédent médical sérieux.
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
              label={step === TOTAL_STEPS ? (editMode ? 'Enregistrer' : 'Créer mon programme') : 'Continuer'}
              fullWidth
              disabled={!canContinue()}
              onPress={goNext}
              iconRight={step < TOTAL_STEPS ? <ChevronRight size={18} color="#fff" strokeWidth={2} /> : undefined}
            />
            {step < TOTAL_STEPS && (
              <Pressable onPress={goNext} style={st.skipBtn} accessibilityRole="button">
                <Text style={st.skipText}>Passer cette étape</Text>
              </Pressable>
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

/* ─── Styles ─────────────────────────────────────────────────────────────── */
const st = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.sand[50] },

  header: {
    flexDirection:'row', alignItems:'center',
    paddingHorizontal: spacing[5], paddingVertical: spacing[4],
  },
  backBtn: { width:40, height:40, borderRadius:20, backgroundColor:colors.ink[100], alignItems:'center', justifyContent:'center' },
  headerCenter: { flex:1, alignItems:'center' },
  headerTitle: { fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.base, color:colors.ink[900] },
  headerSub:   { fontFamily:fontFamily.hanken.regular,  fontSize:fontSize.xs,   color:colors.ink[500] },

  progressTrack: { height:4, backgroundColor:colors.ink[100] },
  progressFill:  { height:4, backgroundColor:colors.sage[500], borderRadius:2 },

  scroll: { paddingHorizontal:spacing[5], paddingTop:spacing[6] },

  stepHeader:    { gap:spacing[2], marginBottom:spacing[6] },
  stepIconBadge: { width:48, height:48, borderRadius:24, backgroundColor:colors.sand[200], alignItems:'center', justifyContent:'center', marginBottom:spacing[1] },
  stepTitle:     { fontFamily:fontFamily.spectral.medium, fontSize:fontSize['2xl'], color:colors.ink[900], lineHeight:fontSize['2xl']*lineHeight.snug },
  stepSub:       { fontFamily:fontFamily.hanken.regular,  fontSize:fontSize.base,   color:colors.ink[600], lineHeight:fontSize.base*lineHeight.relaxed },

  stepBody: { gap:spacing[4] },

  // Option card
  optionCard: {
    flexDirection:'row', alignItems:'center', gap:spacing[4],
    padding:spacing[4], borderRadius:radius.lg,
    backgroundColor:'#fff', borderWidth:1.5, borderColor:colors.ink[200],
    ...shadows.sm,
  },
  optionIcon: { width:40, height:40, borderRadius:20, alignItems:'center', justifyContent:'center' },
  optionLabel:{ fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.base, color:colors.ink[900] },
  optionSub:  { fontFamily:fontFamily.hanken.regular,  fontSize:fontSize.sm,   color:colors.ink[600], marginTop:2, lineHeight:fontSize.sm*lineHeight.relaxed },
  radio:      { width:20, height:20, borderRadius:10, borderWidth:2, borderColor:colors.ink[300], alignItems:'center', justifyContent:'center' },
  radioDot:   { width:10, height:10, borderRadius:5 },

  // Numeric input
  numericWrap:      { gap:spacing[2] },
  numericLabel:     { fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.sm, color:colors.ink[700] },
  numericField:     { flexDirection:'row', alignItems:'center', borderWidth:1.5, borderColor:colors.ink[200], borderRadius:radius.md, backgroundColor:'#fff', paddingHorizontal:spacing[4], height:56 },
  numericFieldFocused: { borderColor:colors.sage[500], shadowColor:colors.sage[500], shadowOpacity:0.2, shadowRadius:4, shadowOffset:{ width:0, height:0 }, elevation:2 },
  numericInput:     { flex:1, fontFamily:fontFamily.spectral.medium, fontSize:fontSize['2xl'], color:colors.ink[900], padding:0 },
  numericUnit:      { fontFamily:fontFamily.hanken.medium, fontSize:fontSize.base, color:colors.ink[500] },
  numericHint:      { fontFamily:fontFamily.hanken.regular, fontSize:fontSize.xs, color:colors.ink[500] },

  doubleRow: { flexDirection:'row', gap:spacing[4] },

  // Chips
  chipsWrap:  { flexDirection:'row', flexWrap:'wrap', gap:spacing[2] },
  chip:       { flexDirection:'row', alignItems:'center', gap:spacing[1], paddingHorizontal:spacing[4], paddingVertical:spacing[2]+2, borderRadius:radius.pill, backgroundColor:colors.ink[100], borderWidth:1.5, borderColor:colors.ink[200] },
  chipText:   { fontFamily:fontFamily.hanken.medium, fontSize:fontSize.sm, color:colors.ink[700] },

  // Info chip
  infoChip:     { borderRadius:radius.md, padding:spacing[3] },
  infoChipText: { fontFamily:fontFamily.hanken.medium, fontSize:fontSize.sm, textAlign:'center' },

  // Ref card
  refCard:   { backgroundColor:colors.sand[100], borderRadius:radius.lg, padding:spacing[4], gap:spacing[2] },
  refTitle:  { fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.sm, color:colors.ink[700] },
  refText:   { fontFamily:fontFamily.hanken.regular,  fontSize:fontSize.sm, color:colors.ink[600], lineHeight:fontSize.sm*lineHeight.relaxed },

  // BF% table
  tableCard:  { backgroundColor:'#fff', borderRadius:radius.lg, padding:spacing[4], gap:spacing[2], ...shadows.sm },
  tableTitle: { fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.sm, color:colors.ink[700], marginBottom:spacing[1] },
  tableRow:   { flexDirection:'row', alignItems:'center', gap:spacing[3], paddingVertical:spacing[1] },
  tableDot:   { width:10, height:10, borderRadius:5 },
  tableLabel: { flex:1, fontFamily:fontFamily.hanken.medium, fontSize:fontSize.sm, color:colors.ink[800] },
  tableRange: { fontFamily:fontFamily.hanken.regular, fontSize:fontSize.sm, color:colors.ink[500] },

  // Sub section (duration inside step 7)
  subSection:     { gap:spacing[3], paddingTop:spacing[2] },
  subSectionTitle:{ fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.base, color:colors.ink[900] },
  durationRow:    { flexDirection:'row', gap:spacing[3] },
  durationChip:   { flex:1, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:spacing[2], padding:spacing[3], borderRadius:radius.md, backgroundColor:colors.ink[100], borderWidth:1.5, borderColor:colors.ink[200] },
  durationChipActive: { backgroundColor:colors.sage[500], borderColor:colors.sage[500] },
  durationText:   { fontFamily:fontFamily.hanken.medium, fontSize:fontSize.sm, color:colors.ink[700] },
  durationTextActive: { color:'#fff' },

  // Text area
  textArea: { fontFamily:fontFamily.hanken.regular, fontSize:fontSize.base, color:colors.ink[800], minHeight:80, textAlignVertical:'top', borderWidth:1.5, borderColor:colors.ink[200], borderRadius:radius.md, padding:spacing[3], backgroundColor:'#fff' },

  chipSectionLabel: { fontFamily:fontFamily.hanken.medium, fontSize:fontSize.base, color:colors.ink[700] },

  // Skip hint
  skipHint:     { backgroundColor:colors.sage[50], borderRadius:radius.md, padding:spacing[3] },
  skipHintText: { fontFamily:fontFamily.hanken.regular, fontSize:fontSize.sm, color:colors.sage[700], textAlign:'center' },

  // Nav
  navRow:  { gap:spacing[3], marginTop:spacing[6] },
  skipBtn: { alignItems:'center', paddingVertical:spacing[2] },
  skipText:{ fontFamily:fontFamily.hanken.regular, fontSize:fontSize.sm, color:colors.ink[500] },
});

export default OnboardingQuestionnaireScreen;
