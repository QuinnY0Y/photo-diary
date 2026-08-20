import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { formatHour, orderedHours } from '../domain/diaryTime';
import type { PhotoEntry, Tag } from '../domain/types';
import { useDiary } from '../state/DiaryContext';
import { colors } from './theme';

export function PhotoEditorModal({
  photo,
  visible,
  onClose,
}: {
  photo: PhotoEntry | null;
  visible: boolean;
  onClose(): void;
}) {
  const { state, updatePhoto, deletePhoto, createTag } = useDiary();
  const [memo, setMemo] = useState('');
  const [location, setLocation] = useState('');
  const [hour, setHour] = useState(0);
  const [selected, setSelected] = useState<Tag[]>([]);
  const [newTag, setNewTag] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!photo) return;
    setMemo(photo.memo);
    setLocation(photo.location?.label ?? '');
    setHour(photo.assignedHour);
    setSelected(photo.tags);
    setNewTag('');
  }, [photo]);

  if (!photo) return null;

  const toggleTag = (tag: Tag) => {
    setSelected((current) =>
      current.some((item) => item.id === tag.id)
        ? current.filter((item) => item.id !== tag.id)
        : [...current, tag],
    );
  };

  const addTag = async () => {
    if (!newTag.trim()) return;
    const tag = await createTag(newTag.trim());
    setSelected((current) => (current.some((item) => item.id === tag.id) ? current : [...current, tag]));
    setNewTag('');
  };

  const save = async () => {
    setSaving(true);
    try {
      await updatePhoto({
        ...photo,
        memo,
        assignedHour: hour,
        isBackfill: photo.isBackfill || hour !== new Date(photo.capturedAt).getHours(),
        location: photo.location
          ? { ...photo.location, label: location.trim() || null, pendingResolution: false }
          : location.trim()
            ? { latitude: 0, longitude: 0, label: location.trim(), pendingResolution: false }
            : null,
        tags: selected,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert('删除这张拍立得？', '照片、Memo 和关联信息将从本机移除。', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => void deletePhoto(photo).then(onClose),
      },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}>
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.headerButton}><Text style={styles.cancel}>取消</Text></Pressable>
          <Text style={styles.title}>编辑拍立得</Text>
          <Pressable onPress={() => void save()} disabled={saving} style={styles.headerButton}>
            <Text style={styles.save}>{saving ? '保存中' : '完成'}</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Image source={{ uri: photo.thumbnailUri }} style={styles.preview} />

          <Text style={styles.label}>归属小时</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hourRow}>
            {orderedHours(state.config.startHour).map((value) => (
              <Pressable key={value} onPress={() => setHour(value)} style={[styles.hourChip, hour === value && styles.hourChipActive]}>
                <Text style={[styles.hourText, hour === value && styles.hourTextActive]}>{formatHour(value)}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.label}>位置</Text>
          <View style={styles.fieldRow}>
            <Ionicons name="location-outline" size={18} color={colors.muted} />
            <TextInput value={location} onChangeText={setLocation} placeholder="添加位置（可选）" placeholderTextColor={colors.subtle} style={styles.fieldInput} />
          </View>

          <Text style={styles.label}>这一小时</Text>
          <TextInput value={memo} onChangeText={setMemo} multiline maxLength={280} placeholder="写下此刻的声音、天气或心情…" placeholderTextColor={colors.subtle} style={styles.memo} />

          <Text style={styles.label}>Tag</Text>
          <View style={styles.tags}>
            {state.tags.map((tag) => {
              const active = selected.some((item) => item.id === tag.id);
              return (
                <Pressable key={tag.id} onPress={() => toggleTag(tag)} style={[styles.tagChip, active && styles.tagChipActive]}>
                  <Text style={[styles.tagText, active && styles.tagTextActive]}>#{tag.name}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.newTagRow}>
            <TextInput value={newTag} onChangeText={setNewTag} onSubmitEditing={() => void addTag()} placeholder="新建 Tag" placeholderTextColor={colors.subtle} style={styles.newTagInput} maxLength={20} />
            <Pressable onPress={() => void addTag()} disabled={!newTag.trim()} style={styles.addButton}>
              <Ionicons name="add" size={20} color={colors.paper} />
            </Pressable>
          </View>

          <Pressable onPress={confirmDelete} style={styles.deleteButton}>
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
            <Text style={styles.deleteText}>删除这张拍立得</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { height: 58, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.paper, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  headerButton: { minWidth: 56, minHeight: 44, justifyContent: 'center' },
  cancel: { color: colors.muted, fontSize: 15 },
  save: { color: colors.coral, fontSize: 15, fontWeight: '700', textAlign: 'right' },
  title: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  content: { padding: 20, paddingBottom: 50 },
  preview: { width: 142, height: 142, borderWidth: 7, borderColor: colors.paper, alignSelf: 'center', marginBottom: 24, transform: [{ rotate: '-1deg' }] },
  label: { fontSize: 12, color: colors.muted, fontWeight: '700', marginTop: 18, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.7 },
  hourRow: { gap: 7, paddingRight: 20 },
  hourChip: { paddingHorizontal: 13, height: 35, borderRadius: 18, justifyContent: 'center', backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line },
  hourChipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  hourText: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  hourTextActive: { color: colors.paper },
  fieldRow: { minHeight: 50, backgroundColor: colors.paper, borderRadius: 13, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 8, borderWidth: 1, borderColor: colors.line },
  fieldInput: { flex: 1, color: colors.ink, fontSize: 14, paddingVertical: 12 },
  memo: { minHeight: 108, backgroundColor: colors.paper, borderRadius: 13, borderWidth: 1, borderColor: colors.line, padding: 14, color: colors.ink, fontSize: 14, lineHeight: 21, textAlignVertical: 'top' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 16, paddingHorizontal: 11, paddingVertical: 7 },
  tagChipActive: { backgroundColor: colors.tealSoft, borderColor: colors.teal },
  tagText: { color: colors.muted, fontSize: 12 },
  tagTextActive: { color: colors.teal, fontWeight: '700' },
  newTagRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  newTagInput: { flex: 1, height: 42, borderRadius: 12, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, color: colors.ink, paddingHorizontal: 12 },
  addButton: { width: 42, height: 42, borderRadius: 12, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center' },
  deleteButton: { marginTop: 36, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 12, borderWidth: 1, borderColor: '#E9C5C1' },
  deleteText: { color: colors.danger, fontWeight: '700', fontSize: 13 },
});
