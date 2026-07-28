import React, { useState } from 'react';
import {
  Animated, Pressable, SafeAreaView,
  ScrollView, StyleSheet, Text, View, TextInput, Modal
} from 'react-native';
import { showAlert } from '../../utils/alert';
import {
  ChevronLeft, Sun, Moon, Wind, BookOpen,
  Heart, Flower2, Plus, Check,
} from 'lucide-react-native';
import { colors, fontFamily, fontSize, lineHeight, spacing, radius, shadows } from '../../theme/theme';
import { Button } from '../../components/Button';

interface Props { onBack: () => void; }

type Ritual = {
  id: string; icon: React.ElementType; title: string; desc: string;
  duration: string; color: string; bg: string;
  tags: string[]; completedToday: boolean;
};

const RITUALS: Ritual[] = [
  {
    id:'r1', icon:Sun, title:'Réveil en douceur', duration:'10 min',
    color:colors.status.warning, bg:colors.status.warningSoft,
    desc:'Étirements légers au lever pour réveiller le corps en douceur. Pas d\'écran pendant les 10 premières minutes.',
    tags:['matin','mobilité','énergie'], completedToday:true,
  },
  {
    id:'r2', icon:Wind, title:'Respiration consciente', duration:'5 min',
    color:colors.info[500], bg:colors.info[50],
    desc:'3 cycles de respiration 4-7-8 pour calmer le système nerveux et aiguiser la concentration.',
    tags:['matin','soir','stress'], completedToday:false,
  },
  {
    id:'r3', icon:BookOpen, title:'Journal de gratitude', duration:'5 min',
    color:colors.clay[500], bg:colors.clay[100],
    desc:'3 choses pour lesquelles tu es reconnaissant·e aujourd\'hui. Ancre ta journée dans le positif.',
    tags:['matin','mindset'], completedToday:false,
  },
  {
    id:'r4', icon:Heart, title:'Scan corporel', duration:'8 min',
    color:colors.sage[500], bg:colors.sage[100],
    desc:'Prise de conscience des sensations physiques et émotionnelles. Un moment de connexion avec soi.',
    tags:['soir','récupération'], completedToday:false,
  },
  {
    id:'r5', icon:Moon, title:'Déconnexion numérique', duration:'30 min avant le sommeil',
    color:colors.ink[600], bg:colors.sand[200],
    desc:'Éteindre les écrans 30 minutes avant de dormir. Lire, écrire ou simplement être.',
    tags:['soir','sommeil'], completedToday:false,
  },
  {
    id:'r6', icon:Flower2, title:'Marche méditative', duration:'15 min',
    color:colors.status.success, bg:colors.status.successSoft,
    desc:'Une promenade lente et consciente, sans musique ni podcast. Juste toi et ton environnement.',
    tags:['journée','pleine conscience'], completedToday:false,
  },
];

