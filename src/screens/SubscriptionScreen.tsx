/**
 * SubscriptionScreen
 * Paywall avec plan Gratuit (limité) et Premium.
 * Affiché après les slides d'intro, avant le signup.
 */
import React, { useState } from 'react';
import {
  Pressable, SafeAreaView, ScrollView,
  StyleSheet, Text, View,
} from 'react-native';
import {
  Check, X, ChevronLeft, Sparkles, Lock,
  UtensilsCrossed, Dumbbell, BarChart2,
  Bell, MessageCircle, Infinity,
} from 'lucide-react-native';
import { colors, fontFamily, fontSize, lineHeight, spacing, radius, shadows } from '../theme/theme';
import { Button } from '../components/Button';

/* ─── Props ──────────────────────────────────────────────────────────────── */
interface Props {
  onBack:       () => void;
  onFree:       () => void;
  onPremium:    () => void;
}

/* ─── Feature comparison rows ────────────────────────────────────────────── */
const FEATURES = [
  { icon: UtensilsCrossed, label: 'Plan repas personnalisé',          free: false, premium: true  },
  { icon: Dumbbell,        label: 'Programme d\'entraînement complet', free: false, premium: true  },
  { icon: BarChart2,       label: 'Suivi progression & historique',    free: true,  premium: true  },
  { icon: Sparkles,        label: 'Rituels d\'équilibre',              free: true,  premium: true  },
  { icon: Bell,            label: 'Rappels & notifications',           free: false, premium: true  },
  { icon: MessageCircle,   label: 'Conseils coaching personnalisés',   free: false, premium: true  },
  { icon: Infinity,        label: 'Accès illimité à toutes les recettes', free: false, premium: true },
] as const;

