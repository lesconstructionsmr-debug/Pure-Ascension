/**
 * AddFoodModal
 * - Recherche Open Food Facts (FR)
 * - 8 presets rapides
 * - Entrée manuelle fallback
 */
import React, { useState, useCallback, useRef } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Modal, Platform,
  Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { Search, X, Plus, ChevronRight, AlertCircle } from 'lucide-react-native';
import { colors, fontFamily, fontSize, lineHeight, spacing, radius, shadows } from '../theme/theme';
import { useCalorie } from '../context/CalorieContext';

/* ─── Presets ──────────────────────────────────────────────────────────────── */
const PRESETS = [
  { name:'Café noir',       kcal:2,   proteins:0.3, carbs:0,  fats:0 },
  { name:'Café + lait',     kcal:35,  proteins:1.8, carbs:3,  fats:1.5 },
  { name:'Banane',          kcal:89,  proteins:1.1, carbs:23, fats:0.3 },
  { name:'Pomme',           kcal:72,  proteins:0.4, carbs:19, fats:0.1 },
  { name:'Œuf entier',      kcal:78,  proteins:6,   carbs:0.6,fats:5 },
  { name:'Yaourt grec 0%',  kcal:59,  proteins:10,  carbs:3.6,fats:0.4 },
  { name:'Riz cuit 150g',   kcal:195, proteins:4,   carbs:43, fats:0.3 },
  { name:'Poulet 100g',     kcal:165, proteins:31,  carbs:0,  fats:3.6 },
  { name:'Saumon 100g',     kcal:208, proteins:20,  carbs:0,  fats:13 },
  { name:'Avocat demi',     kcal:120, proteins:1.5, carbs:6.8,fats:11 },
  { name:'Amandes poignée', kcal:164, proteins:6,   carbs:6.1,fats:14 },
  { name:'Whey (1 scoop)',  kcal:120, proteins:24,  carbs:3,  fats:1.5 },
  { name:'Patate douce',    kcal:130, proteins:2.4, carbs:30, fats:0.15 },
];

