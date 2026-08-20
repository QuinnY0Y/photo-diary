import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { diaryDateFor, formatDateTitle, formatHour, orderedHours, toDateKey } from '../domain/diaryTime';
import type { PhotoEntry } from '../domain/types';
import { useDiary } from '../state/DiaryContext';
import { CaptureSheet } from '../ui/CaptureSheet';
import { DateStrip } from '../ui/DateStrip';
import { FullscreenViewer } from '../ui/FullscreenViewer';
import { PhotoEditorModal } from '../ui/PhotoEditorModal';
import { PolaroidCard } from '../ui/PolaroidCard';
import { TimelineSkeleton } from '../ui/Skeleton';
import { colors, shadow } from '../ui/theme';

function StackPreview({ photos, width, onPress }: { photos: PhotoEntry[]; width: number; onPress(): void }) {
  const shown = photos.slice(0, 3);
  return (
    <Pressable onPress={onPress} style={[styles.stackRoot, { width }]} accessibilityLabel={`查看其余 ${photos.length} 张照片`}>
      {shown.map((photo, index) => (
        <View
          key={photo.id}
          style={[
            styles.stackLayer,
            shadow,
            {
              width: width - 16,
              left: index * 6,
              top: index * 5,
              transform: [{ rotate: `${(index - 1) * 2.2}deg` }],
            },
          ]}
        >
          <Image source={{ uri: photo.thumbnailUri }} style={styles.stackImage} />
        </View>
      ))}
      <View style={styles.stackCount}><Text style={styles.stackCountText}>+{photos.length}</Text></View>
    </Pressable>
  );
}

