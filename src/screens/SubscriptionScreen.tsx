/**
 * SubscriptionScreen
 * Paywall avec plan Gratuit (limité), Standard (12$/mois) et Premium (19.99$/mois).
 * Gère l'initiation de Stripe Checkout via la Netlify Function.
 */
import React, { useState } from 'react';
import {
  Pressable, SafeAreaView, ScrollView,
  StyleSheet, Text, View, ActivityIndicator, Platform
} from 'react-native';
import {
  Check, X, ChevronLeft, Sparkles, Lock,
  UtensilsCrossed, Dumbbell, BarChart2,
  Bell, MessageCircle, Infinity, BookOpen, RefreshCw
} from 'lucide-react-native';
import { colors, fontFamily, fontSize, lineHeight, spacing, radius, shadows } from '../theme/theme';
import { Button } from '../components/Button';

/* ─── Props ──────────────────────────────────────────────────────────────── */
interface Props {
  uid: string;
  email: string;
  onBack?: () => void;
  onFree: () => void;
}

/* ─── Feature comparison rows ────────────────────────────────────────────── */
const FEATURES = [
  { icon: Dumbbell,        label: 'Programme d\'entraînement personnalisé', free: true,  standard: true,  premium: true  },
  { icon: BarChart2,       label: 'Suivi de la progression & historique',   free: true,  standard: true,  premium: true  },
  { icon: UtensilsCrossed, label: 'Plan repas & macros de base',             free: false, standard: true,  premium: true  },
  { icon: RefreshCw,       label: 'Ajustement du plan selon la progression',free: false, standard: false, premium: true  }, // Toutes les 3 semaines
  { icon: BookOpen,        label: 'Livre de recettes exclusif',            free: false, standard: false, premium: true  },
  { icon: MessageCircle,   label: 'Conseils & coaching avancés par IA',     free: false, standard: false, premium: true  },
] as const;

