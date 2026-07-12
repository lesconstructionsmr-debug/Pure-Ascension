import React, { useState } from 'react';
import {
  Pressable, SafeAreaView, ScrollView,
  StyleSheet, Text, View,
} from 'react-native';
import {
  ChevronLeft, Check, Flame, Drumstick,
  Wheat, Droplets, Clock, Users,
} from 'lucide-react-native';
import { colors, fontFamily, fontSize, lineHeight, spacing, radius, shadows } from '../theme/theme';
import { Button } from '../components/Button';
import { Badge  } from '../components/Badge';
import { Meal   } from '../data';

interface Props { meal: Meal; onBack: () => void; onMarkDone: (id: string) => void; }

export const MealDetailScreen: React.FC<Props> = ({ meal, onBack, onMarkDone }) => {
  const [done, setDone] = useState(meal.completed);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());

  const ingredients = meal.ingredients ?? [];
  const steps       = meal.steps ?? [];
  const prepTime    = meal.prepTime ?? '—';
  const nutritionNote = meal.nutritionNote ?? '';

  const toggleIngredient = (idx: number) => {
    setCheckedIngredients(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const handleMarkDone = () => {
    setDone(true);
    onMarkDone(meal.id);
  };

  const macros = [
    { icon: Flame,     label:'Calories', value:`${meal.calories} kcal`, color:colors.clay[500] },
    { icon: Drumstick, label:'Protéines', value:`${meal.protein} g`,   color:colors.sage[500] },
    { icon: Wheat,     label:'Glucides',  value:`${meal.carbs} g`,     color:colors.status.warning },
    { icon: Droplets,  label:'Lipides',   value:`${meal.fat} g`,       color:colors.info[500] },
  ];

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Hero placeholder */}
        <View style={s.hero}>
          <Pressable style={s.back} onPress={onBack} accessibilityRole="button" accessibilityLabel="Retour">
            <ChevronLeft size={22} color="#fff" strokeWidth={2} />
          </Pressable>
          {done && (
            <View style={s.doneBadge}>
              <Check size={14} color="#fff" strokeWidth={2.5} />
              <Text style={s.doneBadgeText}>Consommé</Text>
            </View>
          )}
          <View style={s.heroBottom}>
            <Badge variant="clay" label={meal.type.toUpperCase()} />
            <Text style={s.heroTitle}>{meal.name}</Text>
          </View>
        </View>

        {/* Meta row */}
        <View style={s.metaRow}>
          <View style={s.metaItem}>
            <Clock size={14} color={colors.ink[500]} strokeWidth={1.5} />
            <Text style={s.metaText}>{prepTime}</Text>
          </View>
          <View style={s.metaSep} />
          <View style={s.metaItem}>
            <Users size={14} color={colors.ink[500]} strokeWidth={1.5} />
            <Text style={s.metaText}>1 personne</Text>
          </View>
          <View style={s.metaSep} />
          <Text style={s.metaText}>Semaine 4 · Jour 3</Text>
        </View>

        {/* Macros */}
        <View style={s.macrosGrid}>
          {macros.map(m => (
            <View key={m.label} style={s.macroCard}>
              <m.icon size={18} color={m.color} strokeWidth={1.8} />
              <Text style={[s.macroValue, { color:m.color }]}>{m.value}</Text>
              <Text style={s.macroLabel}>{m.label}</Text>
            </View>
          ))}
        </View>

        {/* Ingredients */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Ingrédients</Text>
          {ingredients.map((ing, idx) => {
            const checked = checkedIngredients.has(idx);
            return (
              <Pressable
                key={idx}
                style={s.ingredientRow}
                onPress={() => toggleIngredient(idx)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked }}
              >
                <View style={[s.checkbox, checked && s.checkboxDone]}>
                  {checked && <Check size={12} color="#fff" strokeWidth={2.5} />}
                </View>
                <Text style={[s.ingName, checked && s.ingNameDone]}>{ing.name}</Text>
                <Text style={s.ingQty}>{ing.qty}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Steps */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Préparation</Text>
          {steps.map((step, idx) => (
            <View key={idx} style={s.stepRow}>
              <View style={s.stepNumBadge}>
                <Text style={s.stepNumText}>{idx + 1}</Text>
              </View>
              <Text style={s.stepText}>{step}</Text>
            </View>
          ))}
        </View>

        {/* Note nutritionnelle */}
        {nutritionNote ? (
          <View style={s.nutNote}>
            <Text style={s.nutNoteTitle}>Note nutritionnelle</Text>
            <Text style={s.nutNoteText}>{nutritionNote}</Text>
          </View>
        ) : null}

        {/* CTA */}
        <View style={s.ctaArea}>
          {done
            ? <View style={s.doneRow}>
                <Check size={20} color={colors.sage[500]} strokeWidth={2.5} />
                <Text style={s.doneText}>Repas consommé — bien joué ! 🌿</Text>
              </View>
            : <Button variant="primary" size="lg" label="Marquer comme consommé" fullWidth onPress={handleMarkDone} />
          }
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: { flex:1, backgroundColor:colors.sand[50] },

  hero: {
    height:240, backgroundColor:colors.sage[800],
    padding:spacing[5], justifyContent:'space-between',
  },
  back: { width:40, height:40, borderRadius:20, backgroundColor:'rgba(0,0,0,.25)', alignItems:'center', justifyContent:'center' },
  doneBadge: { flexDirection:'row', alignItems:'center', gap:spacing[2], alignSelf:'flex-end', backgroundColor:colors.sage[500], paddingHorizontal:spacing[3], paddingVertical:spacing[1], borderRadius:radius.pill },
  doneBadgeText: { fontFamily:fontFamily.hanken.medium, fontSize:fontSize.xs, color:'#fff' },
  heroBottom: { gap:spacing[2] },
  heroTitle:  { fontFamily:fontFamily.spectral.medium, fontSize:fontSize['2xl'], color:'#fff', lineHeight:fontSize['2xl']*lineHeight.snug },

  metaRow: { flexDirection:'row', alignItems:'center', gap:spacing[3], paddingHorizontal:spacing[5], paddingVertical:spacing[4] },
  metaItem:{ flexDirection:'row', alignItems:'center', gap:spacing[1] },
  metaText:{ fontFamily:fontFamily.hanken.regular, fontSize:fontSize.sm, color:colors.ink[600] },
  metaSep: { width:1, height:12, backgroundColor:colors.ink[200] },

  macrosGrid: {
    flexDirection:'row', marginHorizontal:spacing[5], marginBottom:spacing[6],
    gap:spacing[3],
  },
  macroCard: {
    flex:1, alignItems:'center', gap:spacing[1],
    paddingVertical:spacing[4], borderRadius:radius.lg,
    backgroundColor:'#fff', ...shadows.sm,
  },
  macroValue:{ fontFamily:fontFamily.hanken.bold, fontSize:fontSize.sm },
  macroLabel:{ fontFamily:fontFamily.hanken.regular, fontSize:10, color:colors.ink[500], textTransform:'uppercase', letterSpacing:0.5 },

  section:     { paddingHorizontal:spacing[5], marginBottom:spacing[6] },
  sectionTitle:{ fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.base, color:colors.ink[900], marginBottom:spacing[4] },

  ingredientRow: { flexDirection:'row', alignItems:'center', gap:spacing[3], paddingVertical:spacing[3], borderBottomWidth:1, borderBottomColor:colors.ink[100] },
  checkbox:      { width:22, height:22, borderRadius:6, borderWidth:1.5, borderColor:colors.ink[300], alignItems:'center', justifyContent:'center' },
  checkboxDone:  { backgroundColor:colors.sage[500], borderColor:colors.sage[500] },
  ingName:       { flex:1, fontFamily:fontFamily.hanken.regular, fontSize:fontSize.base, color:colors.ink[800] },
  ingNameDone:   { textDecorationLine:'line-through', color:colors.ink[400] },
  ingQty:        { fontFamily:fontFamily.hanken.medium, fontSize:fontSize.sm, color:colors.ink[500] },

  stepRow:       { flexDirection:'row', gap:spacing[4], marginBottom:spacing[4] },
  stepNumBadge:  { width:28, height:28, borderRadius:14, backgroundColor:colors.sage[100], alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 },
  stepNumText:   { fontFamily:fontFamily.hanken.bold, fontSize:fontSize.sm, color:colors.sage[600] },
  stepText:      { flex:1, fontFamily:fontFamily.hanken.regular, fontSize:fontSize.base, color:colors.ink[800], lineHeight:fontSize.base*lineHeight.relaxed },

  nutNote:     { marginHorizontal:spacing[5], marginBottom:spacing[6], backgroundColor:colors.sage[50], borderRadius:radius.lg, padding:spacing[5], borderLeftWidth:3, borderLeftColor:colors.sage[400] },
  nutNoteTitle:{ fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.sm, color:colors.sage[700], marginBottom:spacing[2] },
  nutNoteText: { fontFamily:fontFamily.hanken.regular, fontSize:fontSize.sm, color:colors.ink[700], lineHeight:fontSize.sm*lineHeight.relaxed },

  ctaArea: { paddingHorizontal:spacing[5] },
  doneRow: { flexDirection:'row', alignItems:'center', gap:spacing[3], justifyContent:'center', padding:spacing[5] },
  doneText:{ fontFamily:fontFamily.hanken.medium, fontSize:fontSize.base, color:colors.sage[600] },
});

export default MealDetailScreen;