export function TimelineScreen({
  selectedDate,
  onDateChange,
  onOpenSettings,
}: {
  selectedDate: string;
  onDateChange(value: string): void;
  onOpenSettings(): void;
}) {
  const { width } = useWindowDimensions();
  const { state, loading, error, updatePhoto, refresh } = useDiary();
  const [captureVisible, setCaptureVisible] = useState(false);
  const [editing, setEditing] = useState<PhotoEntry | null>(null);
  const [viewer, setViewer] = useState<{ photos: PhotoEntry[]; id: string } | null>(null);
  const currentDiaryDate = diaryDateFor(new Date(), state.config.startHour);
  const currentHour = new Date().getHours();
  const hours = orderedHours(state.config.startHour);
  const dayPhotos = useMemo(
    () => state.photos.filter((photo) => photo.diaryDate === selectedDate),
    [selectedDate, state.photos],
  );
  const contentWidth = Math.max(220, Math.min(620, width - 88));
  const cardWidth = contentWidth >= 390 ? 176 : Math.max(132, (contentWidth - 12) / 2);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>{selectedDate === toDateKey(new Date()) ? 'TODAY' : 'PHOTO DIARY'}</Text>
          <Text style={styles.title}>{formatDateTitle(selectedDate)}</Text>
        </View>
        <Pressable onPress={onOpenSettings} style={styles.settings} accessibilityLabel="打开设置">
          <Ionicons name="options-outline" size={22} color={colors.ink} />
        </Pressable>
      </View>
      <DateStrip selected={selectedDate} onSelect={onDateChange} />

      {loading ? (
        <TimelineSkeleton />
      ) : error ? (
        <View style={styles.centerState}>
          <Ionicons name="cloud-offline-outline" size={34} color={colors.muted} />
          <Text style={styles.stateTitle}>时间轴没有加载成功</Text>
          <Pressable onPress={() => void refresh()} style={styles.retry}><Text style={styles.retryText}>重试</Text></Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.timeline} showsVerticalScrollIndicator={false}>
          {hours.map((hour, index) => {
            const photos = dayPhotos
              .filter((photo) => photo.assignedHour === hour)
              .sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
            const isCurrent = selectedDate === currentDiaryDate && hour === currentHour;
            const firstPhotos = photos.length <= 2 ? photos : photos.slice(0, 1);
            const stacked = photos.length > 2 ? photos.slice(1) : [];
            return (
              <View key={`${selectedDate}-${hour}`} style={styles.hourRow}>
                <Text style={[styles.hourText, isCurrent && styles.hourCurrent]}>{formatHour(hour)}</Text>
                <View style={styles.rail}>
                  <View style={[styles.dot, isCurrent && styles.dotCurrent]} />
                  {index < hours.length - 1 ? <View style={styles.line} /> : null}
                </View>
                <View style={styles.hourContent}>
                  {isCurrent ? <Text style={styles.nowLabel}>此刻</Text> : null}
                  {photos.length === 0 ? (
                    <Pressable onPress={() => setCaptureVisible(true)} style={({ pressed }) => [styles.emptyHour, pressed && styles.pressed]}>
                      <Ionicons name="camera-outline" size={18} color={colors.subtle} />
                      <Text style={styles.emptyText}>{isCurrent ? '这一小时还空着' : '没有留下照片'}</Text>
                    </Pressable>
                  ) : (
                    <View style={styles.cardsRow}>
                      {firstPhotos.map((photo) => (
                        <PolaroidCard
                          key={photo.id}
                          photo={photo}
                          width={cardWidth}
                          onOpen={() => setViewer({ photos, id: photo.id })}
                          onEdit={() => setEditing(photo)}
                          onSaveMemo={(memo) => updatePhoto({ ...photo, memo })}
                        />
                      ))}
                      {stacked.length > 0 ? (
                        <StackPreview photos={stacked} width={cardWidth} onPress={() => setViewer({ photos, id: stacked[0]?.id ?? photos[0]?.id ?? '' })} />
                      ) : null}
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      <Pressable
        onPress={() => setCaptureVisible(true)}
        style={({ pressed }) => [styles.fab, shadow, pressed && styles.fabPressed]}
        accessibilityRole="button"
        accessibilityLabel="添加照片"
      >
        <Ionicons name="add" size={32} color={colors.paper} />
      </Pressable>

      <CaptureSheet visible={captureVisible} onClose={() => setCaptureVisible(false)} />
      <PhotoEditorModal photo={editing} visible={Boolean(editing)} onClose={() => setEditing(null)} />
      <FullscreenViewer
        photos={viewer?.photos ?? []}
        initialId={viewer?.id ?? null}
        visible={Boolean(viewer)}
        onClose={() => setViewer(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { minHeight: 78, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12 },
  kicker: { color: colors.coral, fontSize: 10, fontWeight: '900', letterSpacing: 1.8 },
  title: { color: colors.ink, fontSize: 24, fontWeight: '800', marginTop: 3 },
  settings: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line },
  timeline: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 124 },
  hourRow: { flexDirection: 'row', minHeight: 118 },
  hourText: { width: 48, paddingTop: 1, color: colors.muted, fontSize: 11, fontWeight: '700', textAlign: 'right', paddingRight: 7 },
  hourCurrent: { color: colors.coral },
  rail: { width: 18, alignItems: 'center' },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.line, zIndex: 2 },
  dotCurrent: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.coral, borderWidth: 2, borderColor: colors.coralSoft },
  line: { width: 1, flex: 1, backgroundColor: colors.line, marginTop: -1 },
  hourContent: { flex: 1, paddingLeft: 9, paddingBottom: 24, minWidth: 0 },
  nowLabel: { color: colors.coral, fontSize: 9, fontWeight: '800', marginBottom: 7, marginTop: -2 },
  emptyHour: { minHeight: 70, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.line, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: 'rgba(255,253,249,0.45)' },
  emptyText: { color: colors.subtle, fontSize: 11 },
  pressed: { opacity: 0.7 },
  cardsRow: { flexDirection: 'row', gap: 11, alignItems: 'flex-start' },
  stackRoot: { minHeight: 208, position: 'relative' },
  stackLayer: { position: 'absolute', backgroundColor: colors.paper, padding: 6, height: 166 },
  stackImage: { width: '100%', height: '100%' },
  stackCount: { position: 'absolute', right: 4, bottom: 25, minWidth: 42, height: 30, borderRadius: 15, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  stackCountText: { color: colors.paper, fontSize: 12, fontWeight: '800' },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 30 },
  stateTitle: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  retry: { marginTop: 6, backgroundColor: colors.ink, borderRadius: 18, paddingHorizontal: 20, paddingVertical: 9 },
  retryText: { color: colors.paper, fontWeight: '700' },
  fab: { position: 'absolute', right: 20, bottom: 18, width: 58, height: 58, borderRadius: 29, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: colors.coralSoft },
  fabPressed: { transform: [{ scale: 0.94 }] },
});
