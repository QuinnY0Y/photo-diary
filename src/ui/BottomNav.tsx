import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from './theme';

export type TabKey = 'timeline' | 'day' | 'tags';

const tabs: { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap; activeIcon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'timeline', label: '时间轴', icon: 'time-outline', activeIcon: 'time' },
  { key: 'day', label: '日视图', icon: 'grid-outline', activeIcon: 'grid' },
  { key: 'tags', label: 'Tag', icon: 'pricetags-outline', activeIcon: 'pricetags' },
];

export function BottomNav({ active, onChange }: { active: TabKey; onChange(tab: TabKey): void }) {
  return (
    <View style={styles.container} accessibilityRole="tablist">
      {tabs.map((tab) => {
        const selected = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={styles.tab}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
          >
            <View style={[styles.iconWrap, selected && styles.iconActive]}>
              <Ionicons name={selected ? tab.activeIcon : tab.icon} size={20} color={selected ? colors.coral : colors.muted} />
            </View>
            <Text style={[styles.label, selected && styles.labelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingTop: 8,
    paddingBottom: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    backgroundColor: 'rgba(255,253,249,0.98)',
  },
  tab: { flex: 1, alignItems: 'center', gap: 2, minHeight: 48, justifyContent: 'center' },
  iconWrap: { width: 38, height: 25, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  iconActive: { backgroundColor: colors.coralSoft },
  label: { fontSize: 10, color: colors.muted, fontWeight: '600' },
  labelActive: { color: colors.ink, fontWeight: '700' },
});
