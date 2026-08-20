import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';

import { formatDateTitle, formatHour, orderedHours } from '../domain/diaryTime';
import type { PhotoEntry } from '../domain/types';
import { useDiary } from '../state/DiaryContext';
import { CaptureSheet } from '../ui/CaptureSheet';
import { DateStrip } from '../ui/DateStrip';
import { FullscreenViewer } from '../ui/FullscreenViewer';
import { DaySkeleton } from '../ui/Skeleton';
import { colors, shadow } from '../ui/theme';

export function DayScreen({ selectedDate, onDateChange }: { selectedDate: string; onDateChange(value: string): void }) {
  const { width } = useWindowDimensions();
  const { state, loading, saveDailyNote } = useDiary();
  const [target, setTarget] = useState<{ diaryDate: string; hour: number } | null>(null);
  const [viewer, setViewer] = useState<{ photos: PhotoEntry[]; id: string } | null>(null);
  const noteForDay = state.dailyNotes.find((note) => note.diaryDate === selectedDate)?.text ?? '';
  const [note, setNote] = useState(noteForDay);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const firstRender = useRef(true);
  const cellWidth = Math.min(132, (Math.min(width, 680) - 54) / 4);
  const hours = orderedHours(state.config.startHour);

  useEffect(() => {
    setNote(noteForDay);
    firstRender.current = true;
  }, [noteForDay, selectedDate]);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (note === noteForDay) return;
    const timer = setTimeout(() => {
      setSaveState('saving');
      void saveDailyNote(selectedDate, note)
        .then(() => setSaveState('saved'))
        .catch(() => setSaveState('error'));
    }, 650);
    return () => clearTimeout(timer);
  }, [note, noteForDay, saveDailyNote, selectedDate]);

  const photosByHour = useMemo(() => {
    const map = new Map<number, PhotoEntry[]>();
    state.photos
      .filter((photo) => photo.diaryDate === selectedDate)
      .forEach((photo) => map.set(photo.assignedHour, [...(map.get(photo.assignedHour) ?? []), photo]));
    return map;
  }, [selectedDate, state.photos]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>DAY IN 20 FRAMES</Text>
          <Text style={styles.title}>{formatDateTitle(selectedDate)}</Text>
        </View>
        <View style={styles.progress}>
          <Text style={styles.progressNumber}>{photosByHour.size}</Text>
          <Text style={styles.progressLabel}>/ 20</Text>
        </View>
      </View>
      <DateStrip selected={selectedDate} onSelect={onDateChange} />

      {loading ? (
        <DaySkeleton />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={[styles.grid, { maxWidth: cellWidth * 4 + 24 }]}>
            {hours.map((hour) => {
              const photos = (photosByHour.get(hour) ?? []).sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
              const first = photos[0];
              return (
                <Pressable
                  key={`${selectedDate}-${hour}`}
                  onPress={() =>
                    first
                      ? setViewer({ photos, id: first.id })
                      : setTarget({ diaryDate: selectedDate, hour })
                  }
                  style={({ pressed }) => [styles.cell, { width: cellWidth, height: cellWidth * 1.06 }, pressed && styles.pressed]}
                  accessibilityLabel={`${formatHour(hour)}，${photos.length ? `${photos.length} 张照片` : '无照片，点击添加'}`}
                >
                  {first ? (
                    <>
                      <Image source={{ uri: first.thumbnailUri }} style={styles.cellImage} />
                      {photos.length > 1 ? <View style={styles.count}><Text style={styles.countText}>+{photos.length - 1}</Text></View> : null}
                    </>
                  ) : (
                    <View style={styles.emptyCell}>
                      <Ionicons name="add" size={17} color={colors.subtle} />
                    </View>
                  )}
                  <View style={[styles.hourBadge, first && styles.hourBadgeFilled]}>
                    <Text style={[styles.hourText, first && styles.hourTextFilled]}>{formatHour(hour)}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <View style={[styles.noteCard, shadow]}>
            <View style={styles.noteHeader}>
              <View>
                <Text style={styles.noteKicker}>MEMO</Text>
                <Text style={styles.noteTitle}>今天想记住什么？</Text>
              </View>
              <Text style={[styles.saveState, saveState === 'error' && styles.saveError]}>
                {saveState === 'saving' ? '保存中…' : saveState === 'saved' ? '已保存' : saveState === 'error' ? '保存失败' : ''}
              </Text>
            </View>
            <TextInput
              value={note}
              onChangeText={setNote}
              multiline
              maxLength={1200}
              placeholder="天气、心情，或今天最小的一个瞬间…"
              placeholderTextColor={colors.subtle}
              style={styles.noteInput}
              accessibilityLabel="今日总结"
            />
          </View>
        </ScrollView>
      )}

      <CaptureSheet visible={Boolean(target)} onClose={() => setTarget(null)} target={target ?? undefined} />
      <FullscreenViewer photos={viewer?.photos ?? []} initialId={viewer?.id ?? null} visible={Boolean(viewer)} onClose={() => setViewer(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { minHeight: 78, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12 },
  kicker: { color: colors.teal, fontSize: 10, fontWeight: '900', letterSpacing: 1.6 },
  title: { color: colors.ink, fontSize: 24, fontWeight: '800', marginTop: 3 },
  progress: { flexDirection: 'row', alignItems: 'baseline' },
  progressNumber: { color: colors.coral, fontSize: 28, fontWeight: '900' },
  progressLabel: { color: colors.muted, fontSize: 12, fontWeight: '700', marginLeft: 2 },
  scroll: { paddingHorizontal: 14, paddingBottom: 40, alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignSelf: 'center' },
  cell: { borderRadius: 10, overflow: 'hidden', backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, position: 'relative' },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
  cellImage: { width: '100%', height: '100%' },
  emptyCell: { flex: 1, alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: colors.line, margin: 5, borderRadius: 7 },
  hourBadge: { position: 'absolute', left: 5, top: 5, borderRadius: 7, paddingHorizontal: 5, paddingVertical: 3, backgroundColor: colors.background },
  hourBadgeFilled: { backgroundColor: 'rgba(28,25,23,0.7)' },
  hourText: { color: colors.muted, fontSize: 8, fontWeight: '800' },
  hourTextFilled: { color: colors.paper },
  count: { position: 'absolute', right: 5, bottom: 5, minWidth: 24, height: 20, borderRadius: 10, paddingHorizontal: 5, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center' },
  countText: { color: colors.paper, fontSize: 9, fontWeight: '900' },
  noteCard: { width: '100%', maxWidth: 560, backgroundColor: colors.paper, borderRadius: 20, marginTop: 24, padding: 18 },
  noteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  noteKicker: { color: colors.gold, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  noteTitle: { color: colors.ink, fontSize: 18, fontWeight: '800', marginTop: 3 },
  saveState: { color: colors.subtle, fontSize: 10 },
  saveError: { color: colors.danger },
  noteInput: { minHeight: 108, marginTop: 12, color: colors.ink, fontSize: 14, lineHeight: 22, textAlignVertical: 'top', padding: 0 },
});
