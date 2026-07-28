import React, { useState, useEffect, useRef } from 'react';
import {
  Modal, View, Text, StyleSheet, Pressable, ScrollView, Image,
  SafeAreaView, Animated, Easing, TextInput,
} from 'react-native';
import {
  X, Camera, Image as ImageIcon, Sparkles, Check, RefreshCw,
  Flame, Dumbbell, Wheat, Droplet, ArrowRight, Zap, Edit3, Sliders,
  Info, Leaf, AlertTriangle,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showAlert } from '../utils/alert';
import { colors, fontFamily, fontSize, lineHeight, spacing, radius, shadows } from '../theme/theme';
import { useCalorie } from '../context/CalorieContext';
import { useDailyProgress } from '../context/DailyProgressContext';
import {
  ScannedMealResult,
  IdentifiedFoodItem,
  NonFoodScanError,
  ScanAuthError,
  ScanQuotaError,
  callBackendScanMeal,
  convertScanResultToFoodEntry,
  getSourceBadgeLabel,
} from '../services/mealScannerService';

export type { ScannedMealResult, IdentifiedFoodItem };

const PENDING_SCAN_KEY = '@pure_ascension_pending_scan_v1';
const SCANNED_HISTORY_KEY = '@pure_ascension_scanned_history_v1';

interface MealScannerModalProps {
  visible: boolean;
  onClose: () => void;
}

const DEMO_DISH_IMAGES = [
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800',
  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800',
  'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800',
];

// ─── Shimmer Skeleton ────────────────────────────────────────────────────────

const ShimmerBox: React.FC<{ width?: number | `${number}%`; height: number; style?: object }> = ({
  width = '100%',
  height,
  style,
}) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.75],
  });

  return (
    <Animated.View
      style={[
        s.shimmerBox,
        { width, height, opacity },
        style,
      ]}
    />
  );
};

const ScanResultsSkeleton: React.FC = () => (
  <View style={s.resultsContainer}>
    <View style={s.dishHeaderCard}>
      <View style={{ flex: 1, gap: spacing[2] }}>
        <ShimmerBox height={22} width="85%" />
        <ShimmerBox height={14} width="45%" />
        <ShimmerBox height={36} width="100%" />
      </View>
      <ShimmerBox height={56} width={56} style={{ borderRadius: radius.lg }} />
    </View>

    <View style={s.detectedItemsCard}>
      <ShimmerBox height={14} width="60%" />
      {[1, 2, 3].map(i => (
        <ShimmerBox key={i} height={40} width="100%" style={{ marginTop: spacing[2] }} />
      ))}
    </View>

    <View style={[s.macrosGrid, { flexWrap: 'wrap' }]}>
      {[1, 2, 3, 4, 5].map(i => (
        <ShimmerBox
          key={i}
          height={72}
          width="30%"
          style={{ flexGrow: 1, borderRadius: radius.lg }}
        />
      ))}
    </View>
  </View>
);

