import React from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View, Platform, Modal, TextInput } from 'react-native';
import { Activity, ChevronRight, Droplets, Plus, Minus, Bot, Leaf, X, Check, Sparkles, ChevronLeft } from 'lucide-react-native';
import { colors, fontFamily, fontSize, lineHeight, letterSpacing, spacing, radius, shadows } from '../theme/theme';
import { Avatar }   from '../components/Avatar';
import { Badge }    from '../components/Badge';
import { Card }     from '../components/Card';
import { Progress } from '../components/Progress';
import { Ring }     from '../components/Ring';
import { useDailyProgress } from '../context/DailyProgressContext';
import { useStreak } from '../hooks/useStreak';
import { FeedbackButton } from '../components/FeedbackButton';
import { EmptyState } from '../components/EmptyState';
import { useProgramStore } from '../store/useProgramStore';
import { getProgramProgress, getTodaySession, generateProgram } from '../services/programService';
import { saveUserProfileAndProgram } from '../services/dbService';
import { auth } from '../services/firebase';

function getGreeting(name: string): string {
  const h = new Date().getHours();
  if (h < 12) return `Bon matin, ${name} ☀️`;
  if (h < 17) return `Bonne séance, ${name} 💪`;
  if (h < 21) return `Belle soirée, ${name} 🌙`;
  return `Bonne nuit, ${name} 🌿`;
}

const Eyebrow: React.FC<{children:string}> = ({children}) => (
  <Text style={{ fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.sm, color:colors.clay[500], letterSpacing:letterSpacing.eyebrow, textTransform:'uppercase' }}>{children}</Text>
);

const SectionHeader: React.FC<{title:string;action?:string;onAction?:()=>void}> = ({title,action,onAction}) => (
  <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
    <Text style={{ fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.md, color:colors.ink[900] }}>{title}</Text>
    {action && <Pressable onPress={onAction} hitSlop={12} accessibilityRole="button"><Text style={{ fontFamily:fontFamily.hanken.medium, fontSize:fontSize.sm, color:colors.sage[600] }}>{action}</Text></Pressable>}
  </View>
);

const RingItem: React.FC<{label:string;sublabel:string;value:number;fill:string;ringLabel:string}> = ({label,sublabel,value,fill,ringLabel}) => (
  <View style={{ alignItems:'center', gap:spacing[1.5], flex:1 }}>
    <Ring value={value} size={72} strokeWidth={7} fillColor={fill} label={ringLabel} />
    <Text style={{ fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.xs, color:colors.ink[900], textAlign:'center' }}>{label}</Text>
    <Text style={{ fontFamily:fontFamily.hanken.regular,  fontSize:fontSize.xs, color:colors.ink[600], textAlign:'center' }}>{sublabel}</Text>
  </View>
);

