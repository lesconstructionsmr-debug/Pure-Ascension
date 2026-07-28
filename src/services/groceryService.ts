/**
 * groceryService.ts — Service de gestion de la Liste de Courses Intelligente.
 * Extraite du plan de repas hebdomadaire et organisée par rayons :
 * - Protéines
 * - Légumes
 * - Épicerie
 * - Épices
 * Sauvegardée dans Firestore à l'emplacement `users/{uid}/groceryList/current`.
 */

import {
  doc, setDoc, getDoc, updateDoc, onSnapshot, serverTimestamp
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from './firebase';

export type GroceryCategory = 'Protéines' | 'Légumes' | 'Épicerie' | 'Épices';

export interface GroceryItem {
  id: string;
  name: string;
  quantity?: string;
  category: GroceryCategory;
  checked: boolean;
  sourceMeal?: string;
}

export interface GroceryListDoc {
  updatedAt?: any;
  items: GroceryItem[];
  categorized: Record<GroceryCategory, GroceryItem[]>;
}

const STORAGE_KEY = '@pure_ascension_grocery_list_v1';

async function loadLocalGroceryList(): Promise<GroceryItem[]> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (err) {
    console.error('Erreur chargement local liste de courses:', err);
    return [];
  }
}

async function saveLocalGroceryList(items: GroceryItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.error('Erreur sauvegarde locale liste de courses:', err);
  }
}

function mergeGroceryItems(localItems: GroceryItem[], remoteItems: GroceryItem[]): GroceryItem[] {
  if (!remoteItems || remoteItems.length === 0) return localItems;
  if (!localItems || localItems.length === 0) return remoteItems;

  const localMap = new Map(localItems.map(i => [i.id, i]));
  const mergedMap = new Map<string, GroceryItem>();

  // 1. Priorité aux items distants, mais en conservant l'état `checked` local si plus récent ou modifié
  remoteItems.forEach(remoteItem => {
    const localItem = localMap.get(remoteItem.id);
    if (localItem) {
      mergedMap.set(remoteItem.id, {
        ...remoteItem,
        checked: localItem.checked || remoteItem.checked,
      });
      localMap.delete(remoteItem.id);
    } else {
      mergedMap.set(remoteItem.id, remoteItem);
    }
  });

  // 2. Ajouter les éléments créés localement hors-ligne qui ne sont pas encore sur le serveur
  localMap.forEach(localItem => {
    mergedMap.set(localItem.id, localItem);
  });

  return Array.from(mergedMap.values());
}


// ─── Classification par rayon ────────────────────────────────────────────────
const PROTEIN_KEYWORDS = [
  'poulet', 'dinde', 'bœuf', 'boeuf', 'veau', 'saumon', 'thon', 'cabillaud', 'poisson',
  'crevette', 'crevettes', 'sardine', 'sardines', 'maquereau', 'truite', 'morue',
  'œuf', 'oeuf', 'œufs', 'oeufs', 'tofu', 'tempeh', 'edamame',
  'viande', 'jambon', 'seitan', 'steak', 'agneau', 'porc', 'protéine', 'whey',
  'skyr', 'yaourt grec', 'fromage blanc', 'cottage', 'collagène', 'dinde hachée',
];

const VEGETABLE_KEYWORDS = [
  'brocoli', 'brocolis', 'épinard', 'épinards', 'courgette', 'courgettes',
  'carotte', 'carottes', 'poivron', 'poivrons', 'tomate', 'tomates',
  'salade', 'batavia', 'laitue', 'roquette', 'avocat', 'avocats',
  'concombre', 'oignon', 'oignons', 'ail', 'échalote', 'échalotes',
  'chou', 'chou-fleur', 'asperge', 'asperges', 'champignon', 'champignons',
  'céleri', 'courge', 'navet', 'haricot', 'haricots', 'aubergine', 'aubergines',
  'poireau', 'poireaux', 'radis', 'pousses', 'betterave', 'betteraves',
  'maïs', 'patate douce', 'patates douces', 'pomme de terre', 'pommes de terre',
  'persil', 'coriandre', 'basilic', 'menthe', 'ciboulette', 'ciboule',
  'citron', 'citrons', 'lime', 'limes', 'gingembre',
  'banane', 'bananes', 'pomme', 'pommes', 'myrtille', 'myrtilles', 'bleuet', 'bleuets',
  'fraise', 'fraises', 'framboise', 'framboises', 'mangue', 'orange', 'oranges', 'kiwi',
];

