import React from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View, Platform, Modal, TextInput } from 'react-native';
import { Activity, ChevronRight, Droplets, Plus, Minus, Bot, Leaf, X, Check, Sparkles, ChevronLeft, Moon, Brain, Star, Users, Camera, ShoppingBag, MoreHorizontal, Utensils } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, fontFamily, fontSize, lineHeight, letterSpacing, spacing, radius, shadows } from '../theme/theme';
import { Avatar }   from '../components/Avatar';
import { Badge }    from '../components/Badge';
import { Card }     from '../components/Card';
import { Progress } from '../components/Progress';
import { Ring }     from '../components/Ring';
import { ReferralModal } from '../components/ReferralModal';
import { AscensionCardModal } from '../components/AscensionCardModal';
import { GroceryListModal } from '../components/GroceryListModal';
import { MealScannerModal } from '../components/MealScannerModal';
import { useDailyProgress } from '../context/DailyProgressContext';
import { useCalorie } from '../context/CalorieContext';
import { FeedbackButton } from '../components/FeedbackButton';
import { EmptyState } from '../components/EmptyState';
import { useProgramStore } from '../store/useProgramStore';
import { getProgramProgress, getTodaySession, generateProgram } from '../services/programService';
import { saveUserProfileAndProgram } from '../services/dbService';
import { auth, db } from '../services/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

function getGreeting(name: string): string {
  const h = new Date().getHours();
  if (h < 12) return `Bon matin, ${name} ☀️`;
  if (h < 17) return `Bonne séance, ${name} 💪`;
  if (h < 21) return `Belle soirée, ${name} 🌙`;
  return `Bonne nuit, ${name} 🌿`;
}

const Eyebrow: React.FC<{children:string}> = ({children}) => (
  <Text style={{ fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.xs, color:colors.clay[300], letterSpacing:letterSpacing.eyebrow, textTransform:'uppercase' }}>{children}</Text>
);

const SectionHeader: React.FC<{title:string;action?:string;onAction?:()=>void}> = ({title,action,onAction}) => (
  <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
    <Text style={{ fontFamily:fontFamily.hanken.bold, fontSize:fontSize.xs, color:colors.ink[500], letterSpacing:0.8, textTransform:'uppercase' }}>{title}</Text>
    {action && <Pressable onPress={onAction} hitSlop={12} accessibilityRole="button"><Text style={{ fontFamily:fontFamily.hanken.medium, fontSize:fontSize.sm, color:colors.sage[600] }}>{action}</Text></Pressable>}
  </View>
);

