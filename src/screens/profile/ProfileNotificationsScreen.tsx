import React, { useState } from 'react';
import {
  Pressable, SafeAreaView, ScrollView,
  StyleSheet, Switch, Text, View,
} from 'react-native';
import {
  ChevronLeft, Bell, Utensils, Dumbbell,
  Droplets, Moon, MessageCircle, TrendingUp,
} from 'lucide-react-native';
import { colors, fontFamily, fontSize, lineHeight, spacing, radius, shadows } from '../../theme/theme';

interface Props { onBack: () => void; }

type NotifSection = { title: string; items: NotifItem[]; };
type NotifItem = {
  icon: React.ElementType;
  label: string;
  desc: string;
  key: string;
  color: string;
};

const SECTIONS: NotifSection[] = [
  {
    title: 'Rappels quotidiens',
    items: [
      { icon:Utensils,  label:'Rappels repas',         desc:'Rappel 15 min avant chaque repas planifié.',   key:'meals',    color:colors.clay[500] },
      { icon:Dumbbell,  label:'Rappel séance',          desc:'Notification 1h avant ta séance du jour.',     key:'workout',  color:colors.sage[500] },
      { icon:Droplets,  label:'Hydratation',            desc:'Rappels réguliers pour atteindre ton objectif hydratation.', key:'hydration', color:colors.info[500] },
      { icon:Moon,      label:'Routine du soir',        desc:'Rituel de fermeture à l\'heure que tu choisis.', key:'evening', color:colors.ink[600] },
    ],
  },
  {
    title: 'Progression & achievements',
    items: [
      { icon:TrendingUp,    label:'Récap hebdomadaire',  desc:'Bilan de la semaine chaque dimanche soir.',   key:'weekly',  color:colors.status.success },
      { icon:Bell,          label:'Nouveaux objectifs atteints', desc:'Célébration quand tu franchis un cap.', key:'milestones', color:colors.status.warning },
    ],
  },
  {
    title: 'Communauté & programme',
    items: [
      { icon:MessageCircle, label:'Messages de coaching', desc:'Conseils et encouragements de ton programme.', key:'coaching', color:colors.sage[600] },
    ],
  },
];

