import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  SafeAreaView, View, Text, TextInput, Pressable,
  ScrollView, StyleSheet, ActivityIndicator,
  KeyboardAvoidingView, Platform, Animated, Keyboard
} from 'react-native';
import { ArrowLeft, Send, Bot, User, Zap, Lock } from 'lucide-react-native';
import { colors, fontFamily, fontSize, spacing, radius, shadows } from '../theme/theme';
import { useProgramStore } from '../store/useProgramStore';
import { auth } from '../services/firebase';
import { getDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

/* ─── Types ────────────────────────────────────────────────────────────────── */
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

/* ─── Limites par plan ─────────────────────────────────────────────────────── */
const PLAN_LIMITS: Record<string, number> = { free: 3, standard: 10, premium: 30 };
const PLAN_LABELS: Record<string, string> = { free: 'Gratuit', standard: 'Standard', premium: 'Premium' };

/* ─── Questions intelligentes pré-générées selon le profil (0 token) ───────── */
function getSmartQuestions(profile: any): { question: string; answer: string }[] {
  const sport = profile?.cardioSport || 'general';
  const goal = String(profile?.mainGoal || '').toLowerCase();

  const base: { question: string; answer: string }[] = [
    {
      question: '💧 Combien d\'eau boire par jour ?',
      answer: '**Hydratation Pure Ascension**\n\nCible simple : **environ 3 litres d\'eau / jour**, adaptés à ta taille et à ton entraînement.\n\n• Au réveil : 300–500 ml\n• Entre les repas : petites gorgées régulières\n• Autour de l\'effort : +500 ml à +1 L selon la durée et la chaleur\n• Le soir : réduire 1 h avant le coucher si tu te réveilles la nuit\n\nPriorise l\'eau plate. Les boissons sucrées ne comptent pas dans ta cible.',
    },
    {
      question: '🍽️ Comment construire une assiette équilibrée ?',
      answer: '**Assiette Pure Ascension (règle simple)**\n\n• **½ assiette** : légumes (fibres, satiété, micronutriments)\n• **¼ assiette** : protéines (poulet, poisson, œufs, tofu, yaourt grec)\n• **¼ assiette** : glucides complexes (riz, quinoa, patate douce, avoine)\n• **1 filet** : graisses de qualité (huile d\'olive, avocat, oléagineux)\n\nScanne ton repas avec l\'IA pour estimer calories & macros, puis ajuste selon ton objectif.',
    },
    {
      question: '⏱️ C\'est quoi le Tempo 3-1-1-0 ?',
      answer: '**Tempo — contrôle du mouvement**\n\nUn tempo à 4 chiffres guide la vitesse de chaque phase :\n\n• **3** = 3 s en descente (excentrique)\n• **1** = 1 s de pause en bas\n• **1** = 1 s en montée (concentrique)\n• **0** = 0 s de pause en haut\n\nPourquoi c\'est utile : plus de contrôle, meilleure qualité d\'exécution, et un stimulus plus clair pour le développement musculaire.\n\nExemple squat : descends en 3 s, pause 1 s, remonte en 1 s.',
    },
  ];

  if (sport === 'course' || sport === 'trail') {
    base.unshift(
      {
        question: '🏃 Que manger avant une sortie longue ?',
        answer: '**Nutrition pré-sortie longue (>75 min)**\n\n🕒 **3 h avant :** glucides complexes (riz, patate douce, avoine) + un peu de protéines. Évite les repas très gras.\n\n⚡ **30–45 min avant :** banane + eau légèrement salée, ou un peu de miel.\n\n🏃 **Pendant (>75 min) :** 60–90 g de glucides / heure + électrolytes toutes les ~20 min.\n\n🔁 **Après :** protéines + glucides dans l\'heure qui suit (ex. smoothie whey + banane).',
      },
      {
        question: '🫀 C\'est quoi la Zone 2 ?',
        answer: '**Zone 2 — endurance de base**\n\nAllure où tu peux encore parler confortablement.\n\n📊 Cible approx. : **60–70 % de ta FC max**\n\nPourquoi c\'est central : construit l\'endurance, améliore la récupération, et laisse de la place pour les séances intenses.\n\nRègle 80/20 : ~80 % du volume en Zone 2, ~20 % en haute intensité.',
      }
    );
  }

  if (sport === 'velo') {
    base.unshift({
      question: '🚴 Pourquoi ma FC max vélo est différente ?',
      answer: '**FC Max Vélo**\n\nEn vélo, la FC max mesurée est souvent **5–10 bpm plus basse** qu\'en course à pied (position assise, masse musculaire sollicitée différente).\n\nDans Pure Ascension :\n```\nFC Max Vélo ≈ 220 − âge − 5\n```\n\nZones :\n• Z2 : 60–70 %\n• Z3 : 70–80 %\n• Z4 : 80–90 %\n• Z5 : 90–100 %',
    });
  }

  if (goal === 'muscle' || goal === 'force') {
    base.push({
      question: '💪 Combien de protéines par jour ?',
      answer: '**Protéines & développement musculaire**\n\nCible pratique : **1,6 à 2,2 g / kg de poids corporel / jour**.\n\nExemple 75 kg → ~120 à 165 g / jour.\n\nBonnes sources : poulet, dinde, bœuf maigre, poisson, œufs, skyr, tofu, légumineuses.\n\nRépartition : 3–4 prises de 30–40 g sur la journée, dont une autour de l\'entraînement.',
    });
  } else {
    base.push({
      question: '🔥 Comment gérer mon déficit calorique ?',
      answer: '**Déficit durable (sans casser l\'énergie)**\n\n• Vise un déficit modéré (plutôt qu\'extrême)\n• Garde les protéines élevées pour préserver le muscle\n• Priorise les légumes et les fibres pour la satiété\n• Garde 1–2 séances de force / semaine minimum\n\nUtilise le journal calories + le scanner de repas pour rester dans ta cible sans obsession.',
    });
  }

  return base.slice(0, 6);
}

/* ─── Composant principal ──────────────────────────────────────────────────── */
export const AICoachScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const isPremium = useProgramStore(s => s.isPremium);
  const program = useProgramStore(s => s.program);
  const storeProfile = useProgramStore(s => s.profile);

  // Profil minimal + conditions santé (grossesse/post-partum) pour le coach
  const inferredProfile = program ? {
    mainGoal: program.goal,
    cardioSport: program.cardioSport,
    healthConditions: storeProfile?.healthConditions || '',
    experience: storeProfile?.experience || program.experience,
  } : null;

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '**Bonjour ! Je suis votre Coach IA Pure Ascension 🌿**\n\nJe peux vous aider avec :\n• Votre programme d\'entraînement (phases P1–P4, tempos, RPE)\n• La nutrition sportive et vos macros\n• Le scanner de repas IA\n• La préparation endurance (course, trail, vélo)\n\nPosez-moi votre question ci-dessous !',
      timestamp: new Date(),
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);

  // Crédits
  const [creditsUsed, setCreditsUsed] = useState(0);
  const [creditsLimit, setCreditsLimit] = useState(isPremium ? 30 : 3);
  const [plan, setPlan] = useState<string>(isPremium ? 'premium' : 'free');
  const [limitReached, setLimitReached] = useState(false);
  const [smartQuestions] = useState(() => getSmartQuestions(inferredProfile));
  const [activeAnswer, setActiveAnswer] = useState<string | null>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const creditBarAnim = useRef(new Animated.Value(0)).current;

  // Écouteur clavier pour ajuster la barre de saisie au-dessus du TabBar
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setIsKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Charger les crédits du jour depuis Firestore
  useEffect(() => {
    const loadCredits = async () => {
      try {
        const uid = auth.currentUser?.uid;
        if (!uid) return;
        const snap = await getDoc(doc(db, 'users', uid));
        if (!snap.exists()) return;
        const data = snap.data();
        const todayStr = new Date().toISOString().split('T')[0];
        const userPlan: string = data.plan || (isPremium ? 'premium' : 'free');
        const limit = PLAN_LIMITS[userPlan] ?? PLAN_LIMITS.free;
        const used = data.aiMessagesResetDate === todayStr ? (data.aiMessagesUsedToday || 0) : 0;

        setPlan(userPlan);
        setCreditsLimit(limit);
        setCreditsUsed(used);
        setLimitReached(used >= limit);

        // Animer la barre de crédits
        Animated.timing(creditBarAnim, {
          toValue: used / limit,
          duration: 600,
          useNativeDriver: false,
        }).start();
      } catch (err) {
        console.error('Erreur chargement crédits :', err);
      }
    };
    loadCredits();
  }, []);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages, activeAnswer]);

  const sendMessage = useCallback(async (text: string) => {
    const content = text.trim();
    if (!content || loading || limitReached) return;

    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      const uid = auth.currentUser?.uid;
      const historyToSend = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({ role: m.role, content: m.content }));
      historyToSend.push({ role: 'user', content });

      const chatEndpoint = Platform.OS === 'web'
        ? '/.netlify/functions/chat-coach'
        : 'https://pure-ascension.netlify.app/.netlify/functions/chat-coach';

      const response = await fetch(chatEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: historyToSend,
          uid: uid || null,
          userProfile: inferredProfile,
        }),
      });

      // Crédits épuisés → basculer en mode questions intelligentes
      if (response.status === 429) {
        setLimitReached(true);
        setCreditsUsed(creditsLimit);
        const errMsg: Message = {
          id: `e-${Date.now()}`,
          role: 'assistant',
          content: `⚡ **Quota atteint pour aujourd'hui** (${creditsLimit} messages/${PLAN_LABELS[plan]})\n\nVotre accès IA se renouvelle automatiquement demain à minuit 🌙\n\nEn attendant, consultez les **conseils personnalisés** ci-dessous — ils sont générés spécialement pour votre profil et disponibles sans limite !`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errMsg]);
        return;
      }

      const data = await response.json();
      const assistantMsg: Message = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: data.reply || 'Je n\'ai pas pu générer de réponse. Réessayez.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);

      // Mettre à jour l'affichage des crédits localement
      const newUsed = creditsUsed + 1;
      setCreditsUsed(newUsed);
      if (newUsed >= creditsLimit) setLimitReached(true);

      Animated.timing(creditBarAnim, {
        toValue: newUsed / creditsLimit,
        duration: 400,
        useNativeDriver: false,
      }).start();

    } catch {
      setMessages(prev => [...prev, {
        id: `e-${Date.now()}`,
        role: 'assistant',
        content: 'Désolé, une erreur est survenue. Vérifiez votre connexion et réessayez.',
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  }, [messages, loading, limitReached, creditsUsed, creditsLimit, plan, inferredProfile]);

  const formatTime = (d: Date) => d.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' });

  const creditPct = creditsLimit > 0 ? creditsUsed / creditsLimit : 0;
  const creditColor = creditPct >= 1 ? '#ef4444' : creditPct >= 0.7 ? '#f59e0b' : colors.sage[500];

  return (
    <SafeAreaView style={st.safe}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View style={st.header}>
        <Pressable onPress={() => navigation?.goBack()} style={st.backBtn} accessibilityRole="button">
          <ArrowLeft size={20} color={colors.ink[700]} />
        </Pressable>
        <View style={st.headerCenter}>
          <View style={st.coachAvatar}>
            <Bot size={18} color="#fff" />
          </View>
          <View>
            <Text style={st.headerTitle}>Coach IA Pure Ascension</Text>
            <Text style={st.headerStatus}>● En ligne · Coach fitness</Text>
          </View>
        </View>
        {/* Compteur de crédits */}
        <View style={st.creditBadge}>
          <Zap size={11} color={creditColor} />
          <Text style={[st.creditBadgeText, { color: creditColor }]}>
            {Math.max(0, creditsLimit - creditsUsed)}/{creditsLimit}
          </Text>
        </View>
      </View>

      {/* ── Barre de crédits ────────────────────────────────────────────── */}
      <View style={st.creditBarTrack}>
        <Animated.View style={[
          st.creditBarFill,
          {
            width: creditBarAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            backgroundColor: creditColor,
          }
        ]} />
      </View>
      <View style={st.creditInfo}>
        <Text style={st.creditInfoText}>
          {limitReached
            ? `⚡ Quota atteint · Renouvellement à minuit`
            : `${creditsLimit - creditsUsed} message${creditsLimit - creditsUsed !== 1 ? 's' : ''} IA restant${creditsLimit - creditsUsed !== 1 ? 's' : ''} aujourd'hui · Plan ${PLAN_LABELS[plan]}`
          }
        </Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollRef}
          style={st.messageList}
          contentContainerStyle={st.messageListContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Messages ────────────────────────────────────────────────── */}
          {messages.map(msg => (
            <View key={msg.id} style={[st.msgRow, msg.role === 'user' ? st.msgRowUser : st.msgRowAssistant]}>
              {msg.role === 'assistant' && (
                <View style={st.avatarSmall}><Bot size={14} color="#fff" /></View>
              )}
              <View style={[st.bubble, msg.role === 'user' ? st.bubbleUser : st.bubbleAssistant]}>
                <Text style={[st.bubbleText, msg.role === 'user' ? st.bubbleTextUser : st.bubbleTextAssistant]}>
                  {msg.content}
                </Text>
                <Text style={[st.bubbleTime, msg.role === 'user' ? { color: 'rgba(255,255,255,0.55)' } : {}]}>
                  {formatTime(msg.timestamp)}
                </Text>
              </View>
              {msg.role === 'user' && (
                <View style={[st.avatarSmall, { backgroundColor: colors.clay[500] }]}>
                  <User size={14} color="#fff" />
                </View>
              )}
            </View>
          ))}

          {loading && (
            <View style={[st.msgRow, st.msgRowAssistant]}>
              <View style={st.avatarSmall}><Bot size={14} color="#fff" /></View>
              <View style={[st.bubble, st.bubbleAssistant, { paddingVertical: spacing[4] }]}>
                <ActivityIndicator size="small" color={colors.sage[500]} />
              </View>
            </View>
          )}

          {/* ── Questions intelligentes (toujours visibles, 0 token) ────── */}
          <View style={st.smartSection}>
            <View style={st.smartHeader}>
              <Lock size={12} color={colors.sage[500]} />
              <Text style={st.smartLabel}>Conseils personnalisés · Sans limite</Text>
            </View>
            {smartQuestions.map((q, i) => (
              <View key={i}>
                <Pressable
                  onPress={() => setActiveAnswer(activeAnswer === q.question ? null : q.question)}
                  style={[st.smartChip, activeAnswer === q.question && st.smartChipActive]}
                  accessibilityRole="button"
                >
                  <Text style={[st.smartChipText, activeAnswer === q.question && st.smartChipTextActive]}>
                    {q.question}
                  </Text>
                  <Text style={[st.smartChipArrow, activeAnswer === q.question && { transform: [{ rotate: '90deg' }] }]}>
                    ›
                  </Text>
                </Pressable>
                {activeAnswer === q.question && (
                  <View style={st.smartAnswer}>
                    <Text style={st.smartAnswerText}>{q.answer}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>

          <View style={{ height: spacing[10] }} />
        </ScrollView>

        {/* ── Barre de saisie ─────────────────────────────────────────── */}
        <View style={[
          st.inputBar,
          !isKeyboardVisible && { paddingBottom: Platform.OS === 'ios' ? 88 : 72 }
        ]}>
          {limitReached ? (
            <View style={st.limitBanner}>
              <Zap size={16} color={colors.clay[500]} />
              <Text style={st.limitBannerText}>
                Quota atteint · Utilisez les conseils ci-dessus ou revenez demain
              </Text>
            </View>
          ) : (
            <>
              <TextInput
                style={st.input}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Posez votre question au coach..."
                placeholderTextColor={colors.ink[400]}
                multiline
                maxLength={500}
                returnKeyType="send"
                accessibilityLabel="Zone de saisie du message"
              />
              <Pressable
                onPress={() => sendMessage(inputText)}
                disabled={!inputText.trim() || loading}
                style={[st.sendBtn, (!inputText.trim() || loading) && st.sendBtnDisabled]}
                accessibilityRole="button"
                accessibilityLabel="Envoyer le message"
              >
                <Send size={18} color="#fff" />
              </Pressable>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

/* ─── Styles ──────────────────────────────────────────────────────────────── */
const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f7f5f0' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing[4], paddingVertical: spacing[3],
    borderBottomWidth: 1, borderBottomColor: colors.ink[100],
    backgroundColor: '#fff', ...shadows.sm,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  coachAvatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.sage[600], alignItems: 'center', justifyContent: 'center'
  },
  headerTitle: { fontFamily: fontFamily.hanken.bold, fontSize: fontSize.base, color: colors.ink[900] },
  headerStatus: { fontFamily: fontFamily.hanken.regular, fontSize: 11, color: colors.sage[500], marginTop: 1 },
  creditBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: colors.ink[50], borderRadius: radius.pill,
    paddingHorizontal: spacing[2], paddingVertical: 4,
    borderWidth: 1, borderColor: colors.ink[200],
  },
  creditBadgeText: { fontFamily: fontFamily.hanken.bold, fontSize: 11 },

  creditBarTrack: { height: 3, backgroundColor: colors.ink[100] },
  creditBarFill: { height: 3, borderRadius: 2 },
  creditInfo: {
    paddingHorizontal: spacing[4], paddingVertical: spacing[1.5],
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.ink[100],
  },
  creditInfoText: { fontFamily: fontFamily.hanken.regular, fontSize: 11, color: colors.ink[500] },

  messageList: { flex: 1 },
  messageListContent: { padding: spacing[4], gap: spacing[3] },

  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing[2], maxWidth: '88%' },
  msgRowUser: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  msgRowAssistant: { alignSelf: 'flex-start' },

  avatarSmall: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.sage[600], alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },

  bubble: { borderRadius: radius.xl, padding: spacing[3], maxWidth: '90%' },
  bubbleUser: { backgroundColor: colors.sage[600], borderBottomRightRadius: 4 },
  bubbleAssistant: {
    backgroundColor: '#fff', borderBottomLeftRadius: 4,
    borderWidth: 1, borderColor: colors.ink[150] ?? colors.ink[200],
  },
  bubbleText: { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.sm, lineHeight: 20 },
  bubbleTextUser: { color: '#fff' },
  bubbleTextAssistant: { color: colors.ink[800] },
  bubbleTime: {
    fontFamily: fontFamily.hanken.regular, fontSize: 10,
    color: colors.ink[400], marginTop: 4, alignSelf: 'flex-end',
  },

  // Questions intelligentes
  smartSection: { marginTop: spacing[4], gap: spacing[2] },
  smartHeader: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[2],
    marginBottom: spacing[1],
  },
  smartLabel: {
    fontFamily: fontFamily.hanken.semiBold, fontSize: fontSize.xs,
    color: colors.sage[600], textTransform: 'uppercase', letterSpacing: 0.6,
  },
  smartChip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.ink[200],
    borderRadius: radius.lg, paddingHorizontal: spacing[4], paddingVertical: spacing[3],
    ...shadows.sm,
  },
  smartChipActive: {
    borderColor: colors.sage[500], backgroundColor: colors.sage[50],
  },
  smartChipText: {
    fontFamily: fontFamily.hanken.medium, fontSize: fontSize.sm, color: colors.ink[700], flex: 1,
  },
  smartChipTextActive: { color: colors.sage[700] },
  smartChipArrow: { fontFamily: fontFamily.hanken.bold, fontSize: 18, color: colors.ink[400], marginLeft: spacing[2] },
  smartAnswer: {
    backgroundColor: colors.sage[50], borderLeftWidth: 3, borderLeftColor: colors.sage[400],
    borderRadius: radius.md, padding: spacing[4], marginTop: 2,
  },
  smartAnswerText: { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.sm, color: colors.ink[800], lineHeight: 21 },

  // Input bar
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: spacing[3],
    paddingHorizontal: spacing[4], paddingVertical: spacing[3],
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: colors.ink[100],
  },
  input: {
    flex: 1, fontFamily: fontFamily.hanken.regular, fontSize: fontSize.sm,
    color: colors.ink[900], backgroundColor: colors.sand[50],
    borderWidth: 1.5, borderColor: colors.ink[200], borderRadius: radius.xl,
    paddingHorizontal: spacing[4], paddingVertical: spacing[3], maxHeight: 100,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.sage[600], alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: colors.ink[300] },
  limitBanner: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing[2],
    backgroundColor: colors.clay[50], borderRadius: radius.xl,
    paddingHorizontal: spacing[4], paddingVertical: spacing[3],
    borderWidth: 1.5, borderColor: colors.clay[200],
  },
  limitBannerText: {
    fontFamily: fontFamily.hanken.medium, fontSize: fontSize.xs,
    color: colors.clay[700], flex: 1,
  },
});

export default AICoachScreen;
