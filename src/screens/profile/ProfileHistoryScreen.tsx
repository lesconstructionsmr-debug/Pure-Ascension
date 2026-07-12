import React, { useState } from 'react';
import {
  Pressable, SafeAreaView, ScrollView,
  StyleSheet, Text, View,
} from 'react-native';
import { ChevronLeft, Dumbbell, Apple, Droplets, TrendingUp, BarChart2 } from 'lucide-react-native';
import { colors, fontFamily, fontSize, lineHeight, spacing, radius, shadows } from '../../theme/theme';
import { Badge } from '../../components/Badge';

interface Props { onBack: () => void; isNewUser?: boolean; }

const EmptyHistory: React.FC = () => (
  <View style={{ flex:1, alignItems:'center', justifyContent:'center', paddingHorizontal:spacing[8], paddingVertical:spacing[12], gap:spacing[4] }}>
    <View style={{ width:72, height:72, borderRadius:36, backgroundColor:colors.sage[100], alignItems:'center', justifyContent:'center' }}>
      <BarChart2 size={32} color={colors.sage[500]} strokeWidth={1.5} />
    </View>
    <Text style={{ fontFamily:fontFamily.spectral.medium, fontSize:fontSize.xl, color:colors.ink[900], textAlign:'center' }}>Ton historique se construit ici</Text>
    <Text style={{ fontFamily:fontFamily.hanken.regular, fontSize:fontSize.base, color:colors.ink[500], textAlign:'center', lineHeight:fontSize.base*lineHeight.relaxed }}>
      Complète ta première séance ou ton premier repas pour voir tes progrès apparaître ici. 🌿
    </Text>
  </View>
);

type Filter = 'tout' | 'séances' | 'repas';

const HISTORY = [
  {
    date: "Aujourd'hui",
    items: [
      { type:'séance', icon:Dumbbell,  title:'Full Body A',       meta:'45 min · 6 exercices', badge:'sage', note:'Nouveau PR sur les squats 🎉' },
      { type:'repas',  icon:Apple,     title:'Petit-déjeuner',    meta:'420 kcal · P 22g G 58g L 12g', badge:'clay' },
    ],
  },
  {
    date: 'Hier · Mercredi',
    items: [
      { type:'séance', icon:Dumbbell,  title:'Cardio LISS',       meta:'30 min · Zone 2', badge:'sage', note:'Fréquence cardiaque stable tout au long' },
      { type:'repas',  icon:Apple,     title:'Déjeuner',          meta:'680 kcal · P 45g G 72g L 20g', badge:'clay' },
      { type:'repas',  icon:Apple,     title:'Dîner',             meta:'520 kcal · P 38g G 48g L 18g', badge:'clay' },
      { type:'eau',    icon:Droplets,  title:'Hydratation',       meta:'2.2 L sur 2.5 L objectif', badge:'info' },
    ],
  },
  {
    date: 'Mardi',
    items: [
      { type:'repas',  icon:Apple,     title:'3 repas complets',  meta:'1 580 kcal · Objectif atteint ✓', badge:'clay' },
      { type:'eau',    icon:Droplets,  title:'Hydratation',       meta:'2.5 L · Objectif atteint ✓', badge:'info' },
    ],
  },
  {
    date: 'Lundi',
    items: [
      { type:'séance', icon:Dumbbell,  title:'Lower Body B',      meta:'50 min · 7 exercices', badge:'sage' },
      { type:'repas',  icon:Apple,     title:'Journée équilibrée',meta:'1 720 kcal · +5% protéines', badge:'clay' },
    ],
  },
];

const STATS = [
  { label:'Séances ce mois', value:'11' },
  { label:'Calories moy./jour', value:'1 640' },
  { label:'Streak actuel', value:'4 j 🔥' },
];

