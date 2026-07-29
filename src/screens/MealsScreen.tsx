import React, { useState, useEffect, useCallback } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { showAlert } from '../utils/alert';
import {
  Plus, Sparkles, Trash2, Camera, ShoppingBag, ChevronRight,
  RefreshCw, Check, RotateCcw
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, fontFamily, fontSize, lineHeight, spacing, radius, shadows } from '../theme/theme';
import { formatNumber } from '../data';
import { useCalorie } from '../context/CalorieContext';
import { AddFoodModal } from '../components/AddFoodModal';
import { GroceryListModal } from '../components/GroceryListModal';
import { MealScannerModal } from '../components/MealScannerModal';
import { BeginnerGuideModal } from '../components/BeginnerGuideModal';
import { useProgramStore } from '../store/useProgramStore';
import { auth } from '../services/firebase';
import {
  WeeklyMealPlan,
  PlannedMeal,
  loadMealPlan,
  saveMealPlan,
  generateWeeklyMealPlan,
  getTodayPlanDay,
  swapMealInPlan,
  regenerateDayInPlan,
  markMealLogged,
  plannedMealToFoodEntry,
  getSlotLabel,
} from '../services/mealPlanService';
import { generateAndSaveGroceryList } from '../services/groceryService';

export const MealsScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [groceryModalOpen, setGroceryModalOpen] = useState(false);
  const [scannerModalOpen, setScannerModalOpen] = useState(false);
  const [guideModalOpen, setGuideModalOpen] = useState(false);
  const [plan, setPlan] = useState<WeeklyMealPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [busyMealId, setBusyMealId] = useState<string | null>(null);

  const program = useProgramStore(st => st.program);
  const profile = useProgramStore(st => st.profile);
  const { totalKcal, goalKcal, pct, totalProteins, totalCarbs, totalFats, entries, removeEntry, addEntry, setGoal } = useCalorie();

  const ensurePlan = useCallback(async () => {
    setPlanLoading(true);
    try {
      const uid = auth.currentUser?.uid || null;
      let existing = await loadMealPlan(uid);

      const calories = program?.calories || goalKcal || 2000;
      const macros = program?.macros || { protein: 140, carbs: 180, fat: 60 };
      const goal = program?.goal || profile?.mainGoal || 'tone';
      const restrictions = profile?.dietaryRestrictions || [];

      const needsRegen =
        !existing ||
        !existing.days?.length ||
        (program?.calories && Math.abs(existing.calories - program.calories) > 150);

      if (needsRegen && program) {
        existing = generateWeeklyMealPlan({
          calories,
          macros,
          goal,
          restrictions,
        });
        await saveMealPlan(uid, existing);
      }

      setPlan(existing);

      if (program?.calories && Math.abs(goalKcal - program.calories) > 50) {
        setGoal(program.calories);
      }
    } catch (err) {
      console.error('Chargement plan alimentaire:', err);
    } finally {
      setPlanLoading(false);
    }
  }, [program, profile, goalKcal, setGoal]);

  useEffect(() => {
    ensurePlan();
  }, [program?.id, program?.calories]);

  const todayDay = getTodayPlanDay(plan);
  const targetGoal = program?.calories || goalKcal || 2000;
  const currentKcal = totalKcal;
  const overGoal = currentKcal > targetGoal;

  const pVal = Math.round(totalProteins);
  const pTarget = program?.macros?.protein || plan?.macros?.protein || 125;
  const gVal = Math.round(totalCarbs);
  const gTarget = program?.macros?.carbs || plan?.macros?.carbs || 125;
  const lVal = Math.round(totalFats);
  const lTarget = program?.macros?.fat || plan?.macros?.fat || 48;

  const persistPlan = async (next: WeeklyMealPlan) => {
    setPlan(next);
    await saveMealPlan(auth.currentUser?.uid || null, next);
  };

  const handleSwap = async (meal: PlannedMeal) => {
    if (!plan || !todayDay) return;
    setBusyMealId(meal.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const next = swapMealInPlan(plan, todayDay.date, meal.id);
    await persistPlan(next);
    setBusyMealId(null);
  };

  const handleLogMeal = async (meal: PlannedMeal) => {
    if (!plan || !todayDay || meal.logged) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addEntry(plannedMealToFoodEntry(meal));
    const next = markMealLogged(plan, todayDay.date, meal.id, true);
    await persistPlan(next);
  };

  const handleRegenDay = () => {
    if (!plan || !todayDay) return;
    showAlert(
      'Régénérer la journée',
      'Créer un nouveau plan pour aujourd\'hui selon tes macros et restrictions ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Régénérer',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            const next = regenerateDayInPlan(plan, todayDay.date);
            await persistPlan(next);
          },
        },
      ]
    );
  };

  const handleRegenWeek = () => {
    if (!program) {
      showAlert('Programme requis', 'Complète ton onboarding pour générer un plan sur-mesure.');
      return;
    }
    showAlert(
      'Nouveau plan de la semaine',
      'Recalculer 7 jours de repas adaptés à ton objectif et tes restrictions ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Générer',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            const next = generateWeeklyMealPlan({
              calories: program.calories,
              macros: program.macros,
              goal: program.goal,
              restrictions: profile?.dietaryRestrictions || [],
            });
            await persistPlan(next);
            setGoal(program.calories);
          },
        },
      ]
    );
  };

  const openGroceryFromPlan = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (plan) {
      const uid = auth.currentUser?.uid || '';
      const mealsOrPlan = plan.days.flatMap((day) =>
        day.meals.map((m) => ({
          mealName: m.name,
          ingredients: m.ingredients.map((i) => ({ name: i.name, qty: i.qty })),
        }))
      );
      try {
        await generateAndSaveGroceryList(uid, mealsOrPlan);
      } catch (e) {
        console.warn('Grocery depuis plan:', e);
      }
    }
    setGroceryModalOpen(true);
  };

  const lastMeal = entries.length > 0 ? entries[entries.length - 1] : null;

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.headerRow}>
          <View>
            <Text style={s.screenTitle} accessibilityRole="header">Repas</Text>
            <Text style={s.screenSubtitle}>Plan alimentaire & journal</Text>
          </View>
          <Pressable
            style={s.addFab}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setModalOpen(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Ajouter un repas"
          >
            <Plus size={18} color="#fff" strokeWidth={2.5} />
            <Text style={s.addFabLabel}>Ajouter</Text>
          </Pressable>
        </View>

        <Pressable
          style={s.scannerBtnDark}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setScannerModalOpen(true);
          }}
          accessibilityRole="button"
        >
          <View style={s.scannerIconWrap}>
            <Camera size={20} color="#fff" strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.scannerBtnLabel}>Scanner Repas IA — détection macros</Text>
          </View>
          <ChevronRight size={18} color="rgba(255,255,255,0.7)" />
        </Pressable>

        {/* Calories */}
        <View style={[s.trackerCardMarron, overGoal && s.trackerCardOver]}>
          <View style={s.trackerHeader}>
            <Text style={s.trackerEyebrow}>OBJECTIF DU JOUR</Text>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setGuideModalOpen(true);
              }}
              accessibilityRole="button"
            >
              <Sparkles size={16} color={colors.clay[200]} />
            </Pressable>
          </View>

          <View style={s.trackerKcalRow}>
            <Text style={s.trackerKcalMain}>
              {formatNumber(currentKcal)}{' '}
              <Text style={s.trackerKcalGoal}>/ {formatNumber(targetGoal)} kcal</Text>
            </Text>
          </View>

          <View style={s.trackerTrack}>
            <View
              style={[
                s.trackerFill,
                { width: `${Math.min(pct, 100)}%` as any },
                overGoal && { backgroundColor: colors.status.danger },
              ]}
            />
          </View>

          <View style={s.macroRow}>
            <View style={s.macroItem}>
              <View style={[s.macroDot, { backgroundColor: colors.sage[300] }]} />
              <Text style={s.macroText}>Prot. {pVal}g/{pTarget}g</Text>
            </View>
            <View style={s.macroItem}>
              <View style={[s.macroDot, { backgroundColor: colors.clay[200] }]} />
              <Text style={s.macroText}>Gluc. {gVal}g/{gTarget}g</Text>
            </View>
            <View style={s.macroItem}>
              <View style={[s.macroDot, { backgroundColor: colors.sand[200] }]} />
              <Text style={s.macroText}>Lip. {lVal}g/{lTarget}g</Text>
            </View>
          </View>
        </View>

        {/* Plan du jour */}
        <View style={s.sectionBlock}>
          <View style={s.sectionHeaderRow}>
            <Text style={s.sectionEyebrow}>PLAN DU JOUR</Text>
            <View style={{ flexDirection: 'row', gap: spacing[2] }}>
              <Pressable onPress={handleRegenDay} style={s.iconBtn} accessibilityRole="button" accessibilityLabel="Régénérer aujourd'hui">
                <RotateCcw size={14} color={colors.sage[700]} />
              </Pressable>
              <Pressable onPress={handleRegenWeek} style={s.iconBtn} accessibilityRole="button" accessibilityLabel="Nouveau plan semaine">
                <RefreshCw size={14} color={colors.sage[700]} />
              </Pressable>
            </View>
          </View>

          {planLoading ? (
            <View style={s.planCard}>
              <ActivityIndicator color={colors.sage[600]} />
              <Text style={s.planHint}>Préparation de ton plan…</Text>
            </View>
          ) : !todayDay ? (
            <View style={s.planCard}>
              <Text style={s.planHint}>Aucun plan pour aujourd'hui.</Text>
              <Pressable style={s.regenBtn} onPress={handleRegenWeek}>
                <Text style={s.regenBtnText}>Générer mon plan</Text>
              </Pressable>
            </View>
          ) : (
            <View style={s.planCard}>
              <Text style={s.planDayLabel}>
                {todayDay.dayLabel} · {todayDay.meals.reduce((s, m) => s + m.kcal, 0)} kcal planifiées
              </Text>
              {todayDay.meals.map((meal) => (
                <View key={meal.id} style={s.mealRow}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={s.mealSlot}>{getSlotLabel(meal.slot)}</Text>
                    <Text style={s.mealName}>{meal.name}</Text>
                    <Text style={s.mealMacros}>
                      {meal.kcal} kcal · P {meal.proteins}g · G {meal.carbs}g · L {meal.fats}g · {meal.prepTime}
                    </Text>
                  </View>
                  <View style={s.mealActions}>
                    <Pressable
                      style={[s.miniBtn, meal.logged && s.miniBtnDone]}
                      onPress={() => handleLogMeal(meal)}
                      disabled={!!meal.logged}
                      accessibilityRole="button"
                      accessibilityLabel="Marquer comme mangé"
                    >
                      <Check size={14} color={meal.logged ? '#fff' : colors.sage[700]} />
                    </Pressable>
                    <Pressable
                      style={s.miniBtn}
                      onPress={() => handleSwap(meal)}
                      disabled={busyMealId === meal.id}
                      accessibilityRole="button"
                      accessibilityLabel="Remplacer ce repas"
                    >
                      {busyMealId === meal.id ? (
                        <ActivityIndicator size="small" color={colors.sage[700]} />
                      ) : (
                        <RefreshCw size={14} color={colors.sage[700]} />
                      )}
                    </Pressable>
                  </View>
                </View>
              ))}
              <Text style={s.planFoot}>
                ✔ = ajouter au journal · ↻ = remplacer ce repas (même créneau, adapté à tes restrictions)
              </Text>
            </View>
          )}
        </View>

        {/* Journal */}
        <View style={s.sectionBlock}>
          <Text style={s.sectionEyebrow}>JOURNAL DU JOUR</Text>
          <View style={s.lastMealCard}>
            <View style={s.lastMealRow}>
              <View style={s.lastMealIconCircle}>
                <Text style={{ fontSize: 20 }}>🍳</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.lastMealTitle}>
                  {lastMeal ? lastMeal.name : 'Aucun repas enregistré'}
                </Text>
                <Text style={s.lastMealSub}>
                  {lastMeal
                    ? `${lastMeal.time} · P ${lastMeal.proteins}g · G ${lastMeal.carbs}g · L ${lastMeal.fats}g`
                    : 'Valide un repas du plan ou scanne ton assiette'}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
                <View style={s.lastMealBadge}>
                  <Text style={s.lastMealKcal}>
                    {lastMeal ? `${lastMeal.kcal} kcal` : '0 kcal'}
                  </Text>
                </View>
                {lastMeal && (
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      removeEntry(lastMeal.id);
                    }}
                    style={s.deleteBtn}
                    accessibilityRole="button"
                  >
                    <Trash2 size={16} color={colors.ink[400]} />
                  </Pressable>
                )}
              </View>
            </View>

            {entries.length > 1 && (
              <View style={s.entriesList}>
                {entries.slice(0, entries.length - 1).reverse().map(entry => (
                  <View key={entry.id} style={s.entrySubRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.entrySubName}>{entry.name}</Text>
                      <Text style={s.entrySubTime}>{entry.time} · P {entry.proteins}g · G {entry.carbs}g · L {entry.fats}g</Text>
                    </View>
                    <Text style={s.entrySubKcal}>{entry.kcal} kcal</Text>
                    <Pressable
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        removeEntry(entry.id);
                      }}
                      style={s.deleteBtn}
                      accessibilityRole="button"
                    >
                      <Trash2 size={14} color={colors.ink[400]} />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Outils */}
        <View style={s.sectionBlock}>
          <Text style={s.sectionEyebrow}>OUTILS</Text>
          <View style={s.toolsCard}>
            <Pressable style={s.toolRow} onPress={openGroceryFromPlan} accessibilityRole="button">
              <View style={s.toolIconWrap}>
                <ShoppingBag size={18} color={colors.sage[700]} />
              </View>
              <Text style={s.toolLabel}>Liste de courses (depuis mon plan)</Text>
              <ChevronRight size={18} color={colors.ink[400]} />
            </Pressable>
          </View>
        </View>

        <View style={s.medicalDisclaimer}>
          <Text style={s.medicalDisclaimerText}>
            Pure Ascension est un outil de coaching fitness et nutrition. Il ne remplace pas un avis médical professionnel.
          </Text>
        </View>

        <View style={{ height: spacing[10] }} />
      </ScrollView>

      <AddFoodModal visible={modalOpen} onClose={() => setModalOpen(false)} />
      <GroceryListModal visible={groceryModalOpen} onClose={() => setGroceryModalOpen(false)} />
      <MealScannerModal visible={scannerModalOpen} onClose={() => setScannerModalOpen(false)} />
      <BeginnerGuideModal visible={guideModalOpen} onClose={() => setGuideModalOpen(false)} defaultKcal={targetGoal} />
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.sand[50] },
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing[5], paddingTop: spacing[6], gap: spacing[5] },

  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  screenTitle: { fontFamily: fontFamily.spectral.medium, fontSize: fontSize['3xl'], color: colors.ink[900] },
  screenSubtitle: { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.sm, color: colors.ink[500], marginTop: 2 },
  addFab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.sage[700], paddingHorizontal: spacing[3], paddingVertical: spacing[2],
    borderRadius: radius.full, ...shadows.sm,
  },
  addFabLabel: { fontFamily: fontFamily.hanken.semibold, fontSize: fontSize.sm, color: '#fff' },

  scannerBtnDark: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[3],
    backgroundColor: colors.sage[800], borderRadius: radius.xl,
    paddingHorizontal: spacing[4], paddingVertical: spacing[4], ...shadows.md,
  },
  scannerIconWrap: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center',
  },
  scannerBtnLabel: { fontFamily: fontFamily.hanken.semibold, fontSize: fontSize.sm, color: '#fff' },

  trackerCardMarron: {
    backgroundColor: colors.clay[700], borderRadius: radius['2xl'],
    padding: spacing[5], gap: spacing[3], ...shadows.md,
  },
  trackerCardOver: { backgroundColor: '#7f1d1d' },
  trackerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  trackerEyebrow: {
    fontFamily: fontFamily.hanken.semibold, fontSize: 11, color: colors.clay[200],
    letterSpacing: 1.2,
  },
  trackerKcalRow: { flexDirection: 'row', alignItems: 'baseline' },
  trackerKcalMain: { fontFamily: fontFamily.spectral.medium, fontSize: fontSize['3xl'], color: '#fff' },
  trackerKcalGoal: { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.base, color: colors.clay[100] },
  trackerTrack: { height: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 4, overflow: 'hidden' },
  trackerFill: { height: '100%', backgroundColor: colors.sage[300], borderRadius: 4 },
  macroRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing[1] },
  macroItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  macroDot: { width: 8, height: 8, borderRadius: 4 },
  macroText: { fontFamily: fontFamily.hanken.medium, fontSize: fontSize.xs, color: colors.clay[100] },

  sectionBlock: { gap: spacing[3] },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionEyebrow: {
    fontFamily: fontFamily.hanken.semibold, fontSize: 11, color: colors.ink[400],
    letterSpacing: 1.2,
  },
  iconBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: colors.sage[100],
    alignItems: 'center', justifyContent: 'center',
  },

  planCard: {
    backgroundColor: '#fff', borderRadius: radius.xl, borderWidth: 1,
    borderColor: colors.ink[100], padding: spacing[4], gap: spacing[3], ...shadows.sm,
  },
  planDayLabel: { fontFamily: fontFamily.hanken.semibold, fontSize: fontSize.sm, color: colors.ink[700] },
  planHint: { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.sm, color: colors.ink[500], textAlign: 'center' },
  planFoot: { fontFamily: fontFamily.hanken.regular, fontSize: 11, color: colors.ink[400], lineHeight: 16 },
  mealRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[3],
    paddingVertical: spacing[3], borderTopWidth: 1, borderTopColor: colors.ink[100],
  },
  mealSlot: { fontFamily: fontFamily.hanken.medium, fontSize: 11, color: colors.sage[700], textTransform: 'uppercase', letterSpacing: 0.6 },
  mealName: { fontFamily: fontFamily.hanken.semibold, fontSize: fontSize.sm, color: colors.ink[900] },
  mealMacros: { fontFamily: fontFamily.hanken.regular, fontSize: 11, color: colors.ink[500] },
  mealActions: { flexDirection: 'row', gap: spacing[2] },
  miniBtn: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: colors.sage[100],
    alignItems: 'center', justifyContent: 'center',
  },
  miniBtnDone: { backgroundColor: colors.sage[600] },
  regenBtn: {
    alignSelf: 'center', marginTop: spacing[2],
    backgroundColor: colors.sage[700], paddingHorizontal: spacing[4], paddingVertical: spacing[2],
    borderRadius: radius.full,
  },
  regenBtnText: { fontFamily: fontFamily.hanken.semibold, fontSize: fontSize.sm, color: '#fff' },

  lastMealCard: {
    backgroundColor: '#fff', borderRadius: radius.xl, borderWidth: 1,
    borderColor: colors.ink[100], padding: spacing[4], ...shadows.sm,
  },
  lastMealRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  lastMealIconCircle: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.sand[100],
    alignItems: 'center', justifyContent: 'center',
  },
  lastMealTitle: { fontFamily: fontFamily.hanken.semibold, fontSize: fontSize.base, color: colors.ink[900] },
  lastMealSub: { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.xs, color: colors.ink[500], marginTop: 2 },
  lastMealBadge: { backgroundColor: colors.sand[100], paddingHorizontal: spacing[2], paddingVertical: 4, borderRadius: radius.md },
  lastMealKcal: { fontFamily: fontFamily.hanken.semibold, fontSize: fontSize.xs, color: colors.ink[700] },
  deleteBtn: { padding: spacing[1] },
  entriesList: { marginTop: spacing[3], gap: spacing[2], borderTopWidth: 1, borderTopColor: colors.ink[100], paddingTop: spacing[3] },
  entrySubRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  entrySubName: { fontFamily: fontFamily.hanken.medium, fontSize: fontSize.sm, color: colors.ink[800] },
  entrySubTime: { fontFamily: fontFamily.hanken.regular, fontSize: 11, color: colors.ink[400] },
  entrySubKcal: { fontFamily: fontFamily.hanken.semibold, fontSize: fontSize.xs, color: colors.ink[600] },

  toolsCard: {
    backgroundColor: '#fff', borderRadius: radius.xl, borderWidth: 1,
    borderColor: colors.ink[100], overflow: 'hidden', ...shadows.sm,
  },
  toolRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], padding: spacing[4] },
  toolIconWrap: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.sand[100],
    alignItems: 'center', justifyContent: 'center',
  },
  toolLabel: { flex: 1, fontFamily: fontFamily.hanken.medium, fontSize: fontSize.sm, color: colors.ink[800] },
  toolDivider: { height: 1, backgroundColor: colors.ink[100], marginHorizontal: spacing[4] },

  medicalDisclaimer: { paddingHorizontal: spacing[2], paddingBottom: spacing[2] },
  medicalDisclaimerText: {
    fontFamily: fontFamily.hanken.regular, fontSize: 11, color: colors.ink[400],
    textAlign: 'center', lineHeight: lineHeight.relaxed * 11,
  },
});

export default MealsScreen;
