/**
 * EquilibreScreen — Onglet Équilibre
 * Rituels quotidiens : respiration, journal, méditation, scan corporel…
 */
import React, { useState } from 'react';
import {
  SafeAreaView, ScrollView, StyleSheet,
  Text, View, Pressable,
} from 'react-native';
import {
  Sun, Moon, Wind, BookOpen, Heart, Flower2, Check, Plus,
} from 'lucide-react-native';
import { colors, fontFamily, fontSize, lineHeight, spacing, radius, shadows } from '../theme/theme';

type Ritual = {
  id: string; icon: React.ElementType; title: string; desc: string;
  duration: string; color: string; bg: string;
  tags: string[]; completedToday: boolean;
};

const RITUALS: Ritual[] = [
  {
    id:'r1', icon:Wind, title:'Respiration 4-7-8', duration:'5 min',
    color:colors.info[500], bg:colors.info[50],
    desc:'Inspire 4 secondes, retiens 7, expire 8. 3 cycles pour calmer le système nerveux et aiguiser la concentration.',
    tags:['matin','soir','stress'], completedToday:false,
  },
  {
    id:'r2', icon:Sun, title:'Réveil en douceur', duration:'10 min',
    color:colors.status.warning, bg:colors.status.warningSoft,
    desc:'Étirements légers au lever pour réveiller le corps en douceur. Pas d\'écran pendant les 10 premières minutes.',
    tags:['matin','mobilité','énergie'], completedToday:false,
  },
  {
    id:'r3', icon:BookOpen, title:'Journal du soir', duration:'5 min',
    color:colors.clay[500], bg:colors.clay[100],
    desc:'3 choses pour lesquelles tu es reconnaissant·e aujourd\'hui. Ancre ta journée dans le positif.',
    tags:['soir','mindset'], completedToday:false,
  },
  {
    id:'r4', icon:Heart, title:'Scan corporel', duration:'8 min',
    color:colors.sage[500], bg:colors.sage[100],
    desc:'Prise de conscience des sensations physiques et émotionnelles. Un moment de connexion avec soi.',
    tags:['soir','récupération'], completedToday:false,
  },
  {
    id:'r5', icon:Moon, title:'Méditation guidée', duration:'10 min',
    color:colors.ink[600], bg:colors.sand[200],
    desc:'Éteindre les écrans 30 min avant de dormir. Un court scan de détente pour préparer un sommeil profond.',
    tags:['soir','sommeil'], completedToday:false,
  },
  {
    id:'r6', icon:Flower2, title:'Marche méditative', duration:'15 min',
    color:colors.status.success, bg:colors.status.successSoft,
    desc:'Une promenade lente et consciente, sans musique ni podcast. Juste toi et ton environnement.',
    tags:['journée','pleine conscience'], completedToday:false,
  },
];

