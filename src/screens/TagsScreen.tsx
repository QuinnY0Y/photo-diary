import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { formatCapturedTime } from '../domain/diaryTime';
import type { PhotoEntry, Tag } from '../domain/types';
import { useDiary } from '../state/DiaryContext';
import { FullscreenViewer } from '../ui/FullscreenViewer';
import { TagSkeleton } from '../ui/Skeleton';
import { colors, shadow } from '../ui/theme';

type Selection = 'all' | 'untagged' | string;

function TagEditor({ tag, visible, onClose }: { tag: Tag | null; visible: boolean; onClose(): void }) {
  const { createTag, renameTag, deleteTag } = useDiary();
  const [name, setName] = useState(tag?.name ?? '');

  React.useEffect(() => setName(tag?.name ?? ''), [tag]);

  const save = async () => {
    const value = name.trim();
    if (!value) return;
    if (tag) await renameTag(tag.id, value);
    else await createTag(value);
    onClose();
  };

  const remove = () => {
    if (!tag) return;
    Alert.alert(`删除 #${tag.name}？`, '照片会保留，仅移除这个 Tag。', [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: () => void deleteTag(tag.id).then(onClose) },
    ]);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={[styles.tagModal, shadow]} onPress={(event) => event.stopPropagation()}>
          <Text style={styles.modalKicker}>{tag ? 'EDIT TAG' : 'NEW TAG'}</Text>
          <Text style={styles.modalTitle}>{tag ? '整理这个分类' : '给片刻一个名字'}</Text>
          <TextInput autoFocus value={name} onChangeText={setName} onSubmitEditing={() => void save()} maxLength={20} placeholder="例如：散步" placeholderTextColor={colors.subtle} style={styles.tagInput} />
          <View style={styles.modalActions}>
            {tag ? <Pressable onPress={remove} style={styles.deleteTagButton}><Ionicons name="trash-outline" size={18} color={colors.danger} /></Pressable> : null}
            <Pressable onPress={onClose} style={styles.secondaryButton}><Text style={styles.secondaryText}>取消</Text></Pressable>
            <Pressable onPress={() => void save()} disabled={!name.trim()} style={styles.primaryButton}><Text style={styles.primaryText}>保存</Text></Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function TagsScreen() {
  const { width } = useWindowDimensions();
  const { state, loading } = useDiary();
  const [selection, setSelection] = useState<Selection>('all');
  const [editor, setEditor] = useState<{ visible: boolean; tag: Tag | null }>({ visible: false, tag: null });
  const [viewer, setViewer] = useState<{ photos: PhotoEntry[]; id: string } | null>(null);
  const columnCount = width >= 700 ? 3 : 2;
  const gridWidth = Math.min(width - 28, 780);
  const cardWidth = (gridWidth - 10 * (columnCount - 1)) / columnCount;

  const filtered = useMemo(() => {
    const photos = selection === 'all'
      ? state.photos
      : selection === 'untagged'
        ? state.photos.filter((photo) => photo.tags.length === 0)
        : state.photos.filter((photo) => photo.tags.some((tag) => tag.id === selection));
    return [...photos].sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
  }, [selection, state.photos]);

  const countFor = (id: string) => state.photos.filter((photo) => photo.tags.some((tag) => tag.id === id)).length;
  const selectedTag = state.tags.find((tag) => tag.id === selection) ?? null;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>COLLECTIONS</Text>
          <Text style={styles.title}>按 Tag 回看</Text>
          <Text style={styles.subtitle}>时间之外，片刻也可以属于一种心情。</Text>
        </View>
        <Pressable onPress={() => setEditor({ visible: true, tag: null })} style={styles.add} accessibilityLabel="新建 Tag">
          <Ionicons name="add" size={25} color={colors.paper} />
        </Pressable>
      </View>

      {loading ? (
        <TagSkeleton />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagList}>
            <Pressable onPress={() => setSelection('all')} style={[styles.tagChip, selection === 'all' && styles.tagChipActive]}>
              <Text style={[styles.tagText, selection === 'all' && styles.tagTextActive]}>全部</Text>
              <Text style={[styles.tagCount, selection === 'all' && styles.tagTextActive]}>{state.photos.length}</Text>
            </Pressable>
            {state.tags.map((tag) => (
              <Pressable
                key={tag.id}
                onPress={() => setSelection(tag.id)}
                onLongPress={() => setEditor({ visible: true, tag })}
                style={[styles.tagChip, selection === tag.id && styles.tagChipActive]}
              >
                <Text style={[styles.tagText, selection === tag.id && styles.tagTextActive]}>#{tag.name}</Text>
                <Text style={[styles.tagCount, selection === tag.id && styles.tagTextActive]}>{countFor(tag.id)}</Text>
              </Pressable>
            ))}
            <Pressable onPress={() => setSelection('untagged')} style={[styles.tagChip, selection === 'untagged' && styles.tagChipActive]}>
              <Text style={[styles.tagText, selection === 'untagged' && styles.tagTextActive]}>未标记</Text>
              <Text style={[styles.tagCount, selection === 'untagged' && styles.tagTextActive]}>{state.photos.filter((photo) => photo.tags.length === 0).length}</Text>
            </Pressable>
          </ScrollView>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{selectedTag ? `#${selectedTag.name}` : selection === 'untagged' ? '未标记' : '全部片刻'}</Text>
            {selectedTag ? (
              <Pressable onPress={() => setEditor({ visible: true, tag: selectedTag })} style={styles.manage}>
                <Ionicons name="create-outline" size={15} color={colors.muted} />
                <Text style={styles.manageText}>管理</Text>
              </Pressable>
            ) : null}
          </View>

          {filtered.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}><Ionicons name="pricetag-outline" size={28} color={colors.teal} /></View>
              <Text style={styles.emptyTitle}>{selection === 'all' ? '还没有拍立得' : '这个分类还空着'}</Text>
              <Text style={styles.emptyCopy}>在照片卡片中添加 Tag，它就会出现在这里。</Text>
            </View>
          ) : (
            <View style={[styles.grid, { maxWidth: gridWidth }]}>
              {filtered.map((photo) => (
                <Pressable
                  key={photo.id}
                  onPress={() => setViewer({ photos: filtered, id: photo.id })}
                  style={({ pressed }) => [styles.photoCard, shadow, { width: cardWidth }, pressed && styles.pressed]}
                >
                  <Image source={{ uri: photo.thumbnailUri }} style={[styles.photo, { height: cardWidth * 0.92 }]} />
                  <View style={styles.photoInfo}>
                    <Text style={styles.photoTime}>{formatCapturedTime(photo.capturedAt)} · {photo.diaryDate.slice(5).replace('-', '.')}</Text>
                    <Text numberOfLines={2} style={styles.photoMemo}>{photo.memo || '没有写 Memo'}</Text>
                    <Text numberOfLines={1} style={styles.photoTags}>{photo.tags.map((tag) => `#${tag.name}`).join('  ') || '未标记'}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      <TagEditor tag={editor.tag} visible={editor.visible} onClose={() => setEditor({ visible: false, tag: null })} />
      <FullscreenViewer photos={viewer?.photos ?? []} initialId={viewer?.id ?? null} visible={Boolean(viewer)} onClose={() => setViewer(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { minHeight: 120, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  kicker: { color: colors.teal, fontSize: 10, fontWeight: '900', letterSpacing: 1.7 },
  title: { color: colors.ink, fontSize: 28, fontWeight: '800', marginTop: 4 },
  subtitle: { color: colors.muted, fontSize: 11, marginTop: 5 },
  add: { width: 44, height: 44, borderRadius: 16, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingBottom: 40 },
  tagList: { gap: 8, paddingHorizontal: 16, paddingBottom: 18 },
  tagChip: { height: 38, borderRadius: 19, paddingHorizontal: 13, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', gap: 7 },
  tagChipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  tagText: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  tagCount: { color: colors.muted, fontSize: 10 },
  tagTextActive: { color: colors.paper },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, marginBottom: 12 },
  sectionTitle: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  manage: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 7 },
  manageText: { color: colors.muted, fontSize: 11 },
  grid: { alignSelf: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoCard: { backgroundColor: colors.paper, padding: 7, paddingBottom: 0, borderRadius: 4 },
  pressed: { opacity: 0.75 },
  photo: { width: '100%', backgroundColor: colors.line },
  photoInfo: { minHeight: 89, paddingHorizontal: 3, paddingTop: 8 },
  photoTime: { color: colors.muted, fontSize: 9, fontWeight: '700' },
  photoMemo: { color: colors.ink, fontSize: 12, lineHeight: 17, marginTop: 5, minHeight: 34 },
  photoTags: { color: colors.teal, fontSize: 9, marginTop: 4 },
  empty: { alignItems: 'center', paddingHorizontal: 32, paddingVertical: 70 },
  emptyIcon: { width: 62, height: 62, borderRadius: 31, backgroundColor: colors.tealSoft, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: colors.ink, fontSize: 17, fontWeight: '800', marginTop: 16 },
  emptyCopy: { color: colors.muted, fontSize: 12, textAlign: 'center', lineHeight: 18, marginTop: 6 },
  modalBackdrop: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: 24 },
  tagModal: { width: '100%', maxWidth: 390, backgroundColor: colors.background, borderRadius: 24, padding: 22 },
  modalKicker: { color: colors.teal, fontSize: 10, fontWeight: '900', letterSpacing: 1.6 },
  modalTitle: { color: colors.ink, fontSize: 22, fontWeight: '800', marginTop: 4 },
  tagInput: { height: 52, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 14, marginTop: 18, paddingHorizontal: 14, color: colors.ink, fontSize: 16 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 16 },
  deleteTagButton: { width: 44, height: 42, borderRadius: 12, borderWidth: 1, borderColor: '#E9C5C1', alignItems: 'center', justifyContent: 'center', marginRight: 'auto' },
  secondaryButton: { height: 42, borderRadius: 12, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: colors.muted, fontWeight: '700' },
  primaryButton: { height: 42, borderRadius: 12, paddingHorizontal: 20, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: colors.paper, fontWeight: '800' },
});
