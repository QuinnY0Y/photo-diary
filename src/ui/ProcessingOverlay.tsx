import React from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, View } from 'react-native';

import { useDiary } from '../state/DiaryContext';
import { colors } from './theme';

export function ProcessingOverlay() {
  const { processing } = useDiary();
  return (
    <Modal visible={processing.active} transparent animationType="fade">
      <View style={styles.backdrop} accessibilityRole="progressbar">
        <View style={styles.card}>
          <ActivityIndicator size="small" color={colors.coral} />
          <Text style={styles.label}>{processing.label}</Text>
          {processing.total > 1 ? <Text style={styles.progress}>{processing.completed} / {processing.total}</Text> : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(31,27,24,0.28)', alignItems: 'center', justifyContent: 'center' },
  card: { minWidth: 170, minHeight: 104, borderRadius: 20, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center', padding: 20, gap: 9 },
  label: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  progress: { color: colors.muted, fontSize: 10 },
});
