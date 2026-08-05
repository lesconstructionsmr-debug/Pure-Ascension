import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, StyleSheet, Pressable, ScrollView, TextInput,
  SafeAreaView, KeyboardAvoidingView, Platform
} from 'react-native';
import { showAlert } from '../utils/alert';
import {
  X, Check, Plus, Trash2, ShoppingBag, RefreshCw, Filter, Sparkles, ChevronDown, CheckCircle2
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, fontFamily, fontSize, lineHeight, spacing, radius, shadows } from '../theme/theme';

export type RayonCategory = 'Protéines' | 'Légumes & Fruits' | 'Épicerie & Oléagineux' | 'Boissons & Électrolytes';

export interface GroceryItem {
  id: string;
  name: string;
  category: RayonCategory;
  checked: boolean;
  isCustom?: boolean;
}

const STORAGE_KEY = '@pure_ascension_grocery_list_v1';

const DEFAULT_ITEMS: GroceryItem[] = [
  // ── Protéines ──────────────────────────────────────────────────────────────
  { id: 'p01', name: 'Poulet fermier bio (blancs)', category: 'Protéines', checked: false },
  { id: 'p02', name: 'Cuisses de poulet désossées', category: 'Protéines', checked: false },
  { id: 'p03', name: 'Dinde hachée maigre', category: 'Protéines', checked: false },
  { id: 'p04', name: 'Poitrine de dinde', category: 'Protéines', checked: false },
  { id: 'p05', name: 'Bœuf haché 5% MG', category: 'Protéines', checked: false },
  { id: 'p06', name: 'Steak de bœuf', category: 'Protéines', checked: false },
  { id: 'p07', name: 'Œufs frais bio plein air (x12)', category: 'Protéines', checked: false },
  { id: 'p08', name: 'Blancs d\'œufs', category: 'Protéines', checked: false },
  { id: 'p09', name: 'Pavé de saumon sauvage', category: 'Protéines', checked: false },
  { id: 'p10', name: 'Saumon fumé', category: 'Protéines', checked: false },
  { id: 'p11', name: 'Thon en conserve au naturel', category: 'Protéines', checked: false },
  { id: 'p12', name: 'Pavé de thon frais', category: 'Protéines', checked: false },
  { id: 'p13', name: 'Filet de cabillaud', category: 'Protéines', checked: false },
  { id: 'p14', name: 'Crevettes décortiquées', category: 'Protéines', checked: false },
  { id: 'p15', name: 'Sardines à l\'huile d\'olive', category: 'Protéines', checked: false },
  { id: 'p16', name: 'Skyr nature 0%', category: 'Protéines', checked: false },
  { id: 'p17', name: 'Yaourt grec nature', category: 'Protéines', checked: false },
  { id: 'p18', name: 'Fromage blanc 0%', category: 'Protéines', checked: false },
  { id: 'p19', name: 'Cottage cheese', category: 'Protéines', checked: false },
  { id: 'p20', name: 'Tofu ferme bio', category: 'Protéines', checked: false },
  { id: 'p21', name: 'Tempeh', category: 'Protéines', checked: false },
  { id: 'p22', name: 'Edamame surgelé', category: 'Protéines', checked: false },
  { id: 'p23', name: 'Protéine whey / végétale', category: 'Protéines', checked: false },
  { id: 'p24', name: 'Jambon de dinde tranché', category: 'Protéines', checked: false },

  // ── Légumes & Fruits ───────────────────────────────────────────────────────
  { id: 'v01', name: 'Épinards frais', category: 'Légumes & Fruits', checked: false },
  { id: 'v02', name: 'Roquette', category: 'Légumes & Fruits', checked: false },
  { id: 'v03', name: 'Laitue / batavia', category: 'Légumes & Fruits', checked: false },
  { id: 'v04', name: 'Brocolis', category: 'Légumes & Fruits', checked: false },
  { id: 'v05', name: 'Chou-fleur', category: 'Légumes & Fruits', checked: false },
  { id: 'v06', name: 'Chou rouge', category: 'Légumes & Fruits', checked: false },
  { id: 'v07', name: 'Courgettes', category: 'Légumes & Fruits', checked: false },
  { id: 'v08', name: 'Aubergines', category: 'Légumes & Fruits', checked: false },
  { id: 'v09', name: 'Poivrons (rouge / jaune / vert)', category: 'Légumes & Fruits', checked: false },
  { id: 'v10', name: 'Tomates', category: 'Légumes & Fruits', checked: false },
  { id: 'v11', name: 'Tomates cerises', category: 'Légumes & Fruits', checked: false },
  { id: 'v12', name: 'Concombre', category: 'Légumes & Fruits', checked: false },
  { id: 'v13', name: 'Carottes', category: 'Légumes & Fruits', checked: false },
  { id: 'v14', name: 'Patates douces', category: 'Légumes & Fruits', checked: false },
  { id: 'v15', name: 'Pommes de terre', category: 'Légumes & Fruits', checked: false },
  { id: 'v16', name: 'Asperges', category: 'Légumes & Fruits', checked: false },
  { id: 'v17', name: 'Haricots verts', category: 'Légumes & Fruits', checked: false },
  { id: 'v18', name: 'Champignons de Paris', category: 'Légumes & Fruits', checked: false },
  { id: 'v19', name: 'Oignons', category: 'Légumes & Fruits', checked: false },
  { id: 'v20', name: 'Oignons verts / ciboule', category: 'Légumes & Fruits', checked: false },
  { id: 'v21', name: 'Ail', category: 'Légumes & Fruits', checked: false },
  { id: 'v22', name: 'Échalotes', category: 'Légumes & Fruits', checked: false },
  { id: 'v23', name: 'Poireaux', category: 'Légumes & Fruits', checked: false },
  { id: 'v24', name: 'Céleri', category: 'Légumes & Fruits', checked: false },
  { id: 'v25', name: 'Radis', category: 'Légumes & Fruits', checked: false },
  { id: 'v26', name: 'Betteraves', category: 'Légumes & Fruits', checked: false },
  { id: 'v27', name: 'Maïs doux', category: 'Légumes & Fruits', checked: false },
  { id: 'v28', name: 'Avocats (x3)', category: 'Légumes & Fruits', checked: false },
  { id: 'v29', name: 'Citrons (x4)', category: 'Légumes & Fruits', checked: false },
  { id: 'v30', name: 'Limes (x3)', category: 'Légumes & Fruits', checked: false },
  { id: 'v31', name: 'Bananes', category: 'Légumes & Fruits', checked: false },
  { id: 'v32', name: 'Pommes', category: 'Légumes & Fruits', checked: false },
  { id: 'v33', name: 'Myrtilles / bleuets', category: 'Légumes & Fruits', checked: false },
  { id: 'v34', name: 'Fraises', category: 'Légumes & Fruits', checked: false },
  { id: 'v35', name: 'Framboises', category: 'Légumes & Fruits', checked: false },
  { id: 'v36', name: 'Mangue', category: 'Légumes & Fruits', checked: false },
  { id: 'v37', name: 'Oranges', category: 'Légumes & Fruits', checked: false },
  { id: 'v38', name: 'Kiwi', category: 'Légumes & Fruits', checked: false },
  { id: 'v39', name: 'Gingembre frais', category: 'Légumes & Fruits', checked: false },
  { id: 'v40', name: 'Persil frais', category: 'Légumes & Fruits', checked: false },
  { id: 'v41', name: 'Coriandre fraîche', category: 'Légumes & Fruits', checked: false },
  { id: 'v42', name: 'Basilic frais', category: 'Légumes & Fruits', checked: false },

  // ── Épicerie & Oléagineux ──────────────────────────────────────────────────
  { id: 'e01', name: 'Huile d\'olive extra-vierge', category: 'Épicerie & Oléagineux', checked: false },
  { id: 'e02', name: 'Huile de coco', category: 'Épicerie & Oléagineux', checked: false },
  { id: 'e03', name: 'Huile d\'avocat', category: 'Épicerie & Oléagineux', checked: false },
  { id: 'e04', name: 'Riz basmati', category: 'Épicerie & Oléagineux', checked: false },
  { id: 'e05', name: 'Riz complet', category: 'Épicerie & Oléagineux', checked: false },
  { id: 'e06', name: 'Quinoa', category: 'Épicerie & Oléagineux', checked: false },
  { id: 'e07', name: 'Flocons d\'avoine', category: 'Épicerie & Oléagineux', checked: false },
  { id: 'e08', name: 'Pâtes complètes', category: 'Épicerie & Oléagineux', checked: false },
  { id: 'e09', name: 'Pain de seigle / levain', category: 'Épicerie & Oléagineux', checked: false },
  { id: 'e10', name: 'Tortillas de blé complet', category: 'Épicerie & Oléagineux', checked: false },
  { id: 'e11', name: 'Pois chiches (conserve ou secs)', category: 'Épicerie & Oléagineux', checked: false },
  { id: 'e12', name: 'Lentilles vertes', category: 'Épicerie & Oléagineux', checked: false },
  { id: 'e13', name: 'Haricots noirs', category: 'Épicerie & Oléagineux', checked: false },
  { id: 'e14', name: 'Amandes brutes', category: 'Épicerie & Oléagineux', checked: false },
  { id: 'e15', name: 'Noix de cajou', category: 'Épicerie & Oléagineux', checked: false },
  { id: 'e16', name: 'Noix de Grenoble', category: 'Épicerie & Oléagineux', checked: false },
  { id: 'e17', name: 'Beurre d\'amande', category: 'Épicerie & Oléagineux', checked: false },
  { id: 'e18', name: 'Beurre de cacahuète 100%', category: 'Épicerie & Oléagineux', checked: false },
  { id: 'e19', name: 'Graines de chia', category: 'Épicerie & Oléagineux', checked: false },
  { id: 'e20', name: 'Graines de lin moulues', category: 'Épicerie & Oléagineux', checked: false },
  { id: 'e21', name: 'Graines de tournesol', category: 'Épicerie & Oléagineux', checked: false },
  { id: 'e22', name: 'Graines de courge', category: 'Épicerie & Oléagineux', checked: false },
  { id: 'e23', name: 'Graines de sésame', category: 'Épicerie & Oléagineux', checked: false },
  { id: 'e24', name: 'Vinaigre de cidre de pomme', category: 'Épicerie & Oléagineux', checked: false },
  { id: 'e25', name: 'Moutarde de Dijon', category: 'Épicerie & Oléagineux', checked: false },
  { id: 'e26', name: 'Sauce soja / tamari', category: 'Épicerie & Oléagineux', checked: false },
  { id: 'e27', name: 'Aminos de coco', category: 'Épicerie & Oléagineux', checked: false },
  { id: 'e28', name: 'Miel brut', category: 'Épicerie & Oléagineux', checked: false },
  { id: 'e29', name: 'Sirop d\'érable pur', category: 'Épicerie & Oléagineux', checked: false },
  { id: 'e30', name: 'Curcuma moulu', category: 'Épicerie & Oléagineux', checked: false },
  { id: 'e31', name: 'Poivre noir', category: 'Épicerie & Oléagineux', checked: false },
  { id: 'e32', name: 'Sel de mer', category: 'Épicerie & Oléagineux', checked: false },
  { id: 'e33', name: 'Cannelle moulue', category: 'Épicerie & Oléagineux', checked: false },
  { id: 'e34', name: 'Paprika fumé', category: 'Épicerie & Oléagineux', checked: false },
  { id: 'e35', name: 'Cumin', category: 'Épicerie & Oléagineux', checked: false },
  { id: 'e36', name: 'Herbes de Provence', category: 'Épicerie & Oléagineux', checked: false },
  { id: 'e37', name: 'Thym séché', category: 'Épicerie & Oléagineux', checked: false },
  { id: 'e38', name: 'Romarin séché', category: 'Épicerie & Oléagineux', checked: false },
  { id: 'e39', name: 'Origan séché', category: 'Épicerie & Oléagineux', checked: false },
  { id: 'e40', name: 'Feta / fromage frais', category: 'Épicerie & Oléagineux', checked: false },
  { id: 'e41', name: 'Parmesan', category: 'Épicerie & Oléagineux', checked: false },
  { id: 'e42', name: 'Lait d\'amande non sucré', category: 'Épicerie & Oléagineux', checked: false },
  { id: 'e43', name: 'Lait d\'avoine', category: 'Épicerie & Oléagineux', checked: false },
  { id: 'e44', name: 'Conserves de tomates', category: 'Épicerie & Oléagineux', checked: false },

  // ── Boissons & Électrolytes ────────────────────────────────────────────────
  { id: 'b01', name: 'Eau minérale riche en magnésium', category: 'Boissons & Électrolytes', checked: false },
  { id: 'b02', name: 'Eau gazeuse', category: 'Boissons & Électrolytes', checked: false },
  { id: 'b03', name: 'Eau de coco pure 100%', category: 'Boissons & Électrolytes', checked: false },
  { id: 'b04', name: 'Infusion camomille', category: 'Boissons & Électrolytes', checked: false },
  { id: 'b05', name: 'Infusion verveine', category: 'Boissons & Électrolytes', checked: false },
  { id: 'b06', name: 'Thé vert', category: 'Boissons & Électrolytes', checked: false },
  { id: 'b07', name: 'Café en grains / moulu', category: 'Boissons & Électrolytes', checked: false },
  { id: 'b08', name: 'Électrolytes / sels minéraux', category: 'Boissons & Électrolytes', checked: false },
];

