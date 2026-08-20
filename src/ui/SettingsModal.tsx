import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { formatHour } from '../domain/diaryTime';
import { useDiary } from '../state/DiaryContext';
import { colors } from './theme';

type BackupAction = 'export' | 'import' | null;

export function SettingsModal({ visible, onClose }: { visible: boolean; onClose(): void }) {
  const { state, notificationStatus, updateConfig, exportBackup, importBackup } = useDiary();
  const [startHour, setStartHour] = useState(state.config.startHour);
  const [notifications, setNotifications] = useState(state.config.notificationsEnabled);
  const [backupAction, setBackupAction] = useState<BackupAction>(null);
  const [passphrase, setPassphrase] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setStartHour(state.config.startHour);
    setNotifications(state.config.notificationsEnabled);
  }, [state.config, visible]);

  const performSave = async () => {
    setBusy(true);
    try {
      await updateConfig({ ...state.config, startHour, notificationsEnabled: notifications });
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    if (startHour !== state.config.startHour && state.photos.length > 0) {
      Alert.alert(
        '更改每日起点？',
        '已有照片仍保留原小时，不会被静默迁移。落在新窗口之外的照片将只在 Tag 页和备份中可见，直到你手动调整归属小时。',
        [
          { text: '取消', style: 'cancel' },
          { text: '确认更改', onPress: () => void performSave() },
        ],
      );
    } else {
      void performSave();
    }
  };

  const runBackup = async () => {
    if (!backupAction || passphrase.length < 8) return;
    setBusy(true);
    try {
      if (backupAction === 'export') {
        await exportBackup(passphrase);
        setNotice('加密备份已生成，请将文件保存到安全位置。');
      } else {
        const restored = await importBackup(passphrase, 'merge');
        if (restored) setNotice('备份校验通过，内容已与本机日记合并。');
      }
      setBackupAction(null);
      setPassphrase('');
    } catch (cause) {
      Alert.alert('操作没有完成', cause instanceof Error ? cause.message : '请检查文件和密码后重试。');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.headerButton}><Ionicons name="close" size={25} color={colors.ink} /></Pressable>
          <Text style={styles.headerTitle}>设置</Text>
          <Pressable onPress={save} disabled={busy} style={styles.headerButton}><Text style={styles.done}>{busy ? '保存中' : '完成'}</Text></Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {notice ? (
            <Pressable onPress={() => setNotice(null)} style={styles.notice} accessibilityLabel="关闭成功提示">
              <Ionicons name="checkmark-circle" size={20} color={colors.teal} />
              <Text style={styles.noticeText}>{notice}</Text>
            </Pressable>
          ) : null}
          <Text style={styles.sectionLabel}>日记时间</Text>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>每日连续 20 小时</Text>
            <Text style={styles.cardCaption}>{formatHour(startHour)} — {formatHour((startHour + 19) % 24)}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hours}>
              {Array.from({ length: 24 }, (_, hour) => (
                <Pressable key={hour} onPress={() => setStartHour(hour)} style={[styles.hour, startHour === hour && styles.hourActive]}>
                  <Text style={[styles.hourText, startHour === hour && styles.hourTextActive]}>{String(hour).padStart(2, '0')}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <Text style={styles.sectionLabel}>提醒</Text>
          <View style={styles.cardRow}>
            <View style={styles.icon}><Ionicons name="notifications-outline" size={20} color={colors.coral} /></View>
            <View style={styles.rowCopy}>
              <Text style={styles.cardTitle}>空时段整点提醒</Text>
              <Text style={styles.cardCaption}>{notificationStatus === 'denied' ? '系统通知权限未开启' : '已有照片的小时自动取消'}</Text>
            </View>
            <Switch value={notifications} onValueChange={setNotifications} trackColor={{ false: colors.line, true: colors.coralSoft }} thumbColor={notifications ? colors.coral : colors.paper} />
          </View>

          <Text style={styles.sectionLabel}>数据与隐私</Text>
          <View style={styles.cardGroup}>
            <Pressable onPress={() => setBackupAction('export')} style={styles.actionRow}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.teal} />
              <View style={styles.rowCopy}><Text style={styles.cardTitle}>导出加密备份</Text><Text style={styles.cardCaption}>照片、Memo、位置与 Tag 一并保存</Text></View>
              <Ionicons name="chevron-forward" size={18} color={colors.subtle} />
            </Pressable>
            <View style={styles.divider} />
            <Pressable onPress={() => setBackupAction('import')} style={styles.actionRow}>
              <Ionicons name="download-outline" size={20} color={colors.teal} />
              <View style={styles.rowCopy}><Text style={styles.cardTitle}>从备份恢复</Text><Text style={styles.cardCaption}>校验成功后与本机内容合并</Text></View>
              <Ionicons name="chevron-forward" size={18} color={colors.subtle} />
            </Pressable>
          </View>
          <View style={styles.privacyBox}>
            <Ionicons name="shield-checkmark-outline" size={21} color={colors.teal} />
            <Text style={styles.privacyText}>无账号、无云上传。数据保存在应用沙箱；备份使用 AES-256-GCM 与密码派生密钥加密。</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={Boolean(backupAction)} transparent animationType="fade" onRequestClose={() => setBackupAction(null)}>
        <Pressable style={styles.backdrop} onPress={() => setBackupAction(null)}>
          <Pressable style={styles.passwordModal} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.passwordTitle}>{backupAction === 'export' ? '设置备份密码' : '输入备份密码'}</Text>
            <Text style={styles.passwordCopy}>至少 8 个字符。密码不会保存，遗失后无法恢复备份。</Text>
            <TextInput autoFocus secureTextEntry value={passphrase} onChangeText={setPassphrase} placeholder="备份密码" placeholderTextColor={colors.subtle} style={styles.passwordInput} />
            <View style={styles.passwordActions}>
              <Pressable onPress={() => setBackupAction(null)} style={styles.cancelButton}><Text style={styles.cancelText}>取消</Text></Pressable>
              <Pressable onPress={() => void runBackup()} disabled={passphrase.length < 8 || busy} style={styles.confirmButton}><Text style={styles.confirmText}>{busy ? '处理中…' : '继续'}</Text></Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { height: 58, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.paper, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  headerButton: { width: 68, height: 44, justifyContent: 'center' },
  headerTitle: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  done: { color: colors.coral, textAlign: 'right', fontSize: 14, fontWeight: '800' },
  content: { padding: 18, paddingBottom: 50 },
  notice: { minHeight: 50, borderRadius: 14, backgroundColor: colors.tealSoft, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 9 },
  noticeText: { flex: 1, color: colors.teal, fontSize: 11, fontWeight: '700' },
  sectionLabel: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 0.8, marginTop: 19, marginBottom: 8, textTransform: 'uppercase' },
  card: { backgroundColor: colors.paper, borderRadius: 17, padding: 16, borderWidth: 1, borderColor: colors.line },
  cardRow: { backgroundColor: colors.paper, borderRadius: 17, padding: 14, minHeight: 72, borderWidth: 1, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', gap: 11 },
  cardTitle: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  cardCaption: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 3 },
  hours: { gap: 6, paddingTop: 14 },
  hour: { width: 37, height: 37, borderRadius: 19, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  hourActive: { backgroundColor: colors.ink },
  hourText: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  hourTextActive: { color: colors.paper },
  icon: { width: 40, height: 40, borderRadius: 13, backgroundColor: colors.coralSoft, alignItems: 'center', justifyContent: 'center' },
  rowCopy: { flex: 1 },
  cardGroup: { backgroundColor: colors.paper, borderRadius: 17, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  actionRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 15 },
  divider: { height: 1, backgroundColor: colors.line, marginLeft: 48 },
  privacyBox: { marginTop: 13, borderRadius: 15, backgroundColor: colors.tealSoft, padding: 14, flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  privacyText: { flex: 1, color: colors.teal, fontSize: 10, lineHeight: 16 },
  backdrop: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: 24 },
  passwordModal: { width: '100%', maxWidth: 390, backgroundColor: colors.background, borderRadius: 22, padding: 21 },
  passwordTitle: { color: colors.ink, fontSize: 20, fontWeight: '800' },
  passwordCopy: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 5 },
  passwordInput: { height: 50, borderRadius: 13, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper, paddingHorizontal: 13, color: colors.ink, marginTop: 16 },
  passwordActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 14 },
  cancelButton: { height: 42, paddingHorizontal: 16, justifyContent: 'center' },
  cancelText: { color: colors.muted, fontWeight: '700' },
  confirmButton: { height: 42, paddingHorizontal: 20, borderRadius: 12, justifyContent: 'center', backgroundColor: colors.teal },
  confirmText: { color: colors.paper, fontWeight: '800' },
});
