import React, { useState, useEffect } from 'react';
import {
  Pressable, SafeAreaView, ScrollView,
  StyleSheet, Switch, Text, View, Modal
} from 'react-native';
import {
  ChevronLeft, Bell, Utensils, Dumbbell,
  Droplets, Moon, MessageCircle, TrendingUp,
  Clock, Sparkles, Check
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showAlert } from '../../utils/alert';
import { colors, fontFamily, fontSize, lineHeight, spacing, radius, shadows } from '../../theme/theme';

interface Props { onBack: () => void; }

type NotifSection = { title: string; items: NotifItem[]; };
type NotifItem = {
  icon: React.ElementType;
  label: string;
  desc: string;
  key: string;
  color: string;
  defaultTime?: string;
};

const STORAGE_NOTIF_KEY = '@pure_ascension_notif_settings_v1';

const SECTIONS: NotifSection[] = [
  {
    title: 'Rappels quotidiens',
    items: [
      { icon: Utensils,  label: 'Rappels repas', desc: 'Rappel 15 min avant chaque repas planifié.', key: 'meals', color: colors.clay[500], defaultTime: '12:30 & 19:30' },
      { icon: Dumbbell,  label: 'Rappel séance', desc: 'Notification 1h avant ta séance du jour.', key: 'workout', color: colors.sage[500], defaultTime: '17:30' },
      { icon: Droplets,  label: 'Hydratation', desc: 'Rappels réguliers pour atteindre 8 verres d\'eau.', key: 'hydration', color: colors.info[500], defaultTime: 'Toutes les 2h' },
      { icon: Moon,      label: 'Routine du soir', desc: 'Rituel de fermeture et déconnexion des écrans.', key: 'evening', color: colors.ink[600], defaultTime: '21:30' },
    ],
  },
  {
    title: 'Progression & achievements',
    items: [
      { icon: TrendingUp, label: 'Récap hebdomadaire', desc: 'Bilan de la semaine chaque dimanche soir.', key: 'weekly', color: colors.status.success, defaultTime: 'Dimanche 19:00' },
      { icon: Bell,       label: 'Nouveaux objectifs atteints', desc: 'Célébration quand tu franchis un cap.', key: 'milestones', color: colors.status.warning, defaultTime: 'Instantané' },
    ],
  },
  {
    title: 'Communauté & programme',
    items: [
      { icon: MessageCircle, label: 'Messages de coaching IA', desc: 'Conseils et encouragements de ton programme.', key: 'coaching', color: colors.sage[600], defaultTime: '09:00' },
    ],
  },
];

