import React, { useState } from 'react';
import {
  KeyboardAvoidingView, Platform, Pressable, SafeAreaView,
  ScrollView, StyleSheet, Text, View, Modal,
} from 'react-native';
import { Mail, Lock, User as UserIcon, ChevronLeft, Check } from 'lucide-react-native';
import { colors, fontFamily, fontSize, lineHeight, spacing, radius } from '../theme/theme';
import { Button } from '../components/Button';
import { Input }  from '../components/Input';
import { signUp } from '../services/authService';

interface Props {
  onBack: () => void;
  onSuccess: (name: string, email: string) => void;
  /** Prénom déjà collecté au diagnostic → signup minimal (email + mot de passe) */
  initialName?: string;
}

export const SignupScreen: React.FC<Props> = ({ onBack, onSuccess, initialName }) => {
  const [name, setName]                 = useState(initialName ?? '');
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [errors, setErrors]             = useState<Record<string,string>>({});
  const [modalVisible, setModalVisible] = useState(false);

  const validate = () => {
    const e: Record<string,string> = {};
    if (!name.trim())    e.name     = 'Ton prénom est requis.';
    if (!email.trim())   e.email    = 'Adresse e-mail requise.';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Format d\'e-mail invalide.';
    if (password.length < 8) e.password = 'Au moins 8 caractères.';
    if (!acceptedTerms)  e.terms    = 'Tu dois certifier ton état de santé et accepter les CGU.';
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
            {initialName ? (
              <>
                <Text style={s.title}>Dernière étape,{'\n'}<Text style={s.titleItalic}>{initialName}.</Text></Text>
                <Text style={s.sub}>Ton programme est prêt — crée ton compte pour y accéder.</Text>
              </>
            ) : (
              <>
                <Text style={s.title}>Crée ton{'\n'}<Text style={s.titleItalic}>espace personnel.</Text></Text>
                <Text style={s.sub}>Quelques secondes pour commencer ton parcours.</Text>
              </>
            )}
          </View>

          <View style={s.form}>
            {!initialName && (
              <Input
                label="Prénom"
                placeholder="Sophie"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                iconLeft={<UserIcon size={18} color={colors.ink[400]} strokeWidth={1.5}/>}
                error={errors.name}
              />
            )}
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

          <View style={s.checkboxRow}>
            <Pressable
              style={[s.checkbox, acceptedTerms && s.checkboxChecked]}
              onPress={() => setAcceptedTerms(!acceptedTerms)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: acceptedTerms }}
            >
              {acceptedTerms && <Check size={12} color="#fff" strokeWidth={3.5} />}
            </Pressable>
            <Text style={s.checkboxLabel}>
              Je confirme avoir lu et accepté les{' '}
              <Text style={s.legalLink} onPress={() => setModalVisible(true)}>Conditions Générales d'Utilisation</Text>
              {' '}et je certifie être en bonne santé, sans contre-indications médicales pour suivre les entraînements.
            </Text>
          </View>
          {errors.terms && <Text style={s.errorText}>{errors.terms}</Text>}

          <Button variant="primary" size="lg" label="Créer mon compte" fullWidth loading={loading} onPress={handleSignup} style={{ marginTop: spacing[4] }} />

          <Text style={s.legal}>
            En créant un compte, tu acceptes notre{' '}
            <Text style={s.legalLink} onPress={() => setModalVisible(true)}>Politique de confidentialité</Text>.
          </Text>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal Confidentialité & CGU */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#fbf8f3', padding: spacing[5] }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[5] }}>
            <Text style={{ fontFamily: fontFamily.spectral.bold, fontSize: fontSize.xl, color: colors.ink[900] }}>
              Confidentialité & CGU
            </Text>
            <Pressable onPress={() => setModalVisible(false)} accessibilityRole="button">
              <Text style={{ fontFamily: fontFamily.hanken.bold, fontSize: fontSize.sm, color: colors.ink[600] }}>
                Fermer
              </Text>
            </Pressable>
          </View>

          {/* Content */}
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: spacing[4], paddingBottom: spacing[8] }}>
            <Text style={{ fontFamily: fontFamily.hanken.regular, fontSize: fontSize.sm, color: colors.ink[600], lineHeight: 20 }}>
              Dernière mise à jour : Juillet 2026
            </Text>

            <View style={{ gap: spacing[1] }}>
              <Text style={{ fontFamily: fontFamily.hanken.bold, fontSize: fontSize.base, color: colors.ink[900] }}>
                1. Collecte des données
              </Text>
              <Text style={{ fontFamily: fontFamily.hanken.regular, fontSize: fontSize.sm, color: colors.ink[700], lineHeight: 20 }}>
                Pure Ascension collecte vos informations de profil de départ (nom, email, mensurations, objectifs physiques) ainsi que vos bilans de vitalité et d'hygiène de vie pour personnaliser vos plans d'entraînements et de nutrition. Ces informations sont stockées de façon sécurisée sur nos serveurs.
              </Text>
            </View>

            <View style={{ gap: spacing[1] }}>
              <Text style={{ fontFamily: fontFamily.hanken.bold, fontSize: fontSize.base, color: colors.ink[900] }}>
                2. Intégrations tierces
              </Text>
              <Text style={{ fontFamily: fontFamily.hanken.regular, fontSize: fontSize.sm, color: colors.ink[700], lineHeight: 20 }}>
                • **Strava** : Si vous connectez votre compte, nous lisons vos activités sportives pour mettre à jour vos dépenses caloriques journalières de manière automatisée.
                {"\n"}• **Stripe** : Vos transactions de paiement d'abonnement sont traitées de manière 100% sécurisée par Stripe. Aucune donnée de carte bancaire ne transite sur nos serveurs.
              </Text>
            </View>

            <View style={{ gap: spacing[1] }}>
              <Text style={{ fontFamily: fontFamily.hanken.bold, fontSize: fontSize.base, color: colors.ink[900] }}>
                3. Utilisation de l'IA (Gemini)
              </Text>
              <Text style={{ fontFamily: fontFamily.hanken.regular, fontSize: fontSize.sm, color: colors.ink[700], lineHeight: 20 }}>
                Les questions posées à l'IA Coach de Pure Ascension sont traitées via l'API sécurisée de Google Gemini. Vos données d'entraînement et objectifs y sont attachés sous forme de contexte strict pour formuler des réponses adaptées. Vos données ne sont pas utilisées pour entraîner le modèle public.
              </Text>
            </View>

            <View style={{ gap: spacing[1] }}>
              <Text style={{ fontFamily: fontFamily.hanken.bold, fontSize: fontSize.base, color: colors.ink[900] }}>
                4. Sécurité & Droits
              </Text>
              <Text style={{ fontFamily: fontFamily.hanken.regular, fontSize: fontSize.sm, color: colors.ink[700], lineHeight: 20 }}>
                Conformément au RGPD, vous disposez d'un droit d'accès, de rectification et de suppression totale de vos données. Vous pouvez à tout moment demander la purge complète de vos informations depuis notre service support ou en supprimant votre compte.
              </Text>
            </View>

            <View style={{ gap: spacing[1] }}>
              <Text style={{ fontFamily: fontFamily.hanken.bold, fontSize: fontSize.base, color: colors.ink[900] }}>
                5. Responsabilité & Santé
              </Text>
              <Text style={{ fontFamily: fontFamily.hanken.regular, fontSize: fontSize.sm, color: colors.ink[700], lineHeight: 20 }}>
                Les conseils d'entraînement et d'alimentation prodigués par l'application sont à titre indicatif et ne remplacent en aucun cas un avis médical professionnel. Consultez votre médecin traitant avant de débuter tout nouveau programme sportif intense ou d'effectuer des changements nutritionnels notables.
              </Text>
            </View>
          </ScrollView>
        </View>
      </Modal>
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

  checkboxRow: { flexDirection:'row', gap:spacing[3], alignItems:'flex-start', marginBottom:spacing[4], paddingHorizontal:2 },
  checkbox: { width:20, height:20, borderRadius:radius.xs, borderWidth:2, borderColor:colors.ink[300], alignItems:'center', justifyContent:'center', marginTop:2, backgroundColor:'#fff' },
  checkboxChecked: { backgroundColor:colors.sage[500], borderColor:colors.sage[500] },
  checkboxLabel: { flex:1, fontFamily:fontFamily.hanken.regular, fontSize:fontSize.xs, color:colors.ink[600], lineHeight:fontSize.xs*lineHeight.relaxed },
  errorText: { fontFamily:fontFamily.hanken.medium, fontSize:fontSize.xs, color:colors.status.danger, marginBottom:spacing[4], paddingHorizontal:2 },

  legal:     { marginTop:spacing[5], fontFamily:fontFamily.hanken.regular, fontSize:fontSize.xs, color:colors.ink[500], textAlign:'center', lineHeight:fontSize.xs*lineHeight.relaxed },
  legalLink: { fontFamily:fontFamily.hanken.medium, color:colors.sage[600] },
});

export default SignupScreen;