const LOCAL_DATABASE = [
  // Fruits
  { name: 'Banane', kcal: 89, proteins: 1.1, carbs: 23, fats: 0.3 },
  { name: 'Pomme', kcal: 52, proteins: 0.3, carbs: 14, fats: 0.2 },
  { name: 'Fraise', kcal: 32, proteins: 0.7, carbs: 7.7, fats: 0.3 },
  { name: 'Orange', kcal: 47, proteins: 0.9, carbs: 12, fats: 0.1 },
  { name: 'Framboise', kcal: 53, proteins: 1.2, carbs: 12, fats: 0.7 },
  { name: 'Myrtille', kcal: 57, proteins: 0.7, carbs: 14, fats: 0.3 },
  { name: 'Avocat', kcal: 160, proteins: 2, carbs: 9, fats: 15 },

  // Protéines / Viandes / Poissons
  { name: 'Saumon (pavé)', kcal: 208, proteins: 20, carbs: 0, fats: 13 },
  { name: 'Saumon fumé', kcal: 117, proteins: 18, carbs: 0, fats: 4.5 },
  { name: 'Blanc de poulet (cuit)', kcal: 165, proteins: 31, carbs: 0, fats: 3.6 },
  { name: 'Steak haché 5% (cuit)', kcal: 138, proteins: 21, carbs: 0, fats: 5 },
  { name: 'Steak haché 15% (cuit)', kcal: 210, proteins: 19, carbs: 0, fats: 15 },
  { name: 'Dinde (poitrine)', kcal: 135, proteins: 30, carbs: 0, fats: 1.5 },
  { name: 'Thon en conserve (au naturel)', kcal: 116, proteins: 26, carbs: 0, fats: 1 },
  { name: 'Crevettes (cuites)', kcal: 99, proteins: 24, carbs: 0.2, fats: 0.3 },
  { name: 'Œuf entier (gros)', kcal: 78, proteins: 6, carbs: 0.6, fats: 5 },
  { name: 'Blanc d\'œuf', kcal: 52, proteins: 11, carbs: 0.7, fats: 0.2 },

  // Féculents / Céréales
  { name: 'Flocons d\'avoine', kcal: 389, proteins: 16.9, carbs: 66, fats: 6.9 },
  { name: 'Riz basmati (cuit)', kcal: 130, proteins: 2.7, carbs: 28, fats: 0.3 },
  { name: 'Pâtes (cuites)', kcal: 157, proteins: 5.8, carbs: 31, fats: 0.9 },
  { name: 'Patate douce (cuite)', kcal: 86, proteins: 1.6, carbs: 20, fats: 0.1 },
  { name: 'Pomme de terre (cuite)', kcal: 87, proteins: 1.9, carbs: 20, fats: 0.1 },
  { name: 'Quinoa (cuit)', kcal: 120, proteins: 4.4, carbs: 21, fats: 1.9 },
  { name: 'Pain de blé entier (tranche)', kcal: 69, proteins: 3.6, carbs: 12, fats: 0.9 },

  // Produits Laitiers / Alternatifs
  { name: 'Yaourt grec 0%', kcal: 59, proteins: 10, carbs: 3.6, fats: 0.4 },
  { name: 'Cottage cheese 2%', kcal: 98, proteins: 11, carbs: 3.4, fats: 4.3 },
  { name: 'Fromage blanc 0%', kcal: 48, proteins: 8, carbs: 4, fats: 0 },
  { name: 'Lait demi-écrémé (100ml)', kcal: 46, proteins: 3.3, carbs: 4.8, fats: 1.5 },
  { name: 'Lait d\'amande sans sucre (100ml)', kcal: 13, proteins: 0.4, carbs: 0.3, fats: 1.1 },

  // Oléagineux / Graines / Graisses
  { name: 'Amandes (28g)', kcal: 164, proteins: 6, carbs: 6.1, fats: 14 },
  { name: 'Noix (28g)', kcal: 185, proteins: 4.3, carbs: 3.9, fats: 18.5 },
  { name: 'Beurre de cacahuète (1 c. à s.)', kcal: 94, proteins: 4, carbs: 3, fats: 8 },
  { name: 'Huile d\'olive (1 c. à s.)', kcal: 119, proteins: 0, carbs: 0, fats: 13.5 },
  { name: 'Graines de chia (10g)', kcal: 49, proteins: 1.7, carbs: 4.2, fats: 3.1 },

  // Légumes
  { name: 'Brocoli (cuit)', kcal: 35, proteins: 2.4, carbs: 7.2, fats: 0.4 },
  { name: 'Épinards (cuits)', kcal: 23, proteins: 3, carbs: 3.8, fats: 0.3 },
  { name: 'Haricots verts (cuits)', kcal: 31, proteins: 1.8, carbs: 7, fats: 0.1 },
  { name: 'Concombre', kcal: 15, proteins: 0.7, carbs: 3.6, fats: 0.1 },
  { name: 'Tomate', kcal: 18, proteins: 0.9, carbs: 3.9, fats: 0.2 },

  // Suppléments
  { name: 'Whey Protein (1 mesure)', kcal: 120, proteins: 24, carbs: 3, fats: 1.5 },

  // 🛒 INVENTAIRE COSTCO / KIRKLAND SIGNATURE
  { name: 'Costco — Poulet Rôti Kirkland (100g)', kcal: 165, proteins: 28, carbs: 0, fats: 6 },
  { name: 'Costco — Poitrine de Poulet Désossée Kirkland (100g)', kcal: 120, proteins: 26, carbs: 0, fats: 1.5 },
  { name: 'Costco — Blancs d\'Œufs Liquides Kirkland (100ml)', kcal: 50, proteins: 11, carbs: 1, fats: 0 },
  { name: 'Costco — Saumon Atlantique Sauvage Kirkland (100g)', kcal: 210, proteins: 22, carbs: 0, fats: 13 },
  { name: 'Costco — Barre Protéinée Kirkland (60g)', kcal: 190, proteins: 21, carbs: 22, fats: 7 },
  { name: 'Costco — Yaourt Grec Nature 0% Kirkland (175g)', kcal: 100, proteins: 18, carbs: 6, fats: 0 },
  { name: 'Costco — Flocons d\'Avoine Bio Kirkland (50g)', kcal: 190, proteins: 7, carbs: 32, fats: 3.5 },
  { name: 'Costco — Beurre d\'Amande Naturel Kirkland (16g)', kcal: 98, proteins: 3.4, carbs: 3, fats: 8.8 },
  { name: 'Costco — Beurre de Cacahuète Bio Kirkland (16g)', kcal: 95, proteins: 4, carbs: 3, fats: 8 },
  { name: 'Costco — Bœuf Haché Maigre 90/10 Kirkland (100g)', kcal: 170, proteins: 22, carbs: 0, fats: 9 },
  { name: 'Costco — Bacon de Dinde Kirkland (2 tranches)', kcal: 70, proteins: 6, carbs: 1, fats: 5 },
  { name: 'Costco — Fruits Rouges Surgelés Kirkland (140g)', kcal: 70, proteins: 1, carbs: 17, fats: 0.5 },
  { name: 'Costco — Noix de Cajou Kirkland (30g)', kcal: 170, proteins: 5, carbs: 9, fats: 14 },
  { name: 'Costco — Dinde Hachée Kirkland (100g)', kcal: 150, proteins: 20, carbs: 0, fats: 8 },
  { name: 'Costco — Quinoa Biologique Kirkland Cuit (150g)', kcal: 180, proteins: 6.5, carbs: 32, fats: 3 },
  { name: 'Costco — Premier Protein Shake Kirkland (330ml)', kcal: 160, proteins: 30, carbs: 5, fats: 3 },
  { name: 'Costco — Cottage Cheese 2% Kirkland (125g)', kcal: 100, proteins: 14, carbs: 4, fats: 2.5 },
  { name: 'Costco — Guacamole Individuel Kirkland (57g)', kcal: 100, proteins: 1, carbs: 5, fats: 9 },
  { name: 'Costco — Crevettes Blanches Surgelées Kirkland (100g)', kcal: 85, proteins: 20, carbs: 0, fats: 0.5 },

  // 🛒 INVENTAIRE IGA / MARQUES QUÉBÉCOISES (Compliments, Oikos, St-Hubert, etc.)
  { name: 'IGA — Poitrine de Poulet Compliments (100g)', kcal: 130, proteins: 27, carbs: 0, fats: 2 },
  { name: 'IGA — Œufs Gros Compliments (1 œuf)', kcal: 70, proteins: 6, carbs: 0.5, fats: 5 },
  { name: 'IGA — Poitrine de Poulet Rôti St-Hubert (100g)', kcal: 155, proteins: 25, carbs: 1, fats: 5.5 },
  { name: 'IGA — Yaourt Grec 2% Oikos (175g)', kcal: 130, proteins: 15, carbs: 9, fats: 3.5 },
  { name: 'IGA — Yaourt Probiotique Activia (115g)', kcal: 90, proteins: 4, carbs: 13, fats: 2.5 },
  { name: 'IGA — Lait PurFiltre 2% Lactantia (250ml)', kcal: 130, proteins: 9, carbs: 12, fats: 5 },
  { name: 'IGA — Sirop d\'Érable Pur du Québec (15ml)', kcal: 52, proteins: 0, carbs: 13.4, fats: 0 },
  { name: 'IGA — Saumon Fumé Atlantique Compliments (50g)', kcal: 90, proteins: 10, carbs: 0.5, fats: 5 },
  { name: 'IGA — Fromage Oka Régulier (30g)', kcal: 110, proteins: 7, carbs: 0.5, fats: 9 },
  { name: 'IGA — Fromage Cheddar Doux P\'tit Québec (30g)', kcal: 120, proteins: 7, carbs: 0.4, fats: 10 },
  { name: 'IGA — Dinde Hachée Maigre Compliments (100g)', kcal: 140, proteins: 21, carbs: 0, fats: 6 },
  { name: 'IGA — Galette de Riz Sucrée Compliments (1 galette)', kcal: 50, proteins: 1, carbs: 11, fats: 0.5 },
  { name: 'IGA — Hummus Traditionnel Compliments (30g)', kcal: 70, proteins: 2, carbs: 5, fats: 4.5 },
  { name: 'IGA — Pain Multigrains Compliments (1 tranche)', kcal: 80, proteins: 4, carbs: 14, fats: 1.5 },
  { name: 'IGA — Tofu Ferme Bio Compliments (100g)', kcal: 120, proteins: 13, carbs: 2, fats: 7 },
  { name: 'IGA — Dinde Fumée en Tranches Compliments (50g)', kcal: 50, proteins: 10, carbs: 1, fats: 0.7 },
  { name: 'IGA — Mélange Salade César Compliments (100g)', kcal: 140, proteins: 3, carbs: 7, fats: 11 },
  { name: 'IGA — Filet de Porc Mince Béresford (100g)', kcal: 120, proteins: 22, carbs: 0, fats: 3.5 },
  { name: 'IGA — Flocons d\'Avoine Rapides Compliments (40g)', kcal: 150, proteins: 5, carbs: 27, fats: 2.5 }
];

