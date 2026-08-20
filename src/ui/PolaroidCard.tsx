import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { formatCapturedTime } from '../domain/diaryTime';
import type { PhotoEntry } from '../domain/types';
import { colors, shadow } from './theme';

export function PolaroidCard({
  photo,
  width,
  onOpen,
  onEdit,
  onSaveMemo,
}: {
  photo: PhotoEntry;
  width: number;
  onOpen(): void;
  onEdit(): void;
  onSaveMemo(memo: string): Promise<void>;
}) {
  const [memo, setMemo] = useState(photo.memo);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const firstRender = useRef(true);

  useEffect(() => setMemo(photo.memo), [photo.memo]);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (memo === photo.memo) return;
    const timer = setTimeout(() => {
      setSaveState('saving');
      void onSaveMemo(memo)
        .then(() => setSaveState('saved'))
        .catch(() => setSaveState('error'));
    }, 650);
    return () => clearTimeout(timer);
  }, [memo, onSaveMemo, photo.memo]);

  return (
    <View style={[styles.card, shadow, { width }]}>
      <View style={styles.tape} />
      <Pressable onPress={onOpen} style={({ pressed }) => [styles.imageButton, pressed && styles.pressed]}>
        <Image source={{ uri: photo.thumbnailUri }} style={[styles.image, { height: width * 0.86 }]} resizeMode="cover" />
        {photo.isBackfill ? <Text style={styles.backfill}>补录</Text> : null}
      </Pressable>
      <View style={styles.footer}>
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={12} color={colors.muted} />
            <Text style={styles.meta} numberOfLines={1}>{formatCapturedTime(photo.capturedAt)}</Text>
          </View>
          <Pressable onPress={onEdit} style={styles.editButton} accessibilityLabel="编辑照片信息">
            <Ionicons name="ellipsis-horizontal" size={16} color={colors.muted} />
          </Pressable>
        </View>
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={12} color={colors.muted} />
          <Text style={styles.location} numberOfLines={1}>
            {photo.location?.label || (photo.location?.pendingResolution ? '位置待解析' : '添加位置')}
          </Text>
        </View>
        <TextInput
          value={memo}
          onChangeText={setMemo}
          placeholder="写下这一小时…"
          placeholderTextColor={colors.subtle}
          style={styles.memo}
          multiline
          maxLength={280}
          accessibilityLabel="小时 Memo"
        />
        <View style={styles.tagRow}>
          {photo.tags.slice(0, 2).map((tag) => (
            <Text key={tag.id} style={styles.tag}>#{tag.name}</Text>
          ))}
          {photo.tags.length > 2 ? <Text style={styles.moreTag}>+{photo.tags.length - 2}</Text> : null}
          {photo.tags.length === 0 ? (
            <Pressable onPress={onEdit} style={styles.addTag}>
              <Ionicons name="add" size={13} color={colors.teal} />
              <Text style={styles.addTagText}>Tag</Text>
            </Pressable>
          ) : null}
          <Text style={[styles.saveState, saveState === 'error' && styles.saveError]}>
            {saveState === 'saving' ? '保存中' : saveState === 'saved' ? '已保存' : saveState === 'error' ? '重试' : ''}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.paper, padding: 7, paddingBottom: 9, borderRadius: 3, position: 'relative' },
  tape: { position: 'absolute', width: 40, height: 13, backgroundColor: 'rgba(240,220,183,0.72)', top: -7, left: '50%', marginLeft: -20, zIndex: 2, transform: [{ rotate: '-2deg' }] },
  imageButton: { position: 'relative', backgroundColor: colors.line, overflow: 'hidden' },
  pressed: { opacity: 0.82 },
  image: { width: '100%' },
  backfill: { position: 'absolute', right: 6, top: 6, color: colors.paper, backgroundColor: 'rgba(46,41,37,0.72)', fontSize: 9, fontWeight: '700', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 8 },
  footer: { paddingHorizontal: 3, paddingTop: 7, gap: 3 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  meta: { fontSize: 10, color: colors.muted, fontWeight: '700' },
  editButton: { width: 25, height: 21, alignItems: 'center', justifyContent: 'center' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 2, maxWidth: '100%' },
  location: { flex: 1, fontSize: 9, color: colors.muted },
  memo: { minHeight: 34, maxHeight: 70, color: colors.ink, fontSize: 12, lineHeight: 17, paddingVertical: 3, paddingHorizontal: 0, textAlignVertical: 'top' },
  tagRow: { minHeight: 19, flexDirection: 'row', gap: 4, alignItems: 'center', flexWrap: 'wrap' },
  tag: { fontSize: 9, color: colors.teal, backgroundColor: colors.tealSoft, borderRadius: 8, paddingHorizontal: 5, paddingVertical: 2, overflow: 'hidden' },
  moreTag: { fontSize: 9, color: colors.teal },
  addTag: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.tealSoft, borderRadius: 9, paddingHorizontal: 4, paddingVertical: 1 },
  addTagText: { fontSize: 9, color: colors.teal },
  saveState: { marginLeft: 'auto', fontSize: 8, color: colors.subtle },
  saveError: { color: colors.danger },
});