/* ─── Component ──────────────────────────────────────────────────────────── */
export const SubscriptionScreen: React.FC<Props> = ({ uid, email, onBack, onFree }) => {
  const [selected, setSelected] = useState<'free' | 'standard' | 'premium'>('premium');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubscribe = async () => {
    if (selected === 'free') {
      onFree();
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Appel à la Netlify Function pour créer la session Stripe Checkout
      const response = await fetch('/.netlify/functions/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid,
          email,
          plan: selected,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.url) {
        throw new Error(data.error || 'Impossible d\'initier le paiement Stripe.');
      }

      // Rediriger vers Stripe Checkout (plateforme web)
      if (Platform.OS === 'web') {
        window.location.href = data.url;
      } else {
        // Fallback pour mobile natif si un jour supporté (ex: Linking)
        setError('Le paiement mobile n\'est pas supporté dans cette version.');
        setLoading(false);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Une erreur de réseau est survenue.');
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={st.safe}>

      {/* Header */}
      <View style={st.header}>
        {onBack ? (
          <Pressable style={st.backBtn} onPress={onBack} accessibilityRole="button">
            <ChevronLeft size={22} color={colors.ink[700]} strokeWidth={2} />
          </Pressable>
        ) : (
          <View style={{ width: 40 }} />
        )}
        <View style={st.headerCenter}>
          <Text style={st.headerTitle}>Choisis ta formule</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={st.heroArea}>
          <View style={st.heroIcon}>
            <Sparkles size={28} color={colors.clay[500]} strokeWidth={1.5} />
          </View>
          <Text style={st.heroTitle}>
            Propulse ton{' '}
            <Text style={st.heroItalic}>ascension.</Text>
            {'\n'}Trouve la formule adaptée à tes objectifs.
          </Text>
        </View>

        {/* Plan Cards Stack (Vertical pour lisibilité mobile) */}
        <View style={st.plansColumn}>

          {/* Free plan */}
          <Pressable
            style={[st.planCard, selected === 'free' && st.planCardSelected]}
            onPress={() => setSelected('free')}
            accessibilityRole="radio"
            accessibilityState={{ selected: selected === 'free' }}
          >
            <View style={st.planCardHeader}>
              <View>
                <Text style={st.planName}>Plan Gratuit</Text>
                <Text style={st.planPriceSub}>Pour tester l'application</Text>
              </View>
              <Text style={st.planPrice}>0 $</Text>
            </View>
          </Pressable>

          {/* Standard plan (12$) */}
          <Pressable
            style={[st.planCard, selected === 'standard' && st.planCardSelected]}
            onPress={() => setSelected('standard')}
            accessibilityRole="radio"
            accessibilityState={{ selected: selected === 'standard' }}
          >
            <View style={st.planCardHeader}>
              <View>
                <Text style={st.planName}>Standard</Text>
                <Text style={st.planPriceSub}>Entraînement & nutrition de base</Text>
              </View>
              <View style={st.priceRow}>
                <Text style={st.planPrice}>12 $</Text>
                <Text style={st.priceUnit}>/mois</Text>
              </View>
            </View>
          </Pressable>

          {/* Premium plan (19.99$) */}
          <Pressable
            style={[
              st.planCard, 
              st.planCardPremium, 
              selected === 'premium' && st.planCardSelectedPremium
            ]}
            onPress={() => setSelected('premium')}
            accessibilityRole="radio"
            accessibilityState={{ selected: selected === 'premium' }}
          >
            <View style={st.popularBadge}>
              <Sparkles size={10} color="#fff" strokeWidth={2} />
              <Text style={st.popularText}>RECOMMANDÉ</Text>
            </View>
            <View style={st.planCardHeader}>
              <View>
                <Text style={[st.planName, { color: '#fff' }]}>Premium</Text>
                <Text style={[st.planPriceSub, { color: colors.sage[200] }]}>Ajustement IA continu & Recettes</Text>
              </View>
              <View style={st.priceRow}>
                <Text style={[st.planPrice, { color: '#fff' }]}>19,99 $</Text>
                <Text style={[st.priceUnit, { color: colors.sage[300] }]}>/mois</Text>
              </View>
            </View>
          </Pressable>

        </View>

        {/* Feature comparison */}
        <View style={st.featureSection}>
          <Text style={st.featureSectionTitle}>Ce qui est inclus</Text>
          <View style={st.featureCard}>
            {/* Column headers */}
            <View style={st.featureHeaderRow}>
              <View style={{ flex: 1.5 }} />
              <Text style={st.featureCol}>Gratuit</Text>
              <Text style={st.featureCol}>Std</Text>
              <Text style={[st.featureCol, { color: colors.sage[600] }]}>Prem</Text>
            </View>

            {FEATURES.map((feat, i) => (
              <View key={i} style={[st.featureRow, i > 0 && st.featureRowBorder]}>
                <View style={st.featureLeft}>
                  <feat.icon size={16} color={colors.ink[500]} strokeWidth={1.8} />
                  <Text style={st.featureLabel}>{feat.label}</Text>
                </View>
                <View style={st.featureCheck}>
                  {feat.free
                    ? <Check size={16} color={colors.sage[500]} strokeWidth={2.5} />
                    : <X     size={14} color={colors.ink[400]}  strokeWidth={2} />}
                </View>
                <View style={st.featureCheck}>
                  {feat.standard
                    ? <Check size={16} color={colors.sage[500]} strokeWidth={2.5} />
                    : <X     size={14} color={colors.ink[400]}  strokeWidth={2} />}
                </View>
                <View style={st.featureCheck}>
                  {feat.premium
                    ? <Check size={16} color={colors.sage[500]} strokeWidth={2.5} />
                    : <X     size={14} color={colors.ink[400]}  strokeWidth={2} />}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Error message */}
        {error ? (
          <View style={st.errorBox}>
            <Text style={st.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* CTAs */}
        <View style={st.ctaArea}>
          {loading ? (
            <View style={st.loaderContainer}>
              <ActivityIndicator size="large" color={colors.sage[600]} />
              <Text style={st.loaderText}>Redirection vers la passerelle sécurisée Stripe...</Text>
            </View>
          ) : (
            <Button
              variant={selected === 'premium' ? 'accent' : 'primary'}
              size="lg"
              label={selected === 'free' ? 'Continuer avec la version limitée' : 'S\'abonner & démarrer'}
              fullWidth
              onPress={handleSubscribe}
              iconRight={selected === 'premium' ? <Sparkles size={18} color="#fff" strokeWidth={2} /> : undefined}
            />
          )}

          {selected !== 'free' && (
            <Text style={st.ctaLegal}>
              Abonnement mensuel sans engagement. Annulation en 2 clics.
            </Text>
          )}
        </View>

        {/* Lock reassurance */}
        <View style={st.reassuranceRow}>
          <Lock size={14} color={colors.ink[500]} strokeWidth={1.5} />
          <Text style={st.reassuranceText}>
            Paiement sécurisé via Stripe · Pas de frais cachés
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

/* ─── Styles ─────────────────────────────────────────────────────────────── */
const st = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.sand[50] },

  header: {
    flexDirection:'row', alignItems:'center',
    paddingHorizontal:spacing[5], paddingVertical:spacing[4],
    borderBottomWidth: 1, borderBottomColor: colors.ink[200],
    backgroundColor: '#fff',
  },
  backBtn:     { width:40, height:40, borderRadius:20, backgroundColor:colors.ink[100], alignItems:'center', justifyContent:'center' },
  headerCenter:{ flex:1, alignItems:'center' },
  headerTitle: { fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.lg, color:colors.ink[900] },

  scroll: { paddingHorizontal:spacing[5], paddingTop:spacing[6] },

  heroArea: { gap:spacing[3], marginBottom:spacing[6], alignItems:'center' },
  heroIcon: { width:64, height:64, borderRadius:32, backgroundColor:colors.clay[100], alignItems:'center', justifyContent:'center' },
  heroTitle:{ fontFamily:fontFamily.spectral.regular, fontSize:fontSize['2xl'], color:colors.ink[900], textAlign:'center', lineHeight:fontSize['2xl']*lineHeight.snug },
  heroItalic:{ fontFamily:fontFamily.spectral.mediumItalic, color:colors.sage[500] },

  // Plan cards column
  plansColumn: { gap:spacing[3], marginBottom:spacing[6] },

  planCard: {
    borderRadius:radius.xl, padding:spacing[4], gap:spacing[2],
    borderWidth:2, borderColor:colors.ink[200], backgroundColor:'#fff',
    position: 'relative',
    ...shadows.sm,
  },
  planCardSelected: { borderColor:colors.ink[600] },
  
  planCardPremium:  { backgroundColor:colors.sage[800], borderColor:colors.sage[700] },
  planCardSelectedPremium: { borderColor:colors.sage[400] },

  planCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  popularBadge: { 
    position: 'absolute',
    top: -10,
    right: 16,
    flexDirection:'row', 
    alignItems:'center', 
    gap:4, 
    backgroundColor:colors.clay[500], 
    paddingHorizontal:spacing[3], 
    paddingVertical:3, 
    borderRadius:radius.pill 
  },
  popularText:  { fontFamily:fontFamily.hanken.bold, fontSize:8, color:'#fff', letterSpacing:1 },

  planName:      { fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.base, color:colors.ink[900] },
  priceRow:      { flexDirection:'row', alignItems:'baseline', gap:2 },
  planPrice:     { fontFamily:fontFamily.spectral.medium, fontSize:fontSize['2xl'], color:colors.ink[900] },
  priceUnit:     { fontFamily:fontFamily.hanken.regular, fontSize:fontSize.xs, color:colors.ink[500] },
  planPriceSub:  { fontFamily:fontFamily.hanken.regular, fontSize:fontSize.xs, color:colors.ink[500], marginTop: 2 },

  // Features
  featureSection:     { marginBottom:spacing[6] },
  featureSectionTitle:{ fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.base, color:colors.ink[900], marginBottom:spacing[4] },
  featureCard:        { backgroundColor:'#fff', borderRadius:radius.xl, overflow:'hidden', ...shadows.sm },
  featureHeaderRow:   { flexDirection:'row', alignItems:'center', paddingHorizontal:spacing[4], paddingVertical:spacing[3], backgroundColor:colors.sand[100] },
  featureCol:         { width:48, textAlign:'center', fontFamily:fontFamily.hanken.semiBold, fontSize:10, color:colors.ink[500], textTransform:'uppercase', letterSpacing:0.5 },
  featureRow:         { flexDirection:'row', alignItems:'center', paddingHorizontal:spacing[4], paddingVertical:spacing[4] },
  featureRowBorder:   { borderTopWidth:1, borderTopColor:colors.ink[100] },
  featureLeft:        { flex:1, flexDirection:'row', alignItems:'center', gap:spacing[3] },
  featureLabel:       { fontFamily:fontFamily.hanken.regular, fontSize:fontSize.sm, color:colors.ink[800], flex:1 },
  featureCheck:       { width:48, alignItems:'center' },

  errorBox: {
    backgroundColor: colors.status.danger + '15',
    padding: spacing[4],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.status.danger,
    marginBottom: spacing[4],
  },
  errorText: {
    fontFamily: fontFamily.hanken.medium,
    color: colors.status.danger,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },

  // Loader & CTAs
  loaderContainer: {
    alignItems: 'center',
    paddingVertical: spacing[3],
    gap: spacing[2],
  },
  loaderText: {
    fontFamily: fontFamily.hanken.medium,
    fontSize: fontSize.xs,
    color: colors.ink[600],
    textAlign: 'center',
  },
  ctaArea:    { gap:spacing[3], marginTop: spacing[2] },
  ctaLegal:   { fontFamily:fontFamily.hanken.regular, fontSize:fontSize.xs, color:colors.ink[500], textAlign:'center' },

  // Reassurance
  reassuranceRow: { flexDirection:'row', alignItems:'center', gap:spacing[2], justifyContent:'center', marginTop:spacing[4] },
  reassuranceText:{ fontFamily:fontFamily.hanken.regular, fontSize:fontSize.xs, color:colors.ink[500] },
});

export default SubscriptionScreen;
