import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  Share,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { X, Copy, Share2, Users, Gift, Sparkles, Check, Trophy, AlertCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { colors, fontFamily, fontSize, letterSpacing, radius, shadows, spacing } from '../theme/theme';
import { Card } from './Card';
import { useProgramStore } from '../store/useProgramStore';
import { auth } from '../services/firebase';
import { getNetlifyAuthHeaders } from '../services/netlifyAuth';

interface ReferralModalProps {
  visible: boolean;
  onClose: () => void;
}

export const ReferralModal: React.FC<ReferralModalProps> = ({ visible, onClose }) => {
  const userName = useProgramStore((s) => s.userName);
  const userData = useProgramStore((s: any) => s.userData);
  
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<'share' | 'apply'>('share');
  
  const [codeInput, setCodeInput] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [applyStatus, setApplyStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });

  const referralCode = React.useMemo(() => {
    const namePart = (userName || auth.currentUser?.displayName || 'WARRIOR')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .slice(0, 6);
    const uidPart = (auth.currentUser?.uid || '7777').slice(-4).toUpperCase();
    return `ASCEND-${namePart || 'GUERRIER'}-${uidPart}`;
  }, [userName]);

  const invitedFriends = 3;
  const freeMonthsEarned = 1;
  const nextTarget = 5;
  const progressPct = Math.min(100, Math.round((invitedFriends / nextTarget) * 100));

  const handleCopyCode = async () => {
    try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch (e) {}
    try {
      await Clipboard.setStringAsync(referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.warn('Clipboard unavailable', e);
    }
  };

  const handleInviteFriend = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (e) {}

    const message = `Rejoins-moi sur Pure Ascension ! Utilise mon code parrain "${referralCode}" pour bénéficier de 1 mois offert et débloquer ton plein potentiel physique et mental ⚔️🔥\n\nTélécharge l'application : https://pureascension.app/invite?ref=${referralCode}`;

    try {
      const shareOptions = Platform.OS === 'ios'
        ? { message }
        : {
            title: 'Inviter un Frère d\'Arme — Pure Ascension',
            message,
            url: `https://pureascension.app/invite?ref=${referralCode}`,
          };
      await Share.share(shareOptions);
    } catch (error) {
      console.log('Erreur lors du partage:', error);
    }
  };

  const handleApplyCode = async () => {
    if (!codeInput.trim()) return;
    setIsApplying(true);
    setApplyStatus({ type: null, message: '' });

    try {
      if (!auth.currentUser) {
        setApplyStatus({ type: 'error', message: 'Connecte-toi pour appliquer un code.' });
        return;
      }

      const applyEndpoint = Platform.OS === 'web'
        ? '/.netlify/functions/apply-referral'
        : 'https://pure-ascension.netlify.app/.netlify/functions/apply-referral';

      const response = await fetch(applyEndpoint, {
        method: 'POST',
        headers: await getNetlifyAuthHeaders(),
        body: JSON.stringify({
          refereeUid: auth.currentUser.uid,
          referralCode: codeInput.trim().toUpperCase(),
          stripeCustomerId: userData?.stripe_customer_id || null
        })
      });
      
      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        setApplyStatus({ type: 'success', message: 'Code parrain appliqué avec succès !' });
        try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch (e) {}
      } else {
        setApplyStatus({ type: 'error', message: data.error || 'Erreur lors de l\'application du code' });
        try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch (e) {}
      }
    } catch (error) {
      setApplyStatus({ type: 'error', message: 'Erreur réseau, veuillez réessayer plus tard.' });
      try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch (e) {}
    } finally {
      setIsApplying(false);
    }
  };

  const isAlreadyReferred = !!userData?.referredBy;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={st.overlay}>
        <View style={st.container}>
          <View style={st.header}>
            <View style={st.iconBadge}>
              <Users size={22} color={colors.clay[500]} />
            </View>
            <Pressable
              onPress={onClose}
              style={st.closeBtn}
              hitSlop={12}
            >
              <X size={20} color={colors.ink[600]} />
            </Pressable>
          </View>

          <View style={st.titleContainer}>
            <Text style={st.eyebrow}>SYSTÈME DE PARRAINAGE</Text>
            <Text style={st.title}>Frères d'Armes ⚔️</Text>
            <Text style={st.subtitle}>
              Partage ta progression ou utilise le code d'un ami.
            </Text>
          </View>

          <View style={st.tabPill}>
            <Pressable 
              style={[st.tabItem, tab === 'share' && st.tabActive]} 
              onPress={() => {
                setTab('share');
                try { Haptics.selectionAsync(); } catch (e) {}
              }}
            >
              <Share2 size={14} color={tab === 'share' ? colors.white : colors.ink[500]} />
              <Text style={[st.tabText, tab === 'share' && st.tabActiveText]}>Parrainer</Text>
            </Pressable>
            <Pressable 
              style={[st.tabItem, tab === 'apply' && st.tabActive]} 
              onPress={() => {
                setTab('apply');
                try { Haptics.selectionAsync(); } catch (e) {}
              }}
            >
              <Gift size={14} color={tab === 'apply' ? colors.white : colors.ink[500]} />
              <Text style={[st.tabText, tab === 'apply' && st.tabActiveText]}>Code ami</Text>
            </Pressable>
          </View>

          {tab === 'share' ? (
            <>
              <Card elevation="sm" style={st.codeCard}>
                <Text style={st.codeLabel}>TON CODE UNIQUE DE PARRAINAGE</Text>
                <View style={st.codeBox}>
                  <Text style={st.codeText}>{referralCode}</Text>
                </View>

                <View style={st.btnRow}>
                  <Pressable
                    onPress={handleCopyCode}
                    style={[st.actionBtn, st.copyBtn, copied && st.copyBtnSuccess]}
                  >
                    {copied ? (
                      <>
                        <Check size={16} color={colors.white} />
                        <Text style={st.copyBtnSuccessText}>Code Copié !</Text>
                      </>
                    ) : (
                      <>
                        <Copy size={16} color={colors.ink[900]} />
                        <Text style={st.copyBtnText}>Copier le code</Text>
                      </>
                    )}
                  </Pressable>

                  <Pressable
                    onPress={handleInviteFriend}
                    style={[st.actionBtn, st.inviteBtn]}
                  >
                    <Share2 size={16} color={colors.white} />
                    <Text style={st.inviteBtnText}>Inviter un ami</Text>
                  </Pressable>
                </View>
              </Card>

              <View style={st.statsCard}>
                <View style={st.statsHeader}>
                  <Trophy size={18} color={colors.clay[500]} />
                  <Text style={st.statsTitle}>Mes Parrainages</Text>
                </View>

                <View style={st.statsGrid}>
                  <View style={st.statBox}>
                    <Text style={st.statNum}>{invitedFriends}</Text>
                    <Text style={st.statDesc}>Amis invités</Text>
                  </View>

                  <View style={st.statDivider} />

                  <View style={st.statBox}>
                    <Text style={st.statNum}>{freeMonthsEarned} mois</Text>
                    <Text style={st.statDesc}>Abonnement offert</Text>
                  </View>
                </View>

                <View style={st.rewardProgressContainer}>
                  <View style={st.rewardProgressHeader}>
                    <Text style={st.rewardProgressText}>Prochain bonus : 5 parrainages</Text>
                    <Text style={st.rewardProgressPct}>{invitedFriends}/{nextTarget}</Text>
                  </View>
                  <View style={st.progressTrack}>
                    <View style={[st.progressBar, { width: `${progressPct}%` }]} />
                  </View>
                </View>
              </View>
            </>
          ) : (
            <Card elevation="sm" style={st.codeCard}>
              <Text style={st.codeLabel}>ENTRER LE CODE D'UN AMI</Text>
              
              <View style={st.inputContainer}>
                <TextInput
                  style={st.input}
                  placeholder="Ex: ASCEND-MARC-A1B2"
                  placeholderTextColor={colors.ink[400]}
                  value={codeInput}
                  onChangeText={setCodeInput}
                  autoCapitalize="characters"
                  editable={!isApplying && !isAlreadyReferred}
                />
              </View>

              {isAlreadyReferred && (
                <View style={[st.statusBox, st.statusSuccess]}>
                  <Check size={16} color={colors.status.success} />
                  <Text style={st.statusSuccessText}>Tu as déjà été parrainé !</Text>
                </View>
              )}

              {applyStatus.type === 'error' && (
                <View style={[st.statusBox, st.statusError]}>
                  <AlertCircle size={16} color={colors.status.danger} />
                  <Text style={st.statusErrorText}>{applyStatus.message}</Text>
                </View>
              )}
              {applyStatus.type === 'success' && (
                <View style={[st.statusBox, st.statusSuccess]}>
                  <Check size={16} color={colors.status.success} />
                  <Text style={st.statusSuccessText}>{applyStatus.message}</Text>
                </View>
              )}

              <Pressable
                onPress={handleApplyCode}
                disabled={isApplying || !codeInput.trim() || isAlreadyReferred}
                style={[
                  st.actionBtn, 
                  st.applyBtn, 
                  (isApplying || !codeInput.trim() || isAlreadyReferred) && st.applyBtnDisabled
                ]}
              >
                {isApplying ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <>
                    <Gift size={16} color={colors.white} />
                    <Text style={st.inviteBtnText}>Appliquer le code</Text>
                  </>
                )}
              </Pressable>
            </Card>
          )}

          <View style={st.footerNote}>
            <Sparkles size={14} color={colors.sage[600]} />
            <Text style={st.footerNoteText}>
              Les mois gratuits sont automatiquement crédités à ton compte.
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const st = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(18, 22, 20, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  container: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.sand[50],
    borderRadius: radius.card,
    padding: spacing[6],
    borderWidth: 1,
    borderColor: colors.sand[200],
    ...shadows.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.clay[50],
    borderWidth: 1,
    borderColor: colors.clay[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.ink[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    marginBottom: spacing[4],
  },
  eyebrow: {
    fontFamily: fontFamily.hanken.semiBold,
    fontSize: fontSize.xs,
    color: colors.clay[500],
    letterSpacing: letterSpacing.eyebrow,
    marginBottom: spacing[1],
  },
  title: {
    fontFamily: fontFamily.spectral.medium,
    fontSize: fontSize.xl,
    color: colors.ink[900],
    marginBottom: spacing[1.5],
  },
  subtitle: {
    fontFamily: fontFamily.hanken.regular,
    fontSize: fontSize.sm,
    color: colors.ink[600],
    lineHeight: 20,
  },
  tabPill: {
    flexDirection: 'row',
    backgroundColor: colors.ink[100],
    borderRadius: radius.pill,
    padding: 4,
    marginBottom: spacing[4],
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[2],
    gap: spacing[1.5],
    borderRadius: radius.pill,
  },
  tabActive: {
    backgroundColor: colors.ink[900],
    ...shadows.sm,
  },
  tabText: {
    fontFamily: fontFamily.hanken.medium,
    fontSize: fontSize.sm,
    color: colors.ink[500],
  },
  tabActiveText: {
    color: colors.white,
    fontFamily: fontFamily.hanken.semiBold,
  },
  codeCard: {
    backgroundColor: colors.white,
    padding: spacing[4],
    borderRadius: radius.lg,
    marginBottom: spacing[4],
    borderWidth: 1,
    borderColor: colors.ink[200],
  },
  codeLabel: {
    fontFamily: fontFamily.hanken.semiBold,
    fontSize: fontSize.xs,
    color: colors.ink[500],
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  codeBox: {
    backgroundColor: colors.sand[100],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.clay[300],
    borderStyle: 'dashed',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  codeText: {
    fontFamily: fontFamily.hanken.bold,
    fontSize: fontSize.lg,
    color: colors.ink[900],
    letterSpacing: 2,
  },
  btnRow: {
    flexDirection: 'row',
    gap: spacing[2.5],
  },
  actionBtn: {
    flex: 1,
    height: 44,
    borderRadius: radius.input,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  },
  copyBtn: {
    backgroundColor: colors.sand[200],
    borderWidth: 1,
    borderColor: colors.ink[200],
  },
  copyBtnSuccess: {
    backgroundColor: colors.sage[600],
    borderColor: colors.sage[600],
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
  inviteBtn: {
    backgroundColor: colors.sage[500],
  },
  inviteBtnText: {
    fontFamily: fontFamily.hanken.semiBold,
    fontSize: fontSize.sm,
    color: colors.white,
  },
  inputContainer: {
    marginBottom: spacing[4],
  },
  input: {
    backgroundColor: colors.sand[100],
    borderWidth: 1.5,
    borderColor: colors.clay[200],
    borderRadius: radius.md,
    padding: spacing[3],
    fontFamily: fontFamily.hanken.medium,
    fontSize: fontSize.md,
    color: colors.ink[900],
    textAlign: 'center',
  },
  applyBtn: {
    backgroundColor: colors.clay[500],
    marginTop: spacing[2],
  },
  applyBtnDisabled: {
    backgroundColor: colors.ink[300],
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    borderRadius: radius.sm,
    marginBottom: spacing[4],
    gap: spacing[2],
  },
  statusSuccess: {
    backgroundColor: colors.status.successSoft,
  },
  statusSuccessText: {
    fontFamily: fontFamily.hanken.medium,
    fontSize: fontSize.sm,
    color: colors.status.success,
  },
  statusError: {
    backgroundColor: colors.status.dangerSoft,
  },
  statusErrorText: {
    fontFamily: fontFamily.hanken.medium,
    fontSize: fontSize.sm,
    color: colors.status.danger,
    flex: 1,
  },
  statsCard: {
    backgroundColor: colors.ink[900],
    borderRadius: radius.lg,
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  statsTitle: {
    fontFamily: fontFamily.hanken.semiBold,
    fontSize: fontSize.sm,
    color: colors.sand[50],
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[4],
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statNum: {
    fontFamily: fontFamily.spectral.medium,
    fontSize: fontSize.xl,
    color: colors.clay[300],
    marginBottom: 2,
  },
  statDesc: {
    fontFamily: fontFamily.hanken.regular,
    fontSize: fontSize.xs,
    color: colors.ink[300],
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.ink[700],
  },
  rewardProgressContainer: {
    gap: spacing[1.5],
  },
  rewardProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rewardProgressText: {
    fontFamily: fontFamily.hanken.medium,
    fontSize: fontSize.xs,
    color: colors.ink[300],
  },
  rewardProgressPct: {
    fontFamily: fontFamily.hanken.semiBold,
    fontSize: fontSize.xs,
    color: colors.clay[300],
  },
  progressTrack: {
    height: 6,
    backgroundColor: colors.ink[700],
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.clay[500],
    borderRadius: radius.pill,
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1.5],
  },
  footerNoteText: {
    fontFamily: fontFamily.hanken.regular,
    fontSize: fontSize.xs,
    color: colors.ink[600],
    textAlign: 'center',
  },
});