export const HomeScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const program = useProgramStore(s => s.program);
  const profile = useProgramStore(s => s.profile);
  const storeName = useProgramStore(s => s.userName);
  const { mealsPct, mealsCount, workoutPct, waterPct, waterGlasses, addWater, removeWater } = useDailyProgress();
  const { streak } = useStreak();

  const [showDigestiveModal, setShowDigestiveModal] = React.useState(false);
  const [diagStep, setDiagStep] = React.useState(1);

  // Form states
  const [digestiveSymptoms, setDigestiveSymptoms] = React.useState<string[]>([]);
  const [energyLevel, setEnergyLevel] = React.useState<string>('moyen');
  const [hydrationLevel, setHydrationLevel] = React.useState<string>('2.0');
  const [stomachAcid, setStomachAcid] = React.useState<string>('normal');
  const [deepWhy, setDeepWhy] = React.useState<string>('');

  React.useEffect(() => {
    if (profile) {
      setDigestiveSymptoms(profile.digestiveSymptoms || []);
      setDeepWhy(profile.deepWhy !== 'Non renseigné' ? profile.deepWhy || '' : '');
    }
  }, [profile]);

  const toggleSymptom = (id: string) => {
    if (id === 'aucun') {
      setDigestiveSymptoms(['aucun']);
    } else {
      setDigestiveSymptoms(prev => {
        const filtered = prev.filter(x => x !== 'aucun');
        if (filtered.includes(id)) {
          return filtered.filter(x => x !== id);
        } else {
          return [...filtered, id];
        }
      });
    }
  };

  const handleSaveDigestive = async () => {
    if (!profile) return;
    try {
      const updatedProfile = {
        ...profile,
        digestiveSymptoms,
        energyLevel,
        hydrationLevel: Number(hydrationLevel),
        stomachAcid,
        deepWhy: deepWhy.trim() || 'Non renseigné',
        digestiveDiagnosticCompleted: true,
      };

      // Régénérer le programme avec les nouvelles données
      const updatedProgram = generateProgram(updatedProfile);

      // Mettre à jour Zustand localement
      useProgramStore.getState().setProfile(updatedProfile);
      useProgramStore.getState().setProgram(updatedProgram);

      // Enregistrer dans Firestore
      const uid = auth.currentUser?.uid;
      if (uid) {
        await saveUserProfileAndProgram(uid, updatedProfile, updatedProgram, updatedProfile.mainGoal || 'muscle');
      }

      setShowDigestiveModal(false);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du bilan digestif :', error);
      alert('Une erreur est survenue lors de la sauvegarde de vos données.');
    }
  };

  const displayName = storeName || 'toi';
  const greeting    = getGreeting(displayName);

  // Aucun programme réel → jamais de données factices
  if (!program) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={{ flex:1, justifyContent:'center', paddingHorizontal:spacing[5] }}>
          <EmptyState />
        </View>
      </SafeAreaView>
    );
  }

  const progress = getProgramProgress(program);
  const today    = getTodaySession(program);
  const displayProgram = {
    eyebrow: `PROGRAMME ${program.name.toUpperCase()}`,
    currentDay: progress.day,
    currentWeek: progress.week,
    totalWeeks: progress.totalWeeks,
    tagline: progress.week === 1 ? 'on démarre !' : 'tu avances bien.',
    completionPct: progress.completionPct,
  };

  const showDigestiveBanner = profile && !profile.digestiveDiagnosticCompleted;

  return (
    <View style={{ flex:1 }}>
      <SafeAreaView style={s.safe}>
        <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={s.header}>
            <View style={{ flex:1, marginRight:spacing[4] }}>
              <Text style={s.greeting} accessibilityRole="header">{greeting}</Text>
              <Text style={s.subgreeting}>
                {streak > 1 ? `🔥 ${streak} jours de série` : progress.day <= 1 ? 'Bienvenue ! C\'est parti 🌿' : 'Voici ton tableau de bord.'}
              </Text>
            </View>
            <Avatar name={displayName} size={44} ring />
          </View>

          {/* Programme card */}
          <Card dark elevation="md" padding={spacing[6]}>
            <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:spacing[3] }}>
              <Eyebrow>{displayProgram.eyebrow}</Eyebrow>
              <Badge label={`Jour ${displayProgram.currentDay}`} variant="solid" />
            </View>
            <Text style={s.programTitle}>
              Semaine {displayProgram.currentWeek} sur {displayProgram.totalWeeks} —{' '}
              <Text style={s.programTitleItalic}>{displayProgram.tagline}</Text>
            </Text>
            <Progress value={displayProgram.completionPct} fillColor={colors.clay[300]} trackColor={colors.sage[700]} height={6} style={{ marginBottom:spacing[2] }} />
            <View style={{ flexDirection:'row', justifyContent:'space-between' }}>
              <Text style={{ fontFamily:fontFamily.hanken.medium, fontSize:fontSize.sm, color:colors.sage[300] }}>{displayProgram.completionPct} % complété</Text>
              <Text style={{ fontFamily:fontFamily.hanken.medium, fontSize:fontSize.sm, color:colors.sand[200] }}>{streak} jour{streak !== 1 ? 's' : ''} de série 🔥</Text>
            </View>
          </Card>

          {/* Aujourd'hui */}
          <SectionHeader title="Aujourd'hui" />
          <Card elevation="sm" padding={spacing[5]}>
            <View style={{ flexDirection:'row', justifyContent:'space-around', alignItems:'center' }}>
              <RingItem label="Nutrition"    sublabel={`${mealsCount}/3 repas`}              value={mealsPct}   fill={colors.sage[500]}   ringLabel={`${mealsPct}%`} />
              <View style={{ width:1, height:72, backgroundColor:colors.ink[200] }} />
              <RingItem label="Entraînement" sublabel={workoutPct === 100 ? 'Complété ✓' : '0/1 séance'} value={workoutPct}  fill={colors.clay[500]}   ringLabel={`${workoutPct}%`} />
              <View style={{ width:1, height:72, backgroundColor:colors.ink[200] }} />
              <RingItem label="Hydratation"  sublabel={`${waterGlasses}/8 verres`}           value={waterPct}   fill={colors.status.info} ringLabel={`${waterPct}%`} />
            </View>
            {/* Compteur eau rapide */}
            <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'center', gap:spacing[4], marginTop:spacing[4], paddingTop:spacing[4], borderTopWidth:1, borderTopColor:colors.ink[100] }}>
              <Pressable onPress={removeWater} style={{ width:32, height:32, borderRadius:16, backgroundColor:colors.ink[100], alignItems:'center', justifyContent:'center' }}>
                <Minus size={14} color={colors.ink[600]} strokeWidth={2.5} />
              </Pressable>
              <View style={{ flexDirection:'row', alignItems:'center', gap:spacing[2] }}>
                <Droplets size={16} color={colors.status.info} strokeWidth={2} />
                <Text style={{ fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.sm, color:colors.ink[900] }}>{waterGlasses} verre{waterGlasses !== 1 ? 's' : ''} d'eau</Text>
              </View>
              <Pressable onPress={addWater} style={{ width:32, height:32, borderRadius:16, backgroundColor:colors.sage[100], alignItems:'center', justifyContent:'center' }}>
                <Plus size={14} color={colors.sage[600]} strokeWidth={2.5} />
              </Pressable>
            </View>
          </Card>

          {/* Diagnostic Naturopathique Banner */}
          {showDigestiveBanner && (
            <Card elevation="sm" padding={spacing[4]} style={s.digestivePromoCard}>
              <View style={{ flexDirection: 'row', gap: spacing[3], alignItems: 'flex-start' }}>
                <View style={s.digestivePromoIconWrap}>
                  <Leaf size={20} color={colors.sage[600]} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.digestivePromoTitle}>🌿 Optimise ta digestion & vitalité</Text>
                  <Text style={s.digestivePromoText}>
                    Complète ton diagnostic naturopathique (symptômes, hydratation, énergie) pour adapter tes recommandations métaboliques.
                  </Text>
                  <Pressable
                    onPress={() => {
                      setDiagStep(1);
                      setShowDigestiveModal(true);
                    }}
                    style={s.digestivePromoBtn}
                    accessibilityRole="button"
                  >
                    <Text style={s.digestivePromoBtnText}>Commencer (2 min) →</Text>
                  </Pressable>
                </View>
              </View>
            </Card>
          )}

          {/* Prochaine séance */}
          {today && (
            <>
              <SectionHeader title={today.isToday ? 'Séance du jour' : 'Prochaine séance'} />
              <Pressable onPress={()=>{}} accessibilityRole="button">
                <Card elevation="sm" padding={spacing[5]}>
                  <View style={{ flexDirection:'row', alignItems:'center', gap:spacing[4] }}>
                    <View style={{ width:44, height:44, borderRadius:22, backgroundColor:colors.clay[100], alignItems:'center', justifyContent:'center' }}>
                      <Activity size={20} color={colors.clay[500]} strokeWidth={2} />
                    </View>
                    <View style={{ flex:1 }}>
                      <Text style={{ fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.base, color:colors.ink[900], marginBottom:spacing[0.5] }}>{today.session.title}</Text>
                      <Text style={{ fontFamily:fontFamily.hanken.regular,  fontSize:fontSize.sm,   color:colors.ink[600] }}>{today.session.day} · {today.session.duration} min · {today.session.exerciseCount} exercices</Text>
                    </View>
                    <ChevronRight size={20} color={colors.ink[500]} strokeWidth={2} />
                  </View>
                </Card>
              </Pressable>
            </>
          )}

          {/* Coach IA */}
          <Pressable
            onPress={() => navigation?.navigate('AICoach')}
            accessibilityRole="button"
            style={s.coachBanner}
          >
            <View style={s.coachBannerLeft}>
              <View style={s.coachBannerIcon}>
                <Bot size={22} color="#fff" />
              </View>
              <View>
                <Text style={s.coachBannerTitle}>Coach IA Pure Ascension 🌿</Text>
                <Text style={s.coachBannerSub}>Posez une question à votre coach</Text>
              </View>
            </View>
            <ChevronRight size={18} color={colors.sage[200]} />
          </Pressable>

          <View style={{ height:spacing[10] }} />
        </ScrollView>
      </SafeAreaView>
      <FeedbackButton />

      {/* Modal du Diagnostic Digestif */}
      <Modal visible={showDigestiveModal} animationType="slide" transparent>
        <View style={s.modalBackdrop}>
          <View style={s.modalContent}>
            {/* Header */}
            <View style={s.modalHeader}>
              <Text style={s.modalHeaderTitle}>Bilan Digestif & Vitalité</Text>
              <Pressable onPress={() => setShowDigestiveModal(false)} style={s.closeBtn} accessibilityRole="button">
                <X size={20} color={colors.ink[600]} />
              </Pressable>
            </View>

            {/* Progress indicator */}
            <View style={s.modalProgressTrack}>
              <View style={[s.modalProgressFill, { width: `${(diagStep / 5) * 100}%` as any }]} />
            </View>

            <ScrollView contentContainerStyle={s.modalScroll} keyboardShouldPersistTaps="handled">
              {diagStep === 1 && (
                <View style={s.modalStepBody}>
                  <Text style={s.modalQuestion}>1. Inconforts digestifs ?</Text>
                  <Text style={s.modalSubQuestion}>Sélectionne tous les symptômes réguliers.</Text>
                  {[
                    { id: 'ballonnements', label: '🎈 Ballonnements post-repas', sub: 'Estomac gonflé juste après manger.' },
                    { id: 'reflux', label: '🔥 Reflux / Brûlures d\'estomac', sub: 'Remontées acides ou sensation de brûlure.' },
                    { id: 'fatigue-post-prandiale', label: '😴 Somnolence post-repas', sub: 'Grosse baisse d\'énergie après manger.' },
                    { id: 'transit-irregulier', label: '🔄 Transit irrégulier / Constipation', sub: 'Ballonnements réguliers ou inconfort.' },
                    { id: 'aucun', label: '🌿 Aucun problème particulier', sub: 'Digestion légère et fluide.' },
                  ].map(opt => {
                    const isSelected = digestiveSymptoms.includes(opt.id);
                    return (
                      <Pressable
                        key={opt.id}
                        onPress={() => toggleSymptom(opt.id)}
                        style={[s.modalOptionCard, isSelected && s.modalOptionCardSelected]}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[s.modalOptionLabel, isSelected && { color: colors.sage[600] }]}>{opt.label}</Text>
                          <Text style={s.modalOptionSub}>{opt.sub}</Text>
                        </View>
                        <View style={[s.modalCheckbox, isSelected && s.modalCheckboxOn]}>
                          {isSelected && <Check size={12} color="#fff" strokeWidth={2.5} />}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {diagStep === 2 && (
                <View style={s.modalStepBody}>
                  <Text style={s.modalQuestion}>2. Ton niveau d'énergie ?</Text>
                  <Text style={s.modalSubQuestion}>Comment te sens-tu au quotidien ?</Text>
                  {[
                    { id: 'faible', label: '🥱 Faible', sub: 'Fatigué·e dès le réveil, besoin de stimulants.' },
                    { id: 'moyen', label: '⚖️ Moyen', sub: 'Énergie correcte, petit coup de pompe l\'après-midi.' },
                    { id: 'excellent', label: '⚡ Excellent', sub: 'Pleine vitalité et clarté mentale toute la journée.' },
                  ].map(opt => {
                    const isSelected = energyLevel === opt.id;
                    return (
                      <Pressable
                        key={opt.id}
                        onPress={() => setEnergyLevel(opt.id)}
                        style={[s.modalOptionCard, isSelected && s.modalOptionCardSelected]}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[s.modalOptionLabel, isSelected && { color: colors.sage[600] }]}>{opt.label}</Text>
                          <Text style={s.modalOptionSub}>{opt.sub}</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {diagStep === 3 && (
                <View style={s.modalStepBody}>
                  <Text style={s.modalQuestion}>3. Objectif d'hydratation ?</Text>
                  <Text style={s.modalSubQuestion}>Volume d'eau pure visé par jour.</Text>
                  {[
                    { id: '1.5', label: '💧 1.5 Litre', sub: 'Recommandation minimale pour activité sédentaire.' },
                    { id: '2.0', label: '💧 2 Litres', sub: 'Excellent équilibre métabolique.' },
                    { id: '2.5', label: '💧 2.5 Litres', sub: 'Recommandé si tu t\'entraînes régulièrement.' },
                    { id: '3.0', label: '💧 3 Litres ou plus', sub: 'Optimal pour l\'endurance et la performance.' },
                  ].map(opt => {
                    const isSelected = hydrationLevel === opt.id;
                    return (
                      <Pressable
                        key={opt.id}
                        onPress={() => setHydrationLevel(opt.id)}
                        style={[s.modalOptionCard, isSelected && s.modalOptionCardSelected]}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[s.modalOptionLabel, isSelected && { color: colors.sage[600] }]}>{opt.label}</Text>
                          <Text style={s.modalOptionSub}>{opt.sub}</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {diagStep === 4 && (
                <View style={s.modalStepBody}>
                  <Text style={s.modalQuestion}>4. Acide stomacal</Text>
                  <Text style={s.modalSubQuestion}>Est-ce que tu ressens des lourdeurs d'estomac persistantes ou des gaz 1h après les repas ?</Text>
                  {[
                    { id: 'normal', label: 'Digestion légère', sub: 'Pas de lourdeurs ni de ballonnements tardifs.' },
                    { id: 'hypo', label: 'Lourdeurs persistantes', sub: 'Sensation d\'indigestion, de fatigue intense ou de gaz après le repas (indique potentiellement un manque d\'acide gastrique).' },
                  ].map(opt => {
                    const isSelected = stomachAcid === opt.id;
                    return (
                      <Pressable
                        key={opt.id}
                        onPress={() => setStomachAcid(opt.id)}
                        style={[s.modalOptionCard, isSelected && s.modalOptionCardSelected]}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[s.modalOptionLabel, isSelected && { color: colors.sage[600] }]}>{opt.label}</Text>
                          <Text style={s.modalOptionSub}>{opt.sub}</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {diagStep === 5 && (
                <View style={s.modalStepBody}>
                  <Text style={s.modalQuestion}>5. Motivation profonde ?</Text>
                  <Text style={s.modalSubQuestion}>Pourquoi veux-tu te transformer aujourd'hui ?</Text>
                  <TextInput
                    style={s.modalInput}
                    value={deepWhy}
                    onChangeText={setDeepWhy}
                    placeholder="Écris ton pourquoi profond ici (ex: retrouver de l'énergie pour mes enfants...)"
                    placeholderTextColor={colors.ink[400]}
                    multiline
                  />
                </View>
              )}
            </ScrollView>

            {/* Footer Navigation */}
            <View style={s.modalFooter}>
              {diagStep > 1 ? (
                <Pressable onPress={() => setDiagStep(prev => prev - 1)} style={s.modalNavBtnPrev} accessibilityRole="button">
                  <ChevronLeft size={20} color={colors.ink[700]} />
                  <Text style={s.modalNavBtnPrevText}>Retour</Text>
                </Pressable>
              ) : (
                <View style={{ flex: 1 }} />
              )}
              {diagStep < 5 ? (
                <Pressable onPress={() => setDiagStep(prev => prev + 1)} style={s.modalNavBtnNext} accessibilityRole="button">
                  <Text style={s.modalNavBtnNextText}>Suivant</Text>
                  <ChevronRight size={20} color="#fff" />
                </Pressable>
              ) : (
                <Pressable onPress={handleSaveDigestive} style={s.modalNavBtnNext} accessibilityRole="button">
                  <Text style={s.modalNavBtnNextText}>Enregistrer</Text>
                  <Sparkles size={16} color="#fff" />
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const s = StyleSheet.create({
  safe:    { flex:1, backgroundColor:colors.sand[50] },
  scroll:  { flex:1 },
  content: { paddingHorizontal:spacing[5], paddingTop:spacing[6], gap:spacing[4] },
  header:  { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:spacing[2] },
  greeting:        { fontFamily:fontFamily.spectral.regular,      fontSize:fontSize['2xl'], color:colors.ink[900], lineHeight:fontSize['2xl']*lineHeight.snug },
  greetingName:    { fontFamily:fontFamily.spectral.mediumItalic, color:colors.sage[600] },
  subgreeting:     { fontFamily:fontFamily.hanken.regular, fontSize:fontSize.sm, color:colors.ink[600], marginTop:spacing[0.5] },
  programTitle:       { fontFamily:fontFamily.spectral.regular,       fontSize:fontSize.xl, color:colors.sand[100], lineHeight:fontSize.xl*lineHeight.snug, marginBottom:spacing[5] },
  programTitleItalic: { fontFamily:fontFamily.spectral.regularItalic, color:colors.sand[50] },

  coachBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.sage[800], borderRadius: 16, padding: spacing[4],
  },
  coachBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  coachBannerIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.sage[600], alignItems: 'center', justifyContent: 'center'
  },
  coachBannerTitle: { fontFamily: fontFamily.hanken.bold, fontSize: fontSize.base, color: '#fff' },
  coachBannerSub: { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.xs, color: colors.sage[300], marginTop: 2 },

  digestivePromoCard: {
    backgroundColor: '#F3F6F3',
    borderColor: colors.sage[200],
    borderWidth: 1,
    borderRadius: 16,
    marginTop: spacing[2],
  },
  digestivePromoIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E6EFE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  digestivePromoTitle: {
    fontFamily: fontFamily.hanken.bold,
    fontSize: fontSize.base,
    color: colors.ink[900],
  },
  digestivePromoText: {
    fontFamily: fontFamily.hanken.regular,
    fontSize: fontSize.sm,
    color: colors.ink[700],
    marginTop: spacing[1],
    lineHeight: 20,
  },
  digestivePromoBtn: {
    marginTop: spacing[3],
    alignSelf: 'flex-start',
    backgroundColor: colors.sage[600],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: 8,
  },
  digestivePromoBtnText: {
    fontFamily: fontFamily.hanken.bold,
    fontSize: fontSize.sm,
    color: '#fff',
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(30, 42, 34, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  modalContent: {
    width: '100%',
    maxHeight: '95%',
    backgroundColor: '#FFF',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.ink[100],
  },
  modalHeaderTitle: {
    fontFamily: fontFamily.hanken.bold,
    fontSize: fontSize.base,
    color: colors.ink[900],
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.ink[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalProgressTrack: {
    height: 4,
    backgroundColor: colors.ink[100],
  },
  modalProgressFill: {
    height: 4,
    backgroundColor: colors.sage[500],
  },
  modalScroll: {
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[5],
  },
  modalStepBody: {
    gap: spacing[3],
  },
  modalQuestion: {
    fontFamily: fontFamily.spectral.medium,
    fontSize: fontSize.xl,
    color: colors.ink[900],
    marginBottom: spacing[1],
  },
  modalSubQuestion: {
    fontFamily: fontFamily.hanken.regular,
    fontSize: fontSize.sm,
    color: colors.ink[600],
    marginBottom: spacing[2],
    lineHeight: 18,
  },
  modalOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    padding: spacing[4],
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: colors.ink[200],
  },
  modalOptionCardSelected: {
    borderColor: colors.sage[500],
    backgroundColor: colors.sage[50],
    borderWidth: 2,
  },
  modalOptionLabel: {
    fontFamily: fontFamily.hanken.semiBold,
    fontSize: fontSize.base,
    color: colors.ink[900],
  },
  modalOptionSub: {
    fontFamily: fontFamily.hanken.regular,
    fontSize: fontSize.sm,
    color: colors.ink[600],
    marginTop: 2,
  },
  modalCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.ink[300],
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCheckboxOn: {
    backgroundColor: colors.sage[500],
    borderColor: colors.sage[500],
  },
  modalInput: {
    fontFamily: fontFamily.hanken.regular,
    fontSize: fontSize.base,
    color: colors.ink[800],
    minHeight: 100,
    textAlignVertical: 'top',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: colors.ink[200],
    borderRadius: 12,
    padding: spacing[3],
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing[5],
    borderTopWidth: 1,
    borderTopColor: colors.ink[100],
  },
  modalNavBtnPrev: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingVertical: spacing[2],
  },
  modalNavBtnPrevText: {
    fontFamily: fontFamily.hanken.bold,
    fontSize: fontSize.sm,
    color: colors.ink[700],
  },
  modalNavBtnNext: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    backgroundColor: colors.sage[600],
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[2.5],
    borderRadius: 8,
  },
  modalNavBtnNextText: {
    fontFamily: fontFamily.hanken.bold,
    fontSize: fontSize.sm,
    color: '#fff',
  },
});
export default HomeScreen;