export const ProfileRitualsScreen: React.FC<Props> = ({ onBack }) => {
  const [rituals, setRituals] = useState<Ritual[]>(RITUALS);
  const [completed, setCompleted] = useState<Set<string>>(
    new Set(RITUALS.filter(r => r.completedToday).map(r => r.id))
  );
  const [expanded, setExpanded] = useState<string | null>(null);

  // Form states
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDuration, setNewDuration] = useState('10 min');
  const [newTags, setNewTags] = useState('bien-être');

  const toggle = (id: string) => {
    setCompleted(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleCreateRitual = () => {
    if (!newTitle.trim()) {
      showAlert('Erreur', 'Le titre est obligatoire.');
      return;
    }
    const newRitual: Ritual = {
      id: 'custom-' + Date.now(),
      icon: Sun, // Default icon
      title: newTitle.trim(),
      desc: newDesc.trim() || 'Mon rituel bien-être personnalisé.',
      duration: newDuration.trim(),
      color: colors.sage[500],
      bg: colors.sage[100],
      tags: newTags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean),
      completedToday: false,
    };
    setRituals(prev => [...prev, newRitual]);
    setNewTitle('');
    setNewDesc('');
    setNewDuration('10 min');
    setNewTags('bien-être');
    setAddModalVisible(false);
  };

  const doneCount = completed.size;
  const totalCount = rituals.length;

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Pressable style={s.backBtn} onPress={onBack} accessibilityRole="button">
          <ChevronLeft size={22} color={colors.ink[700]} strokeWidth={2} />
        </Pressable>
        <Text style={s.title}>Rituels d'équilibre</Text>
        <View style={{ width:40 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll}>

        {/* Progress summary */}
        <View style={s.summaryCard}>
          <View style={s.summaryTop}>
            <Text style={s.summaryHeading}>Aujourd'hui</Text>
            <Text style={s.summaryCount}>{doneCount}/{totalCount}</Text>
          </View>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width:`${(doneCount/totalCount)*100}%` as any }]} />
          </View>
          <Text style={s.summaryCaption}>
            {doneCount === totalCount
              ? '✨ Tous tes rituels accomplis — belle journée !'
              : `${totalCount - doneCount} rituel${totalCount - doneCount > 1 ? 's' : ''} restant${totalCount - doneCount > 1 ? 's' : ''} aujourd'hui`
            }
          </Text>
        </View>

        {/* Intro */}
        <Text style={s.intro}>
          Les rituels d'équilibre sont de petites pratiques quotidiennes qui ancrent ton bien-être dans le temps.
          Quelques minutes par jour suffisent.
        </Text>

        {/* Ritual cards */}
        {rituals.map(ritual => {
          const isDone = completed.has(ritual.id);
          const isExpanded = expanded === ritual.id;
          const Icon = ritual.icon;
          return (
            <View key={ritual.id} style={[s.card, isDone && s.cardDone]}>
              <Pressable
                style={s.cardTop}
                onPress={() => setExpanded(isExpanded ? null : ritual.id)}
                accessibilityRole="button"
                accessibilityState={{ expanded: isExpanded }}
              >
                <View style={[s.cardIcon, { backgroundColor: ritual.bg }]}>
                  <Icon size={22} color={isDone ? '#fff' : ritual.color} strokeWidth={1.8} />
                  {isDone && (
                    <View style={[s.doneBadge, { backgroundColor:ritual.color }]}>
                      <Check size={8} color="#fff" strokeWidth={3} />
                    </View>
                  )}
                </View>
                <View style={{ flex:1 }}>
                  <Text style={[s.cardTitle, isDone && s.cardTitleDone]}>{ritual.title}</Text>
                  <Text style={s.cardDuration}>{ritual.duration}</Text>
                </View>
                <Pressable
                  style={[s.checkBtn, isDone && { backgroundColor:ritual.color }]}
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

              {/* Tags */}
              <View style={s.tagsRow}>
                {ritual.tags.map(tag => (
                  <View key={tag} style={[s.tag, { backgroundColor:ritual.bg }]}>
                    <Text style={[s.tagText, { color:ritual.color }]}>{tag}</Text>
                  </View>
                ))}
              </View>

              {/* Expanded description */}
              {isExpanded && (
                <View style={[s.expandedBox, { borderLeftColor:ritual.color }]}>
                  <Text style={s.expandedText}>{ritual.desc}</Text>
                </View>
              )}
            </View>
          );
        })}

        {/* Add ritual CTA */}
        <Pressable
          style={s.addCard}
          accessibilityRole="button"
          onPress={() => setAddModalVisible(true)}
        >
          <View style={s.addIcon}>
            <Plus size={20} color={colors.sage[500]} strokeWidth={2} />
          </View>
          <Text style={s.addText}>Créer un rituel personnalisé</Text>
        </Pressable>

        <View style={{ height:40 }} />
      </ScrollView>

      {/* Modal Add Ritual */}
      <Modal
        visible={addModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#fbf8f3', padding: spacing[5], gap: spacing[4] }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[2] }}>
            <Text style={{ fontFamily: fontFamily.spectral.bold, fontSize: fontSize.xl, color: colors.ink[900] }}>
              Nouveau Rituel
            </Text>
            <Pressable onPress={() => setAddModalVisible(false)} accessibilityRole="button">
              <Text style={{ fontFamily: fontFamily.hanken.bold, fontSize: fontSize.sm, color: colors.ink[600] }}>
                Fermer
              </Text>
            </Pressable>
          </View>

          <View style={{ gap: spacing[1] }}>
            <Text style={{ fontFamily: fontFamily.hanken.semiBold, fontSize: fontSize.sm, color: colors.ink[800] }}>
              Titre du rituel
            </Text>
            <TextInput
              style={{
                backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.ink[200], borderRadius: radius.lg,
                padding: spacing[3], fontFamily: fontFamily.hanken.regular, fontSize: fontSize.base, color: colors.ink[900]
              }}
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="Ex: Tisane relaxante"
              placeholderTextColor={colors.ink[400]}
            />
          </View>

          <View style={{ gap: spacing[1] }}>
            <Text style={{ fontFamily: fontFamily.hanken.semiBold, fontSize: fontSize.sm, color: colors.ink[800] }}>
              Description / Consignes
            </Text>
            <TextInput
              style={{
                backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.ink[200], borderRadius: radius.lg,
                padding: spacing[3], height: 80, textAlignVertical: 'top', fontFamily: fontFamily.hanken.regular,
                fontSize: fontSize.base, color: colors.ink[900]
              }}
              value={newDesc}
              onChangeText={setNewDesc}
              placeholder="Ex: Préparer une infusion de camomille ou verveine et la déguster loin des écrans."
              placeholderTextColor={colors.ink[400]}
              multiline
            />
          </View>

          <View style={{ gap: spacing[1] }}>
            <Text style={{ fontFamily: fontFamily.hanken.semiBold, fontSize: fontSize.sm, color: colors.ink[800] }}>
              Durée indicative
            </Text>
            <TextInput
              style={{
                backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.ink[200], borderRadius: radius.lg,
                padding: spacing[3], fontFamily: fontFamily.hanken.regular, fontSize: fontSize.base, color: colors.ink[900]
              }}
              value={newDuration}
              onChangeText={setNewDuration}
              placeholder="Ex: 15 min"
              placeholderTextColor={colors.ink[400]}
            />
          </View>

          <View style={{ gap: spacing[1] }}>
            <Text style={{ fontFamily: fontFamily.hanken.semiBold, fontSize: fontSize.sm, color: colors.ink[800] }}>
              Tags (séparés par des virgules)
            </Text>
            <TextInput
              style={{
                backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.ink[200], borderRadius: radius.lg,
                padding: spacing[3], fontFamily: fontFamily.hanken.regular, fontSize: fontSize.base, color: colors.ink[900],
                marginBottom: spacing[4]
              }}
              value={newTags}
              onChangeText={setNewTags}
              placeholder="Ex: soir, détente, tisane"
              placeholderTextColor={colors.ink[400]}
            />
          </View>

          <Button
            variant="primary"
            size="lg"
            label="Ajouter ce rituel"
            fullWidth
            onPress={handleCreateRitual}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe:   { flex:1, backgroundColor:colors.sand[50] },
  header: { flexDirection:'row', alignItems:'center', paddingHorizontal:spacing[5], paddingVertical:spacing[4], borderBottomWidth:1, borderBottomColor:colors.ink[200] },
  backBtn:{ width:40, height:40, borderRadius:20, backgroundColor:colors.ink[100], alignItems:'center', justifyContent:'center' },
  title:  { flex:1, textAlign:'center', fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.lg, color:colors.ink[900] },

  scroll: { paddingHorizontal:spacing[5], paddingTop:spacing[5] },

  summaryCard:    { backgroundColor:colors.sage[800], borderRadius:radius.xl, padding:spacing[5], marginBottom:spacing[6], gap:spacing[3] },
  summaryTop:     { flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  summaryHeading: { fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.base, color:'#fff' },
  summaryCount:   { fontFamily:fontFamily.spectral.medium, fontSize:fontSize['2xl'], color:colors.sage[300] },
  progressTrack:  { height:6, borderRadius:3, backgroundColor:colors.sage[700], overflow:'hidden' },
  progressFill:   { height:'100%' as any, borderRadius:3, backgroundColor:colors.sage[400] },
  summaryCaption: { fontFamily:fontFamily.hanken.regular, fontSize:fontSize.sm, color:colors.sage[200] },

  intro: { fontFamily:fontFamily.hanken.regular, fontSize:fontSize.base, color:colors.ink[600], lineHeight:fontSize.base*lineHeight.relaxed, marginBottom:spacing[6] },

  card:      { backgroundColor:'#fff', borderRadius:radius.xl, padding:spacing[4], marginBottom:spacing[3], gap:spacing[3], ...shadows.sm },
  cardDone:  { opacity:0.85 },
  cardTop:   { flexDirection:'row', alignItems:'center', gap:spacing[4] },
  cardIcon:  { width:48, height:48, borderRadius:24, alignItems:'center', justifyContent:'center', position:'relative' },
  doneBadge: { position:'absolute', bottom:-2, right:-2, width:16, height:16, borderRadius:8, alignItems:'center', justifyContent:'center', borderWidth:2, borderColor:'#fff' },
  cardTitle: { fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.base, color:colors.ink[900], marginBottom:2 },
  cardTitleDone: { textDecorationLine:'line-through', color:colors.ink[400] },
  cardDuration:  { fontFamily:fontFamily.hanken.regular, fontSize:fontSize.sm, color:colors.ink[500] },
  checkBtn:  { width:32, height:32, borderRadius:16, borderWidth:2, borderColor:colors.ink[300], alignItems:'center', justifyContent:'center' },
  checkEmpty:{ width:12, height:12, borderRadius:6 },

  tagsRow: { flexDirection:'row', flexWrap:'wrap', gap:spacing[2] },
  tag:     { paddingHorizontal:spacing[3], paddingVertical:spacing[1], borderRadius:radius.pill },
  tagText: { fontFamily:fontFamily.hanken.medium, fontSize:10, textTransform:'uppercase', letterSpacing:0.5 },

  expandedBox: { backgroundColor:colors.sand[100], borderRadius:radius.md, padding:spacing[4], borderLeftWidth:3 },
  expandedText:{ fontFamily:fontFamily.hanken.regular, fontSize:fontSize.sm, color:colors.ink[700], lineHeight:fontSize.sm*lineHeight.relaxed },

  addCard: { flexDirection:'row', alignItems:'center', gap:spacing[4], padding:spacing[5], borderRadius:radius.xl, borderWidth:2, borderColor:colors.sage[200], borderStyle:'dashed', justifyContent:'center' },
  addIcon: { width:40, height:40, borderRadius:20, backgroundColor:colors.sage[100], alignItems:'center', justifyContent:'center' },
  addText: { fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.base, color:colors.sage[600] },
});

export default ProfileRitualsScreen;
