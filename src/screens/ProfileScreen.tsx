import React from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Bell, ChevronRight, ClipboardList, History, Lock, Sparkles, Target } from 'lucide-react-native';
import { colors, fontFamily, fontSize, lineHeight, spacing } from '../theme/theme';
import { Avatar } from '../components/Avatar';
import { Card }   from '../components/Card';
import { Stat }   from '../components/Stat';
import { mockUser } from '../data';

const SETTINGS = [
  { id:'s-0', route:'EditProfile',   icon:<ClipboardList size={20} color={colors.clay[500]}  strokeWidth={2}/>, label:'Mon programme & profil' },
  { id:'s-1', route:'Goals',         icon:<Target        size={20} color={colors.sage[500]}  strokeWidth={2}/>, label:'Mes objectifs' },
  { id:'s-2', route:'History',       icon:<History       size={20} color={colors.sage[500]}  strokeWidth={2}/>, label:'Historique' },
  { id:'s-3', route:'Notifications', icon:<Bell          size={20} color={colors.sage[500]}  strokeWidth={2}/>, label:'Notifications' },
  { id:'s-4', route:'Rituals',       icon:<Sparkles      size={20} color={colors.clay[500]}  strokeWidth={2}/>, label:"Rituels d'équilibre" },
  { id:'s-5', route:null,            icon:<Lock          size={20} color={colors.ink[500]}   strokeWidth={2}/>, label:'Confidentialité' },
] as const;

const BetaBadge: React.FC = () => (
  <View style={{ flexDirection:'row', alignItems:'center', gap:8, backgroundColor:colors.clay[50], borderRadius:20, paddingHorizontal:12, paddingVertical:6, borderWidth:1, borderColor:colors.clay[200] }}>
    <View style={{ width:8, height:8, borderRadius:4, backgroundColor:colors.clay[500] }} />
    <Text style={{ fontFamily:fontFamily.hanken.bold, fontSize:10, color:colors.clay[600], letterSpacing:1.5 }}>BÊTA v0.1</Text>
  </View>
);

export const ProfileScreen: React.FC<{ navigation?: any; userName?: string; userEmail?: string }> = ({ navigation, userName, userEmail }) => {
  const user = mockUser;
  const isNewUser    = !!userName; // vrai compte créé → données vierges
  const displayName  = userName  || `${user.firstName} ${user.lastName}`;
  const displayEmail = userEmail || '';

  // Stats : 0 pour un nouveau compte, données mock pour la démo
  const streak   = isNewUser ? 0       : user.stats.streakDays;
  const sessions = isNewUser ? 0       : user.stats.totalSessions;
  const wLabel   = isNewUser ? '— kg'  : (
    user.stats.weightChange < 0
      ? `${String(user.stats.weightChange).replace('.',',')} kg`
      : `+${String(user.stats.weightChange).replace('.',',')} kg`
  );

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.screenTitle} accessibilityRole="header">Profil</Text>
        <Card elevation="md" padding={spacing[6]}>
          <View style={{ flexDirection:'row', alignItems:'center', gap:spacing[4], marginBottom:spacing[5] }}>
            <Avatar name={displayName} size={64} ring ringColor={colors.clay[300]} />
            <View style={{ flex:1, gap:spacing[1] }}>
              <Text style={{ fontFamily:fontFamily.spectral.medium, fontSize:fontSize.xl, color:colors.ink[900], lineHeight:fontSize.xl*lineHeight.snug }}>{displayName}</Text>
              <Text style={{ fontFamily:fontFamily.hanken.regular,  fontSize:fontSize.sm, color:colors.ink[600] }}>
                {displayEmail || `Programme ${user.programName} · Membre ${user.memberTier}`}
              </Text>
            </View>
          </View>
          <View style={{ height:1, backgroundColor:colors.ink[200], marginBottom:spacing[5] }} />
          <View style={{ flexDirection:'row', justifyContent:'space-around', alignItems:'center' }}>
            <Stat value={streak}   label="Jours" />
            <View style={{ width:1, height:40, backgroundColor:colors.ink[200] }} />
            <Stat value={wLabel}   label="Évolution" />
            <View style={{ width:1, height:40, backgroundColor:colors.ink[200] }} />
            <Stat value={sessions} label="Séances" />
          </View>
        </Card>
        <View style={{ gap:spacing[3] }}>
          <Text style={{ fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.md, color:colors.ink[900] }}>Réglages</Text>
          <Card elevation="sm" padding={0} style={{ overflow:'hidden' }}>
            {SETTINGS.map((item,idx,arr)=>(
              <View key={item.id}>
                <Pressable onPress={()=>item.route && navigation?.navigate(item.route, { isNewUser })} accessibilityRole="button" accessibilityLabel={item.label}
                  style={({pressed})=>[{ flexDirection:'row', alignItems:'center', paddingHorizontal:spacing[5], paddingVertical:spacing[4], gap:spacing[4], minHeight:56 }, pressed&&{ backgroundColor:colors.sand[100] }]}>
                  <View style={{ width:36, height:36, borderRadius:18, backgroundColor:colors.sand[100], alignItems:'center', justifyContent:'center' }}>{item.icon}</View>
                  <Text style={{ flex:1, fontFamily:fontFamily.hanken.medium, fontSize:fontSize.base, color:colors.ink[900] }}>{item.label}</Text>
                  <ChevronRight size={18} color={colors.ink[500]} strokeWidth={2} />
                </Pressable>
                {idx<arr.length-1 && <View style={{ height:1, backgroundColor:colors.ink[200], marginLeft:spacing[5]+36+spacing[4] }} />}
              </View>
            ))}
          </Card>
        </View>
        {/* Beta badge */}
        <View style={{ alignItems:'center', gap:spacing[2] }}>
          <BetaBadge />
          <Text style={{ fontFamily:fontFamily.hanken.regular, fontSize:fontSize.xs, color:colors.ink[400], textAlign:'center' }}>Accès bêta · Pure Ascension</Text>
        </View>
        <View style={{ height:spacing[10] }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe:       { flex:1, backgroundColor:colors.sand[50] },
  scroll:     { flex:1 },
  content:    { paddingHorizontal:spacing[5], paddingTop:spacing[6], gap:spacing[5] },
  screenTitle:{ fontFamily:fontFamily.spectral.medium, fontSize:fontSize['3xl'], color:colors.ink[900] },
});
export default ProfileScreen;
