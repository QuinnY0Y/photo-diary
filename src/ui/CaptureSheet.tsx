import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useDiary } from '../state/DiaryContext';
import type { MediaPermissionError } from '../services/MediaService';
import { colors, shadow } from './theme';

export function CaptureSheet({
  visible,
  onClose,
  target,
}: {
  visible: boolean;
  onClose(): void;
  target?: { diaryDate: string; hour: number };
}) {
  const { capture, pick, savePrepared } = useDiary();
  const [busy, setBusy] = useState<'camera' | 'library' | null>(null);

  const run = async (source: 'camera' | 'library') => {
    setBusy(source);
    try {
      const prepared = source === 'camera' ? await capture() : await pick();
      if (prepared.length > 0) {
        await savePrepared(prepared, target);
        onClose();
      }
    } catch (cause) {
      const error = cause as Partial<MediaPermissionError>;
      if (error.permission) {
        Alert.alert(
          error.permission === 'camera' ? '无法使用相机' : '无法访问相册',
          cause instanceof Error ? cause.message : '请在系统设置中允许访问。',
          [
            { text: '取消', style: 'cancel' },
            { text: '打开设置', onPress: () => void Linking.openSettings() },
          ],
        );
      } else {
        Alert.alert('没有保存成功', cause instanceof Error ? cause.message : '请稍后重试。');
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="关闭添加菜单">
        <Pressable style={[styles.sheet, shadow]} onPress={(event) => event.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.eyebrow}>NEW MOMENT</Text>
          <Text style={styles.title}>留住这一小时</Text>
          <Text style={styles.subtitle}>现场拍一张，或从相册补录过去的片刻。</Text>
          <View style={styles.actions}>
            <Pressable onPress={() => void run('camera')} disabled={Boolean(busy)} style={({ pressed }) => [styles.action, styles.camera, pressed && styles.pressed]}>
              <View style={[styles.icon, styles.cameraIcon]}><Ionicons name="camera" size={26} color={colors.paper} /></View>
              <View style={styles.copy}>
                <Text style={styles.actionTitle}>{busy === 'camera' ? '正在打开…' : '拍照'}</Text>
                <Text style={styles.actionCaption}>自动记录当前时间与位置</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.muted} />
            </Pressable>
            <Pressable onPress={() => void run('library')} disabled={Boolean(busy)} style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
              <View style={[styles.icon, styles.libraryIcon]}><Ionicons name="images" size={24} color={colors.teal} /></View>
              <View style={styles.copy}>
                <Text style={styles.actionTitle}>{busy === 'library' ? '正在打开…' : '从相册选择'}</Text>
                <Text style={styles.actionCaption}>可多选，并保留原始时间</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.muted} />
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 34 },
  handle: { width: 38, height: 4, borderRadius: 2, backgroundColor: colors.line, alignSelf: 'center', marginBottom: 24 },
  eyebrow: { color: colors.coral, fontSize: 10, fontWeight: '800', letterSpacing: 1.7 },
  title: { color: colors.ink, fontSize: 28, fontWeight: '800', marginTop: 5 },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 6 },
  actions: { gap: 10, marginTop: 22 },
  action: { minHeight: 82, borderRadius: 18, backgroundColor: colors.paper, flexDirection: 'row', alignItems: 'center', padding: 14, gap: 13, borderWidth: 1, borderColor: colors.line },
  camera: { borderColor: '#F0C4BC' },
  pressed: { opacity: 0.76, transform: [{ scale: 0.99 }] },
  icon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  cameraIcon: { backgroundColor: colors.coral },
  libraryIcon: { backgroundColor: colors.tealSoft },
  copy: { flex: 1, gap: 3 },
  actionTitle: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  actionCaption: { color: colors.muted, fontSize: 11 },
});
