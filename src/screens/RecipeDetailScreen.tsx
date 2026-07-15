import React from 'react';
import {
  Pressable, SafeAreaView, ScrollView, StyleSheet,
  Text, View
} from 'react-native';
import { ArrowLeft, Clock, Info, Check, Plus, BookOpen } from 'lucide-react-native';
import { colors, fontFamily, fontSize, spacing, radius, shadows } from '../theme/theme';
import { RECIPES } from './RecipeBookScreen';
import { useCalorie } from '../context/CalorieContext';

interface Props {
  navigation: any;
  route: any;
}

export const RecipeDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { recipeId } = route.params;
  const recipe = RECIPES.find(r => r.id === recipeId);
  const { addEntry } = useCalorie();
  const [added, setAdded] = React.useState(false);

  if (!recipe) {
    return (
      <SafeAreaView style={st.safe}>
        <View style={st.header}>
          <Pressable onPress={() => navigation.goBack()} style={st.backBtn} accessibilityRole="button">
            <ArrowLeft size={20} color={colors.ink[700]} />
          </Pressable>
          <Text style={st.headerTitle}>Recette introuvable</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>
    );
  }

  const handleAdd = () => {
    addEntry({
      name: `[Recette] ${recipe.name}`,
      kcal: recipe.kcal,
      proteins: recipe.proteins,
      carbs: recipe.carbs,
      fats: recipe.fats
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <SafeAreaView style={st.safe}>
      {/* Header */}
      <View style={st.header}>
        <Pressable onPress={() => navigation.goBack()} style={st.backBtn} accessibilityRole="button">
          <ArrowLeft size={20} color={colors.ink[700]} />
        </Pressable>
        <Text style={st.headerTitle} numberOfLines={1}>{recipe.name}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
        {/* Category & Title */}
        <View style={st.hero}>
          <Text style={st.categoryTag}>{recipe.categoryLabel}</Text>
          <Text style={st.title}>{recipe.name}</Text>
          <Text style={st.desc}>{recipe.description}</Text>

          {/* Time & Macros */}
          <View style={st.metaRow}>
            <View style={st.metaItem}>
              <Clock size={16} color={colors.ink[500]} />
              <Text style={st.metaText}>{recipe.prepTime}</Text>
            </View>
          </View>

          {/* Macros Card */}
          <View style={st.macrosCard}>
            <View style={st.macro}>
              <Text style={st.macroValue}>{recipe.kcal}</Text>
              <Text style={st.macroLabel}>kcal</Text>
            </View>
            <View style={st.macroLine} />
            <View style={st.macro}>
              <Text style={st.macroValue}>{recipe.proteins}g</Text>
              <Text style={st.macroLabel}>Protéines</Text>
            </View>
            <View style={st.macroLine} />
            <View style={st.macro}>
              <Text style={st.macroValue}>{recipe.carbs}g</Text>
              <Text style={st.macroLabel}>Glucides</Text>
            </View>
            <View style={st.macroLine} />
            <View style={st.macro}>
              <Text style={st.macroValue}>{recipe.fats}g</Text>
              <Text style={st.macroLabel}>Lipides</Text>
            </View>
          </View>
        </View>

        {/* Ingredients list */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>Ingrédients</Text>
          <View style={st.ingredientsList}>
            {recipe.ingredients.map((ing, index) => (
              <View key={index} style={st.ingredientRow}>
                <View style={st.bullet} />
                <Text style={st.ingName}>{ing.name}</Text>
                <Text style={st.ingQty}>{ing.qty}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Instructions */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>Instructions de préparation</Text>
          <View style={st.stepsList}>
            {recipe.steps.map((step, index) => (
              <View key={index} style={st.stepRow}>
                <View style={st.stepNumberCircle}>
                  <Text style={st.stepNumberText}>{index + 1}</Text>
                </View>
                <Text style={st.stepText}>{step}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Note de l'expert */}
        {recipe.notes ? (
          <View style={st.notesCard}>
            <View style={st.notesHeader}>
              <Info size={16} color={colors.sage[700]} />
              <Text style={st.notesTitle}>Note de l'expert nutrition</Text>
            </View>
            <Text style={st.notesText}>{recipe.notes}</Text>
          </View>
        ) : null}

        {/* Éducation : Lecture d'Étiquette */}
        <View style={st.eduCard}>
          <View style={st.eduHeader}>
            <BookOpen size={18} color="#fff" />
            <Text style={st.eduTitle}>Guide d\'Éducation V9 : Lecture d\'Étiquettes</Text>
          </View>
          <View style={st.eduContent}>
            <Text style={st.eduText}>
              1. **Ordre des ingrédients** : Analysez toujours la liste dans l'ordre décroissant. Si le sucre ou des huiles hydrogénées figurent parmi les 3 premiers ingrédients, le produit est classé comme **ultra-transformé**.
            </Text>
            <Text style={st.eduText}>
              2. **Détection des sucres cachés** : Méfiez-vous des dénominations cachées comme la maltodextrine, le dextrose, le sirop de maïs ou le sucre de canne évaporé.
            </Text>
            <Text style={st.eduText}>
              3. **Ratio Céréalier Performance** : Visez idéalement un ratio de **1g de fibres pour 5g de glucides** sur tous vos produits céréaliers afin de ralentir l'absorption intestinale.
            </Text>
          </View>
        </View>

        {/* Action Button */}
        <Pressable
          onPress={handleAdd}
          style={[st.actionBtn, added && st.actionBtnSuccess]}
          accessibilityRole="button"
        >
          {added ? <Check size={18} color="#fff" /> : <Plus size={18} color="#fff" />}
          <Text style={st.actionBtnText}>
            {added ? 'Ajouté à votre journal !' : 'Ajouter ce repas au journal'}
          </Text>
        </Pressable>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fbf8f3' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing[4], paddingVertical: spacing[3],
    borderBottomWidth: 1, borderBottomColor: colors.ink[100],
    backgroundColor: '#fff'
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: fontFamily.spectral.bold, fontSize: fontSize.lg, color: colors.ink[900], flex: 1, textAlign: 'center' },
  scroll: { padding: spacing[4] },
  hero: { marginBottom: spacing[6] },
  categoryTag: { fontFamily: fontFamily.hanken.bold, fontSize: fontSize.xs, color: colors.sage[600], textTransform: 'uppercase', marginBottom: 6 },
  title: { fontFamily: fontFamily.spectral.bold, fontSize: fontSize['2xl'], color: colors.ink[900], marginBottom: spacing[3] },
  desc: { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.base, color: colors.ink[600], lineHeight: 22, marginBottom: spacing[4] },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[4], marginBottom: spacing[4] },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontFamily: fontFamily.hanken.medium, fontSize: fontSize.sm, color: colors.ink[600] },
  macrosCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.ink[200],
    borderRadius: radius.xl, padding: spacing[4], ...shadows.sm
  },
  macro: { alignItems: 'center', flex: 1 },
  macroValue: { fontFamily: fontFamily.spectral.bold, fontSize: fontSize.lg, color: colors.ink[900] },
  macroLabel: { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.xs, color: colors.ink[400], marginTop: 2 },
  macroLine: { width: 1, height: 28, backgroundColor: colors.ink[200] },
  section: { marginBottom: spacing[6] },
  sectionTitle: { fontFamily: fontFamily.spectral.bold, fontSize: fontSize.lg, color: colors.ink[900], marginBottom: spacing[4] },
  ingredientsList: { backgroundColor: '#fff', borderRadius: radius.xl, borderWidth: 1.5, borderColor: colors.ink[200], padding: spacing[4] },
  ingredientRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing[2] },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.sage[500], marginRight: spacing[3] },
  ingName: { flex: 1, fontFamily: fontFamily.hanken.medium, fontSize: fontSize.sm, color: colors.ink[800] },
  ingQty: { fontFamily: fontFamily.hanken.bold, fontSize: fontSize.sm, color: colors.sage[600] },
  stepsList: { gap: spacing[3] },
  stepRow: { flexDirection: 'row', gap: spacing[4], backgroundColor: '#fff', borderRadius: radius.xl, borderWidth: 1.5, borderColor: colors.ink[200], padding: spacing[4] },
  stepNumberCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.sage[100], alignItems: 'center', justifyContent: 'center' },
  stepNumberText: { fontFamily: fontFamily.hanken.bold, fontSize: fontSize.sm, color: colors.sage[700] },
  stepText: { flex: 1, fontFamily: fontFamily.hanken.regular, fontSize: fontSize.sm, color: colors.ink[700], lineHeight: 20 },
  notesCard: { backgroundColor: colors.sage[50], borderRadius: radius.xl, borderWidth: 1, borderColor: colors.sage[200], padding: spacing[4], marginBottom: spacing[6] },
  notesHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  notesTitle: { fontFamily: fontFamily.hanken.bold, fontSize: fontSize.sm, color: colors.sage[800] },
  notesText: { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.sm, color: colors.sage[700], lineHeight: 20 },
  eduCard: { backgroundColor: colors.ink[900], borderRadius: radius.xl, padding: spacing[4], marginBottom: spacing[6] },
  eduHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing[3] },
  eduTitle: { fontFamily: fontFamily.hanken.bold, fontSize: fontSize.sm, color: '#fff' },
  eduContent: { gap: spacing[2] },
  eduText: { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.xs, color: colors.ink[300], lineHeight: 18 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.sage[600], borderRadius: radius.pill, height: 50,
    marginTop: spacing[4], ...shadows.md
  },
  actionBtnSuccess: { backgroundColor: colors.sage[700] },
  actionBtnText: { fontFamily: fontFamily.hanken.bold, fontSize: fontSize.base, color: '#fff' }
});

export default RecipeDetailScreen;