export const ProfileHistoryScreen: React.FC<Props> = ({ onBack, isNewUser = false }) => {
  const [filter, setFilter] = useState<Filter>('tout');

  const filters: Filter[] = ['tout','séances','repas'];

  const filtered = HISTORY.map(day => ({
    ...day,
    items: filter === 'tout' ? day.items : day.items.filter(i => i.type === filter.slice(0,-1) || i.type === filter),
  })).filter(day => day.items.length > 0);

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Pressable style={s.backBtn} onPress={onBack} accessibilityRole="button">
          <ChevronLeft size={22} color={colors.ink[700]} strokeWidth={2} />
        </Pressable>
        <Text style={s.title}>Historique</Text>
        <View style={{ width:40 }} />
      </View>

      {isNewUser ? <EmptyHistory /> : <ScrollView showsVerticalScrollIndicator={false}>
        {/* Stats */}
        <View style={s.statsRow}>
          {STATS.map(stat => (
            <View key={stat.label} style={s.statCard}>
              <Text style={s.statValue}>{stat.value}</Text>
              <Text style={s.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Chart placeholder */}
        <View style={s.chartCard}>
          <View style={s.chartHeader}>
            <TrendingUp size={18} color={colors.sage[500]} strokeWidth={2} />
            <Text style={s.chartTitle}>Activité des 4 dernières semaines</Text>
          </View>
          <View style={s.chartBars}>
            {[3,4,2,4,3,5,4,3,4,4,3,2,4,4,5,4,4,3,4,5,4,3,4,4,3,4,4,5,4,3].map((h, i) => (
              <View key={i} style={[s.bar, { height: h * 10, backgroundColor: i >= 28 ? colors.sage[500] : colors.sage[200] }]} />
            ))}
          </View>
          <View style={s.chartLegend}>
            <View style={[s.legendDot, { backgroundColor:colors.sage[500] }]} />
            <Text style={s.legendText}>Cette semaine</Text>
            <View style={[s.legendDot, { backgroundColor:colors.sage[200] }]} />
            <Text style={s.legendText}>Semaines précédentes</Text>
          </View>
        </View>

        {/* Filter chips */}
        <View style={s.filtersRow}>
          {filters.map(f => (
            <Pressable
              key={f}
              style={[s.filterChip, filter === f && s.filterChipActive]}
              onPress={() => setFilter(f)}
              accessibilityRole="radio"
              accessibilityState={{ selected: filter === f }}
            >
              <Text style={[s.filterText, filter === f && s.filterTextActive]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Timeline */}
        <View style={s.timeline}>
          {filtered.map((day, di) => (
            <View key={di}>
              <Text style={s.dateLabel}>{day.date}</Text>
              {day.items.map((item, ii) => (
                <View key={ii} style={s.timelineItem}>
                  <View style={s.timelineLine} />
                  <View style={s.timelineDot}>
                    <item.icon size={14} color={colors.sage[600]} strokeWidth={2} />
                  </View>
                  <View style={s.timelineCard}>
                    <View style={s.timelineCardTop}>
                      <Text style={s.itemTitle}>{item.title}</Text>
                      <Badge variant={item.badge as any} label={item.type.toUpperCase()} />
                    </View>
                    <Text style={s.itemMeta}>{item.meta}</Text>
                    {(item as any).note && (
                      <Text style={s.itemNote}>{(item as any).note}</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          ))}
        </View>

        <View style={{ height:40 }} />
      </ScrollView>}
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe:   { flex:1, backgroundColor:colors.sand[50] },
  header: { flexDirection:'row', alignItems:'center', paddingHorizontal:spacing[5], paddingVertical:spacing[4], borderBottomWidth:1, borderBottomColor:colors.ink[200] },
  backBtn:{ width:40, height:40, borderRadius:20, backgroundColor:colors.ink[100], alignItems:'center', justifyContent:'center' },
  title:  { flex:1, textAlign:'center', fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.lg, color:colors.ink[900] },

  statsRow: { flexDirection:'row', gap:spacing[3], paddingHorizontal:spacing[5], paddingTop:spacing[5], marginBottom:spacing[4] },
  statCard: { flex:1, backgroundColor:'#fff', borderRadius:radius.lg, padding:spacing[4], alignItems:'center', gap:spacing[1], ...shadows.sm },
  statValue:{ fontFamily:fontFamily.spectral.medium, fontSize:fontSize.xl, color:colors.ink[900] },
  statLabel:{ fontFamily:fontFamily.hanken.regular, fontSize:10, color:colors.ink[500], textTransform:'uppercase', letterSpacing:0.5, textAlign:'center' },

  chartCard: { marginHorizontal:spacing[5], marginBottom:spacing[5], backgroundColor:'#fff', borderRadius:radius.xl, padding:spacing[5], gap:spacing[4], ...shadows.sm },
  chartHeader:{ flexDirection:'row', alignItems:'center', gap:spacing[2] },
  chartTitle: { fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.sm, color:colors.ink[800] },
  chartBars:  { flexDirection:'row', alignItems:'flex-end', gap:2, height:60 },
  bar:        { flex:1, borderRadius:2 },
  chartLegend:{ flexDirection:'row', alignItems:'center', gap:spacing[3] },
  legendDot:  { width:8, height:8, borderRadius:4 },
  legendText: { fontFamily:fontFamily.hanken.regular, fontSize:fontSize.xs, color:colors.ink[500] },

  filtersRow: { flexDirection:'row', gap:spacing[2], paddingHorizontal:spacing[5], marginBottom:spacing[4] },
  filterChip:     { paddingHorizontal:spacing[4], paddingVertical:spacing[2], borderRadius:radius.pill, backgroundColor:colors.ink[100] },
  filterChipActive:{ backgroundColor:colors.sage[500] },
  filterText:     { fontFamily:fontFamily.hanken.medium, fontSize:fontSize.sm, color:colors.ink[600] },
  filterTextActive:{ color:'#fff' },

  timeline:    { paddingHorizontal:spacing[5] },
  dateLabel:   { fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.sm, color:colors.ink[500], textTransform:'uppercase', letterSpacing:1, marginBottom:spacing[3], marginTop:spacing[5] },

  timelineItem:{ flexDirection:'row', gap:spacing[3], marginBottom:spacing[3], position:'relative' },
  timelineLine:{ position:'absolute', left:20, top:36, bottom:-spacing[3], width:1, backgroundColor:colors.ink[200] },
  timelineDot: { width:40, height:40, borderRadius:20, backgroundColor:colors.sage[50], borderWidth:2, borderColor:colors.sage[200], alignItems:'center', justifyContent:'center', flexShrink:0 },
  timelineCard:{ flex:1, backgroundColor:'#fff', borderRadius:radius.lg, padding:spacing[4], gap:spacing[1], ...shadows.sm },
  timelineCardTop:{ flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  itemTitle:   { fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.base, color:colors.ink[900], flex:1 },
  itemMeta:    { fontFamily:fontFamily.hanken.regular, fontSize:fontSize.sm, color:colors.ink[600] },
  itemNote:    { fontFamily:fontFamily.hanken.medium, fontSize:fontSize.sm, color:colors.sage[600] },
});

export default ProfileHistoryScreen;
