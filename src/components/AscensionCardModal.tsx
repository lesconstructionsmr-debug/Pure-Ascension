import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  Share,
  ScrollView,
  Platform,
} from 'react-native';
import { X, Share2, Copy, Check, Sparkles, Instagram } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { colors, fontFamily, fontSize, radius, shadows, spacing } from '../theme/theme';
import { AscensionCard, AscensionCardData } from './AscensionCard';

interface AscensionCardModalProps {
  visible: boolean;
  onClose: () => void;
  data: AscensionCardData;
}

// Helper to copy text to clipboard via expo-clipboard & web fallback
async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    await Clipboard.setStringAsync(text);
    return true;
  } catch (e) {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (err) {}
    return false;
  }
}

export const AscensionCardModal: React.FC<AscensionCardModalProps> = ({
  visible,
  onClose,
  data,
}) => {
  const [copied, setCopied] = useState(false);

  const shareText = React.useMemo(() => {
    return `🏆 CARTE D'ASCENSION DU JOUR — PURE ASCENSION\n` +
      ` Score d'Ascension : ${data.ascensionScore}%\n` +
      `🔥 Streak Discipline : ${data.streakDays} jours consécutifs\n\n` +
      `• Entraînement : ${data.workoutCompleted ? 'Validé 💪' : 'En cours'}\n` +
      `• Nutrition & Eau : ${data.mealsCount}/${Math.max(3, data.mealsCount)} Repas • ${data.waterGlasses} Verres d'eau 🥗\n` +
      `• Sommeil & Récupération : ${data.sleepScore >= 5 ? '⚡ Reposé' : data.sleepScore >= 3 ? '😐 Moyen' : data.sleepScore === 1 ? '😴 Fatigué' : 'Récupération'} 🌙\n` +
      `• Équilibre Mental : ${data.mentalCheckin ? 'Validé 🧘' : 'Sérénité'}\n\n` +
      `Rejoins l'élite de la discipline sur https://pureascension.app`;
  }, [data]);

  const handleShareStory = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (e) {}

    try {
      const shareOptions = Platform.OS === 'ios'
        ? { message: shareText }
        : {
            title: 'Ma Carte d\'Ascension du Jour',
            message: shareText,
            url: 'https://pureascension.app',
          };
      await Share.share(shareOptions);
    } catch (err) {
      console.log('Erreur de partage:', err);
    }
  };

  const handleCopySummary = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}

    const success = await copyTextToClipboard(shareText);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={st.overlay}>
        <View style={st.modalContent}>
          {/* Header */}
          <View style={st.header}>
            <View style={st.headerTitleBox}>
              <Sparkles size={18} color={colors.clay[500]} />
              <Text style={st.headerTitle}>Carte d'Ascension (Format Story)</Text>
            </View>
            <Pressable
              onPress={onClose}
              style={st.closeBtn}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Fermer"
            >
              <X size={20} color={colors.ink[600]} />
            </Pressable>
          </View>

          {/* Scrollable Story Preview */}
          <ScrollView
            contentContainerStyle={st.cardScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <AscensionCard data={data} />
          </ScrollView>

          {/* Action Buttons */}
          <View style={st.actionSection}>
            <Pressable
              onPress={handleShareStory}
              style={st.shareBtn}
              accessibilityRole="button"
            >
              <Share2 size={18} color={colors.white} />
              <Text style={st.shareBtnText}>Partager mon Ascension</Text>
            </Pressable>

            <Pressable
              onPress={handleCopySummary}
              style={[st.copyBtn, copied && st.copyBtnSuccess]}
              accessibilityRole="button"
            >
              {copied ? (
                <>
                  <Check size={18} color={colors.white} />
                  <Text style={st.copyBtnSuccessText}>Résumé Copié !</Text>
                </>
              ) : (
                <>
                  <Copy size={18} color={colors.ink[900]} />
                  <Text style={st.copyBtnText}>Copier le Résumé Texte</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const st = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(12, 16, 14, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.sand[50],
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[5],
    paddingBottom: spacing[6],
    maxHeight: '92%',
    ...shadows.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[4],
    paddingHorizontal: spacing[2],
  },
  headerTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  headerTitle: {
    fontFamily: fontFamily.hanken.semiBold,
    fontSize: fontSize.md,
    color: colors.ink[900],
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.ink[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardScrollContent: {
    alignItems: 'center',
    paddingVertical: spacing[2],
  },
  actionSection: {
    marginTop: spacing[4],
    gap: spacing[2.5],
  },
  shareBtn: {
    height: 48,
    borderRadius: radius.input,
    backgroundColor: colors.sage[600],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    ...shadows.sm,
  },
  shareBtnText: {
    fontFamily: fontFamily.hanken.bold,
    fontSize: fontSize.base,
    color: colors.white,
  },
  copyBtn: {
    height: 44,
    borderRadius: radius.input,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.ink[200],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  },
  copyBtnSuccess: {
    backgroundColor: colors.sage[500],
    borderColor: colors.sage[500],
  },
  copyBtnText: {
    fontFamily: fontFamily.hanken.semiBold,
    fontSize: fontSize.sm,
    color: colors.ink[900],
  },
  copyBtnSuccessText: {
    fontFamily: fontFamily.hanken.semiBold,
    fontSize: fontSize.sm,
    color: colors.white,
  },
});