export const MealScannerModal: React.FC<MealScannerModalProps> = ({ visible, onClose }) => {
  const { addEntry } = useCalorie();
  const { checkMeal } = useDailyProgress();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanStep, setScanStep] = useState<string>('');
  const [scanResult, setScanResult] = useState<ScannedMealResult | null>(null);
  const [scanError, setScanError] = useState<{ title: string; message: string } | null>(null);
  const [portionFactor, setPortionFactor] = useState<number>(1); // 1 = 100%, 1.25 = 125%, etc.

  /** Dernière image analysée, pour permettre un « Réessayer » sans reprendre la photo. */
  const lastScanRef = useRef<{ uri: string; base64?: string | null } | null>(null);

  // Manual Editing States
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editKcal, setEditKcal] = useState<string>('');
  const [editProteins, setEditProteins] = useState<string>('');
  const [editCarbs, setEditCarbs] = useState<string>('');
  const [editFats, setEditFats] = useState<string>('');
  const [editFibers, setEditFibers] = useState<string>('');

  // Animation values for scanner line
  const [scanAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      setScanResult(null);
      setScanError(null);
      setImageUri(null);
      setIsScanning(false);
      setPortionFactor(1);
      setIsEditing(false);
      setScanStep('');
    }
  }, [visible]);

  useEffect(() => {
    if (isScanning) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanAnim, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(scanAnim, {
            toValue: 0,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      scanAnim.setValue(0);
    }
  }, [isScanning]);

  const populateEditableFields = (result: ScannedMealResult, factor: number = 1) => {
    setEditTitle(result.title);
    setEditKcal(Math.round(result.kcal * factor).toString());
    setEditProteins(Math.round(result.proteins * factor).toString());
    setEditCarbs(Math.round(result.carbs * factor).toString());
    setEditFats(Math.round(result.fats * factor).toString());
    setEditFibers(Math.round(result.fibers * factor).toString());
  };

  const handleNonFoodError = (message: string) => {
    setIsScanning(false);
    setScanResult(null);
    setScanError({ title: 'Aucun aliment détecté', message });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  const handlePortionChange = (factor: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPortionFactor(factor);
    if (scanResult) {
      populateEditableFields(scanResult, factor);
    }
  };

  const resetState = async () => {
    setImageUri(null);
    setIsScanning(false);
    setScanResult(null);
    setScanError(null);
    setPortionFactor(1);
    setIsEditing(false);
    setScanStep('');
    lastScanRef.current = null;
    try {
      await AsyncStorage.removeItem(PENDING_SCAN_KEY);
    } catch (e) {}
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const performAiScan = async (uri: string, base64?: string | null) => {
    lastScanRef.current = { uri, base64 };
    setImageUri(uri);
    setIsScanning(true);
    setScanResult(null);
    setScanError(null);
    setPortionFactor(1);
    setIsEditing(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    setScanStep('Optimisation de la prise de vue...');

    const t1 = setTimeout(() => {
      setScanStep('Analyse visuelle Pure Ascension IA...');
    }, 600);

    const t2 = setTimeout(() => {
      setScanStep('Détection des aliments dans l\'assiette & calcul des portions...');
    }, 1400);

    let failureDetail = '';

    try {
      let result: ScannedMealResult | null = null;

      try {
        result = await callBackendScanMeal(uri, base64);
      } catch (backendErr) {
        if (backendErr instanceof NonFoodScanError) {
          clearTimeout(t1);
          clearTimeout(t2);
          handleNonFoodError(backendErr.message);
          return;
        }
        if (backendErr instanceof ScanAuthError) {
          clearTimeout(t1);
          clearTimeout(t2);
          setIsScanning(false);
          setScanError({ title: 'Connexion requise', message: backendErr.message });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          return;
        }
        if (backendErr instanceof ScanQuotaError) {
          clearTimeout(t1);
          clearTimeout(t2);
          setIsScanning(false);
          setScanError({ title: 'Scanner momentanément saturé', message: backendErr.message });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          return;
        }
        if (backendErr instanceof Error) failureDetail = backendErr.message;
        console.warn('Erreur scan-meal backend :', backendErr);
      }

      clearTimeout(t1);
      clearTimeout(t2);

      if (result) {
        setScanResult(result);
        populateEditableFields(result, 1);
        setIsScanning(false);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        await AsyncStorage.setItem(PENDING_SCAN_KEY, JSON.stringify({
          imageUri: uri,
          scanResult: result,
          portionFactor: 1,
        }));
        return;
      }
    } catch (err) {
      if (err instanceof NonFoodScanError) {
        clearTimeout(t1);
        clearTimeout(t2);
        handleNonFoodError(err.message);
        return;
      }
      if (err instanceof Error) failureDetail = err.message;
      console.error('Erreur appel scan-meal IA:', err);
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
    }

    setIsScanning(false);
    setScanError({
      title: 'Analyse indisponible',
      message: failureDetail
        ? `${failureDetail} Vérifie ta connexion et réessaie.`
        : 'Impossible d\'analyser cette photo pour le moment. Vérifie ta connexion et réessaie.',
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  };

  const handlePickCamera = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        showAlert(
          'Permission requise',
          'L\'accès à l\'appareil photo est nécessaire pour numériser votre repas.'
        );
        return;
      }

      const res = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.55,
        base64: true,
        allowsEditing: true,
        aspect: [4, 3],
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        performAiScan(res.assets[0].uri, res.assets[0].base64);
      }
    } catch (err) {
      console.log('Camera picker error:', err);
      performAiScan(DEMO_DISH_IMAGES[0], null);
    }
  };

  const handlePickLibrary = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        showAlert(
          'Permission requise',
          'L\'accès à la galerie photos est nécessaire pour sélectionner une image.'
        );
        return;
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.55,
        base64: true,
        allowsEditing: true,
        aspect: [4, 3],
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        performAiScan(res.assets[0].uri, res.assets[0].base64);
      }
    } catch (err) {
      console.log('Library picker error:', err);
      performAiScan(DEMO_DISH_IMAGES[0], null);
    }
  };

  const handleValidateMeal = async () => {
    if (!scanResult) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    const finalName = editTitle.trim() || scanResult.title;
    const finalKcal = Math.max(0, parseInt(editKcal, 10) || Math.round(scanResult.kcal * portionFactor));
    const finalProteins = Math.max(0, parseInt(editProteins, 10) || Math.round(scanResult.proteins * portionFactor));
    const finalCarbs = Math.max(0, parseInt(editCarbs, 10) || Math.round(scanResult.carbs * portionFactor));
    const finalFats = Math.max(0, parseInt(editFats, 10) || Math.round(scanResult.fats * portionFactor));
    const finalFibers = Math.max(0, parseInt(editFibers, 10) || Math.round(scanResult.fibers * portionFactor));

    addEntry(convertScanResultToFoodEntry(scanResult, portionFactor, finalName, {
      kcal: finalKcal,
      proteins: finalProteins,
      carbs: finalCarbs,
      fats: finalFats,
      fibers: finalFibers,
    }));

    checkMeal(Date.now().toString());

    try {
      const historyStr = await AsyncStorage.getItem(SCANNED_HISTORY_KEY);
      const history = historyStr ? JSON.parse(historyStr) : [];
      const record = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        imageUri,
        scanResult: {
          ...scanResult,
          title: finalName,
          kcal: finalKcal,
          proteins: finalProteins,
          carbs: finalCarbs,
          fats: finalFats,
          fibers: finalFibers,
        },
        portionFactor,
        validatedKcal: finalKcal,
        validatedProteins: finalProteins,
        validatedFibers: finalFibers,
      };
      await AsyncStorage.setItem(SCANNED_HISTORY_KEY, JSON.stringify([record, ...history]));
      await AsyncStorage.removeItem(PENDING_SCAN_KEY);
    } catch (err) {
      console.error('Erreur sauvegarde historique scan:', err);
    }

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const fibersNote = finalFibers > 0 ? `, ${finalFibers}g fibres` : '';
    showAlert(
      'Repas enregistré ! 🌿',
      `"${finalName}" (${finalKcal} kcal, ${finalProteins}g prot.${fibersNote}) a bien été ajouté à ton suivi calorique P1.`
    );

    handleClose();
  };

  const scanTranslateY = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 220],
  });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={s.modalOverlay}>
        <SafeAreaView style={s.container}>
          {/* Header */}
          <View style={s.header}>
            <View style={s.headerTitleWrap}>
              <View style={s.iconBadge}>
                <Sparkles size={20} color={colors.sage[600]} />
              </View>
              <View>
                <Text style={s.headerTitle}>Scanner de Repas IA</Text>
                <Text style={s.headerSubTitle}>Analyse visuelle & détection des aliments</Text>
              </View>
            </View>

            <View style={s.headerRightActions}>
              <Pressable onPress={handleClose} style={s.closeButton} accessibilityRole="button">
                <X size={20} color={colors.ink[700]} />
              </Pressable>
            </View>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
            <View style={s.engineStatusBar}>
              <Sparkles size={14} color={colors.sage[700]} />
              <Text style={s.engineStatusText}>Analyse via le moteur Pure Ascension (serveur sécurisé)</Text>
            </View>

            {/* Step 1: Image Selection */}
            {!imageUri && (
              <View style={s.pickerChoiceCard}>
                <Text style={s.pickerTitle}>Numérise ton assiette</Text>
                <Text style={s.pickerDesc}>
                  L'IA Vision Pure Ascension estime instantanément les ingrédients, le volume et la répartition en macronutriments de ton repas.
                </Text>

                <View style={s.pickerBtnRow}>
                  <Pressable style={s.primaryPickBtn} onPress={handlePickCamera} accessibilityRole="button">
                    <Camera size={22} color="#fff" />
                    <Text style={s.primaryPickBtnText}>Prendre une photo</Text>
                  </Pressable>

                  <Pressable style={s.secondaryPickBtn} onPress={handlePickLibrary} accessibilityRole="button">
                    <ImageIcon size={20} color={colors.ink[800]} />
                    <Text style={s.secondaryPickBtnText}>Galerie photos</Text>
                  </Pressable>
                </View>

                {/* Instant Scan Demo Button */}
                <Pressable
                  style={s.demoScanBtn}
                  onPress={() => {
                    const randomImg = DEMO_DISH_IMAGES[Math.floor(Math.random() * DEMO_DISH_IMAGES.length)];
                    performAiScan(randomImg, null);
                  }}
                  accessibilityRole="button"
                >
                  <Zap size={15} color={colors.sage[600]} />
                  <Text style={s.demoScanBtnText}>Essayer avec une assiette exemple</Text>
                </Pressable>
              </View>
            )}

            {/* Step 2: Image Preview & AI Scanning Animation */}
            {imageUri && (
              <View style={s.scanPreviewCard}>
                <View style={s.imageFrame}>
                  <Image source={{ uri: imageUri }} style={s.previewImage} resizeMode="cover" />

                  {isScanning && (
                    <View style={s.scanOverlay}>
                      <Animated.View
                        style={[
                          s.scanLine,
                          { transform: [{ translateY: scanTranslateY }] },
                        ]}
                      />
                      <View style={s.scanBadge}>
                        <Sparkles size={14} color={colors.sage[300]} />
                        <Text style={s.scanBadgeText}>Analyse IA Vision en cours...</Text>
                      </View>
                    </View>
                  )}
                </View>

                {/* Status text during scan */}
                {isScanning && (
                  <View style={s.scanStatusBox}>
                    <Sparkles size={18} color={colors.sage[500]} />
                    <Text style={s.scanStatusText}>{scanStep}</Text>
                  </View>
                )}
              </View>
            )}

            {isScanning && imageUri && <ScanResultsSkeleton />}

            {/* Échec d'analyse : message visible + reprise immédiate */}
            {scanError && !isScanning && (
              <View style={s.errorCard}>
                <View style={s.errorHeaderRow}>
                  <AlertTriangle size={18} color={colors.clay[600]} />
                  <Text style={s.errorTitle}>{scanError.title}</Text>
                </View>
                <Text style={s.errorMessage}>{scanError.message}</Text>

                <View style={s.errorActionsRow}>
                  {lastScanRef.current && (
                    <Pressable
                      style={s.errorRetryBtn}
                      onPress={() => {
                        const last = lastScanRef.current;
                        if (last) performAiScan(last.uri, last.base64);
                      }}
                      accessibilityRole="button"
                    >
                      <RefreshCw size={16} color="#fff" />
                      <Text style={s.errorRetryBtnText}>Réessayer</Text>
                    </Pressable>
                  )}
                  <Pressable style={s.errorSecondaryBtn} onPress={resetState} accessibilityRole="button">
                    <Camera size={16} color={colors.ink[800]} />
                    <Text style={s.errorSecondaryBtnText}>Autre photo</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* Step 3: Result Breakdown & Editable Controls */}
            {scanResult && !isScanning && (
              <View style={s.resultsContainer}>
                {/* Header dish title, AI Confidence & score badge */}
                <View style={s.dishHeaderCard}>
                  <View style={{ flex: 1, gap: 6 }}>
                    {isEditing ? (
                      <View style={s.editTitleWrap}>
                        <Text style={s.inputLabelSmall}>Nom du plat :</Text>
                        <TextInput
                          style={s.titleInput}
                          value={editTitle}
                          onChangeText={setEditTitle}
                          placeholder="Nom de l'aliment..."
                          placeholderTextColor={colors.ink[400]}
                        />
                      </View>
                    ) : (
                      <>
                        <Text style={s.dishTitle}>{editTitle || scanResult.title}</Text>

                        {/* Indice de Confiance IA */}
                        <View style={s.confidenceRow}>
                          <View style={s.confidenceBadge}>
                            <Sparkles size={13} color={colors.sage[700]} />
                            <Text style={s.confidenceText}>
                              Confiance IA : {Math.round(scanResult.confidence * 100)}%
                            </Text>
                          </View>
                          {getSourceBadgeLabel(scanResult.source) ? (
                            <View style={s.sourceBadge}>
                              <Text style={s.sourceBadgeText}>
                                {getSourceBadgeLabel(scanResult.source)}
                              </Text>
                            </View>
                          ) : null}
                        </View>

                        <Text style={s.fitnessNote}>{scanResult.fitnessNote}</Text>
                      </>
                    )}
                  </View>
                  <View style={s.scoreBadge}>
                    <Text style={s.scoreBadgeTitle}>SCORE P1</Text>
                    <Text style={s.scoreBadgeVal}>{scanResult.densityScore}</Text>
                  </View>
                </View>

                {/* Détail des aliments détectés dans l'assiette avec leurs portions */}
                <View style={s.detectedItemsCard}>
                  <View style={s.detectedItemsHeader}>
                    <Zap size={16} color={colors.clay[600]} />
                    <Text style={s.detectedItemsTitle}>Aliments détectés dans l'assiette</Text>
                  </View>

                  {scanResult.items && scanResult.items.length > 0 ? (
                    <View style={s.itemsList}>
                      {scanResult.items.map((item, idx) => {
                        const scaledKcal = Math.round(item.calories * portionFactor);
                        const scaledProt = Math.round(item.proteins * portionFactor);
                        return (
                          <View key={idx} style={s.itemRow}>
                            <View style={s.itemBullet} />
                            <View style={{ flex: 1 }}>
                              <Text style={s.itemNameText}>
                                • {item.name}{' '}
                                <Text style={s.itemPortionText}>({item.portion})</Text>
                              </Text>
                            </View>
                            {(scaledKcal > 0 || scaledProt > 0) && (
                              <View style={s.itemMacrosPill}>
                                <Text style={s.itemMacrosText}>
                                  {scaledKcal > 0 ? `${scaledKcal} kcal` : ''}
                                  {scaledKcal > 0 && scaledProt > 0 ? ' · ' : ''}
                                  {scaledProt > 0 ? `${scaledProt}g prot` : ''}
                                </Text>
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  ) : (
                    <View style={s.itemsList}>
                      {scanResult.benefits.map((b, idx) => (
                        <View key={idx} style={s.itemRow}>
                          <View style={s.itemBullet} />
                          <Text style={s.itemNameText}>• {b}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {/* Macro breakdown & Inputs */}
                <View style={s.macrosGrid}>
                  <View style={[s.macroBox, { backgroundColor: colors.clay[50] }]}>
                    <Flame size={18} color={colors.clay[600]} />
                    {isEditing ? (
                      <TextInput
                        style={s.macroInput}
                        value={editKcal}
                        onChangeText={setEditKcal}
                        keyboardType="numeric"
                      />
                    ) : (
                      <Text style={s.macroBoxVal}>{editKcal || Math.round(scanResult.kcal * portionFactor)}</Text>
                    )}
                    <Text style={s.macroBoxLabel}>kcal</Text>
                  </View>

                  <View style={[s.macroBox, { backgroundColor: colors.sage[50] }]}>
                    <Dumbbell size={18} color={colors.sage[600]} />
                    {isEditing ? (
                      <TextInput
                        style={s.macroInput}
                        value={editProteins}
                        onChangeText={setEditProteins}
                        keyboardType="numeric"
                      />
                    ) : (
                      <Text style={s.macroBoxVal}>{editProteins || Math.round(scanResult.proteins * portionFactor)}g</Text>
                    )}
                    <Text style={s.macroBoxLabel}>Protéines</Text>
                  </View>

                  <View style={[s.macroBox, { backgroundColor: colors.sand[100] }]}>
                    <Wheat size={18} color={colors.clay[500]} />
                    {isEditing ? (
                      <TextInput
                        style={s.macroInput}
                        value={editCarbs}
                        onChangeText={setEditCarbs}
                        keyboardType="numeric"
                      />
                    ) : (
                      <Text style={s.macroBoxVal}>{editCarbs || Math.round(scanResult.carbs * portionFactor)}g</Text>
                    )}
                    <Text style={s.macroBoxLabel}>Glucides</Text>
                  </View>

                  <View style={[s.macroBox, { backgroundColor: colors.info[50] }]}>
                    <Droplet size={18} color={colors.info[600]} />
                    {isEditing ? (
                      <TextInput
                        style={s.macroInput}
                        value={editFats}
                        onChangeText={setEditFats}
                        keyboardType="numeric"
                      />
                    ) : (
                      <Text style={s.macroBoxVal}>{editFats || Math.round(scanResult.fats * portionFactor)}g</Text>
                    )}
                    <Text style={s.macroBoxLabel}>Lipides</Text>
                  </View>

                  <View style={[s.macroBox, { backgroundColor: colors.sage[100] }]}>
                    <Leaf size={18} color={colors.sage[700]} />
                    {isEditing ? (
                      <TextInput
                        style={s.macroInput}
                        value={editFibers}
                        onChangeText={setEditFibers}
                        keyboardType="numeric"
                      />
                    ) : (
                      <Text style={s.macroBoxVal}>{editFibers || Math.round(scanResult.fibers * portionFactor)}g</Text>
                    )}
                    <Text style={s.macroBoxLabel}>Fibres</Text>
                  </View>
                </View>

                {/* Portion Adjuster & Edit Toggle Bar */}
                <View style={s.portionAdjusterCard}>
                  <View style={s.portionHeaderRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1.5] }}>
                      <Sliders size={16} color={colors.ink[700]} />
                      <Text style={s.portionTitle}>Ajuster la portion :</Text>
                    </View>
                    <Pressable
                      style={s.editToggleBtn}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setIsEditing(!isEditing);
                      }}
                      accessibilityRole="button"
                    >
                      <Edit3 size={14} color={isEditing ? colors.clay[600] : colors.sage[700]} />
                      <Text style={[s.editToggleBtnText, isEditing && { color: colors.clay[600] }]}>
                        {isEditing ? 'Mode Manuel Actif' : 'Corriger les valeurs'}
                      </Text>
                    </Pressable>
                  </View>

                  <View style={s.portionRow}>
                    {[
                      { factor: 0.75, label: '75%' },
                      { factor: 1.0, label: '100% (Standard)' },
                      { factor: 1.25, label: '125%' },
                      { factor: 1.5, label: '150%' },
                    ].map(p => (
                      <Pressable
                        key={p.factor}
                        onPress={() => handlePortionChange(p.factor)}
                        style={[
                          s.portionPill,
                          portionFactor === p.factor && s.portionPillActive,
                        ]}
                        accessibilityRole="button"
                      >
                        <Text
                          style={[
                            s.portionPillText,
                            portionFactor === p.factor && s.portionPillTextActive,
                          ]}
                        >
                          {p.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Validation CTA Button */}
                <Pressable
                  style={s.validateButton}
                  onPress={handleValidateMeal}
                  accessibilityRole="button"
                >
                  <View style={s.validateIconCircle}>
                    <Check size={20} color={colors.sage[700]} strokeWidth={3} />
                  </View>
                  <Text style={s.validateButtonText}>Ajouter au journal P1</Text>
                  <ArrowRight size={18} color="#fff" />
                </Pressable>

                <Pressable
                  style={s.rescanBtn}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    resetState();
                  }}
                  accessibilityRole="button"
                >
                  <RefreshCw size={14} color={colors.ink[600]} />
                  <Text style={s.rescanBtnText}>Reprendre une autre photo</Text>
                </Pressable>
              </View>
            )}

            {/* Legal / Compliance Disclaimer */}
            <View style={s.legalNoticeBox}>
              <Info size={14} color={colors.ink[500]} />
              <Text style={s.legalNoticeText}>
                Pure Ascension est un outil de coaching fitness et nutrition. Il ne remplace pas un avis médical professionnel.
              </Text>
            </View>

            <View style={{ height: spacing[10] }} />
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 42, 34, 0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.sand[50],
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '94%',
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.ink[200],
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    flex: 1,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  engineStatusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.sage[50],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.sage[200],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  engineStatusText: {
    flex: 1,
    fontFamily: fontFamily.hanken.medium,
    fontSize: fontSize.xs,
    color: colors.sage[800],
  },

  errorCard: {
    backgroundColor: colors.clay[50],
    borderWidth: 1,
    borderColor: colors.clay[200],
    borderRadius: radius.lg,
    padding: spacing[4],
    gap: spacing[2],
  },
  errorHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  errorTitle: {
    flex: 1,
    fontFamily: fontFamily.hanken.bold,
    fontSize: fontSize.sm,
    color: colors.clay[600],
  },
  errorMessage: {
    fontFamily: fontFamily.hanken.regular,
    fontSize: fontSize.xs,
    color: colors.ink[700],
    lineHeight: 18,
  },
  errorActionsRow: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[2],
  },
  errorRetryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: colors.clay[500],
    paddingVertical: spacing[3],
    borderRadius: radius.lg,
  },
  errorRetryBtnText: {
    fontFamily: fontFamily.hanken.bold,
    fontSize: fontSize.sm,
    color: '#fff',
  },
  errorSecondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.ink[300],
    paddingVertical: spacing[3],
    borderRadius: radius.lg,
  },
  errorSecondaryBtnText: {
    fontFamily: fontFamily.hanken.semiBold,
    fontSize: fontSize.sm,
    color: colors.ink[800],
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
  content: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    gap: spacing[4],
  },

  // Choice Card
  pickerChoiceCard: {
    backgroundColor: '#fff',
    borderRadius: radius.xl,
    padding: spacing[6],
    gap: spacing[4],
    borderWidth: 1,
    borderColor: colors.ink[200],
    alignItems: 'center',
    ...shadows.sm,
  },
  pickerTitle: {
    fontFamily: fontFamily.spectral.medium,
    fontSize: fontSize.xl,
    color: colors.ink[900],
    textAlign: 'center',
  },
  pickerDesc: {
    fontFamily: fontFamily.hanken.regular,
    fontSize: fontSize.sm,
    color: colors.ink[600],
    textAlign: 'center',
    lineHeight: fontSize.sm * lineHeight.relaxed,
  },
  pickerBtnRow: {
    width: '100%',
    gap: spacing[3],
    marginTop: spacing[2],
  },
  primaryPickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
    backgroundColor: colors.sage[600],
    paddingVertical: spacing[4],
    borderRadius: radius.xl,
    ...shadows.sm,
  },
  primaryPickBtnText: {
    fontFamily: fontFamily.hanken.bold,
    fontSize: fontSize.base,
    color: '#fff',
  },
  secondaryPickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
    backgroundColor: colors.sand[100],
    borderWidth: 1,
    borderColor: colors.ink[200],
    paddingVertical: spacing[3.5],
    borderRadius: radius.xl,
  },
  secondaryPickBtnText: {
    fontFamily: fontFamily.hanken.semiBold,
    fontSize: fontSize.sm,
    color: colors.ink[800],
  },
  demoScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[2],
  },
  demoScanBtnText: {
    fontFamily: fontFamily.hanken.medium,
    fontSize: fontSize.xs,
    color: colors.sage[700],
  },

  // Scan Preview
  scanPreviewCard: {
    gap: spacing[4],
  },
  imageFrame: {
    height: 240,
    width: '100%',
    borderRadius: radius.xl,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: colors.ink[900],
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(30, 42, 34, 0.4)',
    justifyContent: 'space-between',
    padding: spacing[4],
  },
  scanLine: {
    height: 4,
    width: '100%',
    backgroundColor: colors.sage[400],
    shadowColor: colors.sage[300],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 8,
  },
  scanBadge: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radius.pill,
  },
  scanBadgeText: {
    fontFamily: fontFamily.hanken.bold,
    fontSize: fontSize.xs,
    color: '#fff',
  },
  scanStatusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.sage[50],
    padding: spacing[4],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.sage[200],
  },
  scanStatusText: {
    fontFamily: fontFamily.hanken.medium,
    fontSize: fontSize.xs,
    color: colors.sage[900],
    flex: 1,
  },

  // Results
  resultsContainer: {
    gap: spacing[4],
  },
  dishHeaderCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: radius.xl,
    padding: spacing[5],
    borderWidth: 1,
    borderColor: colors.ink[200],
    gap: spacing[4],
    ...shadows.sm,
  },
  editTitleWrap: {
    gap: 4,
  },
  inputLabelSmall: {
    fontFamily: fontFamily.hanken.medium,
    fontSize: 10,
    color: colors.ink[500],
  },
  titleInput: {
    fontFamily: fontFamily.hanken.bold,
    fontSize: fontSize.md,
    color: colors.ink[900],
    borderBottomWidth: 1,
    borderBottomColor: colors.sage[400],
    paddingVertical: 2,
  },
  dishTitle: {
    fontFamily: fontFamily.hanken.bold,
    fontSize: fontSize.md,
    color: colors.ink[900],
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flexWrap: 'wrap',
    marginTop: spacing[1],
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    backgroundColor: colors.sage[50],
    alignSelf: 'flex-start',
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1],
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.sage[200],
  },
  confidenceText: {
    fontFamily: fontFamily.hanken.bold,
    fontSize: 11,
    color: colors.sage[800],
  },
  sourceBadge: {
    backgroundColor: colors.sand[100],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[0.5],
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.ink[200],
  },
  sourceBadgeText: {
    fontFamily: fontFamily.hanken.medium,
    fontSize: 10,
    color: colors.ink[600],
  },
  fitnessNote: {
    fontFamily: fontFamily.hanken.regular,
    fontSize: fontSize.xs,
    color: colors.ink[600],
    lineHeight: 18,
    marginTop: 2,
  },
  scoreBadge: {
    alignItems: 'center',
    backgroundColor: colors.sage[100],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.sage[300],
  },
  scoreBadgeTitle: {
    fontFamily: fontFamily.hanken.bold,
    fontSize: 9,
    color: colors.sage[700],
    letterSpacing: 0.5,
  },
  scoreBadgeVal: {
    fontFamily: fontFamily.hanken.bold,
    fontSize: fontSize.xl,
    color: colors.sage[800],
  },

  // Detected Food Items Card
  detectedItemsCard: {
    backgroundColor: '#fff',
    borderRadius: radius.xl,
    padding: spacing[4.5],
    gap: spacing[3],
    borderWidth: 1,
    borderColor: colors.ink[200],
    ...shadows.sm,
  },
  detectedItemsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  detectedItemsTitle: {
    fontFamily: fontFamily.hanken.bold,
    fontSize: fontSize.xs,
    color: colors.ink[900],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itemsList: {
    gap: spacing[2.5],
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2.5],
    backgroundColor: colors.sand[50],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    borderRadius: radius.md,
  },
  itemBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.clay[500],
  },
  itemNameText: {
    fontFamily: fontFamily.hanken.semiBold,
    fontSize: fontSize.xs,
    color: colors.ink[800],
  },
  itemPortionText: {
    fontFamily: fontFamily.hanken.regular,
    color: colors.ink[500],
  },
  itemMacrosPill: {
    backgroundColor: colors.sage[100],
    paddingHorizontal: spacing[2.5],
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  itemMacrosText: {
    fontFamily: fontFamily.hanken.bold,
    fontSize: 10,
    color: colors.sage[800],
  },

  shimmerBox: {
    backgroundColor: colors.sage[100],
    borderRadius: radius.md,
  },

  // Macros Grid
  macrosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2.5],
  },
  macroBox: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: '28%',
    alignItems: 'center',
    paddingVertical: spacing[3.5],
    paddingHorizontal: spacing[2],
    borderRadius: radius.lg,
    gap: 4,
  },
  macroBoxVal: {
    fontFamily: fontFamily.hanken.bold,
    fontSize: fontSize.base,
    color: colors.ink[900],
  },
  macroInput: {
    fontFamily: fontFamily.hanken.bold,
    fontSize: fontSize.base,
    color: colors.ink[900],
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.sage[500],
    paddingVertical: 0,
    minWidth: 40,
  },
  macroBoxLabel: {
    fontFamily: fontFamily.hanken.regular,
    fontSize: fontSize.xs,
    color: colors.ink[600],
  },

  // Portion Adjuster
  portionAdjusterCard: {
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    padding: spacing[4],
    gap: spacing[3],
    borderWidth: 1,
    borderColor: colors.ink[200],
  },
  portionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  portionTitle: {
    fontFamily: fontFamily.hanken.semiBold,
    fontSize: fontSize.xs,
    color: colors.ink[700],
  },
  editToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.sand[100],
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.ink[200],
  },
  editToggleBtnText: {
    fontFamily: fontFamily.hanken.bold,
    fontSize: 11,
    color: colors.sage[800],
  },
  portionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  portionPill: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: radius.pill,
    backgroundColor: colors.sand[100],
    borderWidth: 1,
    borderColor: colors.ink[200],
  },
  portionPillActive: {
    backgroundColor: colors.clay[500],
    borderColor: colors.clay[500],
  },
  portionPillText: {
    fontFamily: fontFamily.hanken.medium,
    fontSize: fontSize.xs,
    color: colors.ink[700],
  },
  portionPillTextActive: {
    fontFamily: fontFamily.hanken.bold,
    color: '#fff',
  },

  // VALIDATE BUTTON
  validateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.sage[800],
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[5],
    borderRadius: radius.xl,
    ...shadows.md,
  },
  validateIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  validateButtonText: {
    fontFamily: fontFamily.hanken.bold,
    fontSize: fontSize.base,
    color: '#fff',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: spacing[2],
  },
  rescanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[2],
  },
  rescanBtnText: {
    fontFamily: fontFamily.hanken.medium,
    fontSize: fontSize.xs,
    color: colors.ink[600],
  },

  // Legal / Compliance Notice
  legalNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    backgroundColor: colors.sand[100],
    borderRadius: radius.md,
    marginTop: spacing[2],
  },
  legalNoticeText: {
    fontFamily: fontFamily.hanken.regular,
    fontSize: 10,
    color: colors.ink[500],
    flex: 1,
    lineHeight: 14,
  },

});

export default MealScannerModal;