/* ─── Component ──────────────────────────────────────────────────────────── */
export const SubscriptionScreen: React.FC<Props> = ({ onBack, onFree, onPremium }) => {
  const [selected, setSelected] = useState<'free' | 'premium'>('premium');

  return (
    <SafeAreaView style={st.safe}>

      {/* Header */}
      <View style={st.header}>
        <Pressable style={st.backBtn} onPress={onBack} accessibilityRole="button">
          <ChevronLeft size={22} color={colors.ink[700]} strokeWidth={2} />
        </Pressable>
        <View style={st.headerCenter}>
          <Text style={st.headerTitle}>Choisis ton plan</Text>
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
            Commence{' '}
            <Text style={st.heroItalic}>gratuitement,</Text>
            {'\n'}passe au niveau supérieur quand tu veux.
          </Text>
        </View>

        {/* Plan cards */}
        <View style={st.plansRow}>

          {/* Free plan */}
          <Pressable
            style={[st.planCard, selected === 'free' && st.planCardSelected, st.planCardFree]}
            onPress={() => setSelected('free')}
            accessibilityRole="radio"
            accessibilityState={{ selected: selected === 'free' }}
          >
            <Text style={st.planName}>Gratuit</Text>
            <Text style={[st.planPrice, { color: colors.ink[700] }]}>0 $</Text>
            <Text style={st.planPriceSub}>pour toujours</Text>
            <View style={[st.planBadge, { backgroundColor: colors.ink[100] }]}>
              <Text style={[st.planBadgeText, { color: colors.ink[600] }]}>Accès limité</Text>
            </View>
          </Pressable>

          {/* Premium plan */}
          <Pressable
            style={[st.planCard, selected === 'premium' && st.planCardSelectedPremium, st.planCardPremium]}
            onPress={() => setSelected('premium')}
            accessibilityRole="radio"
            accessibilityState={{ selected: selected === 'premium' }}
          >
            <View style={st.popularBadge}>
              <Sparkles size={10} color="#fff" strokeWidth={2} />
              <Text style={st.popularText}>POPULAIRE</Text>
            </View>
            <Text style={[st.planName, { color: '#fff' }]}>Premium</Text>
            <View style={st.premiumPriceRow}>
              <Text style={[st.planPrice, { color: '#fff' }]}>19,99 $</Text>
              <Text style={[st.planPriceSub, { color: colors.sage[300] }]}>/mois</Text>
            </View>
            <Text style={[st.planPriceSub, { color: colors.sage[300] }]}>ou 109,99 $/an · économise 45 %</Text>
            <View style={[st.planBadge, { backgroundColor: colors.sage[400] + '33' }]}>
              <Text style={[st.planBadgeText, { color: colors.sage[200] }]}>7 jours d'essai gratuit</Text>
            </View>
          </Pressable>

        </View>

        {/* Feature comparison */}
        <View style={st.featureSection}>
          <Text style={st.featureSectionTitle}>Ce qui est inclus</Text>
          <View style={st.featureCard}>
            {/* Column headers */}
            <View style={st.featureHeaderRow}>
              <View style={{ flex: 1 }} />
              <Text style={st.featureCol}>Gratuit</Text>
              <Text style={[st.featureCol, { color: colors.sage[600] }]}>Premium</Text>
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
                  {feat.premium
                    ? <Check size={16} color={colors.sage[500]} strokeWidth={2.5} />
                    : <X     size={14} color={colors.ink[400]}  strokeWidth={2} />}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Testimonial */}
        <View style={st.testimonial}>
          <Text style={st.testimonialText}>
            "En 8 semaines avec Pure Ascension Premium, j'ai perdu 4,5 kg de masse grasse et je n'ai jamais été aussi régulière dans mon entraînement."
          </Text>
          <Text style={st.testimonialAuthor}>— Natasha M., programme Équilibre 8 semaines</Text>
        </View>

        {/* CTAs */}
        <View style={st.ctaArea}>
          {selected === 'premium' ? (
            <>
              <Button
                variant="accent"
                size="lg"
                label="Commencer l'essai gratuit"
                fullWidth
                onPress={onPremium}
                iconRight={<Sparkles size={18} color="#fff" strokeWidth={2} />}
              />
              <Text style={st.ctaLegal}>
                7 jours gratuits, puis 19,99 $/mois. Annule à tout moment.
              </Text>
            </>
          ) : (
            <Button
              variant="primary"
              size="lg"
              label="Continuer gratuitement"
              fullWidth
              onPress={onFree}
            />
          )}

          <Pressable
            onPress={selected === 'premium' ? onFree : onPremium}
            style={st.switchLink}
            accessibilityRole="button"
          >
            <Text style={st.switchLinkText}>
              {selected === 'premium'
                ? 'Commencer avec le plan gratuit plutôt'
                : 'Voir le plan Premium'}
            </Text>
          </Pressable>
        </View>

        {/* Lock reassurance */}
        <View style={st.reassuranceRow}>
          <Lock size={14} color={colors.ink[500]} strokeWidth={1.5} />
          <Text style={st.reassuranceText}>
            Paiement sécurisé · Pas d'engagement · Annulation en 2 clics
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
  },
  backBtn:     { width:40, height:40, borderRadius:20, backgroundColor:colors.ink[100], alignItems:'center', justifyContent:'center' },
  headerCenter:{ flex:1, alignItems:'center' },
  headerTitle: { fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.lg, color:colors.ink[900] },

  scroll: { paddingHorizontal:spacing[5], paddingTop:spacing[6] },

  heroArea: { gap:spacing[3], marginBottom:spacing[6], alignItems:'center' },
  heroIcon: { width:64, height:64, borderRadius:32, backgroundColor:colors.clay[100], alignItems:'center', justifyContent:'center' },
  heroTitle:{ fontFamily:fontFamily.spectral.regular, fontSize:fontSize['2xl'], color:colors.ink[900], textAlign:'center', lineHeight:fontSize['2xl']*lineHeight.snug },
  heroItalic:{ fontFamily:fontFamily.spectral.mediumItalic, color:colors.sage[500] },

  // Plan cards
  plansRow: { flexDirection:'row', gap:spacing[3], marginBottom:spacing[6] },

  planCard: {
    flex:1, borderRadius:radius.xl, padding:spacing[4], gap:spacing[2],
    borderWidth:2, borderColor:colors.ink[200], backgroundColor:'#fff',
    alignItems:'flex-start',
  },
  planCardFree: {},
  planCardSelected: { borderColor:colors.ink[400] },
  planCardPremium:  { backgroundColor:colors.sage[800], borderColor:colors.sage[700] },
  planCardSelectedPremium: { borderColor:colors.sage[400] },

  popularBadge: { flexDirection:'row', alignItems:'center', gap:4, backgroundColor:colors.clay[500], paddingHorizontal:spacing[2]+2, paddingVertical:3, borderRadius:radius.pill, marginBottom:spacing[1] },
  popularText:  { fontFamily:fontFamily.hanken.bold, fontSize:9, color:'#fff', letterSpacing:1 },

  planName:      { fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.base, color:colors.ink[900] },
  premiumPriceRow:{ flexDirection:'row', alignItems:'baseline', gap:4 },
  planPrice:     { fontFamily:fontFamily.spectral.medium, fontSize:fontSize['2xl'], color:colors.ink[900] },
  planPriceSub:  { fontFamily:fontFamily.hanken.regular, fontSize:fontSize.xs, color:colors.ink[500] },
  planBadge:     { paddingHorizontal:spacing[3], paddingVertical:spacing[1], borderRadius:radius.pill },
  planBadgeText: { fontFamily:fontFamily.hanken.medium, fontSize:10, letterSpacing:0.3 },

  // Features
  featureSection:     { marginBottom:spacing[6] },
  featureSectionTitle:{ fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.base, color:colors.ink[900], marginBottom:spacing[4] },
  featureCard:        { backgroundColor:'#fff', borderRadius:radius.xl, overflow:'hidden', ...shadows.sm },
  featureHeaderRow:   { flexDirection:'row', alignItems:'center', paddingHorizontal:spacing[5], paddingVertical:spacing[3], backgroundColor:colors.sand[100] },
  featureCol:         { width:56, textAlign:'center', fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.xs, color:colors.ink[500], textTransform:'uppercase', letterSpacing:0.5 },
  featureRow:         { flexDirection:'row', alignItems:'center', paddingHorizontal:spacing[5], paddingVertical:spacing[4] },
  featureRowBorder:   { borderTopWidth:1, borderTopColor:colors.ink[100] },
  featureLeft:        { flex:1, flexDirection:'row', alignItems:'center', gap:spacing[3] },
  featureLabel:       { fontFamily:fontFamily.hanken.regular, fontSize:fontSize.sm, color:colors.ink[800], flex:1 },
  featureCheck:       { width:56, alignItems:'center' },

  // Testimonial
  testimonial: {
    backgroundColor:colors.sage[50], borderRadius:radius.xl, padding:spacing[5],
    marginBottom:spacing[6], borderLeftWidth:3, borderLeftColor:colors.sage[400], gap:spacing[2],
  },
  testimonialText:   { fontFamily:fontFamily.spectral.regular, fontSize:fontSize.base, color:colors.ink[800], lineHeight:fontSize.base*lineHeight.relaxed, fontStyle:'italic' },
  testimonialAuthor: { fontFamily:fontFamily.hanken.medium, fontSize:fontSize.sm, color:colors.sage[600] },

  // CTAs
  ctaArea:    { gap:spacing[3] },
  ctaLegal:   { fontFamily:fontFamily.hanken.regular, fontSize:fontSize.xs, color:colors.ink[500], textAlign:'center' },
  switchLink: { alignItems:'center', paddingVertical:spacing[2] },
  switchLinkText: { fontFamily:fontFamily.hanken.medium, fontSize:fontSize.sm, color:colors.sage[600] },

  // Reassurance
  reassuranceRow: { flexDirection:'row', alignItems:'center', gap:spacing[2], justifyContent:'center', marginTop:spacing[4] },
  reassuranceText:{ fontFamily:fontFamily.hanken.regular, fontSize:fontSize.xs, color:colors.ink[500] },
});

export default SubscriptionScreen;