export const HomeScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const program = useProgramStore(s => s.program);
  const profile = useProgramStore(s => s.profile);
  const storeName = useProgramStore(s => s.userName);
  const completedWorkoutsCount = useProgramStore(s => s.completedWorkoutsCount);
  const streakDays = useProgramStore(s => s.streakDays);

  const { 
    mealsPct, mealsCount, workoutPct, waterPct, waterGlasses, addWater, removeWater,
    sleepScore, mentalCheckin, setSleepScore, toggleMentalCheckin, ascensionScore
  } = useDailyProgress();
  const { totalKcal, totalProteins, goalKcal } = useCalorie();

  // Modals state
  const [showReferralModal, setShowReferralModal] = React.useState(false);
  const [showAscensionCardModal, setShowAscensionCardModal] = React.useState(false);
  const [showGroceryListModal, setShowGroceryListModal] = React.useState(false);
  const [showMealScannerModal, setShowMealScannerModal] = React.useState(false);

  React.useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const unsub = onSnapshot(doc(db, 'users', uid), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        if (d.streakDays !== undefined) {
          useProgramStore.getState().setStreakDays(d.streakDays);
        }
        if (d.completedWorkoutsCount !== undefined) {
          // Ne jamais faire régresser le compteur : le local peut contenir des séances non encore synchronisées.
          const local = useProgramStore.getState().completedWorkoutsCount;
          useProgramStore.getState().setCompletedWorkoutsCount(
            Math.max(local, Number(d.completedWorkoutsCount) || 0)
          );
        }
      }
    });
    return () => unsub();
  }, []);

  const [showDigestiveModal, setShowDigestiveModal] = React.useState(false);
  const [diagStep, setDiagStep] = React.useState(1);

  // Form states synchronisés avec le profil global
  const [digestiveSymptoms, setDigestiveSymptoms] = React.useState<string[]>([]);
  const [energyLevel, setEnergyLevel] = React.useState<string>('moyen');
  const [hydrationLevel, setHydrationLevel] = React.useState<string>('2.0');
  const [stomachAcid, setStomachAcid] = React.useState<string>('normal');
  const [deepWhy, setDeepWhy] = React.useState<string>('');

  React.useEffect(() => {
    if (profile) {
      setDigestiveSymptoms(profile.digestiveSymptoms || []);
      if (profile.energyLevel) setEnergyLevel(profile.energyLevel);
      if (profile.hydrationLevel) setHydrationLevel(String(profile.hydrationLevel));
      if (profile.stomachAcid) setStomachAcid(profile.stomachAcid);
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
      console.error('Erreur lors de la sauvegarde de la synthèse fitness :', error);
      alert('Une erreur est survenue lors de la sauvegarde de vos données.');
    }
  };

  const displayName = storeName || 'toi';
  const greeting    = getGreeting(displayName);

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
  
  const totalSessions = program.totalWeeks * (program.sessionsPerWeek || 4);
  const programWorkoutPct = totalSessions > 0 ? Math.round((completedWorkoutsCount / totalSessions) * 100) : 0;
  const dailyBonusPct = Math.round((ascensionScore / 100) * (100 / (totalSessions || 1)));
  const calculatedPct = Math.min(100, Math.max(progress.completionPct, programWorkoutPct + dailyBonusPct));
  const currentDayCalculated = completedWorkoutsCount > 0 ? Math.min(progress.totalDays, Math.max(progress.day, completedWorkoutsCount + 1)) : progress.day;
  const currentWeekCalculated = Math.min(program.totalWeeks, Math.ceil(currentDayCalculated / 7));

  const programNameUpper = (program.name || 'FAT BURNER PRO').toUpperCase();
  const displayProgram = {
    eyebrow: `${programNameUpper} · JOUR ${currentDayCalculated}`,
    currentDay: currentDayCalculated,
    currentWeek: currentWeekCalculated,
    totalWeeks: progress.totalWeeks || 12,
    tagline: currentWeekCalculated === 1 ? 'on démarre !' : 'tu avances bien.',
    completionPct: calculatedPct,
  };

  const showDigestiveBanner = profile && !profile.digestiveDiagnosticCompleted;

  return (
    <View style={{ flex:1 }}>
      <SafeAreaView style={s.safe}>
        <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

          {/* Header avec Titre 'Accueil' en grand & Bouton '...' en haut à droite */}
          <View style={s.header}>
            <View style={{ flex:1 }}>
              <Text style={s.headerTitle} accessibilityRole="header">Accueil</Text>
              <Text style={s.subgreeting}>{greeting}</Text>
            </View>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowAscensionCardModal(true);
              }}
              style={s.moreBtn}
              accessibilityRole="button"
              accessibilityLabel="Plus d'options"
            >
              <MoreHorizontal size={24} color={colors.ink[900]} />
            </Pressable>
          </View>

          {/* Barre d'action rapide supérieure : 'Scanner un repas' | 'Ajouter un aliment' */}
          <View style={s.quickActionsRow}>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setShowMealScannerModal(true);
              }}
              style={s.quickBtnPrimary}
              accessibilityRole="button"
            >
              <Camera size={16} color="#fff" />
              <Text style={s.quickBtnPrimaryText}>Scanner un repas</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setShowGroceryListModal(true);
              }}
              style={s.quickBtnSecondary}
              accessibilityRole="button"
            >
              <Utensils size={16} color={colors.sage[700]} />
              <Text style={s.quickBtnSecondaryText}>Ajouter un aliment</Text>
            </Pressable>
          </View>

          {/* Carte de programme : 'FAT BURNER PRO · JOUR 3' -> 'Semaine 1 sur 12 — on démarre !' */}
          <Card dark elevation="md" padding={spacing[6]}>
            <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:spacing[3] }}>
              <Eyebrow>{displayProgram.eyebrow}</Eyebrow>
              <Badge label={`Jour ${displayProgram.currentDay}`} variant="solid" />
            </View>
            <Text style={s.programTitle}>
              Semaine {displayProgram.currentWeek} sur {displayProgram.totalWeeks} —{' '}
              <Text style={s.programTitleItalic}>{displayProgram.tagline}</Text>
            </Text>
            <Progress value={displayProgram.completionPct} fillColor={colors.sage[400]} trackColor={colors.sage[800]} height={6} style={{ marginBottom:spacing[2] }} />
            <View style={{ flexDirection:'row', justifyContent:'space-between' }}>
              <Text style={{ fontFamily:fontFamily.hanken.medium, fontSize:fontSize.sm, color:colors.sage[300] }}>{displayProgram.completionPct} % complété</Text>
              <Text style={{ fontFamily:fontFamily.hanken.medium, fontSize:fontSize.sm, color:colors.sand[200] }}>{streakDays} jour{streakDays !== 1 ? 's' : ''} de série 🔥</Text>
            </View>
          </Card>

          {/* Carte 'Score d'Ascension' (13% / 'Corps, esprit, mindset — en un coup d'œil') */}
          <Card elevation="md" padding={spacing[5]}>
            <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:spacing[4] }}>
              <View style={{ flex:1, marginRight: spacing[2] }}>
                <View style={{ flexDirection:'row', alignItems:'center', gap:spacing[2], flexWrap: 'wrap' }}>
                  <Text style={{ fontFamily:fontFamily.hanken.bold, fontSize:fontSize.lg, color:colors.ink[900] }}>
                    Score d'Ascension
                  </Text>
                  <Badge label={`${ascensionScore}%`} variant="clay" />
                </View>
                <Text style={{ fontFamily:fontFamily.hanken.regular, fontSize:fontSize.xs, color:colors.ink[600], marginTop:2 }}>
                  Corps, esprit, mindset — en un coup d'œil
                </Text>
              </View>
              <Ring value={ascensionScore} size={48} strokeWidth={5} fillColor={colors.clay[500]} label={`${ascensionScore}%`} />
            </View>

            {/* Grille des 4 Piliers */}
            <View style={{ gap:spacing[3] }}>
              
              {/* 💧 Vitalité & Nutrition (2/8 verres) */}
              <View style={{ backgroundColor:colors.sage[50], borderRadius:radius.md, padding:spacing[3] }}>
                <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
                  <View style={{ flexDirection:'row', alignItems:'center', gap:spacing[2] }}>
                    <Droplets size={18} color={colors.sage[600]} />
                    <Text style={{ fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.sm, color:colors.ink[900] }}>
                      Vitalité & Nutrition
                    </Text>
                  </View>
                  <Text style={{ fontFamily:fontFamily.hanken.medium, fontSize:fontSize.xs, color:colors.sage[700] }}>
                    ({waterGlasses}/8 verres · {totalKcal} kcal)
                  </Text>
                </View>
                <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginTop:spacing[2] }}>
                  <Progress value={Math.round((waterGlasses/8) * 100)} fillColor={colors.sage[500]} height={6} style={{ flex:1, marginRight:spacing[3] }} />
                  <View style={{ flexDirection:'row', gap:spacing[2] }}>
                    <Pressable 
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); removeWater(); }} 
                      style={{ width:28, height:28, borderRadius:14, backgroundColor:colors.ink[100], alignItems:'center', justifyContent:'center' }}
                    >
                      <Minus size={12} color={colors.ink[600]} />
                    </Pressable>
                    <Pressable 
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); addWater(); }} 
                      style={{ width:28, height:28, borderRadius:14, backgroundColor:colors.sage[600], alignItems:'center', justifyContent:'center' }}
                    >
                      <Plus size={12} color="#fff" />
                    </Pressable>
                  </View>
                </View>
              </View>

              {/* 💪 Puissance & Entraînement (En attente) */}
              <View style={{ backgroundColor:colors.clay[50], borderRadius:radius.md, padding:spacing[3] }}>
                <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
                  <View style={{ flexDirection:'row', alignItems:'center', gap:spacing[2] }}>
                    <Activity size={18} color={colors.clay[600]} />
                    <Text style={{ fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.sm, color:colors.ink[900] }}>
                      Puissance & Entraînement
                    </Text>
                  </View>
                  <Badge 
                    label={workoutPct === 100 ? 'Validé ✓' : 'En attente'} 
                    variant={workoutPct === 100 ? 'solid' : 'outline'} 
                  />
                </View>
              </View>

              {/* 🌙 Récupération & Sommeil — Micro Check-in Réveil (Sans devinette) */}
              <View style={{ backgroundColor:colors.sand[100], borderRadius:radius.md, padding:spacing[3], gap:spacing[2] }}>
                <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
                  <View style={{ flexDirection:'row', alignItems:'center', gap:spacing[2] }}>
                    <Moon size={18} color={colors.ink[700]} />
                    <Text style={{ fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.sm, color:colors.ink[900] }}>
                      Récupération & Sommeil
                    </Text>
                  </View>
                  <Text style={{ fontFamily:fontFamily.hanken.medium, fontSize:fontSize.xs, color:colors.ink[600] }}>
                    {sleepScore >= 5 ? '⚡ Reposé' : sleepScore >= 3 ? '😐 Moyen' : sleepScore === 1 ? '😴 Fatigué' : 'Check-in 1-tap'}
                  </Text>
                </View>

                {/* 3 boutons 1-tap réveil intuitive */}
                <View style={{ flexDirection:'row', gap:spacing[2], marginTop:2 }}>
                  {[
                    { val: 5, label: '⚡ Reposé (7h+)', bg: colors.sage[600], activeBg: colors.sage[700] },
                    { val: 3, label: '😐 Moyen (6h)', bg: colors.clay[500], activeBg: colors.clay[600] },
                    { val: 1, label: '😴 Fatigué (-6h)', bg: colors.ink[600], activeBg: colors.ink[800] },
                  ].map(item => {
                    const isSelected = sleepScore === item.val;
                    return (
                      <Pressable
                        key={item.val}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                          setSleepScore(item.val);
                        }}
                        style={{
                          flex: 1,
                          paddingVertical: spacing[2],
                          paddingHorizontal: spacing[1],
                          borderRadius: radius.md,
                          backgroundColor: isSelected ? item.bg : colors.sand[200],
                          alignItems: 'center',
                          justify: 'center',
                          borderWidth: isSelected ? 0 : 1,
                          borderColor: colors.ink[200],
                        }}
                        accessibilityRole="button"
                      >
                        <Text
                          style={{
                            fontFamily: fontFamily.hanken.bold,
                            fontSize: 11,
                            color: isSelected ? '#ffffff' : colors.ink[800],
                          }}
                        >
                          {item.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* 🎯 Mental & Intention (Valider →) */}
              <View style={{ backgroundColor:colors.sage[100], borderRadius:radius.md, padding:spacing[3] }}>
                <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
                  <View style={{ flexDirection:'row', alignItems:'center', gap:spacing[2] }}>
                    <Brain size={18} color={colors.sage[700]} />
                    <Text style={{ fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.sm, color:colors.ink[900] }}>
                      Mental & Intention
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                      toggleMentalCheckin();
                    }}
                    style={{
                      flexDirection:'row',
                      alignItems:'center',
                      gap:spacing[1],
                      backgroundColor: mentalCheckin ? colors.sage[600] : colors.clay[500],
                      paddingHorizontal:spacing[3],
                      paddingVertical:spacing[1.5],
                      borderRadius:radius.full,
                    }}
                  >
                    <Text style={{ fontFamily:fontFamily.hanken.bold, fontSize:fontSize.xs, color: '#fff' }}>
                      {mentalCheckin ? 'Validé ✓' : 'Valider →'}
                    </Text>
                  </Pressable>
                </View>
              </View>

            </View>
          </Card>

          {/* Aperçu Profil Fitness Banner */}
          {showDigestiveBanner && (
            <Card elevation="sm" padding={spacing[4]} style={s.digestivePromoCard}>
              <View style={{ flexDirection: 'row', gap: spacing[3], alignItems: 'flex-start' }}>
                <View style={s.digestivePromoIconWrap}>
                  <Leaf size={20} color={colors.sage[600]} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.digestivePromoTitle}>🌿 Optimise ton hygiène de vie & énergie</Text>
                  <Text style={s.digestivePromoText}>
                    Complète ton questionnaire de profil fitness pour adapter tes recommandations d'entraînement.
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

          {/* Carte 'PROCHAINE SÉANCE' : 'Circuit training' (Lundi · 45 min · 5 exercices) */}
          <SectionHeader title="PROCHAINE SÉANCE" />
          <Pressable 
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation?.navigate('Séances');
            }} 
            accessibilityRole="button"
          >
            <Card elevation="sm" padding={spacing[5]}>
              <View style={{ flexDirection:'row', alignItems:'center', gap:spacing[4] }}>
                <View style={{ width:44, height:44, borderRadius:22, backgroundColor:colors.clay[100], alignItems:'center', justifyContent:'center' }}>
                  <Activity size={20} color={colors.clay[500]} strokeWidth={2} />
                </View>
                <View style={{ flex:1 }}>
                  <Text style={{ fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.base, color:colors.ink[900], marginBottom:spacing[0.5] }}>
                    {today?.session?.title || 'Circuit training'}
                  </Text>
                  <Text style={{ fontFamily:fontFamily.hanken.regular, fontSize:fontSize.sm, color:colors.ink[600] }}>
                    {today?.session?.day || 'Lundi'} · {today?.session?.duration || 45} min · {today?.session?.exerciseCount || 5} exercices
                  </Text>
                </View>
                <ChevronRight size={20} color={colors.ink[500]} strokeWidth={2} />
              </View>
            </Card>
          </Pressable>

          {/* Bannière verte 'Coach IA Pure Ascension' : 'Posez une question à votre coach' */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              navigation?.navigate('AICoach');
            }}
            accessibilityRole="button"
            style={s.coachBanner}
          >
            <View style={s.coachBannerLeft}>
              <View style={s.coachBannerIcon}>
                <Bot size={22} color="#fff" />
              </View>
              <View>
                <Text style={s.coachBannerTitle}>Coach IA Pure Ascension</Text>
                <Text style={s.coachBannerSub}>Posez une question à votre coach</Text>
              </View>
            </View>
            <ChevronRight size={18} color={colors.sage[200]} />
          </Pressable>

          <View style={{ height:spacing[10] }} />
        </ScrollView>
      </SafeAreaView>
      <FeedbackButton />

      {/* Modal du Bilan Fitness & Énergie */}
      <Modal visible={showDigestiveModal} animationType="slide" transparent>
        <View style={s.modalBackdrop}>
          <View style={s.modalContent}>
            {/* Header */}
            <View style={s.modalHeader}>
              <Text style={s.modalHeaderTitle}>Synthèse Hygiène & Énergie</Text>
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
                  <Text style={s.modalQuestion}>1. Inconforts ou lourdeurs ?</Text>
                  <Text style={s.modalSubQuestion}>Sélectionne tes ressentis réguliers.</Text>
                  {[
                    { id: 'ballonnements', label: '🎈 Sensations de lourdeur post-repas', sub: 'Estomac lourd juste après manger.' },
                    { id: 'reflux', label: '🔥 Sensations de brûlure', sub: 'Inconfort ou sensation de chaleur.' },
                    { id: 'fatigue-post-prandiale', label: '😴 Somnolence post-repas', sub: 'Baisse d\'énergie après manger.' },
                    { id: 'transit-irregulier', label: '🔄 Transit irrégulier', sub: 'Inconforts légers au quotidien.' },
                    { id: 'aucun', label: '🌿 Aucun problème particulier', sub: 'Sensations fluides et confortables.' },
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
                    { id: '2.0', label: '💧 2 Litres', sub: 'Excellent équilibre d\'hydratation.' },
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
                  <Text style={s.modalQuestion}>4. Confort d'assimilation</Text>
                  <Text style={s.modalSubQuestion}>Est-ce que tu ressens des lourdeurs persistantes 1h après les repas ?</Text>
                  {[
                    { id: 'normal', label: 'Ressenti fluide', sub: 'Pas de lourdeurs ni de gêne tardive.' },
                    { id: 'hypo', label: 'Lourdeurs persistantes', sub: 'Sensation de fatigue après le repas.' },
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

      {/* Referral Modal */}
      <ReferralModal
        visible={showReferralModal}
        onClose={() => setShowReferralModal(false)}
      />

      {/* Ascension Card Modal */}
      <AscensionCardModal
        visible={showAscensionCardModal}
        onClose={() => setShowAscensionCardModal(false)}
        data={{
          userName: storeName || profile?.name || 'Guerrier',
          ascensionScore,
          streakDays,
          workoutCompleted: workoutPct === 100,
          mealsCount,
          waterGlasses,
          sleepScore,
          mentalCheckin,
        }}
      />

      {/* Grocery List Modal */}
      <GroceryListModal
        visible={showGroceryListModal}
        onClose={() => setShowGroceryListModal(false)}
      />

      {/* Meal Scanner Modal */}
      <MealScannerModal
        visible={showMealScannerModal}
        onClose={() => setShowMealScannerModal(false)}
      />
    </View>
  );
};

const s = StyleSheet.create({
  safe:    { flex:1, backgroundColor:colors.sand[50] },
  scroll:  { flex:1 },
  content: { paddingHorizontal:spacing[5], paddingTop:spacing[6], gap:spacing[4] },
  
  /* Header */
  header:  { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:spacing[1] },
  headerTitle: { fontFamily:fontFamily.spectral.regular, fontSize:fontSize['3xl'], color:colors.ink[900], lineHeight:fontSize['3xl']*lineHeight.snug },
  subgreeting: { fontFamily:fontFamily.hanken.regular, fontSize:fontSize.sm, color:colors.ink[600], marginTop:spacing[0.5] },
  moreBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.sand[100], alignItems: 'center', justifyContent: 'center' },

  /* Quick Actions Bar */
  quickActionsRow: { flexDirection: 'row', gap: spacing[3], marginBottom: spacing[1] },
  quickBtnPrimary: {
    flex: 1,
    backgroundColor: colors.sage[800],
    paddingVertical: spacing[3.5],
    paddingHorizontal: spacing[3],
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    ...shadows.sm,
  },
  quickBtnPrimaryText: { fontFamily: fontFamily.hanken.semiBold, fontSize: fontSize.xs, color: '#fff' },
  quickBtnSecondary: {
    flex: 1,
    backgroundColor: colors.sand[100],
    borderWidth: 1,
    borderColor: colors.ink[200],
    paddingVertical: spacing[3.5],
    paddingHorizontal: spacing[3],
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    ...shadows.sm,
  },
  quickBtnSecondaryText: { fontFamily: fontFamily.hanken.semiBold, fontSize: fontSize.xs, color: colors.ink[900] },

  /* Programme Card */
  programTitle:       { fontFamily:fontFamily.spectral.regular,       fontSize:fontSize.xl, color:colors.sand[100], lineHeight:fontSize.xl*lineHeight.snug, marginBottom:spacing[5] },
  programTitleItalic: { fontFamily:fontFamily.spectral.regularItalic, color:colors.sand[50] },

  /* Coach Banner */
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

  /* Digestive Promo Banner */
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
    borderRadius: radius.pill,
  },
  digestivePromoBtnText: {
    fontFamily: fontFamily.hanken.semiBold,
    fontSize: fontSize.xs,
    color: '#fff',
  },

  /* Modal Styles */
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.sand[50], borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, maxHeight: '85%', paddingBottom: spacing[6] },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing[4], borderBottomWidth: 1, borderBottomColor: colors.ink[200] },
  modalHeaderTitle: { fontFamily: fontFamily.hanken.bold, fontSize: fontSize.md, color: colors.ink[900] },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.ink[100], alignItems: 'center', justifyContent: 'center' },
  modalProgressTrack: { height: 4, backgroundColor: colors.ink[200], width: '100%' },
  modalProgressFill: { height: '100%', backgroundColor: colors.sage[500] },
  modalScroll: { padding: spacing[5] },
  modalStepBody: { gap: spacing[3] },
  modalQuestion: { fontFamily: fontFamily.spectral.regular, fontSize: fontSize.xl, color: colors.ink[900] },
  modalSubQuestion: { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.sm, color: colors.ink[600], marginBottom: spacing[2] },
  modalOptionCard: { flexDirection: 'row', alignItems: 'center', padding: spacing[4], borderRadius: radius.lg, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.ink[200], gap: spacing[3] },
  modalOptionCardSelected: { borderColor: colors.sage[500], backgroundColor: colors.sage[50] },
  modalOptionLabel: { fontFamily: fontFamily.hanken.semiBold, fontSize: fontSize.base, color: colors.ink[900] },
  modalOptionSub: { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.xs, color: colors.ink[500], marginTop: 2 },
  modalCheckbox: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: colors.ink[300], alignItems: 'center', justifyContent: 'center' },
  modalCheckboxOn: { backgroundColor: colors.sage[500], borderColor: colors.sage[500] },
  modalInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.ink[200], borderRadius: radius.md, padding: spacing[4], minHeight: 100, textAlignVertical: 'top', fontFamily: fontFamily.hanken.regular, fontSize: fontSize.base, color: colors.ink[900] },
  modalFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing[5], paddingTop: spacing[3] },
  modalNavBtnPrev: { flexDirection: 'row', alignItems: 'center', gap: spacing[1], paddingVertical: spacing[2.5], paddingHorizontal: spacing[4] },
  modalNavBtnPrevText: { fontFamily: fontFamily.hanken.medium, fontSize: fontSize.sm, color: colors.ink[700] },
  modalNavBtnNext: { flexDirection: 'row', alignItems: 'center', gap: spacing[1], backgroundColor: colors.sage[600], paddingVertical: spacing[3], paddingHorizontal: spacing[5], borderRadius: radius.pill },
  modalNavBtnNextText: { fontFamily: fontFamily.hanken.bold, fontSize: fontSize.sm, color: '#fff' }
});

export default HomeScreen;
