import React, { useState } from 'react';
import {
  Pressable, SafeAreaView, ScrollView, StyleSheet,
  Text, TextInput, View
} from 'react-native';
import { Search, Lock, ChevronRight, Plus, ArrowLeft, Check } from 'lucide-react-native';
import { colors, fontFamily, fontSize, spacing, radius, shadows } from '../theme/theme';
import { useProgramStore } from '../store/useProgramStore';
import { useCalorie } from '../context/CalorieContext';

export interface Recipe {
  id: string;
  name: string;
  category: 'reset' | 'hormone' | 'satiete';
  categoryLabel: string;
  kcal: number;
  proteins: number;
  carbs: number;
  fats: number;
  prepTime: string;
  description: string;
  ingredients: { name: string; qty: string }[];
  steps: string[];
  notes: string;
}

export const RECIPES: Recipe[] = [
  {
    id: 'rec-1',
    name: 'Bouillon d\'Os Détox & Collagène',
    category: 'reset',
    categoryLabel: 'Reset Métabolique (14j)',
    kcal: 75,
    proteins: 14,
    carbs: 1,
    fats: 2,
    prepTime: '15 min (hors cuisson)',
    description: 'Une boisson hautement cicatrisante pour la barrière intestinale (Leaky Gut) et de soutien de la détox hépatique.',
    ingredients: [
      { name: 'Bouillon d\'os biologique', qty: '250 ml' },
      { name: 'Collagène hydrolysé', qty: '10g' },
      { name: 'Gingembre frais râpé', qty: '5g' },
      { name: 'Curcuma moulu', qty: '1/2 c. à thé' },
      { name: 'Sel de mer non raffiné', qty: '1 pincée' }
    ],
    steps: [
      'Faire chauffer doucement le bouillon d\'os dans une casserole.',
      'Hors du feu, ajouter la poudre de collagène et fouetter énergiquement pour l\'intégrer sans grumeaux.',
      'Ajouter le gingembre frais et le curcuma anti-inflammatoire.',
      'Déguster à jeun au lever ou entre les repas principaux pour apaiser l\'intestin.'
    ],
    notes: 'Totalement sans allergène courant. Parfait pour le matin de votre phase de reset.'
  },
  {
    id: 'rec-2',
    name: 'Saumon Vapeur au Curcuma & Brocoli',
    category: 'reset',
    categoryLabel: 'Reset Métabolique (14j)',
    kcal: 340,
    proteins: 36,
    carbs: 8,
    fats: 16,
    prepTime: '20 min',
    description: 'Riche en oméga-3 et composés souffrés (brocoli) pour stimuler les phases 1 et 2 de la détoxication du foie.',
    ingredients: [
      { name: 'Filet de saumon sauvage', qty: '120g' },
      { name: 'Brocoli coupé en florets', qty: '150g' },
      { name: 'Huile d\'olive extra-vierge', qty: '1 c. à table' },
      { name: 'Curcuma frais ou moulu', qty: '1/2 c. à thé' },
      { name: 'Jus de citron frais', qty: '1 c. à table' }
    ],
    steps: [
      'Cuire le saumon et les florets de brocoli à la vapeur douce pendant 8 à 10 minutes.',
      'Préparer la sauce en mélangeant l\'huile d\'olive extra-vierge, le curcuma et le jus de citron.',
      'Dresser le poisson et le brocoli dans une assiette.',
      'Napper avec la sauce tiède juste avant de consommer.'
    ],
    notes: 'Excellente densité nutritionnelle. Le curcuma requiert des graisses saines (saumon/huile) pour être bien assimilé.'
  },
  {
    id: 'rec-3',
    name: 'Assiette Signature Estrogène-Balance',
    category: 'hormone',
    categoryLabel: 'Équilibre Hormonal',
    kcal: 440,
    proteins: 40,
    carbs: 35,
    fats: 14,
    prepTime: '25 min',
    description: 'Respecte le ratio d\'architecture hormonale : 50% de légumes colorés, 25% protéines, 25% glucides complexes.',
    ingredients: [
      { name: 'Poitrine de dinde émincée', qty: '130g' },
      { name: 'Patate douce coupée en dés', qty: '120g' },
      { name: 'Asperges et pousses d\'épinards', qty: '150g' },
      { name: 'Huile d\'olive extra-vierge', qty: '1 c. à table' },
      { name: 'Aminos de coco sans soja', qty: '1 c. à table' }
    ],
    steps: [
      'Préchauffer le four à 200°C et rôtir les dés de patate douce avec un filet d\'huile d\'olive pendant 20 minutes.',
      'Poêler les lanières de dinde dans une poêle antiadhésive avec les asperges coupées.',
      'Ajouter les pousses d\'épinards en fin de cuisson pour les faire tomber doucement.',
      'Dresser l\'assiette en divisant visuellement : la moitié de légumes verts, un quart de dinde et un quart de patate douce.',
      'Arroser d\'un trait d\'aminos de coco pour le goût salé anti-inflammatoire.'
    ],
    notes: 'Optimise l\'équilibre hormonal du dîner et régule l\'insuline grâce à la patate douce à index glycémique modéré.'
  },
  {
    id: 'rec-4',
    name: 'Salade Arc-en-ciel au Thon Grillé',
    category: 'hormone',
    categoryLabel: 'Équilibre Hormonal',
    kcal: 460,
    proteins: 38,
    carbs: 32,
    fats: 18,
    prepTime: '15 min',
    description: 'Richesse en antioxydants colorés pour neutraliser le stress oxydatif et réguler la progestérone.',
    ingredients: [
      { name: 'Pavé de thon rouge ou blanc', qty: '120g' },
      { name: 'Chou rouge et carotte râpée', qty: '120g' },
      { name: 'Quinoa cuit', qty: '100g' },
      { name: 'Avocat en tranches', qty: '1/2' },
      { name: 'Graines de chia', qty: '1 c. à thé' },
      { name: 'Vinaigre de cidre de pomme', qty: '1 c. à table' }
    ],
    steps: [
      'Saisir le pavé de thon dans une poêle bien chaude 1 à 2 minutes par face (garder le cœur mi-cuit).',
      'Mélanger le chou rouge, la carotte râpée et le quinoa dans un bol.',
      'Ajouter le thon coupé en tranches, le demi-avocat et saupoudrer de graines de chia.',
      'Assaisonner avec du vinaigre de cidre de pomme et un trait d\'huile de lin.'
    ],
    notes: 'Le chou rouge contient des indoles-3-carbinols qui aident à la détoxification saine des estrogènes.'
  },
  {
    id: 'rec-5',
    name: 'Pouding de Chia aux Bleuets & Cannelle',
    category: 'satiete',
    categoryLabel: 'Collation Satiété',
    kcal: 195,
    proteins: 7,
    carbs: 18,
    fats: 9,
    prepTime: '5 min (hors repos)',
    description: 'Collation riche en fibres solubles (chia) pour réguler le microbiote et le transit intestinal.',
    ingredients: [
      { name: 'Graines de chia', qty: '2 c. à table' },
      { name: 'Lait d\'amande non sucré', qty: '150 ml' },
      { name: 'Bleuets frais ou congelés', qty: '50g' },
      { name: 'Cannelle moulue', qty: '1/2 c. à thé' },
      { name: 'Extrait de vanille pure', qty: '3 gouttes' }
    ],
    steps: [
      'Dans un pot en verre, mélanger les graines de chia, le lait d\'amande, la vanille et la cannelle.',
      'Bien mélanger à la fourchette pour éviter que les graines ne s\'agglomèrent en bas.',
      'Laisser reposer au réfrigérateur pendant au moins 4 heures (idéalement toute la nuit).',
      'Ajouter les bleuets frais sur le dessus juste avant de consommer.'
    ],
    notes: 'La cannelle aide à stabiliser la glycémie en imitant l\'action de l\'insuline, parfait contre les rages de sucre.'
  },
  {
    id: 'rec-6',
    name: 'Skyr Protéiné aux Amandes',
    category: 'satiete',
    categoryLabel: 'Collation Satiété',
    kcal: 220,
    proteins: 24,
    carbs: 12,
    fats: 7,
    prepTime: '5 min',
    description: 'Une collation à haute densité de protéines pour maximiser le signal de satiété musculaire.',
    ingredients: [
      { name: 'Skyr nature 0% MG', qty: '200g' },
      { name: 'Amandes brutes non salées', qty: '15g' },
      { name: 'Framboises fraîches', qty: '40g' },
      { name: 'Graines de lin moulues', qty: '1 c. à thé' }
    ],
    steps: [
      'Verser le skyr dans un bol.',
      'Ajouter les amandes brutes pour apporter du croquant mécanique (stimulation de la mastication).',
      'Saupoudrer de graines de lin moulues pour les oméga-3 et les fibres.',
      'Décorer avec les framboises et déguster lentement.'
    ],
    notes: 'Le skyr est très dense en caséine, ce qui ralentit la vidange gastrique et offre une satiété de longue durée.'
  },
  {
    id: 'rec-7',
    name: 'Potage Crémeux de Courge au Lait de Coco',
    category: 'reset',
    categoryLabel: 'Reset Métabolique (14j)',
    kcal: 180,
    proteins: 4,
    carbs: 22,
    fats: 10,
    prepTime: '25 min',
    description: 'Un velouté réconfortant, riche en antioxydants et graisses saines pour soutenir la barrière digestive.',
    ingredients: [
      { name: 'Courge butternut cuite', qty: '200g' },
      { name: 'Crème de coco biologique', qty: '50ml' },
      { name: 'Bouillon de légumes', qty: '150ml' },
      { name: 'Gingembre frais râpé', qty: '5g' },
      { name: 'Curcuma moulu', qty: '1/2 c. à thé' }
    ],
    steps: [
      'Mixer la courge butternut cuite avec le bouillon de légumes chaud.',
      'Ajouter le lait de coco, le gingembre et le curcuma.',
      'Réchauffer à feu doux pendant 5 minutes sans faire bouillir.',
      'Servir chaud avec un filet d\'huile de coco.'
    ],
    notes: 'Excellente recette anti-inflammatoire et douce pour l\'intestin irrité.'
  },
  {
    id: 'rec-8',
    name: 'Sardines Grillées aux Herbes & Concombre',
    category: 'reset',
    categoryLabel: 'Reset Métabolique (14j)',
    kcal: 290,
    proteins: 28,
    carbs: 4,
    fats: 18,
    prepTime: '15 min',
    description: 'Richesse en oméga-3 biodisponibles et très faible charge glycémique pour la phase de reset.',
    ingredients: [
      { name: 'Sardines fraîches vidées', qty: '120g' },
      { name: 'Concombre en tranches', qty: '150g' },
      { name: 'Huile d\'olive extra-vierge', qty: '1 c. à table' },
      { name: 'Aneth frais ciselé', qty: '1 c. à table' },
      { name: 'Jus de citron', qty: '1 c. à table' }
    ],
    steps: [
      'Griller les sardines à la poêle ou au four pendant 3 à 4 minutes par face.',
      'Mélanger les tranches de concombre avec l\'huile d\'olive, l\'aneth et le citron.',
      'Servir les sardines chaudes accompagnées de la salade fraîche.'
    ],
    notes: 'Les sardines fournissent également du calcium de haute qualité grâce à leurs arêtes très fines.'
  },
  {
    id: 'rec-9',
    name: 'Poulet Mariné au Romarin & Quinoa',
    category: 'hormone',
    categoryLabel: 'Équilibre Hormonal',
    kcal: 420,
    proteins: 38,
    carbs: 36,
    fats: 12,
    prepTime: '25 min',
    description: 'Une assiette équilibrée favorisant la synthèse protéique et le maintien de la masse musculaire.',
    ingredients: [
      { name: 'Poitrine de poulet fermier', qty: '120g' },
      { name: 'Quinoa cuit', qty: '120g' },
      { name: 'Huile d\'avocat', qty: '1 c. à table' },
      { name: 'Romarin frais haché', qty: '1 c. à thé' },
      { name: 'Jus de citron vert', qty: '1 c. à table' }
    ],
    steps: [
      'Faire mariner le poulet avec le romarin, le citron et l\'huile d\'avocat pendant 15 minutes.',
      'Cuire le poulet à la poêle pendant 6 à 8 minutes de chaque côté.',
      'Dresser avec le quinoa chaud et accompagner de légumes cuits au choix.'
    ],
    notes: 'Le romarin contient de l\'acide carnosique qui protège les cellules du stress oxydatif.'
  },
  {
    id: 'rec-10',
    name: 'Bol de Kéfir aux Graines & Grenade',
    category: 'hormone',
    categoryLabel: 'Équilibre Hormonal',
    kcal: 260,
    proteins: 12,
    carbs: 22,
    fats: 14,
    prepTime: '5 min',
    description: 'Un concentré de probiotiques et d\'antioxydants pour équilibrer l\'axe intestin-cerveau.',
    ingredients: [
      { name: 'Kéfir de chèvre ou de brebis', qty: '150ml' },
      { name: 'Graines de grenade fraîches', qty: '40g' },
      { name: 'Graines de citrouille', qty: '15g' },
      { name: 'Miel brut', qty: '1 c. à thé' }
    ],
    steps: [
      'Verser le kéfir dans un bol.',
      'Ajouter les graines de grenade riches en polyphénols.',
      'Parsemer de graines de citrouille pour l\'apport en zinc et magnésium.',
      'Napper de miel brut.'
    ],
    notes: 'Le zinc des graines de citrouille soutient la production hormonale saine.'
  },
  {
    id: 'rec-11',
    name: 'Omelette Légère aux Épinards & Avocat',
    category: 'satiete',
    categoryLabel: 'Collation Satiété',
    kcal: 310,
    proteins: 20,
    carbs: 6,
    fats: 22,
    prepTime: '10 min',
    description: 'Une omelette riche en lipides sains et protéines pour couper durablement la faim.',
    ingredients: [
      { name: 'Œufs entiers biologiques', qty: '3' },
      { name: 'Pousses d\'épinards frais', qty: '50g' },
      { name: 'Avocat en dés', qty: '1/2' },
      { name: 'Huile de coco', qty: '1 c. à thé' }
    ],
    steps: [
      'Fouetter les œufs dans un bol avec une pincée de sel.',
      'Faire tomber les épinards dans une poêle chaude avec l\'huile de coco.',
      'Verser les œufs et cuire à feu moyen jusqu\'à la consistance souhaitée.',
      'Ajouter les dés d\'avocat frais au moment de plier l\'omelette.'
    ],
    notes: 'Une excellente option pour un brunch ou un repas rapide qui soutient la satiété pendant plusieurs heures.'
  },
  {
    id: 'rec-12',
    name: 'Smoothie Vert Vitalité & Whey',
    category: 'satiete',
    categoryLabel: 'Collation Satiété',
    kcal: 280,
    proteins: 26,
    carbs: 14,
    fats: 12,
    prepTime: '5 min',
    description: 'Un smoothie onctueux, faible en sucre et riche en fibres et protéines pour une récupération rapide.',
    ingredients: [
      { name: 'Isolat de protéine de lactosérum (Whey)', qty: '25g' },
      { name: 'Lait d\'amande non sucré', qty: '200ml' },
      { name: 'Avocat', qty: '1/4' },
      { name: 'Pousses d\'épinards frais', qty: '30g' },
      { name: 'Graines de chia', qty: '1 c. à table' }
    ],
    steps: [
      'Placer tous les ingrédients dans un mélangeur (blender).',
      'Mixer à puissance maximale pendant 1 minute jusqu\'à obtention d\'une texture lisse et crémeuse.',
      'Servir immédiatement avec des glaçons si désiré.'
    ],
    notes: 'L\'avocat apporte une texture veloutée très agréable tout en fournissant des graisses monoinsaturées protectrices.'
  }
];