const SPICE_KEYWORDS = [
  'curcuma', 'sel', 'poivre', 'cannelle', 'herbe', 'herbes',
  'cumin', 'paprika', 'romarin', 'thym', 'origan', 'vanille',
  'piment', 'curry', 'épices', 'épice', 'herbes de provence', 'muscade',
  'clous de girofle', 'cardamome', 'garam masala',
];

export function categorizeIngredient(ingredientName: string): GroceryCategory {
  const lower = ingredientName.toLowerCase().trim();

  for (const kw of PROTEIN_KEYWORDS) {
    if (lower.includes(kw)) return 'Protéines';
  }
  for (const kw of VEGETABLE_KEYWORDS) {
    if (lower.includes(kw)) return 'Légumes';
  }
  for (const kw of SPICE_KEYWORDS) {
    if (lower.includes(kw)) return 'Épices';
  }

  // Par défaut, tous les autres aliments (riz, quinoa, huile, fruits, lait, etc.) sont dans Épicerie
  return 'Épicerie';
}

function capitalizeIngredient(name: string): string {
  if (!name) return name;
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** Sépare les ingrédients groupés ("X et Y", "X & Y", "X, Y") en items individuels. */
export function splitIngredientName(rawName: string): string[] {
  const cleaned = rawName.replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];

  // Ne pas splitter les noms composés usuels s'il n'y a pas de séparateur clair
  const compoundKeepers = [
    /huile d[’']olive/i,
    /beurre d[’']amande/i,
    /vinaigre de cidre/i,
    /lait d[’']amande/i,
    /patate douce/i,
    /pomme de terre/i,
  ];
  const hasDelimiter = /\s*(?:,|&|\/|\bet\b)\s*/i.test(cleaned);
  if (!hasDelimiter) return [cleaned];
  if (compoundKeepers.some((re) => re.test(cleaned)) && !/\s+(?:et|&)\s+/i.test(cleaned)) {
    return [cleaned];
  }

  const parts = cleaned
    .split(/\s*(?:,|&|\/|\bet\b)\s*/i)
    .map((p) => capitalizeIngredient(p.trim()))
    .filter((p) => p.length > 1);

  if (parts.length <= 1) return [cleaned];

  // Si un split trop agressif a cassé un nom court, garder l'original
  if (parts.some((p) => p.length < 3)) return [cleaned];
  return parts;
}

// ─── Recettes par défaut — ingrédients 100 % individuels ─────────────────────
const DEFAULT_WEEKLY_RECIPES = [
  {
    mealName: 'Bouillon d\'Os & Collagène',
    ingredients: [
      { name: 'Bouillon d\'os biologique', qty: '1 L' },
      { name: 'Collagène hydrolysé en poudre', qty: '50g' },
      { name: 'Gingembre frais', qty: '30g' },
      { name: 'Curcuma moulu', qty: '1 c. à table' },
      { name: 'Sel de mer', qty: '1 pincée' },
      { name: 'Poivre noir', qty: '1 pincée' },
      { name: 'Citron', qty: '1 unité' },
    ],
  },
  {
    mealName: 'Saumon Vapeur au Curcuma & Brocoli',
    ingredients: [
      { name: 'Filet de saumon', qty: '500g' },
      { name: 'Brocolis', qty: '400g' },
      { name: 'Asperges', qty: '200g' },
      { name: 'Huile d\'olive extra-vierge', qty: '4 c. à table' },
      { name: 'Curcuma moulu', qty: '2 c. à thé' },
      { name: 'Citron', qty: '2 unités' },
      { name: 'Ail', qty: '2 gousses' },
      { name: 'Sel de mer', qty: '1 pincée' },
    ],
  },
  {
    mealName: 'Assiette Signature Dinde & Patate Douce',
    ingredients: [
      { name: 'Poitrine de dinde', qty: '500g' },
      { name: 'Patate douce', qty: '500g' },
      { name: 'Épinards frais', qty: '300g' },
      { name: 'Asperges', qty: '200g' },
      { name: 'Huile d\'olive extra-vierge', qty: '3 c. à table' },
      { name: 'Aminos de coco', qty: '3 c. à table' },
      { name: 'Poivre noir', qty: '1 pincée' },
      { name: 'Thym séché', qty: '1 c. à thé' },
    ],
  },
  {
    mealName: 'Salade Arc-en-ciel au Thon Grillé',
    ingredients: [
      { name: 'Pavé de thon', qty: '450g' },
      { name: 'Chou rouge', qty: '200g' },
      { name: 'Carottes', qty: '200g' },
      { name: 'Quinoa', qty: '350g' },
      { name: 'Avocat', qty: '2 unités' },
      { name: 'Tomates cerises', qty: '150g' },
      { name: 'Concombre', qty: '1 unité' },
      { name: 'Graines de chia', qty: '3 c. à table' },
      { name: 'Vinaigre de cidre de pomme', qty: '4 c. à table' },
      { name: 'Huile d\'olive extra-vierge', qty: '2 c. à table' },
    ],
  },
  {
    mealName: 'Pouding de Chia aux Bleuets & Cannelle',
    ingredients: [
      { name: 'Graines de chia', qty: '100g' },
      { name: 'Lait d\'amande non sucré', qty: '1 L' },
      { name: 'Bleuets', qty: '250g' },
      { name: 'Cannelle moulue', qty: '1 c. à thé' },
      { name: 'Beurre d\'amande', qty: '4 c. à table' },
      { name: 'Banane', qty: '1 unité' },
      { name: 'Miel brut', qty: '1 c. à table' },
    ],
  },
  {
    mealName: 'Bowl Poulet, Riz Basmati & Légumes',
    ingredients: [
      { name: 'Blanc de poulet', qty: '500g' },
      { name: 'Riz basmati', qty: '400g' },
      { name: 'Brocolis', qty: '300g' },
      { name: 'Courgettes', qty: '200g' },
      { name: 'Poivrons', qty: '2 unités' },
      { name: 'Oignons', qty: '1 unité' },
      { name: 'Huile d\'olive extra-vierge', qty: '3 c. à table' },
      { name: 'Paprika fumé', qty: '1 c. à thé' },
      { name: 'Ail', qty: '2 gousses' },
    ],
  },
  {
    mealName: 'Omelette Épinards & Feta',
    ingredients: [
      { name: 'Œufs', qty: '12 unités' },
      { name: 'Épinards frais', qty: '200g' },
      { name: 'Feta', qty: '120g' },
      { name: 'Tomates cerises', qty: '150g' },
      { name: 'Oignons verts', qty: '1 botte' },
      { name: 'Huile d\'olive extra-vierge', qty: '2 c. à table' },
      { name: 'Poivre noir', qty: '1 pincée' },
    ],
  },
  {
    mealName: 'Poké Bowl Thon, Riz & Edamame',
    ingredients: [
      { name: 'Pavé de thon', qty: '400g' },
      { name: 'Riz basmati', qty: '350g' },
      { name: 'Edamame', qty: '200g' },
      { name: 'Avocat', qty: '2 unités' },
      { name: 'Concombre', qty: '1 unité' },
      { name: 'Mangue', qty: '1 unité' },
      { name: 'Graines de sésame', qty: '2 c. à table' },
      { name: 'Sauce soja / tamari', qty: '3 c. à table' },
      { name: 'Citron', qty: '1 unité' },
    ],
  },
];

// ─── Extrait & Agrège les ingrédients d'un plan de repas ─────────────────────
export function extractIngredientsFromMeals(mealsOrPlan?: any[]): GroceryItem[] {
  const sources = (mealsOrPlan && mealsOrPlan.length > 0) ? mealsOrPlan : DEFAULT_WEEKLY_RECIPES;
  const itemsMap: Map<string, GroceryItem> = new Map();

  sources.forEach((item: any, idx: number) => {
    const mealTitle = item.name || item.mealName || item.title || `Repas ${idx + 1}`;
    const rawIngredients = item.ingredients || [];

    rawIngredients.forEach((ing: any) => {
      const name = typeof ing === 'string' ? ing : ing.name || ing.ingredient || '';
      if (!name) return;

      const qty = typeof ing === 'object' && (ing.qty || ing.quantity) ? (ing.qty || ing.quantity) : '';
      const individualNames = splitIngredientName(String(name));

      individualNames.forEach((cleanName) => {
        const key = cleanName.toLowerCase();

        if (itemsMap.has(key)) {
          const existing = itemsMap.get(key)!;
          if (qty && existing.quantity) {
            existing.quantity += ` + ${qty}`;
          } else if (qty) {
            existing.quantity = qty;
          }
        } else {
          const category = categorizeIngredient(cleanName);
          itemsMap.set(key, {
            id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            name: cleanName,
            quantity: qty || undefined,
            category,
            checked: false,
            sourceMeal: mealTitle,
          });
        }
      });
    });
  });

  return Array.from(itemsMap.values());
}

// ─── Organise la liste par rayons ───────────────────────────────────────────
export function organizeByAisle(items: GroceryItem[]): Record<GroceryCategory, GroceryItem[]> {
  const categorized: Record<GroceryCategory, GroceryItem[]> = {
    Protéines: [],
    Légumes: [],
    Épicerie: [],
    Épices: [],
  };

  items.forEach((item) => {
    categorized[item.category].push(item);
  });

  return categorized;
}

// ─── Services Firestore (`users/{uid}/groceryList/current`) & AsyncStorage ─────

/**
 * Génère automatiquement la liste de courses depuis le plan de repas et la sauvegarde localement et dans Firestore.
 */
export async function generateAndSaveGroceryList(uid: string, mealsOrPlan?: any[]): Promise<GroceryListDoc> {
  const items = extractIngredientsFromMeals(mealsOrPlan);
  const categorized = organizeByAisle(items);

  await saveLocalGroceryList(items);

  if (uid) {
    try {
      const docRef = doc(db, 'users', uid, 'groceryList', 'current');
      await setDoc(docRef, { items, categorized, updatedAt: serverTimestamp() }, { merge: true });
    } catch (err) {
      console.warn('generateAndSaveGroceryList: envoi Firestore différé (hors-ligne)', err);
    }
  }

  return { items, categorized };
}

/**
 * Récupère la liste de courses actuelle (AsyncStorage d'abord, puis fusion Firestore).
 */
export async function getGroceryList(uid: string): Promise<GroceryListDoc | null> {
  const localItems = await loadLocalGroceryList();

  if (!uid) {
    return {
      items: localItems,
      categorized: organizeByAisle(localItems),
    };
  }

  try {
    const docRef = doc(db, 'users', uid, 'groceryList', 'current');
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const remoteData = snap.data();
      const remoteItems: GroceryItem[] = remoteData.items || [];
      const mergedItems = mergeGroceryItems(localItems, remoteItems);

      await saveLocalGroceryList(mergedItems);

      return {
        updatedAt: remoteData.updatedAt,
        items: mergedItems,
        categorized: organizeByAisle(mergedItems),
      };
    }
  } catch (err) {
    console.warn('getGroceryList: erreur réseau/offline Firestore, utilisation des données locales', err);
  }

  return {
    items: localItems,
    categorized: organizeByAisle(localItems),
  };
}

/**
 * Écoute en temps réel la liste de courses Firestore avec fusion locale.
 */
export function listenToGroceryList(uid: string, callback: (list: GroceryListDoc | null) => void) {
  // Transmettre d'abord la version locale immédiatement
  loadLocalGroceryList().then((localItems) => {
    callback({
      items: localItems,
      categorized: organizeByAisle(localItems),
    });
  });

  if (!uid) {
    return () => {};
  }

  const docRef = doc(db, 'users', uid, 'groceryList', 'current');
  return onSnapshot(
    docRef,
    async (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const remoteItems: GroceryItem[] = data.items || [];
        const localItems = await loadLocalGroceryList();
        const mergedItems = mergeGroceryItems(localItems, remoteItems);

        await saveLocalGroceryList(mergedItems);

        callback({
          updatedAt: data.updatedAt,
          items: mergedItems,
          categorized: organizeByAisle(mergedItems),
        });
      }
    },
    async (err) => {
      console.warn('Erreur listenToGroceryList Firestore, fallback local:', err);
      const localItems = await loadLocalGroceryList();
      callback({
        items: localItems,
        categorized: organizeByAisle(localItems),
      });
    }
  );
}

/**
 * Bascule l'état coché / décoché d'un article de la liste.
 */
export async function toggleGroceryItem(uid: string, itemId: string, checked: boolean): Promise<void> {
  const currentItems = await loadLocalGroceryList();
  const updatedItems = currentItems.map((item) =>
    item.id === itemId ? { ...item, checked } : item
  );

  await saveLocalGroceryList(updatedItems);

  if (uid) {
    try {
      const docRef = doc(db, 'users', uid, 'groceryList', 'current');
      const updatedCategorized = organizeByAisle(updatedItems);
      await setDoc(docRef, {
        items: updatedItems,
        categorized: updatedCategorized,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (err) {
      console.warn('toggleGroceryItem: envoi Firestore différé (hors-ligne)', err);
    }
  }
}

/**
 * Ajoute un aliment personnalisé à la liste de courses.
 */
export async function addGroceryItem(
  uid: string,
  newItem: { name: string; quantity?: string; category?: GroceryCategory }
): Promise<GroceryItem> {
  const category = newItem.category || categorizeIngredient(newItem.name);
  const createdItem: GroceryItem = {
    id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    name: newItem.name.trim(),
    quantity: newItem.quantity ? newItem.quantity.trim() : undefined,
    category,
    checked: false,
    sourceMeal: 'Ajout manuel',
  };

  const currentItems = await loadLocalGroceryList();
  const updatedItems = [...currentItems, createdItem];
  await saveLocalGroceryList(updatedItems);

  if (uid) {
    try {
      const docRef = doc(db, 'users', uid, 'groceryList', 'current');
      const updatedCategorized = organizeByAisle(updatedItems);
      await setDoc(docRef, {
        items: updatedItems,
        categorized: updatedCategorized,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (err) {
      console.warn('addGroceryItem: envoi Firestore différé (hors-ligne)', err);
    }
  }

  return createdItem;
}

/**
 * Réinitialise ou vide la liste de courses.
 */
export async function clearGroceryList(uid: string): Promise<void> {
  await saveLocalGroceryList([]);

  if (uid) {
    try {
      const docRef = doc(db, 'users', uid, 'groceryList', 'current');
      await setDoc(docRef, {
        items: [],
        categorized: {
          Protéines: [],
          Légumes: [],
          Épicerie: [],
          Épices: [],
        },
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('clearGroceryList: envoi Firestore différé (hors-ligne)', err);
    }
  }
}
