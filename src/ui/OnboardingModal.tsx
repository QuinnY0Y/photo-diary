import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { formatHour } from '../domain/diaryTime';
import { useDiary } from '../state/DiaryContext';
import { colors } from './theme';

export function OnboardingModal({ visible }: { visible: boolean }) {
  const { completeOnboarding } = useDiary();
  const [startHour, setStartHour] = useState(4);
  const [notifications, setNotifications] = useState(true);
  const [saving, setSaving] = useState(false);

  const finish = async () => {
    setSaving(true);
    try {
      await completeOnboarding(startHour, notifications);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade">
      <ScrollView contentContainerStyle={styles.root}>
        <View style={styles.mark}>
          <View style={[styles.card, styles.cardBack]} />
          <View style={styles.card}>
            <View style={styles.photo}><Ionicons name="sunny" size={34} color={colors.gold} /></View>
            <View style={styles.cardLine} />
            <View style={[styles.cardLine, styles.cardLineShort]} />
          </View>
        </View>
        <Text style={styles.kicker}>20 HOURS · 20 FRAMES</Text>
        <Text style={styles.title}>把普通的一天，{`\n`}慢慢显影。</Text>
        <Text style={styles.copy}>每天选择连续 20 个小时。我们在空时段轻轻提醒，你只需要留下这一刻。</Text>

        <View style={styles.panel}>
          <Text style={styles.label}>一天从几点开始？</Text>
          <Text style={styles.preview}>{formatHour(startHour)} — {formatHour((startHour + 19) % 24)}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hours}>
            {Array.from({ length: 24 }, (_, hour) => (
              <Pressable key={hour} onPress={() => setStartHour(hour)} style={[styles.hour, startHour === hour && styles.hourActive]}>
                <Text style={[styles.hourText, startHour === hour && styles.hourTextActive]}>{String(hour).padStart(2, '0')}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <View style={styles.switchRow}>
            <View style={styles.switchIcon}><Ionicons name="notifications-outline" size={20} color={colors.coral} /></View>
            <View style={styles.switchCopy}>
              <Text style={styles.switchTitle}>空时段整点提醒</Text>
              <Text style={styles.switchCaption}>已有照片的小时不会再提醒</Text>
            </View>
            <Switch value={notifications} onValueChange={setNotifications} trackColor={{ false: colors.line, true: colors.coralSoft }} thumbColor={notifications ? colors.coral : colors.paper} />
          </View>
        </View>

        <Pressable onPress={() => void finish()} disabled={saving} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
          <Text style={styles.buttonText}>{saving ? '正在准备…' : '开始我的照片日记'}</Text>
          <Ionicons name="arrow-forward" size={19} color={colors.paper} />
        </Pressable>
        <Text style={styles.privacy}>照片、位置和文字默认只保存在这台设备。</Text>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flexGrow: 1, backgroundColor: colors.background, paddingHorizontal: 24, paddingTop: 54, paddingBottom: 32, alignItems: 'center' },
  mark: { width: 126, height: 140, marginBottom: 24, position: 'relative' },
  card: { position: 'absolute', width: 104, height: 126, backgroundColor: colors.paper, left: 11, top: 5, padding: 8, paddingBottom: 15, transform: [{ rotate: '-4deg' }] },
  cardBack: { backgroundColor: colors.tealSoft, transform: [{ rotate: '7deg' }], left: 18, top: 8 },
  photo: { height: 82, backgroundColor: '#F5E7C8', alignItems: 'center', justifyContent: 'center' },
  cardLine: { width: 65, height: 3, borderRadius: 2, backgroundColor: colors.line, marginTop: 9 },
  cardLineShort: { width: 43, marginTop: 5 },
  kicker: { color: colors.coral, fontSize: 10, fontWeight: '900', letterSpacing: 1.8 },
  title: { color: colors.ink, fontSize: 32, lineHeight: 40, fontWeight: '900', textAlign: 'center', marginTop: 9 },
  copy: { maxWidth: 360, color: colors.muted, fontSize: 13, lineHeight: 21, textAlign: 'center', marginTop: 12 },
  panel: { width: '100%', maxWidth: 430, backgroundColor: colors.paper, borderRadius: 22, padding: 18, marginTop: 26, borderWidth: 1, borderColor: colors.line },
  label: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  preview: { color: colors.ink, fontSize: 23, fontWeight: '800', marginTop: 3 },
  hours: { gap: 6, paddingTop: 14, paddingBottom: 5 },
  hour: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  hourActive: { backgroundColor: colors.ink },
  hourText: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  hourTextActive: { color: colors.paper },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 17, marginTop: 12, borderTopWidth: 1, borderTopColor: colors.line },
  switchIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.coralSoft, alignItems: 'center', justifyContent: 'center' },
  switchCopy: { flex: 1 },
  switchTitle: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  switchCaption: { color: colors.muted, fontSize: 10, marginTop: 2 },
  button: { width: '100%', maxWidth: 430, height: 54, borderRadius: 18, backgroundColor: colors.coral, marginTop: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  buttonText: { color: colors.paper, fontSize: 15, fontWeight: '800' },
  privacy: { color: colors.subtle, fontSize: 10, marginTop: 14 },
});