export const ProfileNotificationsScreen: React.FC<Props> = ({ onBack }) => {
  const [notifs, setNotifs] = useState<Record<string, boolean>>({
    meals: true, workout: true, hydration: true, evening: true,
    weekly: true, milestones: true, coaching: false,
  });

  const [reminderTimes, setReminderTimes] = useState<Record<string, string>>({
    meals: '12:30 & 19:30',
    workout: '17:30',
    hydration: 'Toutes les 2h',
    evening: '21:30',
    weekly: 'Dim 19:00',
  });

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [showTimePickerModal, setShowTimePickerModal] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_NOTIF_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.notifs) setNotifs(parsed.notifs);
        if (parsed.reminderTimes) setReminderTimes(parsed.reminderTimes);
      }
    } catch (e) {
      console.error('Erreur de chargement des notifications:', e);
    }
  };

  const saveSettings = async (updatedNotifs: Record<string, boolean>, updatedTimes: Record<string, string>) => {
    try {
      setNotifs(updatedNotifs);
      setReminderTimes(updatedTimes);
      await AsyncStorage.setItem(STORAGE_NOTIF_KEY, JSON.stringify({
        notifs: updatedNotifs,
        reminderTimes: updatedTimes,
      }));
    } catch (e) {
      console.error('Erreur de sauvegarde des notifications:', e);
    }
  };

  const toggle = (key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updated = { ...notifs, [key]: !notifs[key] };
    saveSettings(updated, reminderTimes);
  };

  const handleSelectTime = (time: string) => {
    if (!editingKey) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const updatedTimes = { ...reminderTimes, [editingKey]: time };
    saveSettings(notifs, updatedTimes);
    setShowTimePickerModal(false);
    setEditingKey(null);
  };

  const handleTestNotification = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showAlert(
      '🔔 Test de notification Pure Ascension',
      'Exemple : "C\'est l\'heure de ton repas P1 ! Pavé de saumon & épinards bio pour maintenir ton énergie."',
      [{ text: 'Super !' }]
    );
  };

  const activeCount = Object.values(notifs).filter(Boolean).length;

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <Pressable
          style={s.backBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onBack();
          }}
          accessibilityRole="button"
        >
          <ChevronLeft size={22} color={colors.ink[700]} strokeWidth={2} />
        </Pressable>
        <Text style={s.title}>Notifications & Rappels</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Summary Card */}
        <View style={s.summaryCard}>
          <View style={s.summaryIconWrap}>
            <Bell size={22} color={colors.sage[600]} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.summaryTitle}>
              {activeCount} rappel{activeCount > 1 ? 's' : ''} actif{activeCount > 1 ? 's' : ''}
            </Text>
            <Text style={s.summaryDesc}>
              Reçois des rappels au moment idéal pour ancrer tes rituels P1-P4 sans charge mentale.
            </Text>
          </View>
        </View>

        {/* Sections list */}
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
                    value={notifs[item.key] ?? false}
                    onValueChange={() => toggle(item.key)}
                    trackColor={{ false: colors.ink[200], true: colors.sage[400] }}
                    thumbColor={notifs[item.key] ? colors.sage[600] : '#fff'}
                    accessibilityLabel={item.label}
                  />
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* Configuration des horaires */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Horaires personnalisés</Text>
          <View style={s.sectionCard}>
            {[
              {
                key: 'meals',
                label: 'Rappels repas',
                options: [
                  '07:30 & 12:00', '08:00 & 12:30', '12:00 & 19:00', '12:30 & 19:30',
                  '13:00 & 20:00', '18:00 & 21:00', 'Personnalisé 11:30 & 18:30',
                ],
              },
              {
                key: 'workout',
                label: 'Rappel séance',
                options: [
                  '06:30 (Tôt)', '07:00 (Matin)', '07:30 (Matin)', '08:00 (Matin)',
                  '12:00 (Midi)', '12:15 (Midi)', '17:00 (Fin de journée)', '17:30 (Fin de journée)',
                  '18:30 (Soir)', '19:00 (Soir)', '20:00 (Soir)',
                ],
              },
              {
                key: 'hydration',
                label: 'Rappels hydratation',
                options: [
                  'Toutes les heures', 'Toutes les 90 min', 'Toutes les 2h',
                  '3x par jour', '4x par jour', 'Au réveil + midi + soir',
                ],
              },
              {
                key: 'evening',
                label: 'Routine du soir',
                options: [
                  '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00',
                ],
              },
            ].map((row, i) => (
              <View key={row.key} style={[s.timeRow, i > 0 && s.itemBorder]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
                  <Clock size={16} color={colors.ink[500]} />
                  <Text style={s.timeLabel}>{row.label}</Text>
                </View>

                <Pressable
                  style={s.timePill}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setEditingKey(row.key);
                    setShowTimePickerModal(true);
                  }}
                  accessibilityRole="button"
                >
                  <Text style={s.timeValue}>{reminderTimes[row.key] || row.options[1]}</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </View>

        {/* Test Notification Button */}
        <Pressable
          style={s.testBtn}
          onPress={handleTestNotification}
          accessibilityRole="button"
        >
          <Sparkles size={18} color={colors.sage[600]} />
          <Text style={s.testBtnText}>Tester une notification rappel</Text>
        </Pressable>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal d'édition des horaires */}
      <Modal visible={showTimePickerModal} transparent animationType="fade" onRequestClose={() => setShowTimePickerModal(false)}>
        <View style={s.timeModalOverlay}>
          <View style={s.timeModalCard}>
            <Text style={s.timeModalTitle}>Choisir un horaire de rappel</Text>
            <Text style={s.timeModalSub}>Sélectionne l'heure préférentielle pour ton rituel</Text>

            {editingKey && (
              (
                {
                  meals: [
                    '07:30 & 12:00', '08:00 & 12:30', '12:00 & 19:00', '12:30 & 19:30',
                    '13:00 & 20:00', '18:00 & 21:00', 'Personnalisé 11:30 & 18:30',
                  ],
                  workout: [
                    '06:30 (Tôt)', '07:00 (Matin)', '07:30 (Matin)', '08:00 (Matin)',
                    '12:00 (Midi)', '12:15 (Midi)', '17:00 (Fin de journée)', '17:30 (Fin de journée)',
                    '18:30 (Soir)', '19:00 (Soir)', '20:00 (Soir)',
                  ],
                  hydration: [
                    'Toutes les heures', 'Toutes les 90 min', 'Toutes les 2h',
                    '3x par jour', '4x par jour', 'Au réveil + midi + soir',
                  ],
                  evening: ['20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00'],
                } as Record<string, string[]>
              )[editingKey] || []
            ).map(t => (
              <Pressable
                key={t}
                style={s.timeModalOption}
                onPress={() => handleSelectTime(t)}
                accessibilityRole="button"
              >
                <Text style={s.timeModalOptionText}>{t}</Text>
                {reminderTimes[editingKey] === t && <Check size={16} color={colors.sage[600]} />}
              </Pressable>
            ))}

            <Pressable
              style={s.timeModalClose}
              onPress={() => setShowTimePickerModal(false)}
              accessibilityRole="button"
            >
              <Text style={s.timeModalCloseText}>Fermer</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.sand[50] },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.ink[200],
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.ink[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  title:  {
    flex: 1,
    textAlign: 'center',
    fontFamily: fontFamily.hanken.semiBold,
    fontSize: fontSize.lg,
    color: colors.ink[900],
  },
  scroll: { paddingHorizontal: spacing[5], paddingTop: spacing[5] },

  summaryCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[4],
    backgroundColor: colors.sage[50],
    borderRadius: radius.xl,
    padding: spacing[5],
    marginBottom: spacing[6],
    borderWidth: 1,
    borderColor: colors.sage[200],
  },
  summaryIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.sage[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTitle: {
    fontFamily: fontFamily.hanken.bold,
    fontSize: fontSize.base,
    color: colors.ink[900],
    marginBottom: 2,
  },
  summaryDesc: {
    fontFamily: fontFamily.hanken.regular,
    fontSize: fontSize.sm,
    color: colors.ink[600],
    lineHeight: fontSize.sm * lineHeight.relaxed,
  },

  section: { marginBottom: spacing[6] },
  sectionTitle: {
    fontFamily: fontFamily.hanken.semiBold,
    fontSize: fontSize.xs,
    color: colors.ink[500],
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing[3],
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.ink[200],
    ...shadows.sm,
  },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    padding: spacing[4.5],
  },
  itemBorder: { borderTopWidth: 1, borderTopColor: colors.ink[100] },
  itemIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  itemText: { flex: 1, gap: 2 },
  itemLabel: { fontFamily: fontFamily.hanken.semiBold, fontSize: fontSize.base, color: colors.ink[900] },
  itemDesc: { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.xs, color: colors.ink[500], lineHeight: 18 },

  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4.5],
  },
  timeLabel: { fontFamily: fontFamily.hanken.medium, fontSize: fontSize.sm, color: colors.ink[800] },
  timePill: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radius.pill,
    backgroundColor: colors.sage[100],
  },
  timeValue: { fontFamily: fontFamily.hanken.bold, fontSize: fontSize.xs, color: colors.sage[800] },

  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: colors.sage[300],
    paddingVertical: spacing[3.5],
    borderRadius: radius.xl,
    marginBottom: spacing[4],
    ...shadows.sm,
  },
  testBtnText: {
    fontFamily: fontFamily.hanken.bold,
    fontSize: fontSize.sm,
    color: colors.sage[800],
  },

  timeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(30,42,34,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[5],
  },
  timeModalCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: radius.xl,
    padding: spacing[5],
    gap: spacing[3],
  },
  timeModalTitle: {
    fontFamily: fontFamily.hanken.bold,
    fontSize: fontSize.base,
    color: colors.ink[900],
  },
  timeModalSub: {
    fontFamily: fontFamily.hanken.regular,
    fontSize: fontSize.xs,
    color: colors.ink[600],
    marginBottom: spacing[2],
  },
  timeModalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    borderRadius: radius.md,
    backgroundColor: colors.sand[50],
  },
  timeModalOptionText: {
    fontFamily: fontFamily.hanken.medium,
    fontSize: fontSize.sm,
    color: colors.ink[900],
  },
  timeModalClose: {
    alignSelf: 'center',
    marginTop: spacing[2],
    paddingVertical: spacing[2],
  },
  timeModalCloseText: {
    fontFamily: fontFamily.hanken.bold,
    fontSize: fontSize.xs,
    color: colors.ink[600],
  },
});

export default ProfileNotificationsScreen;