export const EquilibreScreen: React.FC = () => {
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [expanded,  setExpanded]  = useState<string | null>(null);

  const toggle = (id: string) => {
    setCompleted(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const doneCount  = completed.size;
  const totalCount = RITUALS.length;

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerTitle}>Équilibre</Text>
          <Text style={s.headerSub}>Quelques minutes pour toi.</Text>
        </View>

        {/* Progress card */}
        <View style={s.summaryCard}>
          <View style={s.summaryTop}>
            <Text style={s.summaryHeading}>Aujourd'hui</Text>
            <Text style={s.summaryCount}>{doneCount}/{totalCount}</Text>
          </View>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width:`${(doneCount / totalCount) * 100}%` as any }]} />
          </View>
          <Text style={s.summaryCaption}>
            {doneCount === totalCount
              ? '✨ Tous tes rituels accomplis — belle journée !'
              : `${totalCount - doneCount} rituel${totalCount - doneCount > 1 ? 's' : ''} restant${totalCount - doneCount > 1 ? 's' : ''} aujourd'hui`}
          </Text>
        </View>

        {/* Ritual cards */}
        {RITUALS.map(ritual => {
          const isDone     = completed.has(ritual.id);
          const isExpanded = expanded === ritual.id;
          const Icon       = ritual.icon;
          return (
            <View key={ritual.id} style={[s.card, isDone && s.cardDone]}>
              <Pressable
                style={s.cardTop}
                onPress={() => setExpanded(isExpanded ? null : ritual.id)}
                accessibilityRole="button"
                accessibilityState={{ expanded: isExpanded }}
              >
                <View style={[s.cardIcon, { backgroundColor: isDone ? ritual.color : ritual.bg }]}>
                  <Icon size={22} color={isDone ? '#fff' : ritual.color} strokeWidth={1.8} />
                  {isDone && (
                    <View style={[s.doneBadge, { backgroundColor: ritual.color }]}>
                      <Check size={8} color="#fff" strokeWidth={3} />
                    </View>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.cardTitle, isDone && s.cardTitleDone]}>{ritual.title}</Text>
                  <Text style={s.cardDuration}>{ritual.duration}</Text>
                </View>
                <Pressable
                  style={[s.checkBtn, isDone && { backgroundColor: ritual.color, borderColor: ritual.color }]}
                  onPress={() => toggle(ritual.id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isDone }}
                >
                  {isDone
                    ? <Check size={16} color="#fff" strokeWidth={2.5} />
                    : <View style={s.checkEmpty} />
                  }
                </Pressable>
              </Pressable>

              <View style={s.tagsRow}>
                {ritual.tags.map(tag => (
                  <View key={tag} style={[s.tag, { backgroundColor: ritual.bg }]}>
                    <Text style={[s.tagText, { color: ritual.color }]}>{tag}</Text>
                  </View>
                ))}
              </View>

              {isExpanded && (
                <View style={[s.expandedBox, { borderLeftColor: ritual.color }]}>
                  <Text style={s.expandedText}>{ritual.desc}</Text>
                </View>
              )}
            </View>
          );
        })}

        <Pressable style={s.addCard} accessibilityRole="button">
          <View style={s.addIcon}>
            <Plus size={20} color={colors.sage[500]} strokeWidth={2} />
          </View>
          <Text style={s.addText}>Créer un rituel personnalisé</Text>
        </Pressable>

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.sand[50] },
  scroll: { paddingHorizontal: spacing[5], paddingTop: spacing[6] },

  header:      { marginBottom: spacing[6], gap: spacing[1] },
  headerTitle: { fontFamily: fontFamily.spectral.regular, fontSize: fontSize['3xl'], color: colors.ink[900] },
  headerSub:   { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.base, color: colors.ink[600] },

  summaryCard:    { backgroundColor: colors.sage[800], borderRadius: radius.xl, padding: spacing[5], marginBottom: spacing[6], gap: spacing[3] },
  summaryTop:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryHeading: { fontFamily: fontFamily.hanken.semiBold, fontSize: fontSize.base, color: '#fff' },
  summaryCount:   { fontFamily: fontFamily.spectral.medium, fontSize: fontSize['2xl'], color: colors.sage[300] },
  progressTrack:  { height: 6, borderRadius: 3, backgroundColor: colors.sage[700], overflow: 'hidden' },
  progressFill:   { height: '100%' as any, borderRadius: 3, backgroundColor: colors.sage[400] },
  summaryCaption: { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.sm, color: colors.sage[200] },

  card:     { backgroundColor: '#fff', borderRadius: radius.xl, padding: spacing[4], marginBottom: spacing[3], gap: spacing[3], ...shadows.sm },
  cardDone: { opacity: 0.8 },
  cardTop:  { flexDirection: 'row', alignItems: 'center', gap: spacing[4] },
  cardIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  doneBadge:{ position: 'absolute', bottom: -2, right: -2, width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  cardTitle:{ fontFamily: fontFamily.hanken.semiBold, fontSize: fontSize.base, color: colors.ink[900], marginBottom: 2 },
  cardTitleDone: { textDecorationLine: 'line-through', color: colors.ink[400] },
  cardDuration:  { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.sm, color: colors.ink[500] },
  checkBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: colors.ink[300], alignItems: 'center', justifyContent: 'center' },
  checkEmpty:{ width: 12, height: 12, borderRadius: 6 },

  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  tag:     { paddingHorizontal: spacing[3], paddingVertical: spacing[1], borderRadius: radius.pill },
  tagText: { fontFamily: fontFamily.hanken.medium, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },

  expandedBox:  { backgroundColor: colors.sand[100], borderRadius: radius.md, padding: spacing[4], borderLeftWidth: 3 },
  expandedText: { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.sm, color: colors.ink[700], lineHeight: fontSize.sm * lineHeight.relaxed },

  addCard: { flexDirection: 'row', alignItems: 'center', gap: spacing[4], padding: spacing[5], borderRadius: radius.xl, borderWidth: 2, borderColor: colors.sage[200], borderStyle: 'dashed', justifyContent: 'center' },
  addIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.sage[100], alignItems: 'center', justifyContent: 'center' },
  addText: { fontFamily: fontFamily.hanken.semiBold, fontSize: fontSize.base, color: colors.sage[600] },
});

export default EquilibreScreen;