interface Props {
  navigation: any;
}

export const RecipeBookScreen: React.FC<Props> = ({ navigation }) => {
  const isPremium = useProgramStore(s => s.isPremium);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'reset' | 'hormone' | 'satiete'>('reset');
  const { addEntry } = useCalorie();
  const [addedId, setAddedId] = useState<string | null>(null);

  const filteredRecipes = RECIPES.filter(
    r =>
      r.category === activeTab &&
      (r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.description.toLowerCase().includes(search.toLowerCase()))
  );

  const handleAdd = (recipe: Recipe) => {
    addEntry({
      name: `[Recette] ${recipe.name}`,
      kcal: recipe.kcal,
      proteins: recipe.proteins,
      carbs: recipe.carbs,
      fats: recipe.fats
    });
    setAddedId(recipe.id);
    setTimeout(() => setAddedId(null), 2000);
  };

  const handleRecipePress = (recipe: Recipe) => {
    if (!isPremium) {
      useProgramStore.getState().setShowPaywall(true);
    } else {
      navigation.navigate('RecipeDetail', { recipeId: recipe.id });
    }
  };

  return (
    <SafeAreaView style={st.safe}>
      <View style={st.header}>
        <Pressable onPress={() => navigation.goBack()} style={st.backBtn} accessibilityRole="button">
          <ArrowLeft size={20} color={colors.ink[700]} />
        </Pressable>
        <Text style={st.headerTitle}>Livre de Recettes</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
        {/* Search */}
        <View style={st.searchContainer}>
          <Search size={18} color={colors.ink[400]} />
          <TextInput
            style={st.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Rechercher une recette saine..."
            placeholderTextColor={colors.ink[400]}
          />
        </View>

        {/* Categories / Tabs */}
        <View style={st.tabsRow}>
          {(['reset', 'hormone', 'satiete'] as const).map(tab => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[st.tabBtn, activeTab === tab && st.tabBtnActive]}
            >
              <Text style={[st.tabText, activeTab === tab && st.tabTextActive]}>
                {tab === 'reset' ? 'Reset 14j' : tab === 'hormone' ? 'Équilibre' : 'Satiété'}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Upsell Banner for non-premium */}
        {!isPremium && (
          <Pressable onPress={() => useProgramStore.getState().setShowPaywall(true)} style={st.upsellCard}>
            <View style={st.lockCircle}>
              <Lock size={20} color={colors.sage[600]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.upsellTitle}>Pure Ascension Premium</Text>
              <Text style={st.upsellSub}>
                Débloque le Livre de Recettes complet validé par nos experts seniors en nutrition.
              </Text>
            </View>
            <ChevronRight size={18} color={colors.ink[400]} />
          </Pressable>
        )}

        {/* Recipes list */}
        <View style={st.list}>
          {filteredRecipes.map(recipe => {
            const isAdded = addedId === recipe.id;
            return (
              <Pressable
                key={recipe.id}
                onPress={() => handleRecipePress(recipe)}
                style={[st.recipeCard, !isPremium && st.recipeCardLocked]}
              >
                <View style={st.recipeHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={st.tagRow}>
                      <Text style={st.recipeCategory}>{recipe.categoryLabel}</Text>
                      {!isPremium && (
                        <View style={st.lockTag}>
                          <Lock size={10} color="#fff" />
                          <Text style={st.lockTagText}>Premium</Text>
                        </View>
                      )}
                    </View>
                    <Text style={st.recipeName}>{recipe.name}</Text>
                  </View>
                </View>

                <Text style={st.recipeDesc} numberOfLines={2}>
                  {recipe.description}
                </Text>

                {/* Macros row */}
                <View style={st.macrosRow}>
                  <View style={st.macro}>
                    <Text style={st.macroValue}>{recipe.kcal}</Text>
                    <Text style={st.macroLabel}>kcal</Text>
                  </View>
                  <View style={st.macroLine} />
                  <View style={st.macro}>
                    <Text style={st.macroValue}>{recipe.proteins}g</Text>
                    <Text style={st.macroLabel}>Prot</Text>
                  </View>
                  <View style={st.macroLine} />
                  <View style={st.macro}>
                    <Text style={st.macroValue}>{recipe.carbs}g</Text>
                    <Text style={st.macroLabel}>Gluc</Text>
                  </View>
                  <View style={st.macroLine} />
                  <View style={st.macro}>
                    <Text style={st.macroValue}>{recipe.fats}g</Text>
                    <Text style={st.macroLabel}>Lip</Text>
                  </View>
                </View>

                {/* Interactive buttons */}
                {isPremium && (
                  <View style={st.cardFooter}>
                    <Pressable
                      onPress={() => handleAdd(recipe)}
                      style={[st.addBtn, isAdded && st.addBtnSuccess]}
                      accessibilityRole="button"
                    >
                      <Plus size={16} color="#fff" />
                      <Text style={st.addBtnText}>
                        {isAdded ? 'Ajouté !' : 'Ajouter au journal'}
                      </Text>
                    </Pressable>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
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
  headerTitle: { fontFamily: fontFamily.spectral.bold, fontSize: fontSize.xl, color: colors.ink[900] },
  scroll: { padding: spacing[4], paddingBottom: 100 },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[3],
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.ink[200],
    borderRadius: radius.lg, paddingHorizontal: spacing[4], height: 50,
    marginBottom: spacing[4]
  },
  searchInput: { flex: 1, fontFamily: fontFamily.hanken.regular, fontSize: fontSize.base, color: colors.ink[900], padding: 0 },
  tabsRow: { flexDirection: 'row', gap: spacing[2], marginBottom: spacing[5] },
  tabBtn: {
    flex: 1, alignItems: 'center', paddingVertical: spacing[3],
    borderRadius: radius.lg, backgroundColor: '#fff',
    borderWidth: 1, borderColor: colors.ink[200]
  },
  tabBtnActive: { backgroundColor: colors.sage[500], borderColor: colors.sage[500] },
  tabText: { fontFamily: fontFamily.hanken.medium, fontSize: fontSize.sm, color: colors.ink[600] },
  tabTextActive: { color: '#fff', fontFamily: fontFamily.hanken.bold },
  upsellCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[4],
    backgroundColor: colors.sage[50], borderWidth: 1.5, borderColor: colors.sage[200],
    borderRadius: radius.xl, padding: spacing[4], marginBottom: spacing[5]
  },
  lockCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.sage[100], alignItems: 'center', justifyContent: 'center'
  },
  upsellTitle: { fontFamily: fontFamily.hanken.bold, fontSize: fontSize.base, color: colors.sage[900] },
  upsellSub: { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.xs, color: colors.sage[700], marginTop: 2, lineHeight: 16 },
  list: { gap: spacing[4] },
  recipeCard: {
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.ink[200],
    borderRadius: radius.xl, padding: spacing[4], ...shadows.md
  },
  recipeCardLocked: { opacity: 0.8 },
  recipeHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: spacing[2] },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: 4 },
  recipeCategory: { fontFamily: fontFamily.hanken.bold, fontSize: fontSize.xs, color: colors.sage[600], textTransform: 'uppercase' },
  lockTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.sage[500], paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: radius.pill
  },
  lockTagText: { fontFamily: fontFamily.hanken.bold, fontSize: 9, color: '#fff' },
  recipeName: { fontFamily: fontFamily.spectral.bold, fontSize: fontSize.lg, color: colors.ink[900] },
  recipeDesc: { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.sm, color: colors.ink[600], lineHeight: 18, marginBottom: spacing[4] },
  macrosRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fbf8f3', borderRadius: radius.lg, padding: spacing[3],
    marginBottom: spacing[4]
  },
  macro: { alignItems: 'center', flex: 1 },
  macroValue: { fontFamily: fontFamily.spectral.medium, fontSize: fontSize.base, color: colors.ink[800] },
  macroLabel: { fontFamily: fontFamily.hanken.regular, fontSize: 10, color: colors.ink[400], marginTop: 2 },
  macroLine: { width: 1, height: 24, backgroundColor: colors.ink[200] },
  cardFooter: { flexDirection: 'row', justifyContent: 'flex-end' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.sage[500], paddingHorizontal: spacing[4], paddingVertical: spacing[2] + 2,
    borderRadius: radius.pill, ...shadows.sm
  },
  addBtnSuccess: { backgroundColor: colors.sage[600] },
  addBtnText: { fontFamily: fontFamily.hanken.bold, fontSize: fontSize.xs, color: '#fff' }
});

export default RecipeBookScreen;
