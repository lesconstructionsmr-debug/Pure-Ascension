import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  SafeAreaView, View, Text, TextInput, Pressable,
  ScrollView, StyleSheet, ActivityIndicator,
  KeyboardAvoidingView, Platform, Animated
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
  const symptoms = profile?.digestiveSymptoms || [];
  const goal = profile?.mainGoal || 'tone';

  const base: { question: string; answer: string }[] = [
    {
      question: '💧 Combien d\'eau boire par jour ?',
      answer: '**Hydratation journalière (protocole V9)**\n\nLa cible est de **3 litres d\'eau minimum** par jour, répartis comme suit :\n\n• 🌅 **Matin au réveil** : 500 ml d\'eau tiède avec le jus d\'un demi-citron (alcalinisant, drainage hépatique)\n• 🕐 **Entre les repas** : 250 ml toutes les heures — jamais pendant le repas pour ne pas diluer les sucs digestifs\n• 🏋️ **Autour de l\'effort** : +500 ml à +1L selon la durée et la transpiration\n• 🌙 **Le soir** : stopper l\'eau 1h avant le coucher pour préserver la qualité du sommeil profond\n\nL\'eau filtrée ou de source est préférable au robinet (chlore inhibe la flore intestinale).'
    },
    {
      question: '🧬 C\'est quoi le Reset Métabolique 14 jours ?',
      answer: '**Reset Métabolique 14 jours (V9 Master)**\n\nLe Reset est la **fondation de tout programme Pure Ascension**. Pendant 14 jours :\n\n❌ **Éliminer complètement :**\n• Produits laitiers (inflammatoires, perturbent l\'axe intestin-cerveau)\n• Gluten (active la zonuline → Leaky Gut)\n• Sucres raffinés (résistance à l\'insuline)\n• Alcool (surcharge hépatique)\n\n✅ **Prioriser :**\n• Protéines animales de qualité (poulet, saumon, œufs)\n• Légumes colorés (antioxydants, fibres solubles)\n• Graisses saines (avocat, huile d\'olive, noix)\n\n**Résultats attendus à J14** : Digestion améliorée, énergie stable, réduction des ballonnements, perte de 2-4 kg d\'inflammation.'
    },
    {
      question: '⏱️ C\'est quoi le Tempo 2010 ?',
      answer: '**Tempo 2010 — La clé du gain musculaire (V9)**\n\nLe Tempo 2010 définit la **vitesse de chaque phase** d\'un mouvement :\n\n• **2** = 2 secondes en phase **excentrique** (descente, allongement musculaire)\n• **0** = 0 seconde de pause **en bas** (pas d\'arrêt)\n• **1** = 1 seconde en phase **concentrique** (montée, contraction)\n• **0** = 0 seconde de pause **en haut**\n\n**Pourquoi ça marche ?**\nLa phase excentrique lente crée des micro-déchirures musculaires contrôlées — c\'est là que se produit l\'hypertrophie réelle. Un Tempo rapide divise votre gain musculaire par 2.\n\n**Exemple** : Squat → descente 2s, remontée 1s. Curl biceps → descente 2s, remontée 1s.'
    },
  ];

  // Questions spécifiques course / marathon
  if (sport === 'course' || sport === 'trail') {
    base.unshift(
      {
        question: '🏃 Que manger avant une sortie longue ?',
        answer: '**Nutrition pré-sortie longue (>75 min)**\n\n🕒 **3h avant la course :**\nRepas riche en glucides complexes — riz blanc, patate douce, flocons d\'avoine avec fruits. Éviter fibres, graisses, lactose (risque ischémie intestinale pendant l\'effort).\n\n⚡ **30-45 min avant :**\n1 banane mûre + 300ml eau avec une pincée de sel de mer (sodium). Option : 1 c. à café de miel.\n\n🏃 **Pendant l\'effort (au-delà de 75 min) :**\n60 à 90g de glucides par heure — gels, dattes, banane, compote. **Electrolytes toutes les 20 min** (sodium + magnésium).\n\n🔁 **Après la course :**\nFenêtre anabolique de 45 min : 30g protéines + 60g glucides rapides. Exemple : smoothie whey + banane + avoine.'
      },
      {
        question: '🫀 C\'est quoi la Zone 2 et pourquoi c\'est important ?',
        answer: '**Zone 2 — L\'endurance fondamentale (V9 Endurance)**\n\nLa Zone 2 est l\'allure à laquelle vous pouvez **tenir une conversation sans être essoufflé**.\n\n📊 **Fréquence cardiaque cible :** 60-70% de votre FC Max\n\n**Pourquoi c\'est la base de tout programme marathon ?**\n• Développe les **mitochondries** (vos usines à énergie cellulaire)\n• Brûle **principalement les graisses** comme carburant → épargne le glycogène musculaire\n• Repousse le **seuil lactate** — vous pourrez courir plus vite sans vous acidifier\n• Favorise la **récupération** entre les séances intenses\n\n**La règle d\'or (Modèle polarisé 80/20) :**\n80% de votre volume d\'entraînement doit se faire en Zone 2. Seulement 20% en haute intensité (Z4-Z5).\n\nSi vous sentez que vous courez trop vite en Zone 2... vous courrez trop vite. Ralentissez !'
      }
    );
  }

  // Questions spécifiques vélo
  if (sport === 'velo') {
    base.unshift({
      question: '🚴 Pourquoi ma FC Max vélo est différente ?',
      answer: '**FC Max Vélo — La spécificité cycliste (V9)**\n\nEn vélo, votre FC Max réelle est **5 à 10 bpm inférieure** à la FC Max course à pied.\n\n**Raison physiologique :** En position assise sur le vélo, moins de masse musculaire est sollicitée que dans la course debout. Le cœur n\'a pas besoin de monter aussi haut pour perfuser les muscles.\n\n**Calcul dans Pure Ascension :**\n```\nFC Max Vélo = 220 - âge - 5\n```\n\nTous vos ratports de zones cardiaques sont automatiquement calculés sur cette base dans votre programme.\n\n**Zones cibles vélo :**\n• Z2 (Endurance) : 60-70% FC Max vélo\n• Z3 (Tempo) : 70-80%\n• Z4 (Seuil) : 80-90%\n• Z5 (VO2max) : 90-100%'
    });
  }

  // Questions spécifiques digestives
  if (symptoms.includes('ballonnements') || symptoms.includes('reflux')) {
    base.push({
      question: '🫁 Comment gérer mes ballonnements après les repas ?',
      answer: '**Hypochlorhydrie — Manque d\'acide gastrique (V9)**\n\nLes ballonnements après repas sont souvent le signe d\'un **manque d\'acide chlorhydrique** dans l\'estomac, non d\'un excès (contrairement aux idées reçues).\n\n**Protocole nutritionnel V9 :**\n\n1. **Vinaigre de cidre de pomme (VCP)** : 1 c. à table dilué dans 50ml d\'eau tiède, **10-15 min avant chaque repas principal**. Active la production d\'acide gastrique et réduit les fermentations.\n\n2. **Mastication parasympathique** : 20 à 30 mastications par bouchée. Mange assis, sans écrans, en état de calme. La digestion commence dans la bouche.\n\n3. **Ne pas boire pendant le repas** : L\'eau dilue les sucs digestifs → fermentations → gaz.\n\n4. **Éviter les associations difficiles** : Fruits + protéines = fermentation garantie. Mangez les fruits seuls en dehors des repas.\n\n**Résultats attendus** : Réduction significative des ballonnements en 7-14 jours.'
    });
  }

  // Questions selon objectif
  if (goal === 'muscle' || goal === 'force') {
    base.push({
      question: '💪 Combien de protéines par jour pour prendre du muscle ?',
      answer: '**Protéines & Hypertrophie (V9 Master)**\n\nLa cible standard pour la prise de masse musculaire est de **1,8 à 2,2g de protéines par kg de poids corporel** par jour.\n\n**Exemple : 75 kg → 135g à 165g de protéines/jour**\n\n**Sources recommandées (biodisponibilité élevée) :**\n• 🥩 Viandes maigres (poulet, dinde, bœuf maigre) : ~25g/100g\n• 🐟 Poissons gras (saumon, maquereau) : ~20-25g + oméga-3 anti-inflammatoires\n• 🥚 Œufs entiers : 6g/œuf — protéine de référence (index 100)\n• 🫘 Légumineuses (lentilles, pois chiches) : 8-10g/100g (cuit) + fibres prébiotiques\n\n**Répartition optimale :**\nDistribuer en 3-4 prises de 30-40g. Au-delà de 40g par repas, l\'absorption est limitée.'
    });
  }

  return base.slice(0, 6); // Limiter à 6 questions
}

/* ─── Composant principal ──────────────────────────────────────────────────── */
export const AICoachScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const isPremium = useProgramStore(s => s.isPremium);
  const program = useProgramStore(s => s.program);

  // Reconstruire un profil minimal depuis le programme (sans champ profile dans le store)
  const inferredProfile = program ? {
    mainGoal: program.goal,
    cardioSport: program.cardioSport,
    digestiveSymptoms: program.digestiveProtocol?.map(p => p.condition) ?? [],
  } : null;

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '**Bonjour ! Je suis votre Coach IA Pure Ascension 🌿**\n\nFormé sur la base nutritionnelle V9 Master, je peux vous aider avec :\n• Votre programme et zones de FC personnalisées\n• La nutrition sportive et le Reset 14 jours\n• La gestion digestive (Hypochlorhydrie, Leaky Gut)\n• La préparation marathon / trail\n\nPosez-moi votre question ci-dessous !',
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

  const scrollRef = useRef<ScrollView>(null);
  const creditBarAnim = useRef(new Animated.Value(0)).current;

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

      const response = await fetch('/.netlify/functions/chat-coach', {
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
            <Text style={st.headerStatus}>● En ligne · V9 Master</Text>
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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
        <View style={st.inputBar}>
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
