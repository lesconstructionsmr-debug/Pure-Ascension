import React, { useState } from 'react';
import {
  KeyboardAvoidingView, Platform, Pressable, SafeAreaView,
  ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { Mail, Lock, User as UserIcon, ChevronLeft } from 'lucide-react-native';
import { colors, fontFamily, fontSize, lineHeight, spacing } from '../theme/theme';
import { Button } from '../components/Button';
import { Input }  from '../components/Input';
import { signUp } from '../services/authService';

interface Props { onBack: () => void; onSuccess: (name: string, email: string) => void; }

export const SignupScreen: React.FC<Props> = ({ onBack, onSuccess }) => {
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [errors, setErrors]     = useState<Record<string,string>>({});

  const validate = () => {
    const e: Record<string,string> = {};
    if (!name.trim())    e.name     = 'Ton prénom est requis.';
    if (!email.trim())   e.email    = 'Adresse e-mail requise.';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Format d\'e-mail invalide.';
    if (password.length < 8) e.password = 'Au moins 8 caractères.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSignup = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await signUp(email.trim(), password, name.trim());
      onSuccess(name.trim(), email.trim());
    } catch (err: any) {
      const code = err?.code ?? '';
      if (code === 'auth/email-already-in-use') {
        setErrors({ email: 'Cette adresse e-mail est déjà utilisée.' });
      } else if (code === 'auth/weak-password') {
        setErrors({ password: 'Mot de passe trop faible.' });
      } else {
        setErrors({ email: 'Une erreur est survenue. Réessaie.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex:1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          <Pressable style={s.back} onPress={onBack} accessibilityRole="button">
            <ChevronLeft size={22} color={colors.ink[700]} strokeWidth={2} />
          </Pressable>

          <View style={s.header}>
            <Text style={s.title}>Crée ton{'\n'}<Text style={s.titleItalic}>espace personnel.</Text></Text>
            <Text style={s.sub}>Quelques secondes pour commencer ton parcours.</Text>
          </View>

          {/* Progress steps */}
          <View style={s.stepsRow}>
            {['Compte','Objectif','Programme'].map((step, i) => (
              <View key={step} style={s.stepItem}>
                <View style={[s.stepDot, i === 0 && s.stepDotActive]}>
                  <Text style={[s.stepNum, i === 0 && s.stepNumActive]}>{i + 1}</Text>
                </View>
                <Text style={[s.stepLabel, i === 0 && s.stepLabelActive]}>{step}</Text>
              </View>
            ))}
          </View>

          <View style={s.form}>
            <Input
              label="Prénom"
              placeholder="Sophie"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              iconLeft={<UserIcon size={18} color={colors.ink[400]} strokeWidth={1.5}/>}
              error={errors.name}
            />
            <Input
              label="Adresse e-mail"
              placeholder="sophie@exemple.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              iconLeft={<Mail size={18} color={colors.ink[400]} strokeWidth={1.5}/>}
              error={errors.email}
            />
            <Input
              label="Mot de passe"
              placeholder="8 caractères minimum"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              iconLeft={<Lock size={18} color={colors.ink[400]} strokeWidth={1.5}/>}
              hint="Mélange lettres, chiffres et symboles pour plus de sécurité."
              error={errors.password}
            />
          </View>

          <Button variant="primary" size="lg" label="Créer mon compte" fullWidth loading={loading} onPress={handleSignup} />

          <Text style={s.legal}>
            En créant un compte, tu acceptes nos{' '}
            <Text style={s.legalLink}>Conditions d'utilisation</Text>
            {' '}et notre{' '}
            <Text style={s.legalLink}>Politique de confidentialité</Text>.
          </Text>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe:   { flex:1, backgroundColor:colors.sand[50] },
  scroll: { flexGrow:1, paddingHorizontal:spacing[6], paddingBottom:spacing[12], paddingTop:spacing[4] },
  back:   { width:40, height:40, borderRadius:20, backgroundColor:colors.ink[100], alignItems:'center', justifyContent:'center', marginBottom:spacing[6] },

  header: { marginBottom:spacing[6], gap:spacing[2] },
  title:  { fontFamily:fontFamily.spectral.regular, fontSize:fontSize['3xl'], color:colors.ink[900], lineHeight:fontSize['3xl']*lineHeight.snug },
  titleItalic: { fontFamily:fontFamily.spectral.mediumItalic, color:colors.sage[500] },
  sub:    { fontFamily:fontFamily.hanken.regular, fontSize:fontSize.base, color:colors.ink[600] },

  stepsRow: { flexDirection:'row', gap:spacing[6], marginBottom:spacing[8], alignItems:'center' },
  stepItem: { alignItems:'center', gap:spacing[1] },
  stepDot:  { width:28, height:28, borderRadius:14, backgroundColor:colors.ink[100], alignItems:'center', justifyContent:'center' },
  stepDotActive: { backgroundColor:colors.sage[500] },
  stepNum:  { fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.sm, color:colors.ink[400] },
  stepNumActive: { color:'#fff' },
  stepLabel: { fontFamily:fontFamily.hanken.regular, fontSize:10, color:colors.ink[400], textTransform:'uppercase', letterSpacing:0.5 },
  stepLabelActive: { fontFamily:fontFamily.hanken.semiBold, color:colors.sage[600] },

  form: { gap:spacing[4], marginBottom:spacing[6] },

  legal:     { marginTop:spacing[5], fontFamily:fontFamily.hanken.regular, fontSize:fontSize.xs, color:colors.ink[500], textAlign:'center', lineHeight:fontSize.xs*lineHeight.relaxed },
  legalLink: { fontFamily:fontFamily.hanken.medium, color:colors.sage[600] },
});

export default SignupScreen;