/* ─── Open Food Facts search ───────────────────────────────────────────────── */
interface OFFProduct {
  product_name?: string;
  brands?: string;
  nutriments?: {
    'energy-kcal_100g'?: number;
    proteins_100g?: number;
    carbohydrates_100g?: number;
    fat_100g?: number;
    'energy-kcal_serving'?: number;
    proteins_serving?: number;
    carbohydrates_serving?: number;
    fat_serving?: number;
  };
  serving_size?: string;
  serving_quantity?: number;
}

interface FoodResult {
  name:     string;
  kcal:     number;
  proteins: number;
  carbs:    number;
  fats:     number;
  per:      string; // "par 100g" ou "par portion"
}

function parseProduct(p: OFFProduct): FoodResult | null {
  const name = p.product_name?.trim() || p.brands?.trim();
  if (!name) return null;
  const n = p.nutriments ?? {};
  // Préfère les valeurs par portion si disponibles
  const servingKcal = n['energy-kcal_serving'];
  if (servingKcal && servingKcal > 0) {
    return {
      name,
      kcal:     Math.round(servingKcal),
      proteins: Math.round((n.proteins_serving ?? 0) * 10) / 10,
      carbs:    Math.round((n.carbohydrates_serving ?? 0) * 10) / 10,
      fats:     Math.round((n.fat_serving ?? 0) * 10) / 10,
      per:      p.serving_size ?? 'par portion',
    };
  }
  const kcal100 = n['energy-kcal_100g'] ?? 0;
  if (kcal100 === 0) return null;
  return {
    name,
    kcal:     Math.round(kcal100),
    proteins: Math.round((n.proteins_100g ?? 0) * 10) / 10,
    carbs:    Math.round((n.carbohydrates_100g ?? 0) * 10) / 10,
    fats:     Math.round((n.fat_100g ?? 0) * 10) / 10,
    per:      'par 100g',
  };
}

