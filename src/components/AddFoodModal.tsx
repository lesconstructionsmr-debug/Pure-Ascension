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
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const r = await searchOFF(q);
        setResults(r);
        setSearched(true);
      } catch {
        setError('Connexion impossible. Essaie l\'entrée manuelle.');
        setResults([]);
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