const RAYON_ICONS: Record<RayonCategory, string> = {
  'Protéines': '🥩',
  'Légumes & Fruits': '🥦',
  'Épicerie & Oléagineux': '🌾',
  'Boissons & Électrolytes': '💧',
};

const CATEGORIES: RayonCategory[] = [
  'Protéines',
  'Légumes & Fruits',
  'Épicerie & Oléagineux',
  'Boissons & Électrolytes',
];

/** Aligne les catégories groceryService (Légumes / Épicerie / Épices) sur les rayons du modal. */
function normalizeCategory(raw: unknown): RayonCategory {
  const value = String(raw ?? '');
  switch (value) {
    case 'Protéines':
      return 'Protéines';
    case 'Légumes':
    case 'Légumes & Fruits':
      return 'Légumes & Fruits';
    case 'Épicerie':
    case 'Épices':
    case 'Épicerie & Oléagineux':
      return 'Épicerie & Oléagineux';
    case 'Boissons & Électrolytes':
      return 'Boissons & Électrolytes';
    default:
      return 'Épicerie & Oléagineux';
  }
}

function normalizeGroceryItems(parsed: any[]): GroceryItem[] {
  return parsed.map((item, index) => {
    const name = String(item?.name ?? '').trim() || `Article ${index + 1}`;
    const qty = item?.quantity ? String(item.quantity).trim() : '';
    const displayName = qty && !name.includes(qty) ? `${name} — ${qty}` : name;
    return {
      id: String(item?.id ?? `item-${index}-${Date.now()}`),
      name: displayName,
      category: normalizeCategory(item?.category),
      checked: Boolean(item?.checked),
      isCustom: Boolean(item?.isCustom) || Boolean(item?.sourceMeal),
    };
  });
}