async function searchOFF(query: string): Promise<FoodResult[]> {
  const url =
    `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}`
    + `&search_simple=1&action=process&json=1&lc=fr&fields=product_name,brands,nutriments,serving_size,serving_quantity&page_size=15`;
  const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error('network');
  const data = await res.json();
  const products: OFFProduct[] = data.products ?? [];
  return products.map(parseProduct).filter(Boolean) as FoodResult[];
}

/* ─── Props ──────────────────────────────────────────────────────────────── */
interface Props { visible: boolean; onClose: () => void; }

type Tab = 'search' | 'manual';

export const AddFoodModal: React.FC<Props> = ({ visible, onClose }) => {
  const { addEntry } = useCalorie();

  const [tab,         setTab]         = useState<Tab>('search');
  const [query,       setQuery]       = useState('');
  const [results,     setResults]     = useState<FoodResult[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [searched,    setSearched]    = useState(false);

  // Champs manuels
  const [manualName,  setManualName]  = useState('');
  const [manualKcal,  setManualKcal]  = useState('');
  const [manualP,     setManualP]     = useState('');
  const [manualC,     setManualC]     = useState('');
  const [manualF,     setManualF]     = useState('');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback(async (q: string) => {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) { setResults([]); setSearched(false); return; }

    // Recherche locale immédiate
    const localMatches = LOCAL_DATABASE.filter(f =>
      f.name.toLowerCase().includes(q.toLowerCase())
    ).map(f => ({
      name: f.name,
      kcal: f.kcal,
      proteins: f.proteins,
      carbs: f.carbs,
      fats: f.fats,
      per: 'portion standard'
    }));

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const r = await searchOFF(q);
        // Fusionner en mettant les correspondances locales en premier
        const combined = [...localMatches];
        r.forEach(item => {
          if (!combined.some(c => c.name.toLowerCase() === item.name.toLowerCase())) {
            combined.push(item);
          }
        });
        setResults(combined);
        setSearched(true);
      } catch {
        if (localMatches.length > 0) {
          setResults(localMatches);
          setSearched(true);
        } else {
          setError('Connexion impossible. Essaie l\'entrée manuelle.');
          setResults([]);
        }
      } finally {
        setLoading(false);
      }
    }, 500);
  }, []);

  const addPreset = (p: typeof PRESETS[0]) => {
    addEntry(p);
    onClose();
    resetAll();
  };

  const addResult = (r: FoodResult) => {
    addEntry({ name: r.name, kcal: r.kcal, proteins: r.proteins, carbs: r.carbs, fats: r.fats });
    onClose();
    resetAll();
  };

  const addManual = () => {
    const kcal = Number(manualKcal);
    if (!manualName.trim() || !kcal) return;
    addEntry({
      name: manualName.trim(),
      kcal,
      proteins: Number(manualP) || 0,
      carbs:    Number(manualC) || 0,
      fats:     Number(manualF) || 0,
    });
    onClose();
    resetAll();
  };

  const resetAll = () => {
    setQuery(''); setResults([]); setSearched(false); setError('');
    setManualName(''); setManualKcal(''); setManualP(''); setManualC(''); setManualF('');
    setTab('search');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => { onClose(); resetAll(); }}
    >
      <KeyboardAvoidingView
        style={s.modal}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Handle */}
        <View style={s.handle} />

        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerTitle}>Ajouter un aliment</Text>
          <Pressable onPress={() => { onClose(); resetAll(); }} style={s.closeBtn} accessibilityRole="button">
            <X size={20} color={colors.ink[700]} strokeWidth={2} />
          </Pressable>
        </View>

        {/* Tabs */}
        <View style={s.tabRow}>
          <Pressable
            style={[s.tabBtn, tab === 'search' && s.tabBtnActive]}
            onPress={() => setTab('search')}
          >
            <Text style={[s.tabLabel, tab === 'search' && s.tabLabelActive]}>Recherche</Text>
          </Pressable>
          <Pressable
            style={[s.tabBtn, tab === 'manual' && s.tabBtnActive]}
            onPress={() => setTab('manual')}
          >
            <Text style={[s.tabLabel, tab === 'manual' && s.tabLabelActive]}>Manuel</Text>
          </Pressable>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* ── SEARCH TAB ── */}
          {tab === 'search' && (
            <View style={s.body}>
              {/* Barre de recherche */}
              <View style={s.searchBar}>
                <Search size={18} color={colors.ink[400]} strokeWidth={1.8} />
                <TextInput
                  style={s.searchInput}
                  value={query}
                  onChangeText={handleSearch}
                  placeholder="Chercher un aliment…"
                  placeholderTextColor={colors.ink[400]}
                  returnKeyType="search"
                  autoFocus
                />
                {loading && <ActivityIndicator size="small" color={colors.sage[500]} />}
                {query.length > 0 && !loading && (
                  <Pressable onPress={() => { setQuery(''); setResults([]); setSearched(false); }}>
                    <X size={16} color={colors.ink[400]} strokeWidth={2} />
                  </Pressable>
                )}
              </View>

              {error ? (
                <View style={s.errorRow}>
                  <AlertCircle size={14} color={colors.status.danger} strokeWidth={2} />
                  <Text style={s.errorText}>{error}</Text>
                </View>
              ) : null}

              {/* Résultats Open Food Facts */}
              {results.length > 0 && (
                <View style={s.section}>
                  <Text style={s.sectionLabel}>Résultats ({results.length})</Text>
                  {results.map((r, i) => (
                    <Pressable key={i} style={s.resultRow} onPress={() => addResult(r)}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.resultName} numberOfLines={1}>{r.name}</Text>
                        <Text style={s.resultMacros}>
                          P {r.proteins}g · G {r.carbs}g · L {r.fats}g · {r.per}
                        </Text>
                      </View>
                      <View style={s.resultKcal}>
                        <Text style={s.resultKcalNum}>{r.kcal}</Text>
                        <Text style={s.resultKcalUnit}>kcal</Text>
                      </View>
                      <ChevronRight size={16} color={colors.ink[400]} strokeWidth={1.8} />
                    </Pressable>
                  ))}
                </View>
              )}

              {searched && results.length === 0 && !loading && !error && (
                <View style={s.emptyBox}>
                  <Text style={s.emptyText}>Aucun résultat pour « {query} »</Text>
                  <Pressable onPress={() => setTab('manual')}>
                    <Text style={s.emptyLink}>Ajouter manuellement →</Text>
                  </Pressable>
                </View>
              )}

              {/* Presets rapides */}
              {!searched && (
                <View style={s.section}>
                  <Text style={s.sectionLabel}>Ajout rapide</Text>
                  <View style={s.presetGrid}>
                    {PRESETS.map(p => (
                      <Pressable key={p.name} style={s.presetCard} onPress={() => addPreset(p)}>
                        <Text style={s.presetName}>{p.name}</Text>
                        <Text style={s.presetKcal}>{p.kcal} kcal</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}

          {/* ── MANUAL TAB ── */}
          {tab === 'manual' && (
            <View style={s.body}>
              <Text style={s.manualLabel}>Nom de l'aliment</Text>
              <TextInput
                style={s.manualInput}
                value={manualName}
                onChangeText={setManualName}
                placeholder="Ex : Bowl quinoa avocat"
                placeholderTextColor={colors.ink[400]}
              />

              <Text style={s.manualLabel}>Calories (kcal) *</Text>
              <TextInput
                style={s.manualInput}
                value={manualKcal}
                onChangeText={setManualKcal}
                keyboardType="numeric"
                placeholder="Ex : 420"
                placeholderTextColor={colors.ink[400]}
              />

              <Text style={s.manualLabel}>Macros (optionnel)</Text>
              <View style={s.macroRow}>
                {[
                  { label:'Protéines (g)', val:manualP, set:setManualP },
                  { label:'Glucides (g)',  val:manualC, set:setManualC },
                  { label:'Lipides (g)',   val:manualF, set:setManualF },
                ].map(m => (
                  <View key={m.label} style={{ flex: 1 }}>
                    <Text style={s.macroLabel}>{m.label}</Text>
                    <TextInput
                      style={s.macroInput}
                      value={m.val}
                      onChangeText={m.set}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={colors.ink[400]}
                    />
                  </View>
                ))}
              </View>

              <Pressable
                style={[s.addBtn, (!manualName.trim() || !manualKcal) && s.addBtnDisabled]}
                onPress={addManual}
                disabled={!manualName.trim() || !manualKcal}
                accessibilityRole="button"
              >
                <Plus size={18} color="#fff" strokeWidth={2} />
                <Text style={s.addBtnLabel}>Ajouter</Text>
              </Pressable>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const s = StyleSheet.create({
  modal:  { flex: 1, backgroundColor: colors.sand[50] },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.ink[300], alignSelf: 'center', marginTop: spacing[3], marginBottom: spacing[2] },

  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing[5], paddingVertical: spacing[4] },
  headerTitle: { flex: 1, fontFamily: fontFamily.hanken.semiBold, fontSize: fontSize.lg, color: colors.ink[900] },
  closeBtn:    { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.ink[100], alignItems: 'center', justifyContent: 'center' },

  tabRow:       { flexDirection: 'row', marginHorizontal: spacing[5], marginBottom: spacing[4], backgroundColor: colors.ink[100], borderRadius: radius.lg, padding: 4 },
  tabBtn:       { flex: 1, paddingVertical: spacing[2], borderRadius: radius.md, alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#fff', ...shadows.sm },
  tabLabel:     { fontFamily: fontFamily.hanken.medium, fontSize: fontSize.sm, color: colors.ink[500] },
  tabLabelActive:{ color: colors.ink[900] },

  body: { paddingHorizontal: spacing[5] },

  searchBar:   { flexDirection: 'row', alignItems: 'center', gap: spacing[3], backgroundColor: '#fff', borderRadius: radius.xl, borderWidth: 1.5, borderColor: colors.ink[200], paddingHorizontal: spacing[4], paddingVertical: spacing[3], marginBottom: spacing[3] },
  searchInput: { flex: 1, fontFamily: fontFamily.hanken.regular, fontSize: fontSize.base, color: colors.ink[900] },

  errorRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[3] },
  errorText: { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.sm, color: colors.status.danger },

  section:      { marginBottom: spacing[5] },
  sectionLabel: { fontFamily: fontFamily.hanken.semiBold, fontSize: fontSize.xs, color: colors.ink[500], textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing[3] },

  resultRow:      { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingVertical: spacing[3], borderBottomWidth: 1, borderBottomColor: colors.ink[100] },
  resultName:     { fontFamily: fontFamily.hanken.semiBold, fontSize: fontSize.sm, color: colors.ink[900], marginBottom: 2 },
  resultMacros:   { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.xs, color: colors.ink[500] },
  resultKcal:     { alignItems: 'center' },
  resultKcalNum:  { fontFamily: fontFamily.hanken.semiBold, fontSize: fontSize.base, color: colors.ink[900] },
  resultKcalUnit: { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.xs, color: colors.ink[500] },

  emptyBox:  { alignItems: 'center', paddingVertical: spacing[8], gap: spacing[3] },
  emptyText: { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.sm, color: colors.ink[500] },
  emptyLink: { fontFamily: fontFamily.hanken.semiBold, fontSize: fontSize.sm, color: colors.sage[600] },

  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  presetCard: {
    backgroundColor: '#fff', borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.ink[200],
    paddingHorizontal: spacing[4], paddingVertical: spacing[3], gap: 2, minWidth: '46%', flex: 1,
  },
  presetName: { fontFamily: fontFamily.hanken.medium, fontSize: fontSize.sm, color: colors.ink[900] },
  presetKcal: { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.xs, color: colors.ink[500] },

  manualLabel: { fontFamily: fontFamily.hanken.semiBold, fontSize: fontSize.sm, color: colors.ink[700], marginBottom: spacing[2], marginTop: spacing[4] },
  manualInput: { backgroundColor: '#fff', borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.ink[200], paddingHorizontal: spacing[4], paddingVertical: spacing[3], fontFamily: fontFamily.hanken.regular, fontSize: fontSize.base, color: colors.ink[900] },

  macroRow:   { flexDirection: 'row', gap: spacing[3], marginTop: spacing[1] },
  macroLabel: { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.xs, color: colors.ink[500], marginBottom: spacing[1] },
  macroInput: { backgroundColor: '#fff', borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.ink[200], paddingHorizontal: spacing[3], paddingVertical: spacing[2.5], fontFamily: fontFamily.hanken.regular, fontSize: fontSize.base, color: colors.ink[900], textAlign: 'center' },

  addBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], backgroundColor: colors.sage[500], borderRadius: radius.xl, paddingVertical: spacing[4], marginTop: spacing[6] },
  addBtnDisabled: { opacity: 0.4 },
  addBtnLabel:    { fontFamily: fontFamily.hanken.semiBold, fontSize: fontSize.base, color: '#fff' },
});

export default AddFoodModal;
