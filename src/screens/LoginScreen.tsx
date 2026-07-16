import React, { useState } from 'react';
import {
  KeyboardAvoidingView, Platform, Pressable, SafeAreaView,
  ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { Mail, Lock, ChevronLeft, Sparkles } from 'lucide-react-native';
import { colors, fontFamily, fontSize, lineHeight, spacing, radius } from '../theme/theme';
import { Button }  from '../components/Button';
import { Input }   from '../components/Input';
import { signIn, signUp, signInWithGoogle } from '../services/authService';
import { setupDemoUser } from '../services/demoService';

interface Props { onBack: () => void; onSuccess: () => void; onForgot: () => void; }

export const LoginScreen: React.FC<Props> = ({ onBack, onSuccess, onForgot }) => {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleLogin = async () => {
    setError('');
    if (!email || !password) { setError('Merci de remplir tous les champs.'); return; }
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      onSuccess();
    } catch (err: any) {
      const code = err?.code ?? '';
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('E-mail ou mot de passe incorrect.');
      } else if (code === 'auth/too-many-requests') {
        setError('Trop de tentatives. Réessaie dans quelques minutes.');
      } else {
        setError('Une erreur est survenue. Réessaie.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError('');
    setLoading(true);
    const demoEmail = 'demo@pureascension.com';
    const demoPass = 'puredemo';
    try {
      let user;
      try {
        user = await signIn(demoEmail, demoPass);
      } catch (err: any) {
        const code = err?.code ?? '';
        if (code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
          user = await signUp(demoEmail, demoPass, 'Benoît Bêta');
        } else {
          throw err;
        }
      }
      
      if (user) {
        await setupDemoUser(user.uid);
        onSuccess();
      }
    } catch (err: any) {
      console.error('Erreur connexion démo:', err);
      setError('Impossible de lancer le mode démo. Vérifie ta connexion.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          {/* Back */}
          <Pressable style={s.back} onPress={onBack} accessibilityRole="button">
            <ChevronLeft size={22} color={colors.ink[700]} strokeWidth={2} />
          </Pressable>

          {/* Header */}
          <View style={s.header}>
            <Text style={s.title}>Bienvenue{'\n'}de <Text style={s.titleItalic}>retour.</Text></Text>
            <Text style={s.sub}>Connecte-toi pour retrouver ton programme.</Text>
          </View>

          {/* Form */}
          <View style={s.form}>
            <Input
              label="Adresse e-mail"
              placeholder="sophie@exemple.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              iconLeft={<Mail size={18} color={colors.ink[400]} strokeWidth={1.5} />}
            />
            <Input
              label="Mot de passe"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              iconLeft={<Lock size={18} color={colors.ink[400]} strokeWidth={1.5} />}
            />

            {error ? <Text style={s.errorMsg}>{error}</Text> : null}

            <Pressable onPress={onForgot} style={s.forgotWrap}>
              <Text style={s.forgot}>Mot de passe oublié ?</Text>
            </Pressable>
          </View>

          {/* CTA */}
          <Button
            variant="primary"
            size="lg"
            label="Se connecter"
            fullWidth
            loading={loading}
            onPress={handleLogin}
          />

          {/* Divider */}
          <View style={s.divRow}>
            <View style={s.divLine} />
            <Text style={s.divText}>ou</Text>
            <View style={s.divLine} />
          </View>

          {/* Google Sign-In */}
          <Button
            variant="secondary"
            size="lg"
            label="Continuer avec Google"
            fullWidth
            onPress={async () => {
              setError('');
              setLoading(true);
              try {
                await signInWithGoogle();
                onSuccess();
              } catch (err: any) {
                if (err?.code !== 'auth/popup-closed-by-user') {
                  setError('Connexion Google échouée. Réessaie.');
                }
              } finally {
                setLoading(false);
              }
            }}
          />

          <View style={{ height: spacing[3] }} />

          {/* Demo Mode Sign-In */}
          <Button
            variant="secondary"
            size="lg"
            label="⚡ Lancer le Mode Démo"
            fullWidth
            loading={loading}
            onPress={handleDemoLogin}
          />

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe:    { flex:1, backgroundColor:colors.sand[50] },
  scroll:  { flexGrow:1, paddingHorizontal:spacing[6], paddingBottom:spacing[12], paddingTop:spacing[4] },

  back:    { width:40, height:40, borderRadius:20, backgroundColor:colors.ink[100], alignItems:'center', justifyContent:'center', marginBottom:spacing[6] },

  header:  { marginBottom:spacing[8], gap:spacing[2] },
  title:   { fontFamily:fontFamily.spectral.regular, fontSize:fontSize['3xl'], color:colors.ink[900], lineHeight:fontSize['3xl']*lineHeight.snug },
  titleItalic: { fontFamily:fontFamily.spectral.mediumItalic, color:colors.sage[500] },
  sub:     { fontFamily:fontFamily.hanken.regular, fontSize:fontSize.base, color:colors.ink[600] },

  form:    { gap:spacing[4], marginBottom:spacing[6] },
  errorMsg:{ fontFamily:fontFamily.hanken.regular, fontSize:fontSize.sm, color:colors.status.danger },
  forgotWrap: { alignSelf:'flex-end' },
  forgot:  { fontFamily:fontFamily.hanken.medium, fontSize:fontSize.sm, color:colors.sage[600] },

  divRow:  { flexDirection:'row', alignItems:'center', gap:spacing[3], marginVertical:spacing[5] },
  divLine: { flex:1, height:1, backgroundColor:colors.ink[200] },
  divText: { fontFamily:fontFamily.hanken.regular, fontSize:fontSize.sm, color:colors.ink[500] },
});

export default LoginScreen;