interface GroceryListModalProps {
  visible: boolean;
  onClose: () => void;
}

export const GroceryListModal: React.FC<GroceryListModalProps> = ({ visible, onClose }) => {
  const [items, setItems] = useState<GroceryItem[]>(DEFAULT_ITEMS);
  const [newItemName, setNewItemName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<RayonCategory>('Protéines');
  const [filterMode, setFilterMode] = useState<'all' | 'pending' | 'done'>('all');
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (visible) {
      loadSavedItems();
    }
  }, [visible]);

  const loadSavedItems = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const normalized = normalizeGroceryItems(parsed);
          setItems(normalized);
          // Réécrit les catégories normalisées pour les prochains opens
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
        }
      }
    } catch (err) {
      console.error('Erreur lors du chargement de la liste de courses:', err);
    }
  };

  const saveItems = async (newItems: GroceryItem[]) => {
    try {
      setItems(newItems);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newItems));
    } catch (err) {
      console.error('Erreur lors de la sauvegarde de la liste de courses:', err);
    }
  };

  const toggleItem = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updated = items.map(item =>
      item.id === id ? { ...item, checked: !item.checked } : item
    );
    saveItems(updated);
  };

  const handleAddItem = () => {
    if (!newItemName.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newItem: GroceryItem = {
      id: Date.now().toString(),
      name: newItemName.trim(),
      category: selectedCategory,
      checked: false,
      isCustom: true,
    };
    saveItems([newItem, ...items]);
    setNewItemName('');
    setShowAddForm(false);
  };

  const handleDeleteItem = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const updated = items.filter(item => item.id !== id);
    saveItems(updated);
  };

  const handleResetChecklist = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    showAlert(
      'Réinitialiser la liste',
      'Voulez-vous décocher tous les éléments de la liste de courses ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Décocher tout',
          onPress: () => {
            const updated = items.map(item => ({ ...item, checked: false }));
            saveItems(updated);
          },
        },
      ]
    );
  };

  const handleResetDefaultList = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    showAlert(
      'Restaurer la liste par défaut',
      'Recharger la banque Pure Ascension (~120 aliments individuels) ? Votre liste actuelle sera remplacée.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Restaurer',
          style: 'destructive',
          onPress: () => saveItems(DEFAULT_ITEMS),
        },
      ]
    );
  };

  const totalCount = items.length;
  const checkedCount = items.filter(i => i.checked).length;
  const progressPct = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  const filteredItems = items.filter(item => {
    if (filterMode === 'pending') return !item.checked;
    if (filterMode === 'done') return item.checked;
    return true;
  });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={s.container}
        >
          {/* Header */}
          <View style={s.header}>
            <View style={s.headerTitleWrap}>
              <View style={s.iconBadge}>
                <ShoppingBag size={20} color={colors.sage[600]} />
              </View>
              <View>
                <Text style={s.headerTitle}>Liste de Courses Intelligente</Text>
                <Text style={s.headerSubTitle}>Aliments recommandés P1 Pure Ascension</Text>
              </View>
            </View>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onClose();
              }}
              style={s.closeButton}
              accessibilityRole="button"
            >
              <X size={20} color={colors.ink[700]} />
            </Pressable>
          </View>

          {/* Progress Card */}
          <View style={s.progressCard}>
            <View style={s.progressHeader}>
              <View style={{ flex: 1 }}>
                <Text style={s.progressTitle}>Progression de tes courses</Text>
                <Text style={s.progressCount}>
                  {checkedCount} / {totalCount} article{totalCount > 1 ? 's' : ''} dans le panier ({progressPct}%)
                </Text>
              </View>
              <View style={s.progressBadge}>
                <Text style={s.progressBadgeText}>{progressPct}%</Text>
              </View>
            </View>

            <View style={s.track}>
              <View style={[s.fill, { width: `${progressPct}%` }]} />
            </View>

            <View style={s.actionRow}>
              <Pressable
                style={s.actionBtn}
                onPress={handleResetChecklist}
                accessibilityRole="button"
              >
                <RefreshCw size={13} color={colors.sand[100]} />
                <Text style={s.actionBtnText}>Décocher tout</Text>
              </Pressable>

              <Pressable
                style={s.actionBtn}
                onPress={handleResetDefaultList}
                accessibilityRole="button"
              >
                <Sparkles size={13} color={colors.sage[300]} />
                <Text style={s.actionBtnText}>Restaurer recommandé</Text>
              </Pressable>
            </View>
          </View>

          {/* Filter Bar & Add Button */}
          <View style={s.topControls}>
            <View style={s.filterTabs}>
              {[
                { id: 'all', label: `Tous (${items.length})` },
                { id: 'pending', label: `À prendre (${items.length - checkedCount})` },
                { id: 'done', label: `Pris (${checkedCount})` },
              ].map(f => (
                <Pressable
                  key={f.id}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setFilterMode(f.id as any);
                  }}
                  style={[s.filterTab, filterMode === f.id && s.filterTabActive]}
                  accessibilityRole="button"
                >
                  <Text
                    style={[s.filterTabText, filterMode === f.id && s.filterTabTextActive]}
                  >
                    {f.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              style={s.addItemTriggerBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setShowAddForm(!showAddForm);
              }}
              accessibilityRole="button"
            >
              <Plus size={16} color="#fff" />
              <Text style={s.addItemTriggerText}>Ajouter</Text>
            </Pressable>
          </View>

          {/* Add Item Form (Expandable) */}
          {showAddForm && (
            <View style={s.addFormCard}>
              <Text style={s.addFormTitle}>Ajouter un article personnalisé</Text>
              <TextInput
                style={s.input}
                placeholder="Nom de l'article (ex: Huile de coco, Avocats...)"
                placeholderTextColor={colors.ink[400]}
                value={newItemName}
                onChangeText={setNewItemName}
              />
              <Text style={s.categorySelectLabel}>Choisir le rayon :</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing[3] }}>
                <View style={{ flexDirection: 'row', gap: spacing[2] }}>
                  {CATEGORIES.map(cat => (
                    <Pressable
                      key={cat}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSelectedCategory(cat);
                      }}
                      style={[
                        s.catChip,
                        selectedCategory === cat && s.catChipSelected,
                      ]}
                      accessibilityRole="button"
                    >
                      <Text style={s.catChipIcon}>{RAYON_ICONS[cat]}</Text>
                      <Text
                        style={[
                          s.catChipText,
                          selectedCategory === cat && s.catChipTextSelected,
                        ]}
                      >
                        {cat}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>

              <View style={s.addFormActions}>
                <Pressable
                  style={s.cancelAddBtn}
                  onPress={() => setShowAddForm(false)}
                  accessibilityRole="button"
                >
                  <Text style={s.cancelAddText}>Annuler</Text>
                </Pressable>
                <Pressable
                  style={s.submitAddBtn}
                  onPress={handleAddItem}
                  accessibilityRole="button"
                >
                  <Text style={s.submitAddText}>Ajouter à la liste</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Checklist by Rayon */}
          <ScrollView style={s.scrollList} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
            {CATEGORIES.map(rayon => {
              const rayonItems = filteredItems.filter(i => i.category === rayon);
              if (rayonItems.length === 0) return null;

              const rayonDone = rayonItems.filter(i => i.checked).length;
              const rayonTotal = rayonItems.length;

              return (
                <View key={rayon} style={s.rayonSection}>
                  {/* Rayon Header */}
                  <View style={s.rayonHeader}>
                    <View style={s.rayonHeaderLeft}>
                      <Text style={s.rayonEmoji}>{RAYON_ICONS[rayon]}</Text>
                      <Text style={s.rayonTitle}>{rayon}</Text>
                    </View>
                    <Text style={s.rayonBadge}>
                      {rayonDone}/{rayonTotal}
                    </Text>
                  </View>

                  {/* Rayon Items */}
                  <View style={s.rayonCard}>
                    {rayonItems.map((item, idx) => (
                      <View key={item.id}>
                        <Pressable
                          style={[s.itemRow, item.checked && s.itemRowChecked]}
                          onPress={() => toggleItem(item.id)}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: item.checked }}
                        >
                          <View
                            style={[
                              s.checkbox,
                              item.checked && s.checkboxChecked,
                            ]}
                          >
                            {item.checked && <Check size={14} color="#fff" strokeWidth={3} />}
                          </View>

                          <Text
                            style={[
                              s.itemName,
                              item.checked && s.itemNameChecked,
                            ]}
                          >
                            {item.name}
                          </Text>

                          {item.isCustom && (
                            <Pressable
                              style={s.deleteBtn}
                              onPress={() => handleDeleteItem(item.id)}
                              hitSlop={10}
                              accessibilityRole="button"
                            >
                              <Trash2 size={15} color={colors.ink[400]} />
                            </Pressable>
                          )}
                        </Pressable>
                        {idx < rayonItems.length - 1 && <View style={s.itemDivider} />}
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}

            {filteredItems.length === 0 && (
              <View style={s.emptyState}>
                <CheckCircle2 size={40} color={colors.sage[400]} />
                <Text style={s.emptyTitle}>
                  {filterMode === 'done'
                    ? 'Aucun article validé pour le moment'
                    : filterMode === 'pending'
                    ? 'Tous tes articles sont déjà dans le panier ! 🎉'
                    : 'Aucun article trouvé dans ta liste'}
                </Text>
              </View>
            )}

            <View style={{ height: spacing[10] }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 42, 34, 0.65)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.sand[50],
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: '92%',
    maxHeight: '92%',
    paddingTop: spacing[4],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.ink[200],
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    flex: 1,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.sage[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fontFamily.spectral.medium,
    fontSize: fontSize.lg,
    color: colors.ink[900],
  },
  headerSubTitle: {
    fontFamily: fontFamily.hanken.regular,
    fontSize: fontSize.xs,
    color: colors.ink[600],
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.ink[100],
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Progress Card
  progressCard: {
    margin: spacing[5],
    padding: spacing[4],
    backgroundColor: colors.sage[900],
    borderRadius: radius.xl,
    gap: spacing[3],
    ...shadows.md,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressTitle: {
    fontFamily: fontFamily.hanken.semiBold,
    fontSize: fontSize.sm,
    color: colors.sand[100],
  },
  progressCount: {
    fontFamily: fontFamily.hanken.regular,
    fontSize: fontSize.xs,
    color: colors.sage[200],
    marginTop: 2,
  },
  progressBadge: {
    backgroundColor: colors.sage[700],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radius.pill,
  },
  progressBadgeText: {
    fontFamily: fontFamily.hanken.bold,
    fontSize: fontSize.xs,
    color: '#fff',
  },
  track: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.sage[300],
    borderRadius: 4,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing[1],
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: radius.pill,
  },
  actionBtnText: {
    fontFamily: fontFamily.hanken.medium,
    fontSize: fontSize.xs,
    color: colors.sand[100],
  },

  // Controls
  topControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[5],
    marginBottom: spacing[3],
    gap: spacing[2],
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: colors.ink[100],
    borderRadius: radius.pill,
    padding: 3,
    flex: 1,
  },
  filterTab: {
    flex: 1,
    paddingVertical: spacing[1.5],
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  filterTabActive: {
    backgroundColor: '#fff',
    ...shadows.sm,
  },
  filterTabText: {
    fontFamily: fontFamily.hanken.medium,
    fontSize: 11,
    color: colors.ink[600],
  },
  filterTabTextActive: {
    fontFamily: fontFamily.hanken.bold,
    color: colors.ink[900],
  },
  addItemTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.clay[500],
    paddingHorizontal: spacing[3.5],
    paddingVertical: spacing[2],
    borderRadius: radius.pill,
  },
  addItemTriggerText: {
    fontFamily: fontFamily.hanken.semiBold,
    fontSize: fontSize.xs,
    color: '#fff',
  },

  // Add Form Card
  addFormCard: {
    marginHorizontal: spacing[5],
    marginBottom: spacing[4],
    padding: spacing[4],
    backgroundColor: '#fff',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.clay[200],
    ...shadows.sm,
  },
  addFormTitle: {
    fontFamily: fontFamily.hanken.bold,
    fontSize: fontSize.sm,
    color: colors.ink[900],
    marginBottom: spacing[2.5],
  },
  input: {
    backgroundColor: colors.sand[50],
    borderWidth: 1,
    borderColor: colors.ink[200],
    borderRadius: radius.md,
    paddingHorizontal: spacing[3.5],
    paddingVertical: spacing[2.5],
    fontFamily: fontFamily.hanken.regular,
    fontSize: fontSize.sm,
    color: colors.ink[900],
    marginBottom: spacing[3],
  },
  categorySelectLabel: {
    fontFamily: fontFamily.hanken.medium,
    fontSize: fontSize.xs,
    color: colors.ink[600],
    marginBottom: spacing[2],
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: radius.pill,
    backgroundColor: colors.sand[100],
    borderWidth: 1,
    borderColor: colors.ink[200],
  },
  catChipSelected: {
    backgroundColor: colors.sage[100],
    borderColor: colors.sage[500],
  },
  catChipIcon: {
    fontSize: 12,
  },
  catChipText: {
    fontFamily: fontFamily.hanken.regular,
    fontSize: fontSize.xs,
    color: colors.ink[700],
  },
  catChipTextSelected: {
    fontFamily: fontFamily.hanken.bold,
    color: colors.sage[700],
  },
  addFormActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing[2.5],
  },
  cancelAddBtn: {
    paddingHorizontal: spacing[3.5],
    paddingVertical: spacing[2],
    borderRadius: radius.md,
  },
  cancelAddText: {
    fontFamily: fontFamily.hanken.medium,
    fontSize: fontSize.xs,
    color: colors.ink[600],
  },
  submitAddBtn: {
    backgroundColor: colors.sage[600],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radius.md,
  },
  submitAddText: {
    fontFamily: fontFamily.hanken.bold,
    fontSize: fontSize.xs,
    color: '#fff',
  },

  // Rayon Sections
  scrollList: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[6],
    gap: spacing[4],
  },
  rayonSection: {
    gap: spacing[2],
  },
  rayonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[1],
  },
  rayonHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  rayonEmoji: {
    fontSize: 16,
  },
  rayonTitle: {
    fontFamily: fontFamily.hanken.bold,
    fontSize: fontSize.sm,
    color: colors.ink[900],
  },
  rayonBadge: {
    fontFamily: fontFamily.hanken.medium,
    fontSize: fontSize.xs,
    color: colors.ink[500],
  },
  rayonCard: {
    backgroundColor: '#fff',
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.ink[200],
    ...shadows.sm,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3.5],
  },
  itemRowChecked: {
    backgroundColor: colors.sand[50],
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.ink[300],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: colors.sage[600],
    borderColor: colors.sage[600],
  },
  itemName: {
    flex: 1,
    fontFamily: fontFamily.hanken.medium,
    fontSize: fontSize.sm,
    color: colors.ink[900],
  },
  itemNameChecked: {
    textDecorationLine: 'line-through',
    color: colors.ink[400],
    fontFamily: fontFamily.hanken.regular,
  },
  deleteBtn: {
    padding: spacing[1],
  },
  itemDivider: {
    height: 1,
    backgroundColor: colors.ink[100],
    marginLeft: spacing[11],
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[10],
    gap: spacing[3],
  },
  emptyTitle: {
    fontFamily: fontFamily.hanken.medium,
    fontSize: fontSize.sm,
    color: colors.ink[600],
    textAlign: 'center',
  },
});

export default GroceryListModal;
