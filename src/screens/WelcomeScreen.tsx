import React from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { colors, fontFamily, fontSize, lineHeight, spacing, radius } from '../theme/theme';
import { Button } from '../components/Button';
import { PureAscensionLogo } from '../components/PureAscensionLogo';

interface Props { onLogin: () => void; onSignup: () => void; }

export const WelcomeScreen: React.FC<Props> = ({ onLogin, onSignup }) => (
  <SafeAreaView style={s.safe}>
    <View style={s.content}>

      {/* Logo */}
      <View style={s.logoArea}>
        <View style={s.logoIcon}>
          <PureAscensionLogo size={48} color={colors.sage[600]} strokeWidth={3} />
        </View>
        <Text style={s.logoText}>Pure Ascension</Text>
        <Text style={s.logoTagline}>Équilibre · Structure · Connexion à soi</Text>
      </View>

      {/* Hero text */}
      <View style={s.heroArea}>
        <Text style={s.heroTitle}>
          Un programme pensé{'\n'}pour <Text style={s.heroItalic}>toi.</Text>
        </Text>
        <Text style={s.heroSub}>
          Nutrition, entraînement et bien-être réunis dans une app accessible et humaine.
        </Text>
      </View>

      {/* Feature pills */}
      <View style={s.pillsRow}>
        {['Repas équilibrés', 'Séances guidées', 'Suivi bienveillant'].map(p => (
          <View key={p} style={s.pill}>
            <Text style={s.pillText}>{p}</Text>
          </View>
        ))}
      </View>

      {/* CTAs */}
      <View style={s.ctaArea}>
        <Button variant="primary" size="lg" label="Commencer gratuitement" fullWidth onPress={onSignup} />
        <Pressable onPress={onLogin} accessibilityRole="button" style={s.loginBtn}>
          <Text style={s.loginText}>J'ai déjà un compte · <Text style={s.loginLink}>Se connecter</Text></Text>
        </Pressable>
      </View>

    </View>
  </SafeAreaView>
);

const s = StyleSheet.create({
  safe:    { flex:1, backgroundColor:colors.sand[50] },
  content: { flex:1, paddingHorizontal:spacing[6], paddingTop:spacing[12], paddingBottom:spacing[8], justifyContent:'space-between' },

  logoArea:    { alignItems:'center', gap:spacing[3] },
  logoIcon:    { width:64, height:64, alignItems:'center', justifyContent:'center' },
  logoText:    { fontFamily:fontFamily.spectral.medium, fontSize:fontSize.xl, color:colors.ink[900], letterSpacing:0.5 },
  logoTagline: { fontFamily:fontFamily.hanken.regular, fontSize:fontSize.sm, color:colors.ink[600], letterSpacing:1, textTransform:'uppercase' },

  heroArea:  { gap:spacing[4] },
  heroTitle: { fontFamily:fontFamily.spectral.regular, fontSize:fontSize['3xl'], color:colors.ink[900], lineHeight:fontSize['3xl']*lineHeight.snug, textAlign:'center' },
  heroItalic:{ fontFamily:fontFamily.spectral.mediumItalic, color:colors.sage[500] },
  heroSub:   { fontFamily:fontFamily.hanken.regular, fontSize:fontSize.base, color:colors.ink[600], textAlign:'center', lineHeight:fontSize.base*lineHeight.relaxed },

  pillsRow: { flexDirection:'row', flexWrap:'wrap', gap:spacing[2], justifyContent:'center' },
  pill:     { paddingHorizontal:spacing[4], paddingVertical:spacing[2], borderRadius:radius.pill, backgroundColor:colors.sage[100] },
  pillText: { fontFamily:fontFamily.hanken.medium, fontSize:fontSize.sm, color:colors.sage[700] },

  ctaArea:  { gap:spacing[4] },
  loginBtn: { alignItems:'center', paddingVertical:spacing[2] },
  loginText:{ fontFamily:fontFamily.hanken.regular, fontSize:fontSize.sm, color:colors.ink[600] },
  loginLink:{ fontFamily:fontFamily.hanken.semiBold, color:colors.sage[600] },
});

export default WelcomeScreen;