export const ProfileNotificationsScreen: React.FC<Props> = ({ onBack }) => {
  const [notifs, setNotifs] = useState<Record<string,boolean>>({
    meals: true, workout: true, hydration: false, evening: true,
    weekly: true, milestones: true, coaching: false,
  });

  const toggle = (key: string) => setNotifs(prev => ({ ...prev, [key]: !prev[key] }));

  const activeCount = Object.values(notifs).filter(Boolean).length;

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Pressable style={s.backBtn} onPress={onBack} accessibilityRole="button">
          <ChevronLeft size={22} color={colors.ink[700]} strokeWidth={2} />
        </Pressable>
        <Text style={s.title}>Notifications</Text>
        <View style={{ width:40 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        {/* Summary */}
        <View style={s.summaryCard}>
          <Bell size={22} color={colors.sage[500]} strokeWidth={1.8} />
          <View style={{ flex:1 }}>
            <Text style={s.summaryTitle}>{activeCount} notification{activeCount > 1 ? 's' : ''} activée{activeCount > 1 ? 's' : ''}</Text>
            <Text style={s.summaryDesc}>Les notifications t'aident à rester sur la bonne voie sans effort.</Text>
          </View>
        </View>

        {SECTIONS.map((section, si) => (
          <View key={si} style={s.section}>
            <Text style={s.sectionTitle}>{section.title}</Text>
            <View style={s.sectionCard}>
              {section.items.map((item, ii) => (
                <View
                  key={item.key}
                  style={[s.item, ii > 0 && s.itemBorder]}
                >
                  <View style={[s.itemIcon, { backgroundColor: item.color + '1A' }]}>
                    <item.icon size={18} color={item.color} strokeWidth={1.8} />
                  </View>
                  <View style={s.itemText}>
                    <Text style={s.itemLabel}>{item.label}</Text>
                    <Text style={s.itemDesc}>{item.desc}</Text>
                  </View>
                  <Switch
                    value={notifs[item.key]}
                    onValueChange={() => toggle(item.key)}
                    trackColor={{ false:colors.ink[200], true:colors.sage[400] }}
                    thumbColor={notifs[item.key] ? colors.sage[600] : '#fff'}
                    accessibilityLabel={item.label}
                  />
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* Heure rappel */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Horaires</Text>
          <View style={s.sectionCard}>
            {[
              { label:'Rappel repas', time:'30 min avant' },
              { label:'Rappel séance', time:'1h avant' },
              { label:'Routine du soir', time:'21h30' },
              { label:'Récap hebdomadaire', time:'Dimanche 19h' },
            ].map((row, i) => (
              <View key={i} style={[s.timeRow, i > 0 && s.itemBorder]}>
                <Text style={s.timeLabel}>{row.label}</Text>
                <Pressable style={s.timePill} accessibilityRole="button">
                  <Text style={s.timeValue}>{row.time}</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </View>

        <View style={{ height:40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe:   { flex:1, backgroundColor:colors.sand[50] },
  header: { flexDirection:'row', alignItems:'center', paddingHorizontal:spacing[5], paddingVertical:spacing[4], borderBottomWidth:1, borderBottomColor:colors.ink[200] },
  backBtn:{ width:40, height:40, borderRadius:20, backgroundColor:colors.ink[100], alignItems:'center', justifyContent:'center' },
  title:  { flex:1, textAlign:'center', fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.lg, color:colors.ink[900] },

  scroll: { paddingHorizontal:spacing[5], paddingTop:spacing[5] },

  summaryCard: { flexDirection:'row', alignItems:'flex-start', gap:spacing[4], backgroundColor:colors.sage[50], borderRadius:radius.xl, padding:spacing[5], marginBottom:spacing[6], borderWidth:1, borderColor:colors.sage[200] },
  summaryTitle:{ fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.base, color:colors.ink[900], marginBottom:2 },
  summaryDesc: { fontFamily:fontFamily.hanken.regular, fontSize:fontSize.sm, color:colors.ink[600], lineHeight:fontSize.sm*lineHeight.relaxed },

  section:     { marginBottom:spacing[6] },
  sectionTitle:{ fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.sm, color:colors.ink[500], textTransform:'uppercase', letterSpacing:1, marginBottom:spacing[3] },
  sectionCard: { backgroundColor:'#fff', borderRadius:radius.xl, overflow:'hidden', ...shadows.sm },

  item:     { flexDirection:'row', alignItems:'center', gap:spacing[4], padding:spacing[5] },
  itemBorder:{ borderTopWidth:1, borderTopColor:colors.ink[100] },
  itemIcon: { width:40, height:40, borderRadius:20, alignItems:'center', justifyContent:'center' },
  itemText: { flex:1, gap:2 },
  itemLabel:{ fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.base, color:colors.ink[900] },
  itemDesc: { fontFamily:fontFamily.hanken.regular, fontSize:fontSize.sm, color:colors.ink[500], lineHeight:fontSize.sm*lineHeight.relaxed },

  timeRow:  { flexDirection:'row', alignItems:'center', justifyContent:'space-between', padding:spacing[5] },
  timeLabel:{ fontFamily:fontFamily.hanken.regular, fontSize:fontSize.base, color:colors.ink[800] },
  timePill: { paddingHorizontal:spacing[4], paddingVertical:spacing[2], borderRadius:radius.pill, backgroundColor:colors.sage[100] },
  timeValue:{ fontFamily:fontFamily.hanken.medium, fontSize:fontSize.sm, color:colors.sage[700] },
});

export default ProfileNotificationsScreen;
