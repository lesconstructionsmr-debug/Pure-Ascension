import React, { useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Plus, Sparkles, Trash2, BookOpen, ChevronRight } from 'lucide-react-native';
import { colors, fontFamily, fontSize, lineHeight, spacing, radius, shadows } from '../theme/theme';
import { formatNumber } from '../data';
import { Ring } from '../components/Ring';
import { useCalorie } from '../context/CalorieContext';
import { AddFoodModal } from '../components/AddFoodModal';
import { useProgramStore } from '../store/useProgramStore';

export const MealsScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const program = useProgramStore(st => st.program);
  const { totalKcal, goalKcal, remainingKcal, pct, totalProteins, totalCarbs, totalFats, entries, removeEntry } = useCalorie();

  const overGoal = totalKcal > goalKcal;

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
          <Text style={s.screenTitle} accessibilityRole="header">Repas</Text>
          <Pressable style={s.addFab} onPress={() => setModalOpen(true)} accessibilityRole="button">
            <Plus size={18} color="#fff" strokeWidth={2.5} />
            <Text style={s.addFabLabel}>Ajouter</Text>
          </Pressable>
        </View>

        {/* ── Calorie tracker card ── */}
        <View style={[s.trackerCard, overGoal && s.trackerCardOver]}>
          <View style={s.trackerTop}>
            <View style={{ flex: 1, gap: spacing[1] }}>
              <Text style={s.trackerEyebrow}>CALORIES DU JOUR</Text>
              <Text style={s.trackerMain}>
                {formatNumber(totalKcal)}{' '}
                <Text style={s.trackerGoal}>/ {formatNumber(goalKcal)} kcal</Text>
              </Text>
              <Text style={[s.trackerRemaining, overGoal && { color: colors.status.danger }]}>
                {overGoal
                  ? `+${formatNumber(totalKcal - goalKcal)} kcal au-dessus de l'objectif`
                  : `${formatNumber(remainingKcal)} kcal restantes`}
              </Text>
            </View>
            <Ring
              value={Math.min(pct, 100)}
              size={80}
              strokeWidth={8}
              fillColor={overGoal ? colors.status.danger : colors.clay[500]}
              label={`${pct}%`}
            />
          </View>

          {/* Barre de progression */}
          <View style={s.trackerTrack}>
            <View style={[
              s.trackerFill,
              { width: `${Math.min(pct, 100)}%` as any },
              overGoal && { backgroundColor: colors.status.danger },
            ]} />
          </View>

          {/* Macros consommées vs cibles du programme */}
          <View style={s.macroRow}>
            {[
              { label:'Prot.', val: totalProteins, target: program?.macros.protein, color: colors.sage[400] },
              { label:'Gluc.', val: totalCarbs,    target: program?.macros.carbs,   color: colors.clay[400] },
              { label:'Lip.',  val: totalFats,     target: program?.macros.fat,     color: colors.info[500] },
            ].map(m => (
              <View key={m.label} style={s.macroItem}>
                <View style={[s.macroDot, { backgroundColor: m.color }]} />
                <Text style={s.macroLabel}>{m.label}</Text>
                <Text style={s.macroVal}>
                  {Math.round(m.val)}g{m.target ? ` / ${m.target}g` : ''}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Entrées journalières ── */}
        {entries.length > 0 && (
          <View style={{ gap: spacing[3] }}>
            <Text style={s.sectionTitle}>Aujourd'hui · {entries.length} entrée{entries.length > 1 ? 's' : ''}</Text>
            <View style={s.entriesCard}>
              {entries.map((entry, idx) => (
                <View key={entry.id}>
                  <View style={s.entryRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.entryName}>{entry.name}</Text>
                      <Text style={s.entryTime}>{entry.time} · P {entry.proteins}g · G {entry.carbs}g · L {entry.fats}g</Text>
                    </View>
                    <Text style={s.entryKcal}>{entry.kcal} kcal</Text>
                    <Pressable
                      onPress={() => removeEntry(entry.id)}
                      style={s.deleteBtn}
                      accessibilityRole="button"
                      accessibilityLabel="Supprimer"
                    >
                      <Trash2 size={14} color={colors.ink[400]} strokeWidth={1.8} />
                    </Pressable>
                  </View>
                  {idx < entries.length - 1 && <View style={s.divider} />}
                </View>
              ))}
            </View>
          </View>
        )}

        {entries.length === 0 && (
          <Pressable style={s.emptyTracker} onPress={() => setModalOpen(true)}>
            <Plus size={22} color={colors.clay[400]} strokeWidth={1.8} />
            <Text style={s.emptyTrackerText}>Ajouter ton premier aliment</Text>
          </Pressable>
        )}

        {/* ── Livre de recettes ── */}
        <Pressable
          style={s.recipeBookBtn}
          onPress={() => navigation?.navigate('RecipeBook')}
          accessibilityRole="button"
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3], flex: 1 }}>
            <View style={s.recipeBookIconCircle}>
              <BookOpen size={20} color={colors.sage[600]} />
            </View>
            <View>
              <Text style={s.recipeBookTitle}>Livre de Recettes Holistiques</Text>
              <Text style={s.recipeBookSub}>Reset Métabolique & Équilibre Hormonal</Text>
            </View>
          </View>
          <ChevronRight size={18} color={colors.ink[400]} />
        </Pressable>

        {/* ── Cibles du programme ── */}
        {program ? (
          <View style={s.planCard}>
            <View style={{ flexDirection:'row', alignItems:'center', gap:spacing[2] }}>
              <Sparkles size={16} color={colors.sage[600]} strokeWidth={2} />
              <Text style={s.planTitle}>Tes cibles — {program.name}</Text>
            </View>
            <Text style={s.planText}>
              {formatNumber(program.calories)} kcal / jour · P {program.macros.protein}g · G {program.macros.carbs}g · L {program.macros.fat}g
            </Text>
            <Text style={s.planHint}>
              Ton plan repas détaillé (recettes personnalisées selon tes restrictions) arrive bientôt.
              En attendant, vise tes cibles avec le suivi ci-dessus. 🌿
            </Text>
          </View>
        ) : (
          <View style={s.planCard}>
            <Text style={s.planTitle}>Aucun plan trouvé</Text>
            <Text style={s.planHint}>Complète ton diagnostic pour recevoir tes cibles caloriques personnalisées.</Text>
          </View>
        )}

        {/* Bandeau de décharge médicale */}
        <View style={s.medicalDisclaimer}>
          <Text style={s.medicalDisclaimerText}>
            Avertissement : Les cibles nutritionnelles et suggestions de Pure Ascension sont destinées à soutenir votre bien-être. Elles ne remplacent pas un avis médical. Consultez un professionnel de la santé avant tout changement alimentaire majeur.
          </Text>
        </View>

        <View style={{ height:spacing[10] }} />
      </ScrollView>

      <AddFoodModal visible={modalOpen} onClose={() => setModalOpen(false)} />
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe:    { flex:1, backgroundColor:colors.sand[50] },
  scroll:  { flex:1 },
  content: { paddingHorizontal:spacing[5], paddingTop:spacing[6], gap:spacing[5] },
  screenTitle: { fontFamily:fontFamily.spectral.medium, fontSize:fontSize['3xl'], color:colors.ink[900] },

  addFab:      { flexDirection:'row', alignItems:'center', gap:spacing[2], backgroundColor:colors.clay[500], borderRadius:radius.pill, paddingHorizontal:spacing[4], paddingVertical:spacing[2] },
  addFabLabel: { fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.sm, color:'#fff' },

  trackerCard:     { backgroundColor:colors.clay[700], borderRadius:radius.xl, padding:spacing[5], gap:spacing[4] },
  trackerCardOver: { backgroundColor:'#5c1a0e' },
  trackerTop:      { flexDirection:'row', alignItems:'center' },
  trackerEyebrow:  { fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.xs, color:colors.clay[300], letterSpacing:0.6 },
  trackerMain:     { fontFamily:fontFamily.spectral.medium, fontSize:fontSize['2xl'], color:'#fff', lineHeight:fontSize['2xl']*lineHeight.snug },
  trackerGoal:     { fontFamily:fontFamily.spectral.regular, fontSize:fontSize.lg, color:colors.clay[300] },
  trackerRemaining:{ fontFamily:fontFamily.hanken.regular, fontSize:fontSize.sm, color:colors.clay[200] },
  trackerTrack:    { height:6, borderRadius:3, backgroundColor:'rgba(0,0,0,0.25)', overflow:'hidden' },
  trackerFill:     { height:'100%' as any, borderRadius:3, backgroundColor:colors.clay[400] },

  macroRow:  { flexDirection:'row', justifyContent:'space-between' },
  macroItem: { flexDirection:'row', alignItems:'center', gap:spacing[1.5] },
  macroDot:  { width:8, height:8, borderRadius:4 },
  macroLabel:{ fontFamily:fontFamily.hanken.regular, fontSize:fontSize.xs, color:colors.clay[200] },
  macroVal:  { fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.xs, color:'#fff' },

  sectionTitle: { fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.md, color:colors.ink[900] },

  entriesCard: { backgroundColor:'#fff', borderRadius:radius.xl, overflow:'hidden', ...shadows.sm },
  entryRow:    { flexDirection:'row', alignItems:'center', gap:spacing[3], paddingHorizontal:spacing[4], paddingVertical:spacing[3] },
  entryName:   { fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.sm, color:colors.ink[900] },
  entryTime:   { fontFamily:fontFamily.hanken.regular, fontSize:fontSize.xs, color:colors.ink[500], marginTop:2 },
  entryKcal:   { fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.sm, color:colors.clay[600] },
  deleteBtn:   { width:30, height:30, borderRadius:15, backgroundColor:colors.ink[100], alignItems:'center', justifyContent:'center' },
  divider:     { height:1, backgroundColor:colors.ink[100], marginHorizontal:spacing[4] },

  emptyTracker: { flexDirection:'row', alignItems:'center', justifyContent:'center', gap:spacing[3], padding:spacing[5], borderRadius:radius.xl, borderWidth:2, borderColor:colors.clay[200], borderStyle:'dashed' },
  emptyTrackerText: { fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.base, color:colors.clay[500] },

  planCard: { backgroundColor:colors.sage[50], borderRadius:radius.xl, padding:spacing[5], gap:spacing[2], borderWidth:1, borderColor:colors.sage[200] },
  planTitle:{ fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.base, color:colors.sage[700] },
  planText: { fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.sm, color:colors.ink[900] },
  planHint: { fontFamily:fontFamily.hanken.regular, fontSize:fontSize.sm, color:colors.ink[600], lineHeight:fontSize.sm*lineHeight.relaxed },

  recipeBookBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: radius.xl, padding: spacing[4],
    borderWidth: 1.5, borderColor: colors.ink[200], ...shadows.sm
  },
  recipeBookIconCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.sage[50], alignItems: 'center', justifyContent: 'center'
  },
  recipeBookTitle: { fontFamily: fontFamily.hanken.bold, fontSize: fontSize.base, color: colors.ink[900] },
  recipeBookSub: { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.xs, color: colors.ink[500], marginTop: 2 },

  medicalDisclaimer: { marginTop:spacing[4], padding:spacing[3], backgroundColor:colors.sand[100], borderRadius:radius.md, borderWidth:1, borderColor:colors.sand[200] },
  medicalDisclaimerText: { fontFamily:fontFamily.hanken.regular, fontSize:10, color:colors.ink[500], textAlign:'center', lineHeight:14 },
});
export default MealsScreen;
